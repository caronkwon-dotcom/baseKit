import { useEffect, useRef } from 'react';
import type { MdiTab, ProgramKey } from '../types/adminShell';

interface MdiTabsProps {
  tabs: MdiTab[];
  activeProgramKey: ProgramKey;
  onSelect: (programKey: ProgramKey) => void;
  onClose: (programKey: ProgramKey) => void;
  onCloseOthers: () => void;
  onCloseAll: () => void;
  onMove: (direction: -1 | 1) => void;
}

export default function MdiTabs({
  tabs,
  activeProgramKey,
  onSelect,
  onClose,
  onCloseOthers,
  onCloseAll,
  onMove,
}: MdiTabsProps) {
  const activeTabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeProgramKey]);

  return (
    <div className="mdi-bar">
      <div className="mdi-navigation" aria-label="탭 이동">
        <button type="button" aria-label="이전 탭" onClick={() => onMove(-1)}>‹</button>
        <button type="button" aria-label="다음 탭" onClick={() => onMove(1)}>›</button>
      </div>
      <div className="mdi-tabs" role="tablist" aria-label="열린 프로그램">
        {tabs.map((tab) => {
          const isActive = tab.programKey === activeProgramKey;
          const isHome = tab.programKey === 'HOME';

          return (
            <div
              key={tab.programKey}
              ref={isActive ? activeTabRef : undefined}
              className={isActive ? 'mdi-tab active' : 'mdi-tab'}
              role="tab"
              aria-selected={isActive}
            >
              <button type="button" onClick={() => onSelect(tab.programKey)}>{tab.title}</button>
              {!isHome && (
                <button
                  type="button"
                  className="tab-close"
                  aria-label={`${tab.title} 닫기`}
                  onClick={() => onClose(tab.programKey)}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="mdi-management">
        <select
          aria-label="열린 탭 목록"
          value={activeProgramKey}
          onChange={(event) => onSelect(event.target.value as ProgramKey)}
        >
          {tabs.map((tab) => <option key={tab.programKey} value={tab.programKey}>{tab.title}</option>)}
        </select>
        <button type="button" onClick={onCloseOthers} disabled={activeProgramKey === 'HOME' && tabs.length === 1}>현재 외 닫기</button>
        <button type="button" onClick={onCloseAll} disabled={tabs.length === 1}>전체 닫기</button>
      </div>
    </div>
  );
}
