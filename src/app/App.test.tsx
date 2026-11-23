import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: () => ({ offlineReady: [false, vi.fn()], needRefresh: [false, vi.fn()], updateServiceWorker: vi.fn() }) }));

describe('React demo shell', () => {
  it('starts with clearly labelled fixtures and disabled financial writes', () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByText(/Fase 2 · datos ficticios/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Villa de Leyva', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Almuerzo en la plaza')).toBeInTheDocument();
  });
  it('navigates between available screens and exposes absent Firebase config', async () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    await userEvent.click(screen.getAllByRole('link', { name: 'Balance' })[0]!);
    expect(screen.getByRole('heading', { name: 'Balance', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar abono' })).toBeDisabled();
    await userEvent.click(screen.getAllByRole('link', { name: 'Actividad' })[0]!);
    expect(screen.getByText('Firebase sin configurar')).toBeInTheDocument();
    expect(document.getElementById('main')).toHaveFocus();
  });
  it('changes and persists only the visual theme', async () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Tema' }), 'dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('gastos.theme')).toBe('dark');
  });
  it('uses an honest offline message instead of claiming synchronization', () => {
    render(<MemoryRouter initialEntries={['/actividad']}><App /></MemoryRouter>);
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    fireEvent(window, new Event('offline'));
    expect(screen.getByText(/Puedes recorrer la interfaz si se descargó antes/)).toBeInTheDocument();
    online.mockRestore();
  });
  it('renders a recoverable unknown route', () => {
    render(<MemoryRouter initialEntries={['/missing']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a Inicio' })).toHaveAttribute('href', '/');
  });
});
