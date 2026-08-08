import type { MenuNode } from '../types/adminShell';

interface HeaderProps {
  topMenus: MenuNode[];
  activeTopMenuKey: string;
  sidebarOpen: boolean;
  onSelectTopMenu: (menuKey: string) => void;
  onToggleSidebar: () => void;
}

/** Compact shell header: brand, sidebar control, 1Depth navigation and user area. */
export default function Header({
  topMenus,
  activeTopMenuKey,
  sidebarOpen,
  onSelectTopMenu,
  onToggleSidebar,
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <span className="brand-mark">B</span>
        <strong>BaseKit</strong>
      </div>

      <button
        type="button"
        className="shell-icon-button"
        aria-label={sidebarOpen ? '사이드바 닫기' : '사이드바 열기'}
        aria-expanded={sidebarOpen}
        onClick={onToggleSidebar}
      >
        ☰
      </button>

      <nav className="top-navigation" aria-label="업무 영역">
        {topMenus.map((menu) => (
          <button
            key={menu.menuKey}
            type="button"
            className={
              menu.menuKey === activeTopMenuKey
                ? 'top-menu-button active'
                : 'top-menu-button'
            }
            onClick={() => onSelectTopMenu(menu.menuKey)}
          >
            {menu.menuName}
          </button>
        ))}
      </nav>

      <div className="user-area">
        <span>PM 검수</span>
        <strong>admin</strong>
      </div>
    </header>
  );
}
