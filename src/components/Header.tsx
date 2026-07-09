import type { ProgramMeta } from '../types/adminShell';

interface HeaderProps {
  activeProgram: ProgramMeta;
}
/**
 * 상단 헤더 영역
 *
 * 시스템 브랜드, 사용자 정보, 현재 활성 프로그램명을 표시한다.
 * activeProgram은 AppLayout에서 현재 선택된 programKey 기준으로 전달된다.
 * 추후 로그인 사용자 정보와 프로그램별 공통 액션 버튼으로 확장한다.
 */
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
