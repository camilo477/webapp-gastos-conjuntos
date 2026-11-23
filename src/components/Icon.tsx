import mountain from '../../design/prototype/assets/mountain.svg';
import house from '../../design/prototype/assets/house.svg';
import scale from '../../design/prototype/assets/scale.svg';
import activity from '../../design/prototype/assets/activity.svg';
import wallet from '../../design/prototype/assets/wallet.svg';
import users from '../../design/prototype/assets/users.svg';
import mapPin from '../../design/prototype/assets/map-pin.svg';
import receipt from '../../design/prototype/assets/receipt.svg';
import utensils from '../../design/prototype/assets/utensils.svg';
import car from '../../design/prototype/assets/car.svg';
import offline from '../../design/prototype/assets/wifi-off.svg';
import help from '../../design/prototype/assets/circle-help.svg';
import alert from '../../design/prototype/assets/triangle-alert.svg';
import more from '../../design/prototype/assets/ellipsis.svg';
import close from '../../design/prototype/assets/x.svg';

const icons = { mountain, house, scale, activity, wallet, users, mapPin, receipt, utensils, car, offline, help, alert, more, close };
export type IconName = keyof typeof icons;

export function Icon({ name }: { name: IconName }) {
  return <img className="icon" src={icons[name]} alt="" aria-hidden="true" />;
}
