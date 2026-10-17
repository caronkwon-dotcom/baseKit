import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import RootLayout from './layouts/standalone/RootLayout';
import UiPreferencesProvider from './preferences/UiPreferencesProvider';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UiPreferencesProvider>
      <HashRouter>
        <RootLayout />
      </HashRouter>
    </UiPreferencesProvider>
  </StrictMode>,
);
