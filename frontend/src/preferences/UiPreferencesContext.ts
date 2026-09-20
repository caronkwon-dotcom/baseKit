import { createContext } from 'react';
import type { UiPreferences } from './uiPreferences';

export interface UiPreferencesContextValue {
  preferences: UiPreferences;
  updatePreferences: (patch: Partial<UiPreferences>) => void;
}

export const UiPreferencesContext = createContext<UiPreferencesContextValue | null>(null);
