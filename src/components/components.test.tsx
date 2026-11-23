import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { Field } from './Field';
import { Dialog } from './Dialog';
import { MovementRow } from './MovementRow';
import { ErrorBoundary } from './ErrorBoundary';
import { loadTheme, saveTheme } from '../app/theme';

describe('accessible component behavior', () => {
  it('does not invoke a disabled future action', async () => {
    const click = vi.fn(); render(<Button disabled onClick={click}>Guardar gasto</Button>);
    await userEvent.click(screen.getByRole('button')); expect(click).not.toHaveBeenCalled();
  });
  it('associates label, error and invalid state with the field', () => {
    render(<Field label="Concepto" error="Escribe un concepto" />);
    expect(screen.getByLabelText('Concepto')).toBeInvalid();
    expect(screen.getByLabelText('Concepto')).toHaveAccessibleDescription('Escribe un concepto');
  });
  it('renders arbitrary movement strings as text without cutting the amount', () => {
    render(<MovementRow movement={{ id: 'demo', title: '<script>example</script>', detail: 'Ejemplo', amount: '$999.999.999.999', context: 'Sin cálculos', icon: 'receipt' }} />);
    expect(screen.getByText('<script>example</script>')).toBeInTheDocument();
    expect(screen.getByText('$999.999.999.999')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
  it('opens a labelled dialog and handles cancel', () => {
    const onClose = vi.fn(); render(<Dialog open title="Opciones" onClose={onClose}>Contenido</Dialog>);
    const dialog = screen.getByRole('dialog', { name: 'Opciones' });
    dialog.dispatchEvent(new Event('cancel', { cancelable: true })); expect(onClose).toHaveBeenCalledOnce();
  });
  it('shows a recovery action after a rendering error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function Failure(): never { throw new Error('synthetic failure'); }
    render(<ErrorBoundary><Failure /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('La interfaz encontró un error');
    expect(screen.getByRole('button', { name: 'Recargar aplicación' })).toBeInTheDocument();
  });
  it('tolerates blocked local storage without breaking the UI', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(loadTheme()).toBe('system'); expect(saveTheme('dark')).toBe(false);
  });
});
