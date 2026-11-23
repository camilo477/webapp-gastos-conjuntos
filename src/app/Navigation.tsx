import { NavLink } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';

const primary: readonly [string, string, IconName][] = [['/', 'Inicio', 'house'], ['/balance', 'Balance', 'scale'], ['/actividad', 'Actividad', 'activity']];
const secondary: readonly [string, string, IconName][] = [['/presupuesto', 'Presupuesto', 'wallet'], ['/personas', 'Personas', 'users'], ['/viajes', 'Mis viajes', 'mapPin']];

export function Navigation({ mobile = false, secondaryOnly = false, onNavigate }: { mobile?: boolean; secondaryOnly?: boolean; onNavigate?: () => void }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobile || !ref.current) return;
    const element = ref.current;
    const measure = () => document.documentElement.style.setProperty('--nav-height', `${element.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--nav-height'); };
  }, [mobile]);
  const items = secondaryOnly ? secondary : mobile ? primary : [...primary, ...secondary];
  return <nav ref={ref} className={mobile ? 'bottom-nav' : 'navigation'} aria-label={secondaryOnly ? 'Más destinos' : mobile ? 'Navegación principal móvil' : 'Navegación principal'}>{items.map(([to, label, icon]) => <NavLink className="nav-link" to={to} end key={to} onClick={onNavigate}><Icon name={icon} />{label}</NavLink>)}</nav>;
}
