import { expect, it } from 'vitest';
import { splitExpense } from './allocation';
import { calculateBalances, suggestTransfers } from './balances';
import { calculateStatistics } from './statistics';
import { calculateBudget } from './budget';
import { MAX_MONEY, sumMoney } from './money';
import { budget, entry, expense, now, settlement, state, trip } from './testing/fixtures';

it('FIN-08: 4.500 vectores deterministas entre 2–10 personas conservan dinero y orden', () => {
  let vectors = 0;
  for (let count = 2; count <= 10; count++) for (let index = 0; index < 500; index++) {
    const ids = Array.from({ length: count }, (_, offset) => String.fromCharCode(65 + offset));
    const seed = BigInt(count * 500 + index + 1);
    const total = index % 17 === 0 ? MAX_MONEY : index % 19 === 0 ? 1n : 1n + seed * 7919n * 999_983n % MAX_MONEY;
    let remaining = 10_000;
    const weights = ids.map((personId, offset) => {
      const weight = offset === count - 1 ? remaining : Number((seed * BigInt(offset + 37) + 17n) % BigInt(remaining + 1));
      remaining -= weight; return { personId, weight };
    });
    const equal = splitExpense(total, { mode: 'equal', personIds: ids });
    expect(splitExpense(total, { mode: 'equal', personIds: ids.slice().reverse() })).toEqual(equal);
    const shares = splitExpense(total, { mode: 'percentage', weights });
    expect(sumMoney(shares.map(share => share.amount))).toBe(total);
    expect(sumMoney(equal.map(share => share.amount))).toBe(total);
    expect(splitExpense(total, { mode: 'percentage', weights: weights.slice().reverse() })).toEqual(shares);
    expect(splitExpense(total, { mode: 'fixed', shares: shares.slice().reverse() })).toEqual(shares);
    const paid = total / 3n;
    const payerIds = paid > 0n ? [ids[0]!, ids[count - 1]!] : [ids[count - 1]!];
    const payerAmounts = paid > 0n ? [Number(paid), Number(total - paid)] : [Number(total)];
    const snapshot = expense(Number(total), ids, { splitMode: 'percentage', weights: weights.map(row => row.weight), shareAmounts: shares.map(share => Number(share.amount)), payerIds, payerAmounts });
    const payment = settlement(Number(total), { fromPersonId: ids[count - 1]!, toPersonId: ids[0]! });
    const result = state([entry(1, snapshot)], [entry(2, payment)], budget(null), trip(ids));
    const permuted = state([entry(1, { ...snapshot, payerIds: payerIds.slice().reverse(), payerAmounts: payerAmounts.slice().reverse() })], [entry(2, payment)], budget(null), trip(ids.slice().reverse()));
    expect(result).toEqual(permuted); expect(result.provisional).toBe(false);
    const balances = calculateBalances(result).rows;
    expect(sumMoney(balances.map(row => row.balance))).toBe(0n); expect(calculateStatistics(result).total).toBe(total);
    const residuals = new Map(balances.map(row => [row.personId, row.balance]));
    for (const transfer of suggestTransfers(result).transfers) { residuals.set(transfer.fromPersonId, residuals.get(transfer.fromPersonId)! + transfer.amount); residuals.set(transfer.toPersonId, residuals.get(transfer.toPersonId)! - transfer.amount); }
    expect([...residuals.values()].every(amount => amount === 0n)).toBe(true);
    vectors++;
  }
  expect(vectors).toBe(4500);
}, 60_000);

it('FIN-09: 10.000 movimientos máximos mantienen agregados fuera del rango Number exactos', () => {
  const raw = expense(Number(MAX_MONEY), ['A', 'B'], { splitMode: 'percentage', weights: [0, 10_000], shareAmounts: [0, Number(MAX_MONEY)] });
  const input = state(Array.from({ length: 10_000 }, (_, index) => entry(index + 1, raw)));
  const aggregate = 10_000_000_000_000_000n;
  expect(calculateStatistics(input).total).toBe(aggregate);
  expect(calculateBalances(input).rows.map(row => row.balance)).toEqual([aggregate, -aggregate]);
  expect(suggestTransfers(input).transfers).toEqual([{ fromPersonId: 'B', toPersonId: 'A', amount: aggregate }]);
}, 30_000);

it('1.000 presupuestos deterministas conservan remanente, reservas y cupos no negativos', () => {
  for (let index = 1; index <= 1000; index++) {
    const total = index * 1009, spent = index * 383, reserved = index * 127;
    const result = calculateBudget(state([entry(1, expense(spent))], [], budget(total, [{ day: '2026-11-24', amount: reserved }])), now);
    expect(result.available).toBe(BigInt(total) - BigInt(spent));
    expect(sumMoney(result.future.map(row => row.amount!))).toBe(result.available);
    expect(result.future[2]!.amount).toBe(BigInt(reserved)); expect(result.future.every(row => row.amount! >= 0n)).toBe(true);
  }
}, 30_000);
