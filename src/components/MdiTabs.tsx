import type { MdiTab, ProgramKey } from '../types/adminShell';
/**
 * MDI 탭 영역
 *
 * 현재 열린 프로그램 탭 목록을 표시한다.
 * 탭 선택과 닫기 이벤트는 AppLayout으로 전달하여
 * 활성 프로그램 변경 및 탭 목록 갱신을 처리한다.
 */
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
