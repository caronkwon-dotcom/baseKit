import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { listMenuExecutionSettings, type MenuExecutionSetting } from '../services/menuExecutionApi';
import { launchStandaloneWindow, resolveMenuExecution } from '../runtime/menuExecution';
import Header from '../components/Header';
import MdiTabs from '../components/MdiTabs';
import Sidebar from '../components/Sidebar';
import Workspace from '../components/Workspace';
import { programComponents } from '../config/programRegistry';
import { metadataRepository, programByKey } from '../repositories/metadataRepository';
import type { MdiTab, MenuNode, ProgramKey } from '../types/adminShell';
import { designLifecycleRepository } from '../modules/standard-design/design-lifecycle/designLifecycle.repository';
import { ProjectContextDialog } from '../modules/standard-design/ui/components/ProjectContextSelector';

const homeTab: MdiTab = { programKey: 'HOME', title: programByKey.HOME.programName };

function findTopMenuKeyByProgram(menuTree: MenuNode[], programKey: ProgramKey) {
  const containsProgram = (menu: MenuNode): boolean =>
    menu.programKey === programKey || menu.children.some(containsProgram);
  return menuTree.find(containsProgram)?.menuKey;
}

function findProgramKeyByRoutePath(routePath: string): ProgramKey {
  if (routePath === '/standard-design/design-review') return 'SD_REQUIREMENT_GROUP';
  return Object.values(programByKey).find((program) => program.routePath === routePath)?.programKey ?? 'HOME';
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const menuTree = useMemo(() => metadataRepository.getMenuTree(), []);
  const [executionSettings, setExecutionSettings] = useState<MenuExecutionSetting[]>([]);
  const [executionMessage, setExecutionMessage] = useState('');
  useEffect(() => {
    let disposed = false;
    let revision = 0;
    const load = () => {
      const requestRevision = ++revision;
      void listMenuExecutionSettings().then(settings => {
        if (!disposed && requestRevision === revision) { setExecutionSettings(settings); setExecutionMessage(''); }
      }).catch(() => {
        if (!disposed && requestRevision === revision) setExecutionMessage('메뉴 실행 설정을 불러오지 못해 기본 INNER/BASEKIT 또는 마지막 확인 설정으로 실행합니다. 새로고침하면 다시 조회합니다.');
      });
    };
    load();
    window.addEventListener('basekit:menu-execution-settings-changed', load);
    return () => { disposed = true; window.removeEventListener('basekit:menu-execution-settings-changed', load); };
  }, []);
  const initialProgramKey = findProgramKeyByRoutePath(location.pathname);
  const initialContextMissing = Boolean(location.pathname !== '/standard-design/design-review' && !(initialProgramKey === 'SD_REQUIREMENT_GROUP' && /[?&]project=[^&]+/.test(location.search ?? '')) && programByKey[initialProgramKey].requiresProjectContext && !designLifecycleRepository.getSelectedProjectId());
  const [activeTopMenuKey, setActiveTopMenuKey] = useState(() =>
    findTopMenuKeyByProgram(menuTree, initialProgramKey) ?? menuTree[0]?.menuKey ?? '',
  );
  const [sidebarPinned, setSidebarPinned] = useState(() => localStorage.getItem('basekit.navigation.sidebar-pinned') === 'Y');
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('basekit.navigation.sidebar-pinned') === 'Y');
  const [floatingMenuOpen, setFloatingMenuOpen] = useState(false);
  const [expandedMenuKeys, setExpandedMenuKeys] = useState<string[]>(() =>
    menuTree.flatMap((menu) => menu.children.filter((child) => child.menuType === 'FOLDER').map((child) => child.menuKey)),
  );
  const [tabs, setTabs] = useState<MdiTab[]>(() =>
    initialProgramKey === 'HOME' || initialContextMissing
      ? [homeTab]
      : [homeTab, { programKey: initialProgramKey, title: programByKey[initialProgramKey].programName }],
  );
  const [activeProgramKey, setActiveProgramKey] = useState<ProgramKey>(initialContextMissing ? 'HOME' : initialProgramKey);
  const [projectContextDialogOpen, setProjectContextDialogOpen] = useState(initialContextMissing);
  const [pendingProjectProgramKey, setPendingProjectProgramKey] = useState<ProgramKey | null>(initialContextMissing ? initialProgramKey : null);
  const activeTopMenu = menuTree.find((menu) => menu.menuKey === activeTopMenuKey) ?? menuTree[0];

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setFloatingMenuOpen(false);
      if (!sidebarPinned) setSidebarOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [sidebarPinned]);

  useEffect(() => {
    if (initialContextMissing) navigate(programByKey.HOME.routePath, { replace: true });
  }, [initialContextMissing, navigate]);

  useEffect(() => {
    const openLinkedProgram = (event: Event) => {
      const key = (event as CustomEvent<{PROGRAM_KEY:string}>).detail?.PROGRAM_KEY;
      const program = programByKey[key];
      if (!program || program.useYn !== 'Y') return;
      const execution = resolveMenuExecution(menuTree, key, executionSettings);
      if (execution?.EXECUTION_TYPE === 'WINDOW') {
        setExecutionMessage(launchStandaloneWindow(execution.MENU_ID, key) ? '' : '팝업이 차단되었습니다. 이 사이트의 팝업을 허용한 후 메뉴를 다시 선택해 주세요.');
        return;
      }
      if (!window.dispatchEvent(new CustomEvent('basekit:before-program-change', { cancelable: true, detail: { resume: () => openLinkedProgram(event) } }))) return;
      if (program.requiresProjectContext && !designLifecycleRepository.getSelectedProjectId()) {
        setPendingProjectProgramKey(key); setProjectContextDialogOpen(true); return;
      }
      setTabs(current => current.some(tab => tab.programKey === key) ? current : [...current, {programKey:key,title:program.programName}]);
      setActiveProgramKey(key); setActiveTopMenuKey(findTopMenuKeyByProgram(menuTree,key) ?? menuTree[0]?.menuKey ?? '');
      navigate(program.routePath);
    };
    window.addEventListener('basekit:open-program',openLinkedProgram);
    return () => window.removeEventListener('basekit:open-program',openLinkedProgram);
  }, [menuTree,navigate,executionSettings]);

  const pinSidebar = () => { setSidebarPinned(true); setSidebarOpen(true); localStorage.setItem('basekit.navigation.sidebar-pinned', 'Y'); };
  const unpinSidebar = () => { setSidebarPinned(false); localStorage.setItem('basekit.navigation.sidebar-pinned', 'N'); };
  const selectTopMenu = (menuKey: string) => {
    const sameMenu = menuKey === activeTopMenuKey;
    setActiveTopMenuKey(menuKey);
    setFloatingMenuOpen(sameMenu ? !floatingMenuOpen : true);
  };

  const activateProgramImmediately = (programKey: ProgramKey) => {
    setActiveProgramKey(programKey);
    const topMenuKey = findTopMenuKeyByProgram(menuTree, programKey);
    if (topMenuKey) setActiveTopMenuKey(topMenuKey);
    const routePath = programByKey[programKey].routePath;
    if (location.pathname !== routePath) navigate(routePath);
  };

  const activateProgram = (programKey: ProgramKey) => {
    if (programKey !== activeProgramKey && !window.dispatchEvent(new CustomEvent('basekit:before-program-change', { cancelable: true, detail: { resume: () => activateProgram(programKey) } }))) return;
    if (programByKey[programKey].requiresProjectContext && !designLifecycleRepository.getSelectedProjectId()) {
      setPendingProjectProgramKey(programKey);
      setProjectContextDialogOpen(true);
      return;
    }
    activateProgramImmediately(programKey);
  };

  const openProgram = (programKey: ProgramKey) => {
    const execution = resolveMenuExecution(menuTree, programKey, executionSettings, activeTopMenuKey);
    if (execution?.EXECUTION_TYPE === 'WINDOW') {
      setExecutionMessage(launchStandaloneWindow(execution.MENU_ID, programKey) ? '' : '팝업이 차단되었습니다. 이 사이트의 팝업을 허용한 후 메뉴를 다시 선택해 주세요.');
      setFloatingMenuOpen(false);
      if (!sidebarPinned) setSidebarOpen(false);
      return;
    }
    if (programByKey[programKey].requiresProjectContext && !designLifecycleRepository.getSelectedProjectId()) {
      setPendingProjectProgramKey(programKey);
      setProjectContextDialogOpen(true);
      setFloatingMenuOpen(false);
      if (!sidebarPinned) setSidebarOpen(false);
      return;
    }
    const program = programByKey[programKey];
    setTabs((currentTabs) => currentTabs.some((tab) => tab.programKey === programKey)
      ? currentTabs : [...currentTabs, { programKey, title: program.programName }]);
    activateProgram(programKey);
    setFloatingMenuOpen(false);
    if (!sidebarPinned) setSidebarOpen(false);
  };

  const closeProgram = (programKey: ProgramKey) => {
    if (programKey === activeProgramKey && !window.dispatchEvent(new CustomEvent('basekit:before-program-change', { cancelable: true, detail: { resume: () => closeProgram(programKey) } }))) return;
    if (programKey === 'HOME') return;
    setTabs((currentTabs) => {
      const closeIndex = currentTabs.findIndex((tab) => tab.programKey === programKey);
      const nextTabs = currentTabs.filter((tab) => tab.programKey !== programKey);
      if (programKey === activeProgramKey) {
        activateProgramImmediately((nextTabs[Math.max(0, closeIndex - 1)] ?? homeTab).programKey);
      }
      return nextTabs;
    });
  };

  const closeOthers = () => {
    setTabs((currentTabs) => activeProgramKey === 'HOME'
      ? [homeTab] : [homeTab, ...currentTabs.filter((tab) => tab.programKey === activeProgramKey)]);
  };

  const closeAll = () => {
    if (!window.dispatchEvent(new CustomEvent('basekit:before-program-change', { cancelable: true, detail: { resume: closeAll } }))) return;
    setTabs([homeTab]);
    activateProgramImmediately('HOME');
  };

  const moveTab = (direction: -1 | 1) => {
    const currentIndex = tabs.findIndex((tab) => tab.programKey === activeProgramKey);
    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
    activateProgram(tabs[nextIndex].programKey);
  };

  return (
    <div className="app-shell">
      {executionMessage ? <div role="status">{executionMessage}</div> : null}
      <Header topMenus={menuTree} activeTopMenuKey={activeTopMenuKey}
        sidebarOpen={sidebarOpen} onSelectTopMenu={selectTopMenu}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onOpenProgram={openProgram} notificationCount={3} />
      {floatingMenuOpen && activeTopMenu && (
        <>
          <button type="button" className="floating-navigation-backdrop" aria-label="플로팅 메뉴 닫기" onClick={() => setFloatingMenuOpen(false)} />
          <Sidebar menu={activeTopMenu} variant="floating"
            expandedMenuKeys={expandedMenuKeys} activeProgramKey={activeProgramKey}
            onToggleMenu={(menuKey) => setExpandedMenuKeys((keys) =>
              keys.includes(menuKey) ? keys.filter((key) => key !== menuKey) : [...keys, menuKey])}
            onOpenProgram={openProgram} onClose={() => setFloatingMenuOpen(false)} />
        </>
      )}
      <div className="app-body">
        {sidebarOpen && activeTopMenu && (
          <Sidebar menu={activeTopMenu} expandedMenuKeys={expandedMenuKeys}
            activeProgramKey={activeProgramKey}
            onToggleMenu={(menuKey) => setExpandedMenuKeys((keys) =>
              keys.includes(menuKey) ? keys.filter((key) => key !== menuKey) : [...keys, menuKey])}
            onOpenProgram={openProgram} pinned={sidebarPinned}
            onPin={pinSidebar} onUnpin={unpinSidebar} />
        )}
        <section className="app-main" aria-label="작업 영역">
          <MdiTabs tabs={tabs} activeProgramKey={activeProgramKey}
            onSelect={activateProgram} onClose={closeProgram}
            onCloseOthers={closeOthers} onCloseAll={closeAll} onMove={moveTab} />
          <Workspace activeProgramKey={activeProgramKey} programComponents={programComponents} />
        </section>
      </div>
      {projectContextDialogOpen ? <ProjectContextDialog
        onClose={() => { setProjectContextDialogOpen(false); setPendingProjectProgramKey(null); }}
        onOpenProjectManagement={() => {
          setProjectContextDialogOpen(false);
          setPendingProjectProgramKey(null);
          openProgram('SD_PROJECT_MGMT');
        }}
        onSelected={() => {
          const pending = pendingProjectProgramKey;
          setProjectContextDialogOpen(false);
          setPendingProjectProgramKey(null);
          if (pending) openProgram(pending);
        }} /> : null}
    </div>
  );
}
