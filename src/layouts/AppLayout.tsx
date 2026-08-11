import { useMemo, useState } from 'react';
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenuKeys, setExpandedMenuKeys] = useState<string[]>(() =>
    menuTree.flatMap((menu) => menu.children.filter((child) => child.menuType === 'GROUP').map((child) => child.menuKey)),
  );
  const [tabs, setTabs] = useState<MdiTab[]>([homeTab]);
  const [activeProgramKey, setActiveProgramKey] = useState<ProgramKey>('HOME');
  const activeTopMenu = menuTree.find((menu) => menu.menuKey === activeTopMenuKey) ?? menuTree[0];

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
    setSidebarOpen(false);
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
        sidebarOpen={sidebarOpen} onSelectTopMenu={setActiveTopMenuKey}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onOpenProgram={openProgram} />
      <div className="app-body">
        {sidebarOpen && activeTopMenu && (
          <Sidebar menu={activeTopMenu} expandedMenuKeys={expandedMenuKeys}
            activeProgramKey={activeProgramKey}
            onToggleMenu={(menuKey) => setExpandedMenuKeys((keys) =>
              keys.includes(menuKey) ? keys.filter((key) => key !== menuKey) : [...keys, menuKey])}
            onOpenProgram={openProgram} />
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
