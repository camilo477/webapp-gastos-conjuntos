import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './app/styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el contenedor de la aplicación.');
root.dataset.build = __BUILD_ID__;
createRoot(root).render(<StrictMode><ErrorBoundary><BrowserRouter><App /></BrowserRouter></ErrorBoundary></StrictMode>);
