import type { ReactNode } from 'react';

export function Container({ children, form = false }: { children: ReactNode; form?: boolean }) {
  return <main id="main" tabIndex={-1} className={form ? 'form-main' : undefined}>{children}</main>;
}
