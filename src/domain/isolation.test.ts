import { readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';
import { summarizeTrip } from './summary';
import { budget, entry, expense, now, state } from './testing/fixtures';

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

it('el dominio se ejecuta sin DOM, React, Firebase, red o reloj implícito', () => {
  expect(typeof window).toBe('undefined'); expect(typeof document).toBe('undefined');
  const directory = new URL('./', import.meta.url);
  for (const file of readdirSync(directory).filter(file => file.endsWith('.ts') && !file.endsWith('.test.ts'))) {
    const source = readFileSync(new URL(file, directory), 'utf8');
    const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(match => match[1]!);
    expect(imports.every(path => path === 'zod' || path.startsWith('./'))).toBe(true);
    expect(source).not.toMatch(/\b(?:window|document|navigator|localStorage|sessionStorage|fetch)\s*[.(]/);
    expect(source).not.toMatch(/Date\.now\s*\(|Math\.random\s*\(|new Date\s*\(\s*\)/);
  }
});

it('todas las vistas calculadas admiten entradas congeladas y son reproducibles', () => {
  const input = freeze(state([entry(1, expense(101))], [], budget()));
  const first = summarizeTrip(input, now), second = summarizeTrip(input, now);
  expect(second).toEqual(first); expect(input.expenses[0]!.total).toBe(101n);
  expect(input.budget!.total).toBe(400_000);
});
