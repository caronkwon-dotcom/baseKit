import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import MdiTabs from '../components/MdiTabs';
import Sidebar from '../components/Sidebar';
import Workspace from '../components/Workspace';
import { programComponents } from '../config/programRegistry';
import { metadataRepository, programByKey } from '../repositories/metadataRepository';
import type { MdiTab, MenuNode, ProgramKey } from '../types/adminShell';

const homeTab: MdiTab = { programKey: 'HOME', title: programByKey.HOME.programName };

function findTopMenuKeyByProgram(menuTree: MenuNode[], programKey: ProgramKey) {
  const containsProgram = (menu: MenuNode): boolean =>
    menu.programKey === programKey || menu.children.some(containsProgram);
  return menuTree.find(containsProgram)?.menuKey;
}

export default function AppLayout() {
  const menuTree = useMemo(() => metadataRepository.getMenuTree(), []);
  const [activeTopMenuKey, setActiveTopMenuKey] = useState(menuTree[0]?.menuKey ?? '');
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('basekit.navigation.sidebar-pinned') === 'Y');
  const [floatingMenuOpen, setFloatingMenuOpen] = useState(false);
  const [expandedMenuKeys, setExpandedMenuKeys] = useState<string[]>(() =>
    menuTree.flatMap((menu) => menu.children.filter((child) => child.menuType === 'GROUP').map((child) => child.menuKey)),
  );
  const [tabs, setTabs] = useState<MdiTab[]>([homeTab]);
  const [activeProgramKey, setActiveProgramKey] = useState<ProgramKey>('HOME');
  const activeTopMenu = menuTree.find((menu) => menu.menuKey === activeTopMenuKey) ?? menuTree[0];

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setFloatingMenuOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const pinSidebar = () => { setSidebarOpen(true); setFloatingMenuOpen(false); localStorage.setItem('basekit.navigation.sidebar-pinned', 'Y'); };
  const unpinSidebar = () => { setSidebarOpen(false); localStorage.setItem('basekit.navigation.sidebar-pinned', 'N'); };
  const selectTopMenu = (menuKey: string) => {
    const sameMenu = menuKey === activeTopMenuKey;
    setActiveTopMenuKey(menuKey);
    if (!sidebarOpen) setFloatingMenuOpen(sameMenu ? !floatingMenuOpen : true);
  };

  const activateProgram = (programKey: ProgramKey) => {
    setActiveProgramKey(programKey);
    const topMenuKey = findTopMenuKeyByProgram(menuTree, programKey);
    if (topMenuKey) setActiveTopMenuKey(topMenuKey);
  };

  const openProgram = (programKey: ProgramKey) => {
    const program = programByKey[programKey];
    setTabs((currentTabs) => currentTabs.some((tab) => tab.programKey === programKey)
      ? currentTabs : [...currentTabs, { programKey, title: program.programName }]);
    activateProgram(programKey);
    setFloatingMenuOpen(false);
  };

  const closeProgram = (programKey: ProgramKey) => {
    if (programKey === 'HOME') return;
    setTabs((currentTabs) => {
      const closeIndex = currentTabs.findIndex((tab) => tab.programKey === programKey);
      const nextTabs = currentTabs.filter((tab) => tab.programKey !== programKey);
      if (programKey === activeProgramKey) {
        activateProgram((nextTabs[Math.max(0, closeIndex - 1)] ?? homeTab).programKey);
      }
      return nextTabs;
    });
  };

  const closeOthers = () => {
    setTabs((currentTabs) => activeProgramKey === 'HOME'
      ? [homeTab] : [homeTab, ...currentTabs.filter((tab) => tab.programKey === activeProgramKey)]);
  };

  const closeAll = () => {
    setTabs([homeTab]);
    setActiveProgramKey('HOME');
  };

  const moveTab = (direction: -1 | 1) => {
    const currentIndex = tabs.findIndex((tab) => tab.programKey === activeProgramKey);
    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
    activateProgram(tabs[nextIndex].programKey);
  };

  return (
    <div className="app-shell">
      <Header topMenus={menuTree} activeTopMenuKey={activeTopMenuKey}
        sidebarOpen={sidebarOpen} onSelectTopMenu={selectTopMenu}
        onToggleSidebar={() => sidebarOpen ? unpinSidebar() : pinSidebar()}
        onOpenProgram={openProgram} notificationCount={3} />
      {floatingMenuOpen && activeTopMenu ? <><button type="button" className="floating-navigation-backdrop" aria-label="플로팅 메뉴 닫기" onClick={() => setFloatingMenuOpen(false)} /><Sidebar menu={activeTopMenu} variant="floating" expandedMenuKeys={expandedMenuKeys} activeProgramKey={activeProgramKey} onToggleMenu={(menuKey) => setExpandedMenuKeys((keys) => keys.includes(menuKey) ? keys.filter((key) => key !== menuKey) : [...keys, menuKey])} onOpenProgram={openProgram} onPin={pinSidebar} onClose={() => setFloatingMenuOpen(false)} /></> : null}
      <div className="app-body">
        {sidebarOpen && activeTopMenu && (
          <Sidebar menu={activeTopMenu} expandedMenuKeys={expandedMenuKeys}
            activeProgramKey={activeProgramKey}
            onToggleMenu={(menuKey) => setExpandedMenuKeys((keys) =>
              keys.includes(menuKey) ? keys.filter((key) => key !== menuKey) : [...keys, menuKey])}
            onOpenProgram={openProgram} onUnpin={unpinSidebar} />
        )}
        <section className="app-main" aria-label="작업 영역">
          <MdiTabs tabs={tabs} activeProgramKey={activeProgramKey}
            onSelect={activateProgram} onClose={closeProgram}
            onCloseOthers={closeOthers} onCloseAll={closeAll} onMove={moveTab} />
          <Workspace activeProgramKey={activeProgramKey} programComponents={programComponents} />
        </section>
      </div>
    </div>
  );
}
