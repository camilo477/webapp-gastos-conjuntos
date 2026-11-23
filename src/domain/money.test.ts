import { describe, expect, it } from 'vitest';
import { formatMoney, MAX_MONEY, moneyToBigInt, moneyToDto, parseMoney, sumMoney } from './money';

describe('VAL-01/02 · dinero exacto y fronteras', () => {
  it.each([['1', 'COP', 1n], ['1000000000000', 'COP', MAX_MONEY], ['100,50', 'USD', 10050n], ['100.5', 'EUR', 10050n], ['0,01', 'USD', 1n], [' 0 ', 'COP', 0n]] as const)('parsea %s %s', (input, currency, expected) => expect(parseMoney(input, currency)).toBe(expected));
  it.each(['100,50', '100.50', '-1', '+1', '1e3', '1.000', '1 000', '', 'NaN', 'Infinity', '1,00,00', '1000000000001'])('rechaza COP ambiguo o fuera de límite: %s', value => expect(() => parseMoney(value, 'COP')).toThrow());
  it.each(['1.234', '0.001', '1,234.56', '10000000000.01', '-0.01'])('rechaza USD inválido: %s', value => expect(() => parseMoney(value, 'USD')).toThrow());
  it.each([NaN, Infinity, -Infinity, -1, 0.5, 1_000_000_000_001, Number.MAX_SAFE_INTEGER + 1, '100'])('rechaza unidades Number inválidas: %s', value => expect(() => moneyToBigInt(value)).toThrow());
  it('admite cero para presupuesto, pero no para movimiento positivo', () => {
    expect(moneyToBigInt(0)).toBe(0n); expect(() => parseMoney('0', 'COP', true)).toThrow(); expect(() => moneyToDto(0n, true)).toThrow();
  });
  it('FIN-09: agrega por encima del entero seguro sin perder unidades', () => {
    const result = sumMoney(Array.from({ length: 10_000 }, () => MAX_MONEY));
    expect(result).toBe(10_000_000_000_000_000n); expect(() => moneyToDto(result)).toThrow();
    expect(formatMoney(result + 1n, 'COP')).toBe('COP $10.000.000.000.000.001');
    expect(formatMoney(-10051n, 'USD')).toBe('-USD $100,51'); expect(formatMoney(1n, 'EUR')).toBe('EUR €0,01');
  });
  it('no convierte ni admite monedas fuera del catálogo', () => expect(() => parseMoney('1', 'JPY' as 'COP')).toThrow());
});
