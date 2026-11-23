import { Icon } from './Icon';
import type { IconName } from './Icon';

// A presentation model, not a persisted expense or a financial contract.
export interface MovementPresentation { id: string; title: string; detail: string; amount: string; context: string; icon: IconName }

export function MovementRow({ movement }: { movement: MovementPresentation }) {
  return <li className="movement"><span className="movement-icon"><Icon name={movement.icon} /></span><div className="movement-body"><span className="movement-title">{movement.title}</span><span className="movement-sub">{movement.detail}</span></div><span className="movement-end money">{movement.amount}<small>{movement.context}</small></span></li>;
}
