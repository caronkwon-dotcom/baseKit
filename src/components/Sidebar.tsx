import type { MenuNode, ProgramKey } from '../types/adminShell';

/**
 * 좌측 메뉴 영역
 *
 * AppLayout에서 생성한 메뉴 트리를 받아 Sidebar에 표시한다.
 * SCREEN 메뉴 클릭 시 programKey를 AppLayout으로 전달하여
 * MDI 탭 열기와 Workspace 화면 전환이 일어나도록 한다.
 */
interface SidebarProps {
  menus: MenuNode[];
  activeProgramKey: ProgramKey;
  onOpenProgram: (programKey: ProgramKey) => void;
}

export default function Sidebar({
  menus,
  activeProgramKey,
  onOpenProgram,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav" aria-label="주 메뉴">
        {menus.map((menu) => (
          <section key={menu.menuKey}>
            <h2>{menu.menuName}</h2>
            <ul>
              {menu.children.map((childMenu) => {
                const isActive =
                  childMenu.programKey !== null &&
                  childMenu.programKey === activeProgramKey;

                return (
                  <li key={childMenu.menuKey}>
                    <button
                      type="button"
                      className={isActive ? 'nav-link active' : 'nav-link'}
                      onClick={() => {
                        if (childMenu.programKey) {
                          onOpenProgram(childMenu.programKey);
                        }
                      }}
                    >
                      <span className="menu-depth-mark" aria-hidden="true">
                        -
                      </span>
                      {childMenu.menuName}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>
    </aside>
  );
}
