import type { FinancialState } from './state';
import { ordinal, requireCondition } from './errors';
import { sumMoney } from './money';

export interface PersonBalance {
  readonly personId: string; readonly paid: bigint; readonly consumed: bigint;
  readonly sent: bigint; readonly received: bigint; readonly balance: bigint;
}

export function calculateBalances(state: FinancialState): { rows: PersonBalance[]; provisional: boolean } {
  const rows = new Map(state.trip.people.map(person => [person.personId, { personId: person.personId, paid: 0n, consumed: 0n, sent: 0n, received: 0n, balance: 0n }]));
  for (const expense of state.expenses) {
    for (const payer of expense.payers) rows.get(payer.personId)!.paid += payer.amount;
    for (const share of expense.shares) rows.get(share.personId)!.consumed += share.amount;
  }
  for (const payment of state.settlements) { rows.get(payment.fromPersonId)!.sent += payment.amount; rows.get(payment.toPersonId)!.received += payment.amount; }
  for (const row of rows.values()) row.balance = row.paid - row.consumed + row.sent - row.received;
  requireCondition(sumMoney([...rows.values()].map(row => row.balance)) === 0n, 'BALANCE_INVARIANT', 'Los saldos deben sumar cero.');
  return { rows: [...rows.values()].sort((a, b) => ordinal(a.personId, b.personId)), provisional: state.provisional };
}

export interface SuggestedTransfer { readonly fromPersonId: string; readonly toPersonId: string; readonly amount: bigint }

export function suggestTransfers(state: FinancialState): { transfers: SuggestedTransfer[]; provisional: boolean } {
  const balances = calculateBalances(state);
  const sort = (a: { id: string; amount: bigint }, b: { id: string; amount: bigint }) => a.amount === b.amount ? ordinal(a.id, b.id) : a.amount > b.amount ? -1 : 1;
  const debtors = balances.rows.filter(row => row.balance < 0n).map(row => ({ id: row.personId, amount: -row.balance })).sort(sort);
  const creditors = balances.rows.filter(row => row.balance > 0n).map(row => ({ id: row.personId, amount: row.balance })).sort(sort);
  const transfers: SuggestedTransfer[] = [];
  let debit = 0, credit = 0;
  while (debit < debtors.length && credit < creditors.length) {
    const debtor = debtors[debit]!, creditor = creditors[credit]!;
    const amount = debtor.amount < creditor.amount ? debtor.amount : creditor.amount;
    transfers.push({ fromPersonId: debtor.id, toPersonId: creditor.id, amount });
    debtor.amount -= amount; creditor.amount -= amount;
    if (debtor.amount === 0n) debit++;
    if (creditor.amount === 0n) credit++;
  }
  return { transfers, provisional: state.provisional };
}
