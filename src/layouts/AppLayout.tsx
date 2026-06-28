import { useMemo, useState } from 'react';
import Header from '../components/Header';
import MdiTabs from '../components/MdiTabs';
import Sidebar from '../components/Sidebar';
import Workspace from '../components/Workspace';
import { buildMenuTree, menus, programByKey } from '../config/adminPrograms';
import CodeManagePage from '../pages/CodeManagePage';
import HomePage from '../pages/HomePage';
import MenuManagePage from '../pages/MenuManagePage';
import UserManagePage from '../pages/UserManagePage';
import type {
  MdiTab,
  ProgramComponentMap,
  ProgramKey,
} from '../types/adminShell';

const programComponents: ProgramComponentMap = {
  HOME: () => <HomePage />,
  USER_MGMT: () => <UserManagePage />,
  COMMON_CODE_MGMT: () => <CodeManagePage />,
  MENU_MGMT: () => <MenuManagePage />,
};

const homeTab: MdiTab = {
  programKey: 'HOME',
  title: programByKey.HOME.programName,
};

export default function AppLayout() {
  const menuTree = useMemo(() => buildMenuTree(menus), []);
  const [tabs, setTabs] = useState<MdiTab[]>([homeTab]);
  const [activeProgramKey, setActiveProgramKey] = useState<ProgramKey>('HOME');

  const activeProgram = programByKey[activeProgramKey];

  const openProgram = (programKey: ProgramKey) => {
    const program = programByKey[programKey];

    setTabs((currentTabs) => {
      if (currentTabs.some((tab) => tab.programKey === programKey)) {
        return currentTabs;
      }

      return [
        ...currentTabs,
        {
          programKey,
          title: program.programName,
        },
      ];
    });
    setActiveProgramKey(programKey);
  };

  const closeProgram = (programKey: ProgramKey) => {
    setTabs((currentTabs) => {
      const closeIndex = currentTabs.findIndex(
        (tab) => tab.programKey === programKey,
      );
      const nextTabs = currentTabs.filter(
        (tab) => tab.programKey !== programKey,
      );

      if (programKey === activeProgramKey) {
        const adjacentTab =
          nextTabs[Math.max(0, closeIndex - 1)] ?? nextTabs[0] ?? homeTab;
        setActiveProgramKey(adjacentTab.programKey);
      }

      return nextTabs.length > 0 ? nextTabs : [homeTab];
    });
  };

  return (
    <div className="app-shell">
      <Header activeProgram={activeProgram} />
      <div className="app-body">
        <Sidebar
          menus={menuTree}
          activeProgramKey={activeProgramKey}
          onOpenProgram={openProgram}
        />
        <section className="app-main" aria-label="작업 영역">
          <MdiTabs
            tabs={tabs}
            activeProgramKey={activeProgramKey}
            onSelect={setActiveProgramKey}
            onClose={closeProgram}
          />
          <Workspace
            activeProgramKey={activeProgramKey}
            programComponents={programComponents}
          />
        </section>
      </div>
    </div>
  );
}
