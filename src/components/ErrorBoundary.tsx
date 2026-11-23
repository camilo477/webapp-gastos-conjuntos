import { Component } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main id="main"><h1>No pudimos abrir esta pantalla</h1><p role="alert">La interfaz encontró un error. Puedes recargar la demostración.</p><Button onClick={() => window.location.reload()}>Recargar aplicación</Button></main>;
    return this.props.children;
  }
}
