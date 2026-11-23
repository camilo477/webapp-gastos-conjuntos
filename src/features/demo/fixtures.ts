import type { MovementPresentation } from '../../components/MovementRow';

// Read-only display fixtures from Phase 1, never inputs to a real repository.
export const demoTrip = {
  title: 'Villa de Leyva',
  description: '21–24 noviembre · COP · 3 personas · Ejemplo',
  balance: '$20.000',
  available: '$150.000',
  budget: '$400.000',
  today: '$250.000',
  dailyContext: 'Cupo $100.000 · Exceso $150.000',
  people: [
    { name: 'Ana', initials: 'AN', balance: 'Recibe $20.000' },
    { name: 'Bruno', initials: 'BR', balance: 'Aporta $30.000' },
    { name: 'Carla', initials: 'CA', balance: 'Recibe $10.000' },
  ],
} as const;

export const demoMovements: readonly MovementPresentation[] = [
  { id: 'demo-payment', title: 'Bruno → Ana', detail: 'Abono de ejemplo · 14:25', amount: '$15.000', context: 'No suma al gasto', icon: 'scale' },
  { id: 'demo-food', title: 'Almuerzo en la plaza', detail: 'Ana pagó · 13:10', amount: '$96.000', context: '3 personas · ejemplo', icon: 'utensils' },
  { id: 'demo-market', title: 'Mercado para la casa', detail: 'Ana + Bruno pagaron · 11:45', amount: '$84.000', context: '3 personas · ejemplo', icon: 'receipt' },
  { id: 'demo-transport', title: 'Gasolina', detail: 'Carla pagó · 09:20', amount: '$70.000', context: '2 personas · ejemplo', icon: 'car' },
];
