import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export function EmptyState({ title, children, icon = 'receipt' }: { title: string; children: ReactNode; icon?: IconName }) {
  return <div className="empty-state"><span className="empty-symbol"><Icon name={icon} /></span><h2>{title}</h2><p>{children}</p></div>;
}
