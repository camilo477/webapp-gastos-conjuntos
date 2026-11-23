import { z } from 'zod';
import { requireCondition } from './errors';

export const daySchema = z.string().regex(/^(?!0000)\d{4}-\d{2}-\d{2}$/).refine(day => {
  const time = Date.parse(`${day}T00:00:00.000Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === day;
}, 'Fecha civil inválida.');

export const instantSchema = z.string().regex(/^(?!0000)\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/)
  .refine(value => daySchema.safeParse(value.slice(0, 10)).success && Number.isFinite(Date.parse(value)), 'Instante UTC inválido.');

// Explicit-zone formatters are deterministic and expensive to construct per event.
const formatters = new Map<string,Intl.DateTimeFormat>();
function formatter(zone: string) {
  let value = formatters.get(zone);
  if (!value) {
    value = new Intl.DateTimeFormat('en-CA',{ timeZone: zone,calendar: 'iso8601',numberingSystem: 'latn',year: 'numeric',month: '2-digit',day: '2-digit' });
    if (formatters.size >= 64) formatters.delete(formatters.keys().next().value!);
    formatters.set(zone,value);
  }
  return value;
}
export const timezoneSchema = z.string().max(100).refine(value => {
  if (value !== 'UTC' && !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(value)) return false;
  try { formatter(value); return true; } catch { return false; }
}, 'Zona horaria IANA inválida.');

export function tripDay(instant: string, timezone: string): string {
  instantSchema.parse(instant);
  timezoneSchema.parse(timezone);
  const parts = formatter(timezone).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)!.value;
  return daySchema.parse(`${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`);
}

export function inclusiveDays(start: string, end: string): string[] {
  daySchema.parse(start); daySchema.parse(end);
  const startTime = Date.parse(`${start}T00:00:00.000Z`);
  const endTime = Date.parse(`${end}T00:00:00.000Z`);
  const count = (endTime - startTime) / 86_400_000 + 1;
  requireCondition(count >= 1 && count <= 366, 'TRIP_DATES', 'El viaje debe durar entre 1 y 366 días inclusivos.');
  return Array.from({ length: count }, (_, index) => new Date(startTime + index * 86_400_000).toISOString().slice(0, 10));
}
