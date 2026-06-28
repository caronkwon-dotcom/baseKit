import type { MdiTab, ProgramKey } from '../types/adminShell';

interface MdiTabsProps {
  tabs: MdiTab[];
  activeProgramKey: ProgramKey;
  onSelect: (programKey: ProgramKey) => void;
  onClose: (programKey: ProgramKey) => void;
}

export default function MdiTabs({
  tabs,
  activeProgramKey,
  onSelect,
  onClose,
}: MdiTabsProps) {
  return (
    <div className="mdi-tabs" role="tablist" aria-label="열린 프로그램">
      {tabs.map((tab) => {
        const isActive = tab.programKey === activeProgramKey;

        return (
          <div
            key={tab.programKey}
            className={isActive ? 'mdi-tab active' : 'mdi-tab'}
            role="tab"
            aria-selected={isActive}
          >
            <button type="button" onClick={() => onSelect(tab.programKey)}>
              {tab.title}
            </button>
            <button
              type="button"
              className="tab-close"
              aria-label={`${tab.title} 닫기`}
              onClick={() => onClose(tab.programKey)}
            >
              x
            </button>
          </div>
        );
      })}
    </div>
  );
}
