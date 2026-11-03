import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import { menuApi, type MenuRecord, type MenuSave } from '../services/menuApi';
import { listMenuExecutionSettings, saveMenuExecutionSetting, type MenuExecutionSetting } from '../services/menuExecutionApi';
import { programApi } from '../services/programApi';
import type { Program } from '../types/program';
import './menuManage.css';

const blankMenu = (): MenuSave => ({ MENU_KEY: '', MENU_NAME: '', PARENT_MENU_KEY: null, MENU_TYPE_CODE: 'FOLDER', SORT_ORDER: 0, PROGRAM_KEY: null, USE_YN: 'Y' });
function rootOf(menu: MenuRecord, index: Map<string, MenuRecord>): MenuRecord {
  let current = menu;
  while (current.PARENT_MENU_KEY && index.has(current.PARENT_MENU_KEY)) current = index.get(current.PARENT_MENU_KEY)!;
  return current;
}
function childrenOf(rows: MenuRecord[], parent: string | null) {
  return rows.filter((row) => row.PARENT_MENU_KEY === parent).sort((a, b) => a.SORT_ORDER - b.SORT_ORDER || a.MENU_KEY.localeCompare(b.MENU_KEY));
}

export default function MenuManagePage() {
  const [menus, setMenus] = useState<MenuRecord[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<MenuSave | null>(null);
  const [creating, setCreating] = useState(false);
  const [settings, setSettings] = useState<MenuExecutionSetting[]>([]);
  const [executionDraft, setExecutionDraft] = useState<MenuExecutionSetting | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const index = useMemo(() => new Map(menus.map((menu) => [menu.MENU_KEY, menu])), [menus]);
  const programByKey = useMemo(() => new Map(programs.map((program) => [program.PROGRAM_KEY, program])), [programs]);
  const selectedRoot = draft && !creating && selectedKey && index.has(selectedKey) ? rootOf(index.get(selectedKey)!, index) : null;
  const executionEditable = !!selectedRoot && selectedRoot.MENU_KEY === selectedKey;

  async function loadData(keyToSelect?: string) {
    const [rows, programRows, settingRows] = await Promise.all([menuApi.find({}), programApi.find({ USE_YN: 'Y' }), listMenuExecutionSettings()]);
    setMenus(rows); setPrograms(programRows); setSettings(settingRows); setLoaded(true);
    const key = keyToSelect ?? selectedKey;
    if (!key) { setSelectedKey(null); setDraft(null); setExecutionDraft(null); return; }
    const row = await menuApi.get(key);
    setSelectedKey(row.MENU_KEY); setDraft({ ...row });
    const root = rootOf(row, new Map(rows.map((item) => [item.MENU_KEY, item])));
    setExecutionDraft(settingRows.find((item) => item.MENU_ID === root.MENU_KEY) ?? { MENU_ID: root.MENU_KEY, EXECUTION_TYPE: 'INNER', DESIGN_TYPE: 'BASEKIT' });
  }

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const [rows, programRows, settingRows] = await Promise.all([menuApi.find({}), programApi.find({ USE_YN: 'Y' }), listMenuExecutionSettings()]);
        if (!active) return;
        setMenus(rows); setPrograms(programRows); setSettings(settingRows); setLoaded(true);
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : '메뉴 조회에 실패했습니다.');
      }
    };
    void initialize();
    return () => { active = false; };
  }, []);

  async function select(menu: MenuRecord) {
    setCreating(false); setSelectedKey(menu.MENU_KEY); setBusy(true); setMessage('');
    try {
      const detail = await menuApi.get(menu.MENU_KEY);
      setDraft({ ...detail });
      const root = rootOf(detail, index);
      setExecutionDraft(settings.find((item) => item.MENU_ID === root.MENU_KEY) ?? { MENU_ID: root.MENU_KEY, EXECUTION_TYPE: 'INNER', DESIGN_TYPE: 'BASEKIT' });
    } catch (error) {
      setDraft(null); setExecutionDraft(null);
      setMessage(error instanceof Error ? error.message : '메뉴 상세 조회에 실패했습니다.');
    } finally { setBusy(false); }
  }
  function newMenu(parent: MenuRecord | null = null) {
    const siblings = childrenOf(menus, parent?.MENU_KEY ?? null);
    setCreating(true); setSelectedKey(null); setExecutionDraft(null);
    setDraft({ ...blankMenu(), PARENT_MENU_KEY: parent?.MENU_KEY ?? null, SORT_ORDER: siblings.length ? Math.max(...siblings.map((row) => row.SORT_ORDER)) + 1 : 0 });
    setMessage('');
  }
  function updateDraft<K extends keyof MenuSave>(key: K, value: MenuSave[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  }
  const descendants = (key: string): Set<string> => {
    const result = new Set<string>();
    const visit = (parent: string) => childrenOf(menus, parent).forEach((child) => { result.add(child.MENU_KEY); visit(child.MENU_KEY); });
    visit(key); return result;
  };
  const validParent = (parentKey: string | null) => {
    if (!parentKey) return true;
    const parent = index.get(parentKey);
    if (!parent || parent.MENU_TYPE_CODE !== 'FOLDER' || parent.USE_YN !== 'Y') return false;
    const parentDepth = (() => { let depth = 1; let cursor = parent; while (cursor.PARENT_MENU_KEY && index.has(cursor.PARENT_MENU_KEY)) { depth++; cursor = index.get(cursor.PARENT_MENU_KEY)!; } return depth; })();
    const moving = !creating && selectedKey ? descendants(selectedKey) : new Set<string>();
    let subtreeHeight = 1;
    if (selectedKey) {
      const depthFrom = (key: string): number => Math.max(1, ...childrenOf(menus, key).map((child) => 1 + depthFrom(child.MENU_KEY)));
      subtreeHeight = depthFrom(selectedKey);
    }
    return (!selectedKey || (parentKey !== selectedKey && !moving.has(parentKey))) && parentDepth + subtreeHeight <= 3;
  };
  const parentChoices = menus.filter((menu) => menu.MENU_TYPE_CODE === 'FOLDER' && menu.USE_YN === 'Y' && (!selectedKey || (menu.MENU_KEY !== selectedKey && !descendants(selectedKey).has(menu.MENU_KEY))));
  const canSave = !!draft && loaded && !busy && draft.MENU_KEY.trim() && draft.MENU_NAME.trim() && Number.isInteger(draft.SORT_ORDER) && draft.SORT_ORDER >= 0
    && validParent(draft.PARENT_MENU_KEY) && (draft.MENU_TYPE_CODE === 'FOLDER' ? !draft.PROGRAM_KEY : !!draft.PROGRAM_KEY);

  async function saveMenu() {
    if (!draft || !canSave) return;
    setBusy(true); setMessage('');
    try {
      const payload: MenuSave = { ...draft, MENU_KEY: draft.MENU_KEY.trim(), MENU_NAME: draft.MENU_NAME.trim(), PARENT_MENU_KEY: draft.PARENT_MENU_KEY || null, PROGRAM_KEY: draft.MENU_TYPE_CODE === 'PAGE' ? draft.PROGRAM_KEY : null };
      const saved = creating ? await menuApi.create(payload) : await menuApi.update(draft.MENU_KEY, payload);
      await loadData(saved.MENU_KEY); setCreating(false); setMessage('저장 후 DB에서 메뉴를 다시 조회했습니다.');
    } catch (error) { setMessage(error instanceof Error ? error.message : '메뉴 저장에 실패했습니다.'); }
    finally { setBusy(false); }
  }
  async function deleteMenu() {
    if (!selectedKey || creating || busy) return;
    if (childrenOf(menus, selectedKey).length) { setMessage('하위 메뉴가 있어 삭제할 수 없습니다. 하위 메뉴를 먼저 삭제하세요.'); return; }
    setBusy(true); setMessage('');
    try { await menuApi.delete(selectedKey); setSelectedKey(null); setDraft(null); setExecutionDraft(null); await loadData(''); setMessage('메뉴를 삭제하고 DB 목록을 다시 조회했습니다.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : '메뉴 삭제에 실패했습니다.'); }
    finally { setBusy(false); }
  }
  async function saveExecution() {
    if (!executionDraft || !executionEditable || busy) return;
    setBusy(true); setMessage('');
    try { const saved = await saveMenuExecutionSetting(executionDraft); setSettings((rows) => [...rows.filter((row) => row.MENU_ID !== saved.MENU_ID), saved]); setExecutionDraft(saved); setMessage('실행 설정을 저장했습니다. 하위 메뉴는 이 1Depth 설정을 사용합니다.'); window.dispatchEvent(new Event('basekit:menu-execution-settings-changed')); }
    catch (error) { setMessage(error instanceof Error ? error.message : '실행 설정 저장에 실패했습니다.'); }
    finally { setBusy(false); }
  }
  function renderTree(parent: string | null, depth = 1): React.ReactNode {
    const rows = childrenOf(menus, parent);
    if (!rows.length) return null;
    return <ul role={depth === 1 ? 'tree' : 'group'}>{rows.map((menu) => <li role="treeitem" aria-level={depth} aria-selected={selectedKey === menu.MENU_KEY} key={menu.MENU_KEY}>
      <button type="button" className={`menu-tree-item${selectedKey === menu.MENU_KEY ? ' selected' : ''}`} onClick={() => select(menu)}>{menu.MENU_NAME}<small>{menu.MENU_KEY} · {menu.MENU_TYPE_CODE} · {menu.USE_YN === 'Y' ? '사용' : '미사용'}</small></button>
      {renderTree(menu.MENU_KEY, depth + 1)}
    </li>)}</ul>;
  }

  return <section className="page">
    <PageHeader breadcrumbs={['시스템관리', '메뉴관리']} description="메뉴 계층과 표시 순서, Program 연결 및 기존 실행 설정을 관리합니다." />
    <div className="menu-manage-toolbar" role="toolbar" aria-label="메뉴 작업">
      <button type="button" className="secondary-button" disabled={!loaded || busy} onClick={() => newMenu()}>신규 메뉴</button>
      <button type="button" className="secondary-button" disabled={!loaded || busy || !selectedKey || creating || childrenOf(menus, selectedKey ?? '').length > 0} onClick={() => void deleteMenu()}>삭제</button>
      <button type="button" className="primary-button" disabled={!canSave} onClick={() => void saveMenu()}>{busy ? '처리 중…' : '메뉴 저장'}</button>
      {selectedKey && <button type="button" className="secondary-button" disabled={busy} onClick={() => void loadData(selectedKey).catch((error: unknown) => setMessage(error instanceof Error ? error.message : '메뉴 재조회에 실패했습니다.'))}>DB 재조회</button>}
      {message && <span role="status">{message}</span>}
    </div>
    <div className="menu-manage-layout">
      <aside className="menu-tree-panel"><h2>메뉴 트리</h2>{menus.length ? renderTree(null) : loaded ? <p className="empty-detail">등록된 메뉴가 없습니다. 신규 메뉴로 시작하세요.</p> : <p>메뉴를 조회하고 있습니다…</p>}</aside>
      <section className="menu-editor-panel" aria-label="메뉴 상세">
        <h2>{creating ? '신규 메뉴 등록' : draft ? '메뉴 상세' : '메뉴 상세 및 실행 설정'}</h2>
        {draft ? <>
          <div className="menu-editor-grid">
            <label>메뉴 식별자<input value={draft.MENU_KEY} disabled={!creating || busy} onChange={(event) => updateDraft('MENU_KEY', event.target.value)} /></label>
            <label>메뉴명<input value={draft.MENU_NAME} disabled={busy} onChange={(event) => updateDraft('MENU_NAME', event.target.value)} /></label>
            <label>상위 메뉴<select value={draft.PARENT_MENU_KEY ?? ''} disabled={busy} onChange={(event) => updateDraft('PARENT_MENU_KEY', event.target.value || null)}><option value="">최상위 메뉴</option>{parentChoices.map((menu) => <option key={menu.MENU_KEY} value={menu.MENU_KEY} disabled={!validParent(menu.MENU_KEY)}>{menu.MENU_NAME} ({menu.MENU_KEY})</option>)}</select></label>
            <label>메뉴 유형<select value={draft.MENU_TYPE_CODE} disabled={busy} onChange={(event) => { const type = event.target.value; updateDraft('MENU_TYPE_CODE', type); if (type === 'FOLDER') updateDraft('PROGRAM_KEY', null); }}><option value="FOLDER">FOLDER · 그룹</option><option value="PAGE" disabled={!creating && !!selectedKey && childrenOf(menus, selectedKey).length > 0}>PAGE · 실행</option></select></label>
            <label>형제 정렬 순서<input type="number" min="0" step="1" value={draft.SORT_ORDER} disabled={busy} onChange={(event) => updateDraft('SORT_ORDER', Number(event.target.value))} /></label>
            <label>사용 여부<select value={draft.USE_YN} disabled={busy} onChange={(event) => updateDraft('USE_YN', event.target.value as 'Y' | 'N')}><option value="Y">사용</option><option value="N">미사용</option></select></label>
            {draft.MENU_TYPE_CODE === 'PAGE' && <label className="menu-program-field">Program Registry<select value={draft.PROGRAM_KEY ?? ''} disabled={busy} onChange={(event) => updateDraft('PROGRAM_KEY', event.target.value || null)}><option value="">Program 선택</option>{programs.map((program) => <option key={program.PROGRAM_ID} value={program.PROGRAM_KEY}>{program.PROGRAM_KEY} · {program.PROGRAM_NAME}</option>)}</select><small>실행 경로: {programByKey.get(draft.PROGRAM_KEY ?? '')?.ROUTE ?? '선택한 Program의 Route가 없습니다.'}</small></label>}
          </div>
          {!creating && selectedRoot && executionDraft && <div className="menu-execution-panel"><h3>Standalone / 실행 설정</h3><p>설정 기준: {selectedRoot.MENU_NAME} ({selectedRoot.MENU_KEY}){!executionEditable && ' · 하위 메뉴는 1Depth 설정을 상속합니다.'}</p><div className="menu-editor-grid"><label>실행 유형<select value={executionDraft.EXECUTION_TYPE} disabled={!executionEditable || busy} onChange={(event) => setExecutionDraft({ ...executionDraft, EXECUTION_TYPE: event.target.value as MenuExecutionSetting['EXECUTION_TYPE'] })}><option value="INNER">기본 화면 (INNER)</option><option value="WINDOW">독립 창 (WINDOW)</option></select></label><label>디자인 유형<select value={executionDraft.DESIGN_TYPE} disabled={!executionEditable || busy} onChange={(event) => setExecutionDraft({ ...executionDraft, DESIGN_TYPE: event.target.value as MenuExecutionSetting['DESIGN_TYPE'] })}><option value="BASEKIT">BASEKIT</option><option value="LINEAR">LINEAR</option></select></label></div>{executionEditable && <button type="button" className="secondary-button" disabled={busy} onClick={() => void saveExecution()}>실행 설정 저장</button>}</div>}
        </> : <p className="empty-detail">왼쪽 트리에서 메뉴를 선택하거나 신규 메뉴를 등록하세요.</p>}
      </section>
    </div>
  </section>;
}
