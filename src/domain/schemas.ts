import { z } from 'zod';
import { operationIdSchema, personIdSchema, splitExpense } from './allocation';
import { daySchema, inclusiveDays, instantSchema, timezoneSchema, tripDay } from './dates';
import { currencyExponent, currencySchema, moneySchema, positiveMoneySchema, sumMoney } from './money';
import { ordinal, requireCondition } from './errors';

export const personSchema = z.strictObject({ personId: personIdSchema, displayName: z.string().trim().min(1).max(60), status: z.enum(['active', 'revoked']) });
export const tripContextSchema = z.strictObject({
  id: personIdSchema, startDate: daySchema, endDate: daySchema, timezone: timezoneSchema,
  currency: currencySchema, currencyExponent: z.union([z.literal(0), z.literal(2)]),
  people: z.array(personSchema).min(1).max(1000),
}).superRefine((trip, ctx) => {
  try { inclusiveDays(trip.startDate, trip.endDate); } catch { ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Duración de viaje inválida.' }); }
  if (trip.currencyExponent !== currencyExponent(trip.currency)) ctx.addIssue({ code: 'custom', path: ['currencyExponent'], message: 'Exponente incompatible con la moneda.' });
  if (new Set(trip.people.map(person => person.personId)).size !== trip.people.length) ctx.addIssue({ code: 'custom', path: ['people'], message: 'Personas repetidas.' });
  if (trip.people.filter(person => person.status === 'active').length > 10) ctx.addIssue({ code: 'custom', path: ['people'], message: 'Máximo 10 personas activas.' });
}).transform(trip => ({ ...trip, people: trip.people.slice().sort((a, b) => ordinal(a.personId, b.personId)) }));
export type TripContext = z.infer<typeof tripContextSchema>;

const httpsUrl = z.string().max(2048).url().refine(value => value.startsWith('https://'), 'Se requiere HTTPS.');
export const openverseMetadataSchema = z.strictObject({
  id: z.string().min(1).max(200), title: z.string().max(500), source: z.string().min(1).max(200),
  foreignLandingUrl: httpsUrl, creator: z.string().min(1).max(500), creatorUrl: httpsUrl.nullable(),
  license: z.string().min(1).max(100), licenseVersion: z.string().max(100), licenseUrl: httpsUrl,
  thumbnailUrl: httpsUrl, modified: z.boolean(),
});
const visualSchema = z.union([z.null(), z.strictObject({ kind: z.literal('icon'), key: z.string().min(1).max(100) }), openverseMetadataSchema]);
export const categorySchema = z.enum(['food', 'transport', 'lodging', 'activities', 'shopping', 'other']);

export const expenseSnapshotSchema = z.strictObject({
  title: z.string().trim().min(1).max(100), note: z.string().max(2000).nullable().default(null),
  total: positiveMoneySchema, category: categorySchema, occurredAt: instantSchema, day: daySchema,
  payerIds: z.array(personIdSchema).min(1).max(10), payerAmounts: z.array(positiveMoneySchema).min(1).max(10),
  participantIds: z.array(personIdSchema).min(1).max(10), shareAmounts: z.array(moneySchema).min(1).max(10),
  splitMode: z.enum(['equal', 'percentage', 'fixed']), weights: z.array(z.number().int().min(0).max(10_000)).max(10),
  visual: visualSchema, attachmentId: operationIdSchema.nullable().default(null),
  status: z.enum(['active', 'deleted', 'merged']), mergedInto: operationIdSchema.nullable(),
}).superRefine((expense, ctx) => {
  const issue = (message: string, field: string) => ctx.addIssue({ code: 'custom', message, path: [field] });
  if (expense.payerIds.length !== expense.payerAmounts.length || expense.participantIds.length !== expense.shareAmounts.length) { issue('Listas monetarias desalineadas.', 'payerIds'); return; }
  if (new Set(expense.payerIds).size !== expense.payerIds.length || new Set(expense.participantIds).size !== expense.participantIds.length) { issue('Personas repetidas.', 'participantIds'); return; }
  if (sumMoney(expense.payerAmounts.map(BigInt)) !== BigInt(expense.total)) issue('Los aportes no suman el total.', 'payerAmounts');
  if (sumMoney(expense.shareAmounts.map(BigInt)) !== BigInt(expense.total)) issue('Las cuotas no suman el total.', 'shareAmounts');
  if ((expense.status === 'merged') !== (expense.mergedInto !== null)) issue('Destino de unificación incompatible con el estado.', 'mergedInto');
  if (expense.splitMode === 'fixed') {
    if (expense.weights.length !== 0) issue('fixed requiere weights vacío.', 'weights');
    return;
  }
  if (expense.weights.length !== expense.participantIds.length) { issue('Pesos desalineados.', 'weights'); return; }
  if (expense.splitMode === 'equal' && expense.weights.some(weight => weight !== 1)) { issue('Reparto igualitario requiere pesos 1.', 'weights'); return; }
  try {
    const expected = splitExpense(BigInt(expense.total), expense.splitMode === 'equal'
      ? { mode: 'equal', personIds: expense.participantIds }
      : { mode: 'percentage', weights: expense.participantIds.map((personId, index) => ({ personId, weight: expense.weights[index]! })) });
    const actual = new Map(expense.participantIds.map((id, index) => [id, BigInt(expense.shareAmounts[index]!)]));
    if (expected.some(share => actual.get(share.personId) !== share.amount)) issue('Cuotas incompatibles con restos mayores.', 'shareAmounts');
  } catch { issue('Porcentajes inválidos: se requiere suma exacta 100%.', 'weights'); }
}).transform(expense => {
  const payers = expense.payerIds.map((id, index) => ({ id, amount: expense.payerAmounts[index]! })).sort((a, b) => ordinal(a.id, b.id));
  const shares = expense.participantIds.map((id, index) => ({ id, amount: expense.shareAmounts[index]!, weight: expense.weights[index] })).sort((a, b) => ordinal(a.id, b.id));
  return { ...expense, payerIds: payers.map(row => row.id), payerAmounts: payers.map(row => row.amount), participantIds: shares.map(row => row.id), shareAmounts: shares.map(row => row.amount), weights: expense.splitMode === 'fixed' ? [] : shares.map(row => row.weight!) };
});
export type ExpenseSnapshot = z.infer<typeof expenseSnapshotSchema>;

export const settlementSnapshotSchema = z.strictObject({
  fromPersonId: personIdSchema, toPersonId: personIdSchema, amount: positiveMoneySchema,
  occurredAt: instantSchema, day: daySchema, note: z.string().max(2000).nullable().default(null), status: z.enum(['active', 'deleted']),
}).refine(value => value.fromPersonId !== value.toPersonId, 'El origen y el destino deben ser distintos.');
export type SettlementSnapshot = z.infer<typeof settlementSnapshotSchema>;

export const budgetSnapshotSchema = z.strictObject({
  total: moneySchema.nullable(), lockedDays: z.array(z.strictObject({ day: daySchema, amount: moneySchema })).max(366), status: z.literal('active'),
}).superRefine((budget, ctx) => {
  if (new Set(budget.lockedDays.map(row => row.day)).size !== budget.lockedDays.length) ctx.addIssue({ code: 'custom', path: ['lockedDays'], message: 'Fechas de reserva repetidas.' });
  if (budget.total === null && budget.lockedDays.length !== 0) ctx.addIssue({ code: 'custom', path: ['lockedDays'], message: 'Sin presupuesto no puede haber reservas.' });
}).transform(budget => ({ ...budget, lockedDays: budget.lockedDays.slice().sort((a, b) => ordinal(a.day, b.day)) }));
export type BudgetSnapshot = z.infer<typeof budgetSnapshotSchema>;

export function validateDayInTrip(day: string, context: TripContext): void {
  requireCondition(day >= context.startDate && day <= context.endDate, 'DAY_RANGE', 'La fecha debe estar dentro del viaje.');
}

export function validateExpenseContext(snapshot: ExpenseSnapshot, context: TripContext): void {
  validateDayInTrip(snapshot.day, context);
  requireCondition(tripDay(snapshot.occurredAt, context.timezone) === snapshot.day, 'DAY_TIMEZONE', 'El día no coincide con el instante en la zona del viaje.');
  const known = new Set(context.people.map(person => person.personId));
  requireCondition([...snapshot.payerIds, ...snapshot.participantIds].every(id => known.has(id)), 'UNKNOWN_PERSON', 'El gasto referencia personas ajenas al viaje.');
}

export function validateSettlementContext(snapshot: SettlementSnapshot, context: TripContext): void {
  validateDayInTrip(snapshot.day, context);
  requireCondition(tripDay(snapshot.occurredAt, context.timezone) === snapshot.day, 'DAY_TIMEZONE', 'El día del abono no coincide con la zona del viaje.');
  const known = new Set(context.people.map(person => person.personId));
  requireCondition(known.has(snapshot.fromPersonId) && known.has(snapshot.toPersonId), 'UNKNOWN_PERSON', 'El abono referencia personas ajenas al viaje.');
}

export function validateBudgetContext(snapshot: BudgetSnapshot, context: TripContext): void {
  for (const row of snapshot.lockedDays) validateDayInTrip(row.day, context);
}

export function validateExpenseChange(raw: unknown, context: TripContext, previous?: ExpenseSnapshot): ExpenseSnapshot {
  const snapshot = expenseSnapshotSchema.parse(raw);
  validateExpenseContext(snapshot, context);
  const allowed = new Set(context.people.filter(person => person.status === 'active').map(person => person.personId));
  if (previous) { validateExpenseContext(expenseSnapshotSchema.parse(previous), context); for (const id of [...previous.payerIds, ...previous.participantIds]) allowed.add(id); }
  requireCondition([...snapshot.payerIds, ...snapshot.participantIds].every(id => allowed.has(id)), 'REVOKED_PERSON', 'No se puede añadir una persona revocada ajena al gasto anterior.');
  return snapshot;
}

export function validateSettlementChange(raw: unknown, context: TripContext, previous?: SettlementSnapshot): SettlementSnapshot {
  const snapshot = settlementSnapshotSchema.parse(raw);
  validateSettlementContext(snapshot, context);
  const allowed = new Set(context.people.filter(person => person.status === 'active').map(person => person.personId));
  if (previous) { validateSettlementContext(settlementSnapshotSchema.parse(previous), context); allowed.add(previous.fromPersonId); allowed.add(previous.toPersonId); }
  requireCondition(allowed.has(snapshot.fromPersonId) && allowed.has(snapshot.toPersonId), 'REVOKED_PERSON', 'No se puede añadir una persona revocada ajena al abono anterior.');
  return snapshot;
}
