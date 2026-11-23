import { describe, expect, it } from 'vitest';
import { localDateTime, moneyInput, occurredAt, percentageInput, percentageWeight } from './formValues';
describe('financial form adapters', () => {
  it('round-trips COP, decimals and exact percentage text', () => {
    expect(moneyInput(100,'COP')).toBe('100'); expect(moneyInput(1,'USD')).toBe('0.01');
    expect(percentageWeight('33,33')).toBe(3333); expect(percentageInput(3333)).toBe('33.33'); expect(() => percentageWeight('33.333')).toThrow();
  });
  it('interprets date and time in the trip zone, independent of device zone', () => {
    expect(occurredAt('2026-11-23','09:30','America/Bogota')).toBe('2026-11-23T14:30:00.000Z');
    expect(localDateTime('2026-11-23T01:30:00.000Z','America/Bogota')).toEqual({ day: '2026-11-22',time: '20:30' });
  });
  it('rejects nonexistent DST wall-clock time and handles both offsets', () => {
    expect(() => occurredAt('2026-03-08','02:30','America/New_York')).toThrow('no existe');
    expect(occurredAt('2026-03-07','12:00','America/New_York')).toBe('2026-03-07T17:00:00.000Z');
    expect(occurredAt('2026-03-09','12:00','America/New_York')).toBe('2026-03-09T16:00:00.000Z');
  });
});
