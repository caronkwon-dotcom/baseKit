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

/**
 * 프로그램 컴포넌트 매핑
 *
 * 메뉴에서 선택한 programKey에 따라 실제로 렌더링할 화면 컴포넌트를 연결한다.
 * 현재는 샘플 단계이므로 AppLayout에서 직접 관리한다.
 * 추후 화면 수가 늘어나면 별도 registry/config 구조로 분리할 예정이다.
 *
 * 메뉴 = 사용자가 보는 목록
 * programKey = 화면을 식별하는 키
 * programComponents = 키와 실제 화면 컴포넌트를 연결하는 지도
 * Workspace = 연결된 화면을 실제로 보여주는 자리
 */
const programComponents: ProgramComponentMap = {
  HOME: () => <HomePage />,
  USER_MGMT: () => <UserManagePage />,
  COMMON_CODE_MGMT: () => <CodeManagePage />,
  MENU_MGMT: () => <MenuManagePage />,
};

/**
 * 기본 홈 탭
 *
 * AppLayout 최초 진입 시 MDI 영역에 기본으로 표시되는 탭이다.
 * 모든 탭이 닫히는 경우에도 최소 1개 탭을 유지하기 위해 사용한다.
 */
const homeTab: MdiTab = {
  programKey: 'HOME',
  title: programByKey.HOME.programName,
};

export default function AppLayout() {
  /**
   * Sidebar 표시용 메뉴 트리
   *
   * 현재는 전체 메뉴 데이터를 기준으로 트리를 생성한다.
   * 추후 로그인/권한 기능이 추가되면 사용자 권한에 따라 메뉴 목록을 필터링한 뒤
   * 트리 구조로 변환하는 방식으로 확장한다.
   */
  const menuTree = useMemo(() => buildMenuTree(menus), []);
  /**
   * MDI 탭 상태
   *
   * tabs는 현재 열려 있는 프로그램 탭 목록이다.
   * activeProgramKey는 현재 선택되어 Workspace에 표시될 프로그램 키이다.
   * 최초 진입 시에는 HOME 탭을 기본으로 연다.
   */
  const [tabs, setTabs] = useState<MdiTab[]>([homeTab]);
  const [activeProgramKey, setActiveProgramKey] = useState<ProgramKey>('HOME');

  const activeProgram = programByKey[activeProgramKey];

  /**
   * 프로그램 열기
   *
   * 메뉴에서 선택한 programKey를 기준으로 MDI 탭을 연다.
   * 이미 열려 있는 프로그램이면 탭을 중복 생성하지 않고,
   * 해당 프로그램을 활성 탭으로 전환한다.
   */
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

  /**
   * 프로그램 탭 닫기
   *
   * 선택한 programKey의 탭을 닫는다.
   * 현재 활성 탭을 닫는 경우 인접한 탭을 활성화하고,
   * 모든 탭이 닫히면 HOME 탭을 기본 탭으로 유지한다.
   */
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
