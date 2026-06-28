import type { ProgramMeta } from '../types/adminShell';

interface HeaderProps {
  activeProgram: ProgramMeta;
}

export default function Header({ activeProgram }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-primary">
        <div className="header-brand">
          <span className="brand-mark">B</span>
          <div>
            <strong>BaseKit</strong>
            <span>Admin Shell</span>
          </div>
        </div>
        <div className="user-area">
          <span>PM 검수 환경</span>
          <strong>admin</strong>
        </div>
      </div>

      <div className="header-secondary">
        <div>
          <span className="location-label">현재 위치</span>
          <strong>{activeProgram.programName}</strong>
        </div>
        <div className="header-actions">
          <button type="button" className="ghost-button">
            매뉴얼
          </button>
          <button type="button" className="primary-button">
            공통 액션
          </button>
        </div>
      </div>
    </header>
  );
}
