import { useEffect, useState } from 'react';
import { BUTTON_DISPLAY_MODES, EDITABLE_THEME_TOKENS, SKINS, type ButtonDisplayMode, type ThemeToken } from '../preferences/uiPreferences';
import { useUiPreferences } from '../preferences/useUiPreferences';

function applyColors(colors: Record<ThemeToken, string>) {
  EDITABLE_THEME_TOKENS.forEach(({ key }) => document.documentElement.style.setProperty(key, colors[key]));
}

const buttonModeLabels: Record<ButtonDisplayMode, string> = {
  ICON_TEXT: '아이콘 + 텍스트',
  ICON_ONLY: '아이콘만',
};

export default function ThemeSkinPicker() {
  const [open, setOpen] = useState(false);
  const { preferences, updatePreferences } = useUiPreferences();
  const { skinId, colors, buttonDisplayMode } = preferences;

  useEffect(() => {
    applyColors(colors);
  }, [colors]);

  const selectSkin = (nextSkinId: 'base' | 'green') => {
    updatePreferences({ skinId: nextSkinId, colors: SKINS[nextSkinId] });
  };

  const changeColor = (key: ThemeToken, value: string) => {
    updatePreferences({ skinId: 'custom', colors: { ...colors, [key]: value } });
  };

  const createCustomSkin = () => updatePreferences({ skinId: 'custom' });

  return (
    <div className="theme-skin-area">
      <button type="button" className="shell-icon-button theme-button" aria-label="화면 스킨 변경" title="화면 스킨 변경" aria-expanded={open} onClick={() => setOpen((value) => !value)}><i aria-hidden="true" />스킨</button>
      {open && (
        <section className="theme-skin-popover" aria-label="화면 개인화 설정">
          <header><strong>화면 개인화</strong><span>개인화 설정</span></header>
          <fieldset className="theme-preference-fieldset">
            <legend>버튼 표시</legend>
            {BUTTON_DISPLAY_MODES.map((mode) => (
              <label key={mode}>
                <input type="radio" name="buttonDisplayMode" value={mode} checked={buttonDisplayMode === mode} onChange={() => updatePreferences({ buttonDisplayMode: mode })} />
                {buttonModeLabels[mode]}
              </label>
            ))}
          </fieldset>
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
                {EDITABLE_THEME_TOKENS.map(({ key, label }) => (
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
