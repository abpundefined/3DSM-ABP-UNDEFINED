import '@fontsource-variable/figtree';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import AuthProvider from './providers/AuthProvider';
import './index.css';
import './theme.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('O elemento de entrada do React não foi encontrado.');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
