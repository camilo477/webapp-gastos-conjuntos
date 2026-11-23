import type { FinancialState } from './state';
import { calculateBalances, suggestTransfers } from './balances';
import { calculateStatistics } from './statistics';
import { calculateBudget } from './budget';

export function summarizeTrip(state: FinancialState, asOf: string) {
  return {
    tripId: state.trip.id, currency: state.trip.currency,
    statistics: calculateStatistics(state), balances: calculateBalances(state),
    budget: calculateBudget(state, asOf), suggestions: suggestTransfers(state),
    provisional: state.provisional, issues: state.issues,
  };
}
