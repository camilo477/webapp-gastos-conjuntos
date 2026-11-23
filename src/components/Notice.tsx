import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Notice({ title, children, kind = 'info' }: { title: string; children: ReactNode; kind?: 'info' | 'warning' | 'error' }) {
  return <div className={`note ${kind}`} role={kind === 'error' ? 'alert' : undefined}><Icon name={kind === 'info' ? 'help' : 'alert'} /><div><strong>{title}</strong><div>{children}</div></div></div>;
}
