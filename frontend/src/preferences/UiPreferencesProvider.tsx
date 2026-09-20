import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  loadUiPreferences, saveUiPreferences, subscribeUiPreferences, type UiPreferences,
} from './uiPreferences';
import { UiPreferencesContext } from './UiPreferencesContext';

export default function UiPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(loadUiPreferences);

  useEffect(() => subscribeUiPreferences(setPreferences), []);

  const value = useMemo(() => ({
    preferences,
    updatePreferences: (patch: Partial<UiPreferences>) => setPreferences(saveUiPreferences({
      ...preferences,
      ...patch,
      colors: { ...preferences.colors, ...patch.colors },
    })),
  }), [preferences]);

  return <UiPreferencesContext.Provider value={value}>{children}</UiPreferencesContext.Provider>;
}
