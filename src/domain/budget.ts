import { allocateByWeight } from './allocation';
import { inclusiveDays, tripDay } from './dates';
import { requireCondition } from './errors';
import { sumMoney } from './money';
import { budgetSnapshotSchema, validateBudgetContext } from './schemas';
import type { FinancialState } from './state';
import { calculateStatistics } from './statistics';

const nonnegative = (value: bigint) => value > 0n ? value : 0n;

export function calculateBudget(state: FinancialState, asOf: string) {
  const today = tripDay(asOf, state.trip.timezone);
  const days = inclusiveDays(state.trip.startDate, state.trip.endDate);
  const statistics = calculateStatistics(state);
  const spent = new Map(statistics.byDay.map(row => [row.day, row.amount]));
  const total = state.budget?.total === null || !state.budget ? null : BigInt(state.budget.total);
  const locked = new Map(state.budget?.lockedDays.map(row => [row.day, BigInt(row.amount)]) ?? []);
  const initial = new Map(total === null ? [] : allocateByWeight(total, days.map(id => ({ id, weight: 1n }))).map(row => [row.id, row.amount]));
  const pivot = today < state.trip.startDate ? state.trip.startDate : today;
  const phase = today < state.trip.startDate ? 'before' : today > state.trip.endDate ? 'after' : 'during';
  const allocateAt = (day: string) => {
    if (total === null) return new Map<string, bigint>();
    const remaining = total - sumMoney(days.filter(date => date < day).map(date => spent.get(date)!));
    const future = days.filter(date => date >= day);
    const reserved = sumMoney(future.map(date => locked.get(date) ?? 0n));
    const automatic = future.filter(date => !locked.has(date));
    const allocations = new Map(future.filter(date => locked.has(date)).map(date => [date, locked.get(date)!]));
    if (automatic.length) for (const row of allocateByWeight(nonnegative(remaining - reserved), automatic.map(id => ({ id, weight: 1n })))) allocations.set(row.id, row.amount);
    return allocations;
  };
  let accumulated = 0n;
  const rows = days.map(day => {
    accumulated += spent.get(day)!;
    const allocated = allocateAt(day).get(day) ?? null;
    return {
      day, spent: spent.get(day)!, accumulated, initial: initial.get(day) ?? null,
      allocated, manual: locked.has(day), available: allocated === null ? null : allocated - spent.get(day)!,
      excess: allocated === null ? null : nonnegative(spent.get(day)! - allocated),
      remainingTotal: total === null ? null : total - accumulated,
    };
  });
  // Future proposals account for every known purchase, including future-dated
  // ones, while preserving manual caps and never counting a purchase twice.
  const futureDays = days.filter(day => phase === 'before' ? day >= pivot : day > today);
  const available = total === null ? null : total - statistics.total;
  const reservedRemaining = sumMoney(futureDays.filter(day => locked.has(day)).map(day => nonnegative(locked.get(day)! - spent.get(day)!)));
  const automatic = futureDays.filter(day => !locked.has(day));
  const pool = available === null ? 0n : nonnegative(available - reservedRemaining);
  const extra = new Map(automatic.length ? allocateByWeight(pool, automatic.map(id => ({ id, weight: 1n }))).map(row => [row.id, row.amount]) : []);
  const future = futureDays.map(day => ({ day, amount: total === null ? null : locked.get(day) ?? (spent.get(day)! + (extra.get(day) ?? 0n)), manual: locked.has(day) }));
  return {
    total, spent: statistics.total, available, phase, today, status: state.budgetStatus,
    current: phase === 'during' ? rows.find(row => row.day === today)! : null,
    days: rows, future,
    fundingDeficit: available === null ? null : nonnegative(reservedRemaining - available),
    unallocatedSurplus: available === null ? null : automatic.length === 0 ? nonnegative(available - reservedRemaining) : 0n,
    provisional: state.provisional,
  };
}

export function validateBudgetEdit(state: FinancialState, raw: unknown, asOf: string) {
  requireCondition(!state.provisional, 'PROVISIONAL_BUDGET', 'No se valida una reserva con datos incompletos o en conflicto.');
  const budget = budgetSnapshotSchema.parse(raw);
  validateBudgetContext(budget, state.trip);
  const today = tripDay(asOf, state.trip.timezone);
  if (budget.total !== null) {
    const previousCost = sumMoney(state.expenses.filter(expense => expense.day < today).map(expense => expense.total));
    const reserved = sumMoney(budget.lockedDays.filter(row => row.day >= today).map(row => BigInt(row.amount)));
    requireCondition(reserved <= nonnegative(BigInt(budget.total) - previousCost), 'BUDGET_RESERVES', 'Las reservas futuras superan el remanente disponible.');
  }
  return budget;
}
