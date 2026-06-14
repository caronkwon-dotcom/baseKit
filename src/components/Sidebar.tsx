import { NavLink } from 'react-router-dom';

const systemMenus = [
  { label: '사용자관리', path: '/system/users' },
  { label: '권한관리', path: '/system/roles' },
  { label: '메뉴관리', path: '/system/menus' },
  { label: '공통코드관리', path: '/system/codes' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink to="/" className="brand">
        BaseKit
      </NavLink>

      <nav className="sidebar-nav" aria-label="주 메뉴">
        <section>
          <h2>시스템관리</h2>
          <ul>
            {systemMenus.map((menu) => (
              <li key={menu.path}>
                <NavLink
                  to={menu.path}
                  className={({ isActive }) =>
                    isActive ? 'nav-link active' : 'nav-link'
                  }
                >
                  {menu.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </section>
      </nav>
    </aside>
  );
}
