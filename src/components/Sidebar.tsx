import type { MenuNode, ProgramKey } from '../types/adminShell';

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
