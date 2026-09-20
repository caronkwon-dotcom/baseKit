export const BUTTON_DISPLAY_MODES = ['ICON_TEXT', 'ICON_ONLY'] as const;
export type ButtonDisplayMode = (typeof BUTTON_DISPLAY_MODES)[number];

export type SkinId = 'base' | 'green' | 'custom';
export type ThemeToken = typeof EDITABLE_THEME_TOKENS[number]['key'];
export type ThemeColors = Record<ThemeToken, string>;

export const EDITABLE_THEME_TOKENS = [
  { key: '--surface-app', label: '전체 배경' },
  { key: '--surface-panel', label: '패널 배경' },
  { key: '--text-primary', label: '기본 글자' },
  { key: '--border-default', label: '기본 테두리' },
  { key: '--brand-primary', label: '주 색상' },
] as const;

export const SKINS: Record<Exclude<SkinId, 'custom'>, ThemeColors> = {
  base: {
    '--surface-app': '#eef2f7', '--surface-panel': '#ffffff', '--text-primary': '#1d2433',
    '--border-default': '#d6deea', '--brand-primary': '#1f6feb',
  },
  green: {
    '--surface-app': '#edf4f0', '--surface-panel': '#ffffff', '--text-primary': '#173329',
    '--border-default': '#cdded6', '--brand-primary': '#16835b',
  },
};

export interface UiPreferences {
  skinId: SkinId;
  colors: ThemeColors;
  buttonDisplayMode: ButtonDisplayMode;
}

const STORAGE_KEY = 'basekit.ui-preferences.v1';
const LEGACY_THEME_STORAGE_KEY = 'basekit.theme-skin.v2';
const defaultPreferences: UiPreferences = {
  skinId: 'base',
  colors: SKINS.base,
  buttonDisplayMode: 'ICON_TEXT',
};
let cachedPreferences = defaultPreferences;
const listeners = new Set<(preferences: UiPreferences) => void>();

function clonePreferences(preferences: UiPreferences): UiPreferences {
  return { ...preferences, colors: { ...preferences.colors } };
}

function readStoredPreferences(): UiPreferences {
  if (typeof window === 'undefined') return clonePreferences(defaultPreferences);
  const saved = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  if (!saved) return clonePreferences(defaultPreferences);
  try {
    const parsed = JSON.parse(saved) as Partial<UiPreferences>;
    const skinId = parsed.skinId === 'green' || parsed.skinId === 'custom' ? parsed.skinId : 'base';
    const buttonDisplayMode = parsed.buttonDisplayMode === 'ICON_ONLY' ? 'ICON_ONLY' : 'ICON_TEXT';
    const colors = parsed.colors && typeof parsed.colors === 'object'
      ? { ...SKINS.base, ...parsed.colors }
      : SKINS[skinId === 'custom' ? 'base' : skinId];
    return { skinId, colors, buttonDisplayMode };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return clonePreferences(defaultPreferences);
  }
}

export function loadUiPreferences() {
  cachedPreferences = readStoredPreferences();
  return clonePreferences(cachedPreferences);
}

export function saveUiPreferences(nextPreferences: UiPreferences) {
  cachedPreferences = clonePreferences(nextPreferences);
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedPreferences));
  listeners.forEach((listener) => listener(clonePreferences(cachedPreferences)));
  return clonePreferences(cachedPreferences);
}

export function updateUiPreferences(patch: Partial<UiPreferences>) {
  return saveUiPreferences({ ...cachedPreferences, ...patch, colors: { ...cachedPreferences.colors, ...patch.colors } });
}

export function subscribeUiPreferences(listener: (preferences: UiPreferences) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
