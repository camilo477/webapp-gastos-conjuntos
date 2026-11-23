import { describe, expect, it, vi } from 'vitest';
import { daySchema, inclusiveDays, instantSchema, tripDay } from './dates';
import { state, trip, entry, expense, budget } from './testing/fixtures';

describe('VAL-02 · fechas y zonas explícitas', () => {
  it('días inclusivos, bisiesto, duración máxima y entradas inválidas', () => {
    expect(inclusiveDays('2024-02-28', '2024-03-01')).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
    expect(inclusiveDays('2026-11-21', '2026-11-21')).toEqual(['2026-11-21']);
    expect(inclusiveDays('2024-01-01', '2024-12-31')).toHaveLength(366);
    expect(() => inclusiveDays('2024-01-01', '2025-01-01')).toThrow(); expect(() => inclusiveDays('2026-11-22', '2026-11-21')).toThrow();
    for (const value of ['2026-02-29', '2026-02-30', '2026-13-01', '2026-00-01', '2026-1-01']) expect(daySchema.safeParse(value).success).toBe(false);
  });
  it('agrupa por Bogotá aunque UTC esté en el día siguiente', () => {
    expect(tripDay('2026-11-22T04:59:59Z', 'America/Bogota')).toBe('2026-11-21');
    expect(tripDay('2026-11-22T05:00:00Z', 'America/Bogota')).toBe('2026-11-22');
    expect(state([entry(1, expense(100, ['A', 'B'], { occurredAt: '2026-11-22T04:59:59Z' }))]).provisional).toBe(false);
  });
  it('DST primavera/otoño no inventa ni elimina días contables', () => {
    expect(tripDay('2026-03-08T04:59:59Z', 'America/New_York')).toBe('2026-03-07');
    for (const value of ['2026-03-08T05:00:00Z', '2026-03-08T06:59:59Z', '2026-03-08T07:00:00Z']) expect(tripDay(value, 'America/New_York')).toBe('2026-03-08');
    for (const value of ['2026-11-01T05:30:00Z', '2026-11-01T06:30:00Z']) expect(tripDay(value, 'America/New_York')).toBe('2026-11-01');
    expect(inclusiveDays('2026-03-07', '2026-03-10')).toHaveLength(4);
    const context = { ...trip(), startDate: '2026-03-07', endDate: '2026-03-10', timezone: 'America/New_York' };
    expect(state([entry(1, expense(100, ['A', 'B'], { day: '2026-03-08', occurredAt: '2026-03-08T07:00:00Z' }))], [], budget(null), context).provisional).toBe(false);
  });
  it('no depende del reloj actual ni de la zona del proceso', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('implicit clock forbidden'); });
    const before = process.env.TZ;
    try {
      for (const zone of ['Pacific/Auckland', 'UTC', 'America/Los_Angeles']) { process.env.TZ = zone; expect(tripDay('2026-11-22T04:00:00Z', 'America/Bogota')).toBe('2026-11-21'); }
    } finally { if (before === undefined) delete process.env.TZ; else process.env.TZ = before; nowSpy.mockRestore(); }
  });
  it('instantes UTC estrictos rechazan rollovers, offsets ambiguos y segundos inexistentes', () => {
    for (const value of ['2026-02-30T12:00:00Z', '2026-11-21T24:00:00Z', '2026-11-21T12:00:60Z', '2026-11-21T12:00:00', '2026-11-21T12:00:00-05:00']) expect(instantSchema.safeParse(value).success).toBe(false);
  });
});
