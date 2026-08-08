import { useEffect, useMemo, useRef, useState } from 'react';
import type { MdiTab, ProgramKey } from '../types/adminShell';

const MAX_VISIBLE_TABS = 10;

interface MdiTabsProps {
  tabs: MdiTab[];
  activeProgramKey: ProgramKey;
  onSelect: (programKey: ProgramKey) => void;
  onClose: (programKey: ProgramKey) => void;
  onCloseOthers: () => void;
  onCloseAll: () => void;
  onMove: (direction: -1 | 1) => void;
}

function HomeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 11 8-7 8 7v9h-6v-6h-4v6H4z" /></svg>;
}

export default function MdiTabs({ tabs, activeProgramKey, onSelect, onClose, onCloseOthers, onCloseAll, onMove }: MdiTabsProps) {
  const activeTabRef = useRef<HTMLDivElement>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [tabListOpen, setTabListOpen] = useState(false);
  const visibleTabs = useMemo(() => {
    if (tabs.length <= MAX_VISIBLE_TABS) return tabs;
    const initial = tabs.slice(0, MAX_VISIBLE_TABS);
    if (initial.some((tab) => tab.programKey === activeProgramKey)) return initial;
    return [...initial.slice(0, MAX_VISIBLE_TABS - 1), tabs.find((tab) => tab.programKey === activeProgramKey)!];
  }, [activeProgramKey, tabs]);
  const hiddenTabs = tabs.filter((tab) => !visibleTabs.some((visible) => visible.programKey === tab.programKey));

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeProgramKey]);

  return (
    <div className="mdi-bar">
      <div className="mdi-navigation" aria-label="탭 이동">
        <button type="button" aria-label="이전 탭" title="이전 탭" onClick={() => onMove(-1)}>‹</button>
        <button type="button" aria-label="다음 탭" title="다음 탭" onClick={() => onMove(1)}>›</button>
      </div>
      <div className="mdi-tabs" role="tablist" aria-label="열린 프로그램">
        {visibleTabs.map((tab) => {
          const isActive = tab.programKey === activeProgramKey;
          const isHome = tab.programKey === 'HOME';
          return (
            <div key={tab.programKey} ref={isActive ? activeTabRef : undefined} className={isActive ? 'mdi-tab active' : 'mdi-tab'} role="tab" aria-selected={isActive}>
              <button className={isHome ? 'home-tab-button' : 'tab-title-button'} type="button" title={tab.title} aria-label={isHome ? '홈' : tab.title} onClick={() => onSelect(tab.programKey)}>
                {isHome ? <HomeIcon /> : <span>{tab.title}</span>}
              </button>
              {!isHome && <button type="button" className="tab-close" aria-label={`${tab.title} 닫기`} title="닫기" onClick={() => onClose(tab.programKey)}>×</button>}
            </div>
          );
        })}
        {hiddenTabs.length > 0 && (
          <div className="mdi-overflow">
            <button type="button" className="mdi-overflow-trigger" aria-expanded={overflowOpen} onClick={() => setOverflowOpen((open) => !open)}>… +{hiddenTabs.length}</button>
            {overflowOpen && <div className="mdi-overflow-menu">{hiddenTabs.map((tab) => <button key={tab.programKey} type="button" title={tab.title} onClick={() => { onSelect(tab.programKey); setOverflowOpen(false); }}>{tab.title}</button>)}</div>}
          </div>
        )}
      </div>
      <div className="mdi-management">
        <button type="button" aria-label="열린 탭 목록" title="열린 탭 목록" aria-expanded={tabListOpen} onClick={() => setTabListOpen((open) => !open)}>☷</button>
        <button type="button" aria-label="현재 외 닫기" title="현재 외 닫기" onClick={onCloseOthers} disabled={activeProgramKey === 'HOME' && tabs.length === 1}>⊟</button>
        <button type="button" aria-label="전체 닫기" title="전체 닫기" onClick={onCloseAll} disabled={tabs.length === 1}>⊠</button>
        {tabListOpen && <div className="mdi-all-tabs-menu">{tabs.map((tab) => <button key={tab.programKey} type="button" title={tab.title} onClick={() => { onSelect(tab.programKey); setTabListOpen(false); }}>{tab.title}</button>)}</div>}
      </div>
    </div>
  );
}
