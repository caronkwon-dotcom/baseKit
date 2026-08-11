import type { MenuNode, ProgramKey } from '../types/adminShell';

interface SidebarProps {
  menu: MenuNode;
  expandedMenuKeys: string[];
  activeProgramKey: ProgramKey;
  onToggleMenu: (menuKey: string) => void;
  onOpenProgram: (programKey: ProgramKey) => void;
  variant?: 'sidebar' | 'floating';
  onPin?: () => void;
  onUnpin?: () => void;
  onClose?: () => void;
}

function ScreenMenu({
  menu,
  activeProgramKey,
  depth,
  onOpenProgram,
}: {
  menu: MenuNode;
  activeProgramKey: ProgramKey;
  depth: 2 | 3;
  onOpenProgram: (programKey: ProgramKey) => void;
}) {
  const isActive = menu.programKey === activeProgramKey;

  return (
    <button
      type="button"
      className={isActive ? `nav-link depth-${depth} active` : `nav-link depth-${depth}`}
      onClick={() => menu.programKey && onOpenProgram(menu.programKey)}
    >
      <span className="menu-depth-mark" aria-hidden="true">•</span>
      <span className="menu-label" title={menu.menuName}>{menu.menuName}</span>
    </button>
  );
}

/** Selected 1Depth menu's 2Depth groups/screens and 3Depth screens. */
export default function Sidebar({
  menu,
  expandedMenuKeys,
  activeProgramKey,
  onToggleMenu,
  onOpenProgram,
  variant = 'sidebar',
  onPin,
  onUnpin,
  onClose,
}: SidebarProps) {
  return (
    <aside className={variant === 'floating' ? 'floating-navigation' : 'sidebar'}>
      <div className="sidebar-heading"><span>{menu.menuName}</span><div className="navigation-heading-actions">{variant === 'floating' ? <><button type="button" title="사이드바 고정" aria-label="사이드바 고정" onClick={onPin}>⌖</button><button type="button" title="메뉴 닫기" aria-label="메뉴 닫기" onClick={onClose}>×</button></> : <button type="button" title="사이드바 고정 해제" aria-label="사이드바 고정 해제" onClick={onUnpin}>«</button>}</div></div>
      <nav className="sidebar-nav" aria-label={`${menu.menuName} 하위 메뉴`}>
        <ul>
          {menu.children.map((secondDepth) => {
            if (secondDepth.menuType === 'SCREEN') {
              return (
                <li key={secondDepth.menuKey}>
                  <ScreenMenu
                    menu={secondDepth}
                    depth={2}
                    activeProgramKey={activeProgramKey}
                    onOpenProgram={onOpenProgram}
                  />
                </li>
              );
            }

            const isExpanded = expandedMenuKeys.includes(secondDepth.menuKey);
            return (
              <li key={secondDepth.menuKey} className="nav-group">
                <button
                  type="button"
                  className="nav-group-toggle"
                  aria-expanded={isExpanded}
                  onClick={() => onToggleMenu(secondDepth.menuKey)}
                >
                  <span className="menu-label" title={secondDepth.menuName}>{secondDepth.menuName}</span>
                  <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
                </button>
                {isExpanded && (
                  <ul>
                    {secondDepth.children.map((thirdDepth) => (
                      <li key={thirdDepth.menuKey}>
                        <ScreenMenu
                          menu={thirdDepth}
                          depth={3}
                          activeProgramKey={activeProgramKey}
                          onOpenProgram={onOpenProgram}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
