import { instantSchema, tripDay } from '../../domain';
import type { Currency } from '../../domain';

export const categories = { food: 'Comida', transport: 'Transporte', lodging: 'Alojamiento', activities: 'Actividades', shopping: 'Compras', other: 'Otros' } as const;

// Input representation only; accounting, allocation and formatting stay in domain.
export function moneyInput(value: number, currency: Currency): string {
  if (currency === 'COP') return String(value);
  const digits = String(value).padStart(3, '0');
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`;
}
export function percentageInput(weight: number): string { return `${Math.floor(weight / 100)}.${String(weight % 100).padStart(2, '0')}`; }
export function percentageWeight(text: string): number {
  if (!/^\d{1,3}([.,]\d{1,2})?$/.test(text.trim())) throw new Error('Introduce porcentajes con hasta dos decimales.');
  const [whole = '', fraction = ''] = text.trim().split(/[.,]/);
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
export function localDateTime(instant: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(instant));
  return { day: tripDay(instant, timezone), time: `${parts.find(p => p.type === 'hour')!.value}:${parts.find(p => p.type === 'minute')!.value}` };
}
export function occurredAt(day: string, time: string, timezone: string): string {
  const local = instantSchema.parse(`${day}T${time}:00.000Z`), target = Date.parse(local);
  let candidate = target;
  for (let i = 0; i < 4; i++) {
    const parts = localDateTime(new Date(candidate).toISOString(), timezone);
    const delta = target - Date.parse(`${parts.day}T${parts.time}:00.000Z`);
    candidate += delta;
    if (delta === 0) return new Date(candidate).toISOString();
  }
  throw new Error('Esta hora no existe en la zona del viaje. Elige otra hora.');
}
