import { useContext } from 'react';
import { UiPreferencesContext } from './UiPreferencesContext';

export function useUiPreferences() {
  const context = useContext(UiPreferencesContext);
  if (!context) throw new Error('useUiPreferences must be used within UiPreferencesProvider');
  return context;
}
