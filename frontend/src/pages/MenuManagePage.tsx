import { useEffect, useMemo, useState } from 'react';
import DataTable, { type DataTableColumn } from '../components/common/DataTable';
import PageHeader from '../components/common/PageHeader';
import { menuApi, type MenuRecord } from '../services/menuApi';
import { listMenuExecutionSettings, saveMenuExecutionSetting, type MenuExecutionSetting } from '../services/menuExecutionApi';
import { programApi } from '../services/programApi';
import type { Program } from '../types/program';

const menuColumns: DataTableColumn<MenuRecord>[] = [
  { key: 'MENU_KEY', header: '메뉴 키', render: (menu) => menu.MENU_KEY },
  { key: 'MENU_NAME', header: '메뉴명', render: (menu) => menu.MENU_NAME },
  { key: 'MENU_TYPE_CODE', header: '유형', render: (menu) => menu.MENU_TYPE_CODE },
  { key: 'PROGRAM_KEY', header: '프로그램', render: (menu) => menu.PROGRAM_KEY ?? '-' },
];
function rootOf(menu: MenuRecord, menus: MenuRecord[]): MenuRecord {
  const parent = menus.find((candidate) => candidate.MENU_KEY === menu.PARENT_MENU_KEY);
  return parent ? rootOf(parent, menus) : menu;
}
export default function MenuManagePage() {
  const [menus, setMenus] = useState<MenuRecord[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<MenuRecord | null>(null);
  const [programKeyDraft, setProgramKeyDraft] = useState('');
  const [settings, setSettings] = useState<MenuExecutionSetting[]>([]);
  const [draft, setDraft] = useState<MenuExecutionSetting | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [programSaving, setProgramSaving] = useState(false);
  const [message, setMessage] = useState('');

  const programByKey = useMemo(() => new Map(programs.map((row) => [row.PROGRAM_KEY, row])), [programs]);

  useEffect(() => {
    let active = true;
    Promise.all([
      menuApi.find({}),
      programApi.find({ USE_YN: 'Y' }),
      listMenuExecutionSettings(),
    ])
      .then(([menuRows, programRows, settingRows]) => {
        if (!active) return;
        setMenus(menuRows);
        setPrograms(programRows);
        setSettings(settingRows);
        setLoaded(true);
      })
      .catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : '조회 실패');
      });
    return () => { active = false; };
  }, []);

  function applySelection(menu: MenuRecord, settingRows: MenuExecutionSetting[], menuRows: MenuRecord[]) {
    setSelectedMenu(menu);
    setProgramKeyDraft(menu.PROGRAM_KEY ?? '');
    const root = rootOf(menu, menuRows);
    setDraft(settingRows.find((row) => row.MENU_ID === root.MENU_KEY) ?? { MENU_ID: root.MENU_KEY, EXECUTION_TYPE: 'INNER', DESIGN_TYPE: 'BASEKIT' });
  }

  function selectMenu(menu: MenuRecord) {
    applySelection(menu, settings, menus);
    if (loaded) setMessage('');
  }

  async function reloadMenuData(menuKeyToSelect: string) {
    const [menuRows, programRows, settingRows] = await Promise.all([
      menuApi.find({}),
      programApi.find({ USE_YN: 'Y' }),
      listMenuExecutionSettings(),
    ]);
    setMenus(menuRows);
    setPrograms(programRows);
    setSettings(settingRows);
    setLoaded(true);
    const refreshed = menuRows.find((row) => row.MENU_KEY === menuKeyToSelect);
    if (refreshed) applySelection(refreshed, settingRows, menuRows);
  }

  async function saveExecutionSetting() {
    if (!draft || saving || !loaded) return;
    setSaving(true);
    setMessage('');
    try {
      const saved = await saveMenuExecutionSetting(draft);
      setSettings((rows) => [...rows.filter((row) => row.MENU_ID !== saved.MENU_ID), saved]);
      setDraft(saved);
      setMessage('저장했습니다. 다음 메뉴 실행부터 적용됩니다.');
      window.dispatchEvent(new Event('basekit:menu-execution-settings-changed'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  }

  async function saveProgramBinding() {
    if (!selectedMenu || selectedMenu.MENU_TYPE_CODE !== 'PAGE' || programSaving) return;
    if (!programKeyDraft) {
      setMessage('PAGE 메뉴에는 Program을 선택해야 합니다.');
      return;
    }
    setProgramSaving(true);
    setMessage('');
    try {
      await menuApi.update(selectedMenu.MENU_KEY, {
        MENU_KEY: selectedMenu.MENU_KEY,
        MENU_NAME: selectedMenu.MENU_NAME,
        PARENT_MENU_KEY: selectedMenu.PARENT_MENU_KEY,
        MENU_TYPE_CODE: selectedMenu.MENU_TYPE_CODE,
        SORT_ORDER: selectedMenu.SORT_ORDER,
        PROGRAM_KEY: programKeyDraft,
        USE_YN: selectedMenu.USE_YN,
      });
      await reloadMenuData(selectedMenu.MENU_KEY);
      setMessage('Program 연결을 저장하고 메뉴/Program을 재조회했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Program 연결 저장 실패');
    } finally {
      setProgramSaving(false);
    }
  }

  const selectedProgram = programByKey.get(programKeyDraft) ?? null;
  const editable = selectedMenu?.PARENT_MENU_KEY === null;
  const pageMenuSelected = selectedMenu?.MENU_TYPE_CODE === 'PAGE';

  return <section className="page">
    <PageHeader breadcrumbs={['시스템관리', '메뉴관리']} description="메뉴 구조는 DB(BSYMENU)를 기준으로 조회하며, 1Depth 실행 설정과 PAGE Program 연결을 관리합니다." />
    <DataTable title="메뉴 목록" columns={menuColumns} rows={menus} getRowKey={(menu) => menu.MENU_KEY} onRowClick={saving || programSaving ? undefined : selectMenu} />
    <div className="detail-section"><h2>메뉴 실행 설정</h2>
      {selectedMenu && draft ? <div>
        <p>{selectedMenu.MENU_NAME} ({selectedMenu.MENU_KEY}) · 유형: {selectedMenu.MENU_TYPE_CODE}</p>
        <p>설정 기준: {draft.MENU_ID}{!editable && ' · 하위 메뉴는 1Depth 설정을 상속합니다.'}</p>
        {!loaded && <p role="alert">설정을 조회하지 못해 편집·저장이 잠겨 있습니다. 표시된 기본값은 저장값이 아닙니다. 권한·서버 연결과 개발 실행 프로필을 확인하세요.</p>}
        <fieldset disabled={!editable || !loaded || saving || programSaving}>
          <label htmlFor="executionType">실행 유형</label>
          <select id="executionType" value={draft.EXECUTION_TYPE} onChange={(event) => setDraft({ ...draft, EXECUTION_TYPE: event.target.value as MenuExecutionSetting['EXECUTION_TYPE'] })}>
            <option value="INNER">기본 화면 (INNER)</option><option value="WINDOW">독립 창 (WINDOW)</option>
          </select>
          <label htmlFor="designType">디자인</label>
          <select id="designType" value={draft.DESIGN_TYPE} onChange={(event) => setDraft({ ...draft, DESIGN_TYPE: event.target.value as MenuExecutionSetting['DESIGN_TYPE'] })}>
            <option value="BASEKIT">BASEKIT</option><option value="LINEAR">LINEAR</option>
          </select>
          {editable && <button type="button" onClick={() => void saveExecutionSetting()}>{saving ? '저장 중…' : '설정 저장'}</button>}
        </fieldset>

        <h3>PAGE Program 연결</h3>
        {pageMenuSelected ? <fieldset disabled={!loaded || programSaving || saving}>
          <label htmlFor="programKey">Program</label>
          <select id="programKey" value={programKeyDraft} onChange={(event) => setProgramKeyDraft(event.target.value)}>
            <option value="">선택하세요</option>
            {programs.map((program) => <option key={program.PROGRAM_ID} value={program.PROGRAM_KEY}>{program.PROGRAM_KEY} - {program.PROGRAM_NAME}</option>)}
          </select>
          <p>Route: {selectedProgram?.ROUTE ?? '-'}</p>
          <button type="button" onClick={() => void saveProgramBinding()} disabled={!programKeyDraft}>{programSaving ? '저장 중…' : 'Program 연결 저장'}</button>
        </fieldset> : <p>Program 연결은 Menu Type이 PAGE인 메뉴에서만 설정할 수 있습니다.</p>}

        <p>디자인은 독립 창에서 적용됩니다. PAGE 메뉴 Route는 연결된 Program의 ROUTE를 기준으로 표시됩니다.</p>
      </div> : <p className="empty-detail">메뉴를 선택하세요.</p>}
      {message && <p role="status">{message}</p>}
    </div>
  </section>;
}
