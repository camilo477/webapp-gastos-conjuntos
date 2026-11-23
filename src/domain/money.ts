import { z } from 'zod';
import { requireCondition } from './errors';

export const MAX_MONEY = 1_000_000_000_000n;
export const currencySchema = z.enum(['COP', 'USD', 'EUR']);
export type Currency = z.infer<typeof currencySchema>;
export const moneySchema = z.number().int().min(0).max(Number(MAX_MONEY));
export const positiveMoneySchema = moneySchema.refine(value => value > 0, 'El importe debe ser positivo.');

export function currencyExponent(currency: Currency): 0 | 2 {
  currencySchema.parse(currency);
  return currency === 'COP' ? 0 : 2;
}

export function moneyToBigInt(value: unknown, positive = false): bigint {
  return BigInt((positive ? positiveMoneySchema : moneySchema).parse(value));
}

export function moneyToDto(value: bigint, positive = false): number {
  requireCondition(typeof value === 'bigint' && value >= (positive ? 1n : 0n) && value <= MAX_MONEY,
    'MONEY_RANGE', 'El importe está fuera del límite de un movimiento.');
  return Number(value);
}

export function sumMoney(values: Iterable<bigint>): bigint {
  let total = 0n;
  for (const value of values) {
    requireCondition(typeof value === 'bigint', 'MONEY_TYPE', 'Las operaciones requieren unidades enteras BigInt.');
    total += value;
  }
  return total;
}

export function parseMoney(text: string, currency: Currency, positive = false): bigint {
  const exponent = currencyExponent(currency);
  requireCondition(typeof text === 'string', 'MONEY_TEXT', 'Introduce un importe como texto.');
  const trimmed = text.trim();
  requireCondition(trimmed.length <= 32 && (exponent === 0 ? /^\d+$/ : /^\d+(?:[.,]\d{1,2})?$/).test(trimmed),
    'MONEY_FORMAT', 'Importe inválido: no se permiten agrupadores, signos, exponentes ni decimales adicionales.');
  const [whole = '', fraction = ''] = trimmed.split(/[.,]/);
  const amount = BigInt(whole) * (exponent === 0 ? 1n : 100n) + (exponent === 0 ? 0n : BigInt(fraction.padEnd(2, '0')));
  moneyToDto(amount, positive);
  return amount;
}

export function formatMoney(amount: bigint, currency: Currency): string {
  const exponent = currencyExponent(currency);
  requireCondition(typeof amount === 'bigint', 'MONEY_TYPE', 'El formato requiere unidades enteras BigInt.');
  const magnitude = amount < 0n ? -amount : amount;
  const scale = exponent === 0 ? 1n : 100n;
  const integer = (magnitude / scale).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fraction = exponent === 0 ? '' : `,${(magnitude % scale).toString().padStart(2, '0')}`;
  return `${amount < 0n ? '-' : ''}${currency} ${currency === 'EUR' ? '€' : '$'}${integer}${fraction}`;
}
