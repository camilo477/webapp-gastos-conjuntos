import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { FirebaseClient } from '../../repositories/firebase/client';
import type { TripRecord } from '../../repositories/access/contracts';
import { loginOrganizer } from '../../repositories/access/auth';
import { listMembers } from '../../repositories/access/trips';
import { sessionContext } from './session';
import type { SessionUser } from './session';
import { AuthPage } from './AuthPage';
import { PeoplePage } from './PeoplePage';
import { TripFormPage } from './TripFormPage';

vi.mock('../../repositories/access/auth', () => ({ loginOrganizer: vi.fn(), registerOrganizer: vi.fn(), resetPassword: vi.fn() }));
vi.mock('../../repositories/access/trips', () => ({ listMembers: vi.fn(), revokeMember: vi.fn(), createTrip: vi.fn(), editTripMetadata: vi.fn() }));
const owner: SessionUser = { uid: 'owner', email: 'synthetic@example.invalid', displayName: 'Titular', emailVerified: true, isAnonymous: false };
const client = {} as FirebaseClient;
const trip = { id: 'synthetic-trip', ownerId: owner.uid, activeUids: [owner.uid], membershipVersion: 0 } as TripRecord;
function show(element: React.ReactNode, user: SessionUser | null = null) {
  return render(<MemoryRouter><sessionContext.Provider value={{ client, user }}>{element}</sessionContext.Provider></MemoryRouter>);
}
beforeEach(() => vi.resetAllMocks());
describe('Access page feedback', () => {
  it('shows safe Firebase login errors without reflecting raw server content', async () => {
    vi.mocked(loginOrganizer).mockRejectedValue({ code: 'auth/invalid-credential', message: 'sensitive-server-detail' });
    show(<AuthPage mode="login" />); const user = userEvent.setup();
    await user.type(screen.getByLabelText('Correo electrónico'),'synthetic@example.invalid');
    await user.type(screen.getByLabelText('Contraseña'),'Synthetic-test-984!');
    await user.click(screen.getByRole('button',{ name: 'Iniciar sesión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
    expect(screen.queryByText('sensitive-server-detail')).not.toBeInTheDocument();
  });
  it('does not offer trip creation to an anonymous identity', () => {
    show(<TripFormPage />,{ ...owner, isAnonymous: true, email: null, emailVerified: false });
    expect(screen.getByText(/Se requiere la cuenta verificada/)).toBeVisible();
    expect(screen.queryByRole('button',{ name: 'Crear viaje' })).not.toBeInTheDocument();
  });
  it('recovers from a failed members request through explicit retry', async () => {
    vi.mocked(listMembers).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    show(<PeoplePage trip={trip} />,owner);
    expect(await screen.findByText('No se pudieron consultar los participantes')).toBeVisible();
    await userEvent.setup().click(screen.getByRole('button',{ name: 'Reintentar consulta' }));
    expect(await screen.findByText('Identidad histórica protegida')).toBeVisible();
    expect(screen.queryByText('No se pudieron consultar los participantes')).not.toBeInTheDocument();
  });
});
