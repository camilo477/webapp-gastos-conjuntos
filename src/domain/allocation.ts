import { z } from 'zod';
import { moneyToBigInt, moneyToDto, sumMoney } from './money';
import { ordinal, requireCondition } from './errors';

export const personIdSchema = z.string().min(1).max(128).regex(/^[^/\s\p{Cc}]+$/u);
export const operationIdSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
export interface Allocation { readonly personId: string; readonly amount: bigint }

export function allocateByWeight(total: bigint, entries: readonly { id: string; weight: bigint }[]): { id: string; amount: bigint }[] {
  requireCondition(typeof total === 'bigint' && total >= 0n, 'ALLOCATION_TOTAL', 'El total de reparto debe ser entero no negativo.');
  requireCondition(entries.length > 0 && entries.length <= 366, 'ALLOCATION_SIZE', 'Se requieren entre 1 y 366 destinos.');
  requireCondition(new Set(entries.map(entry => entry.id)).size === entries.length, 'DUPLICATE_ID', 'No se permiten identificadores repetidos.');
  for (const entry of entries) {
    personIdSchema.parse(entry.id);
    requireCondition(typeof entry.weight === 'bigint' && entry.weight >= 0n, 'WEIGHT', 'Los pesos deben ser enteros no negativos.');
  }
  const weightTotal = sumMoney(entries.map(entry => entry.weight));
  requireCondition(weightTotal > 0n, 'WEIGHT_TOTAL', 'Se requiere al menos un peso positivo.');
  const rows = entries.map(entry => ({ id: entry.id, amount: total * entry.weight / weightTotal, remainder: total * entry.weight % weightTotal }));
  const remainder = total - sumMoney(rows.map(row => row.amount));
  rows.sort((a, b) => a.remainder === b.remainder ? ordinal(a.id, b.id) : a.remainder > b.remainder ? -1 : 1);
  for (let index = 0; BigInt(index) < remainder; index++) rows[index]!.amount += 1n;
  return rows.sort((a, b) => ordinal(a.id, b.id)).map(({ id, amount }) => ({ id, amount }));
}

export type Split =
  | { mode: 'equal'; personIds: readonly string[] }
  | { mode: 'percentage'; weights: readonly { personId: string; weight: number }[] }
  | { mode: 'fixed'; shares: readonly Allocation[] };

export function splitExpense(total: bigint, split: Split): Allocation[] {
  moneyToDto(total, true);
  const entries = split.mode === 'equal' ? split.personIds.map(personId => ({ personId, weight: 1 }))
    : split.mode === 'percentage' ? split.weights : split.shares;
  requireCondition(entries.length >= 1 && entries.length <= 10, 'SPLIT_SIZE', 'Un gasto admite entre 1 y 10 beneficiarios.');
  const ids = entries.map(entry => personIdSchema.parse(entry.personId));
  requireCondition(new Set(ids).size === ids.length, 'DUPLICATE_PERSON', 'Hay participantes repetidos.');
  if (split.mode === 'fixed') {
    const shares = split.shares.map(share => ({ personId: share.personId, amount: moneyToBigInt(moneyToDto(share.amount)) }));
    requireCondition(sumMoney(shares.map(share => share.amount)) === total, 'SHARE_SUM', 'Las cuotas deben sumar exactamente el total.');
    return shares.sort((a, b) => ordinal(a.personId, b.personId));
  }
  const weights = split.mode === 'equal' ? split.personIds.map(id => ({ id, weight: 1n })) : split.weights.map(entry => ({
    id: entry.personId, weight: BigInt(z.number().int().min(0).max(10_000).parse(entry.weight)),
  }));
  if (split.mode === 'percentage') requireCondition(sumMoney(weights.map(entry => entry.weight)) === 10_000n, 'PERCENT_SUM', 'Los porcentajes deben sumar exactamente 100%.');
  return allocateByWeight(total, weights).map(entry => ({ personId: entry.id, amount: entry.amount }));
}
