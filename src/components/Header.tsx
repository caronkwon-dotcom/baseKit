import { useMemo, useState } from 'react';
import type { MenuNode, ProgramKey } from '../types/adminShell';
import ThemeSkinPicker from './ThemeSkinPicker';

interface HeaderProps {
  topMenus: MenuNode[];
  activeTopMenuKey: string;
  sidebarOpen: boolean;
  onSelectTopMenu: (menuKey: string) => void;
  onToggleSidebar: () => void;
  onOpenProgram: (programKey: ProgramKey) => void;
  notificationCount?: number;
}

interface MenuSearchItem { programKey: ProgramKey; menuName: string; path: string; }

function getSearchItems(menus: MenuNode[]): MenuSearchItem[] {
  const result: MenuSearchItem[] = [];
  const visit = (menu: MenuNode, parents: string[]) => {
    const path = [...parents, menu.menuName];
    if (menu.menuType === 'SCREEN' && menu.programKey) result.push({ programKey: menu.programKey, menuName: menu.menuName, path: path.join(' > ') });
    menu.children.forEach((child) => visit(child, path));
  };
  menus.forEach((menu) => visit(menu, []));
  return result;
}

export default function Header({ topMenus, activeTopMenuKey, sidebarOpen, onSelectTopMenu, onToggleSidebar, onOpenProgram, notificationCount = 0 }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const searchItems = useMemo(() => getSearchItems(topMenus), [topMenus]);
  const normalizedKeyword = keyword.trim().toLocaleLowerCase();
  const results = searchItems.filter((item) => !normalizedKeyword || item.path.toLocaleLowerCase().includes(normalizedKeyword)).slice(0, 8);

  return (
    <header className="app-header">
      <div className="header-brand"><span className="brand-mark">B</span><strong>BaseKit</strong></div>
      <button type="button" className="shell-icon-button" aria-label={sidebarOpen ? '사이드바 닫기' : '사이드바 열기'} aria-expanded={sidebarOpen} onClick={onToggleSidebar}>☰</button>
      <nav className="top-navigation" aria-label="업무 영역">
        {topMenus.map((menu) => <button key={menu.menuKey} type="button" className={menu.menuKey === activeTopMenuKey ? 'top-menu-button active' : 'top-menu-button'} onClick={() => onSelectTopMenu(menu.menuKey)}>{menu.menuName}</button>)}
      </nav>
      <div className="menu-search-area">
        <button type="button" className="shell-icon-button" aria-label="메뉴 검색" title="메뉴 검색" aria-expanded={searchOpen} onClick={() => setSearchOpen((open) => !open)}>⌕</button>
        {searchOpen && (
          <div className="menu-search-popover">
            <input autoFocus type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="메뉴 검색" aria-label="메뉴 검색어" />
            <div className="menu-search-results">
              {results.map((item) => <button key={item.programKey} type="button" onClick={() => { onOpenProgram(item.programKey); setSearchOpen(false); setKeyword(''); }}><strong>{item.menuName}</strong><span>{item.path}</span></button>)}
              {results.length === 0 && <p>일치하는 메뉴가 없습니다.</p>}
            </div>
          </div>
        )}
      </div>
      <ThemeSkinPicker />
      <button type="button" className="notification-button" aria-label={`알림 ${notificationCount}건`} title={`알림 ${notificationCount}건`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        {notificationCount > 0 ? <span>{notificationCount > 99 ? '99+' : notificationCount}</span> : null}
      </button>
      <div className="user-area"><span>PM 검수</span><strong>admin</strong></div>
    </header>
  );
}
