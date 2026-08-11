import { useEffect, useState } from 'react';

type ThemeColors = Record<ThemeToken, string>;
type ThemeToken = typeof editableTokens[number]['key'];

const editableTokens = [
  { key: '--surface-app', label: '전체 배경' },
  { key: '--surface-panel', label: '패널 배경' },
  { key: '--text-primary', label: '기본 글자' },
  { key: '--border-default', label: '기본 테두리' },
  { key: '--brand-primary', label: '주 색상' },
] as const;

const skins: Record<'base' | 'green', ThemeColors> = {
  base: {
    '--surface-app': '#eef2f7', '--surface-panel': '#ffffff', '--text-primary': '#1d2433',
    '--border-default': '#d6deea', '--brand-primary': '#1f6feb',
  },
  green: {
    '--surface-app': '#edf4f0', '--surface-panel': '#ffffff', '--text-primary': '#173329',
    '--border-default': '#cdded6', '--brand-primary': '#16835b',
  },
};

const storageKey = 'basekit.theme-skin.v2';

function applyColors(colors: ThemeColors) {
  editableTokens.forEach(({ key }) => document.documentElement.style.setProperty(key, colors[key]));
}

function getInitialTheme(): { skinId: 'base' | 'green' | 'custom'; colors: ThemeColors } {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return { skinId: 'base', colors: skins.base };
  try {
    return JSON.parse(saved) as { skinId: 'base' | 'green' | 'custom'; colors: ThemeColors };
  } catch {
    localStorage.removeItem(storageKey);
    return { skinId: 'base', colors: skins.base };
  }
}

export default function ThemeSkinPicker() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const { skinId, colors } = theme;

  useEffect(() => {
    applyColors(colors);
  }, [colors]);

  const selectSkin = (nextSkinId: 'base' | 'green') => {
    const nextColors = skins[nextSkinId];
    setTheme({ skinId: nextSkinId, colors: nextColors });
    localStorage.setItem(storageKey, JSON.stringify({ skinId: nextSkinId, colors: nextColors }));
  };

  const changeColor = (key: ThemeToken, value: string) => {
    const nextColors = { ...colors, [key]: value };
    setTheme({ skinId: 'custom', colors: nextColors });
    localStorage.setItem(storageKey, JSON.stringify({ skinId: 'custom', colors: nextColors }));
  };

  const createCustomSkin = () => {
    setTheme({ skinId: 'custom', colors });
    localStorage.setItem(storageKey, JSON.stringify({ skinId: 'custom', colors }));
  };

  return (
    <div className="theme-skin-area">
      <button type="button" className="shell-icon-button theme-button" aria-label="화면 스킨 변경" title="화면 스킨 변경" aria-expanded={open} onClick={() => setOpen((value) => !value)}><i aria-hidden="true" />스킨</button>
      {open && (
        <section className="theme-skin-popover" aria-label="개인화 스킨 설정">
          <header><strong>화면 스킨</strong><span>개인화 1단계</span></header>
          <div className="theme-preset-list">
            <button type="button" className={skinId === 'base' ? 'active' : ''} onClick={() => selectSkin('base')}><i className="skin-swatch base" />블루(기본)</button>
            <button type="button" className={skinId === 'green' ? 'active' : ''} onClick={() => selectSkin('green')}><i className="skin-swatch green" />그린</button>
          </div>
          {skinId !== 'custom' ? (
            <div className="theme-custom-start">
              <p>선택한 스킨을 기준으로 나만의 색상을 만들 수 있습니다.</p>
              <button type="button" onClick={createCustomSkin}>현재 스킨 복사하여 개인화 만들기</button>
            </div>
          ) : (
            <>
              <p className="theme-custom-status">개인화 편집 중 · 변경 즉시 저장</p>
              <div className="theme-color-grid">
                {editableTokens.map(({ key, label }) => (
                  <label key={key}><span>{label}</span><input type="color" value={colors[key]} aria-label={`${label} 색상`} onChange={(event) => changeColor(key, event.target.value)} /><code>{colors[key]}</code></label>
                ))}
              </div>
            </>
          )}
          <button type="button" className="theme-reset-button" onClick={() => selectSkin('base')}>기본 스킨으로 초기화</button>
        </section>
      )}
    </div>
  );
}
