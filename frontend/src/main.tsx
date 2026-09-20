import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import UiPreferencesProvider from './preferences/UiPreferencesProvider';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UiPreferencesProvider>
      <HashRouter>
        <AppLayout />
      </HashRouter>
    </UiPreferencesProvider>
  </StrictMode>,
);
