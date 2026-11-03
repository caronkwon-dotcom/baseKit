import { useEffect, useMemo, useRef, useState } from 'react';
import ActionButton from '../components/common/ActionButton';
import PageHeader from '../components/common/PageHeader';
import FormField from '../components/common/FormField';
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
function expandableMenuKeys(rows: MenuRecord[]) {
  return new Set(rows.filter((row) => row.MENU_TYPE_CODE === 'FOLDER' && childrenOf(rows, row.MENU_KEY).length > 0).map((row) => row.MENU_KEY));
}
function ancestorMenuKeys(menuKey: string, rows: MenuRecord[]) {
  const byKey = new Map(rows.map((row) => [row.MENU_KEY, row]));
  const ancestors = new Set<string>();
  let current = byKey.get(menuKey);
  while (current?.PARENT_MENU_KEY) {
    const parent = byKey.get(current.PARENT_MENU_KEY);
    if (!parent) break;
    ancestors.add(parent.MENU_KEY);
    current = parent;
  }
  return ancestors;
}

export default function MenuManagePage() {
  const [menus, setMenus] = useState<MenuRecord[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const [draft, setDraft] = useState<MenuSave | null>(null);
  const [creating, setCreating] = useState(false);
  const [settings, setSettings] = useState<MenuExecutionSetting[]>([]);
  const [executionDraft, setExecutionDraft] = useState<MenuExecutionSetting | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const treeItemRefs = useRef(new Map<string, HTMLDivElement>());
  const index = useMemo(() => new Map(menus.map((menu) => [menu.MENU_KEY, menu])), [menus]);
  const programByKey = useMemo(() => new Map(programs.map((program) => [program.PROGRAM_KEY, program])), [programs]);
  const visibleMenus = useMemo(() => {
    const result: Array<{ menu: MenuRecord; depth: number }> = [];
    const visit = (parent: string | null, depth: number) => {
      childrenOf(menus, parent).forEach((menu) => {
        result.push({ menu, depth });
        if (expandedKeys.has(menu.MENU_KEY)) visit(menu.MENU_KEY, depth + 1);
      });
    };
    visit(null, 1);
    return result;
  }, [menus, expandedKeys]);
  const selectedRoot = draft && !creating && selectedKey && index.has(selectedKey) ? rootOf(index.get(selectedKey)!, index) : null;
  const executionEditable = !!selectedRoot && selectedRoot.MENU_KEY === selectedKey
    && settings.some((setting) => setting.MENU_ID === selectedRoot.MENU_KEY);

  useEffect(() => {
    if (focusedKey && visibleMenus.some(({ menu }) => menu.MENU_KEY === focusedKey)) {
      treeItemRefs.current.get(focusedKey)?.focus();
    }
  }, [focusedKey, visibleMenus]);

  async function loadData(keyToSelect?: string) {
    const [rows, programRows, settingRows] = await Promise.all([menuApi.find({}), programApi.find({ USE_YN: 'Y' }), listMenuExecutionSettings()]);
    setMenus(rows); setPrograms(programRows); setSettings(settingRows); setLoaded(true);
    const expandableKeys = expandableMenuKeys(rows);
    setExpandedKeys((current) => {
      const next = new Set([...current].filter((key) => expandableKeys.has(key)));
      const selected = keyToSelect ?? selectedKey;
      if (selected) ancestorMenuKeys(selected, rows).forEach((key) => next.add(key));
      return next;
    });
    const key = keyToSelect ?? selectedKey;
    if (!key) {
      setSelectedKey(null); setDraft(null); setExecutionDraft(null);
      setFocusedKey((current) => rows.some((row) => row.MENU_KEY === current) ? current : rows[0]?.MENU_KEY ?? null);
      return;
    }
    const row = await menuApi.get(key);
    setSelectedKey(row.MENU_KEY); setDraft({ ...row });
    setFocusedKey(row.MENU_KEY);
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
        setExpandedKeys(expandableMenuKeys(rows));
        setFocusedKey(rows[0]?.MENU_KEY ?? null);
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : '메뉴 조회에 실패했습니다.');
      }
    };
    void initialize();
    return () => { active = false; };
  }, []);

  async function select(menu: MenuRecord) {
    setCreating(false); setSelectedKey(menu.MENU_KEY); setBusy(true); setMessage('');
    setFocusedKey(menu.MENU_KEY);
    setExpandedKeys((current) => new Set([...current, ...ancestorMenuKeys(menu.MENU_KEY, menus)]));
    treeItemRefs.current.get(menu.MENU_KEY)?.focus();
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
  function toggleMenu(menuKey: string) {
    if (!childrenOf(menus, menuKey).length) return;
    setExpandedKeys((current) => { const next = new Set(current); if (next.has(menuKey)) next.delete(menuKey); else next.add(menuKey); return next; });
    setFocusedKey(menuKey);
    requestAnimationFrame(() => treeItemRefs.current.get(menuKey)?.focus());
  }
  function handleTreeKeyDown(event: React.KeyboardEvent<HTMLDivElement>, menu: MenuRecord) {
    if (event.target instanceof HTMLButtonElement) return;
    const currentIndex = visibleMenus.findIndex(({ menu: row }) => row.MENU_KEY === menu.MENU_KEY);
    const focusAt = (position: number) => { const item = visibleMenus[position]?.menu; if (item) setFocusedKey(item.MENU_KEY); };
    const hasChildren = childrenOf(menus, menu.MENU_KEY).length > 0;
    const expanded = expandedKeys.has(menu.MENU_KEY);
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); focusAt(currentIndex + 1); break;
      case 'ArrowUp': event.preventDefault(); focusAt(currentIndex - 1); break;
      case 'Home': event.preventDefault(); focusAt(0); break;
      case 'End': event.preventDefault(); focusAt(visibleMenus.length - 1); break;
      case 'ArrowRight':
        if (!hasChildren) return;
        event.preventDefault();
        if (!expanded) setExpandedKeys((current) => new Set(current).add(menu.MENU_KEY));
        else { const firstChild = childrenOf(menus, menu.MENU_KEY)[0]; if (firstChild) setFocusedKey(firstChild.MENU_KEY); }
        break;
      case 'ArrowLeft':
        if (hasChildren && expanded) {
          event.preventDefault();
          setExpandedKeys((current) => { const next = new Set(current); next.delete(menu.MENU_KEY); return next; });
        } else if (menu.PARENT_MENU_KEY) { event.preventDefault(); setFocusedKey(menu.PARENT_MENU_KEY); }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        void select(menu);
        break;
      default: break;
    }
  }
  function renderTree(parent: string | null, depth = 1): React.ReactNode {
    const rows = childrenOf(menus, parent);
    if (!rows.length) return null;
    return <ul role={depth === 1 ? 'tree' : 'group'} className={depth === 1 ? 'menu-tree-root' : undefined} aria-label={depth === 1 ? '메뉴 트리' : undefined}>
      {rows.map((menu) => {
        const hasChildren = childrenOf(menus, menu.MENU_KEY).length > 0;
        const expanded = expandedKeys.has(menu.MENU_KEY);
        return <li role="none" key={menu.MENU_KEY}>
          <div
            ref={(element) => { if (element) treeItemRefs.current.set(menu.MENU_KEY, element); else treeItemRefs.current.delete(menu.MENU_KEY); }}
            role="treeitem"
            aria-level={depth}
            aria-selected={selectedKey === menu.MENU_KEY}
            aria-expanded={hasChildren ? expanded : undefined}
            tabIndex={focusedKey === menu.MENU_KEY ? 0 : -1}
            className={'menu-tree-item' + (selectedKey === menu.MENU_KEY ? ' selected' : '')}
            onFocus={() => setFocusedKey(menu.MENU_KEY)}
            onClick={() => select(menu)}
            onKeyDown={(event) => handleTreeKeyDown(event, menu)}
          >
            {menu.MENU_TYPE_CODE === 'FOLDER' ? <button type="button" className={'menu-tree-toggle' + (expanded ? ' expanded' : '')} tabIndex={-1} disabled={!hasChildren} aria-expanded={hasChildren ? expanded : undefined} aria-label={hasChildren ? menu.MENU_NAME + ' ' + (expanded ? '접기' : '펼치기') : menu.MENU_NAME + ' 하위 메뉴 없음'} onClick={(event) => { event.stopPropagation(); toggleMenu(menu.MENU_KEY); }}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 3 5 5-5 5" /></svg></button> : <span className="menu-tree-toggle-placeholder" aria-hidden="true" />}
            <span className={'menu-tree-icon menu-tree-icon--' + (menu.MENU_TYPE_CODE === 'FOLDER' ? 'folder' : 'page')} aria-hidden="true">
              {menu.MENU_TYPE_CODE === 'FOLDER' ? <svg viewBox="0 0 20 20"><path d="M2.5 5.5a2 2 0 0 1 2-2h4l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z" /><path d="M2.7 8h14.5" /></svg> : <svg viewBox="0 0 20 20"><path d="M5 2.5h7l4 4v11H5z" /><path d="M12 2.5v4h4M7.5 10h6M7.5 13h6" /></svg>}
            </span>
            <span className="menu-tree-name">{menu.MENU_NAME}</span>
            <small className="menu-tree-meta">{menu.MENU_KEY} · {menu.MENU_TYPE_CODE} · {menu.USE_YN === 'Y' ? '사용' : '미사용'}</small>
          </div>
          {hasChildren && expanded && renderTree(menu.MENU_KEY, depth + 1)}
        </li>;
      })}
    </ul>;
  }

  return <section className="page">
    <PageHeader breadcrumbs={['시스템관리', '메뉴관리']} description="메뉴 계층과 표시 순서, Program 연결 및 기존 실행 설정을 관리합니다." rightContent={<div className="button-area page-actions" role="toolbar" aria-label={"메뉴 작업"}>
      <ActionButton actionCode="CREATE" label={"신규 메뉴"} disabled={!loaded || busy} onClick={() => newMenu()} />
      <ActionButton actionCode="DELETE" label={"삭제"} tone="danger" disabled={!loaded || busy || !selectedKey || creating || childrenOf(menus, selectedKey ?? '').length > 0} onClick={() => void deleteMenu()} />
      <ActionButton actionCode="SEARCH" label={"DB 재조회"} disabled={!loaded || busy} onClick={() => void loadData(selectedKey ?? undefined).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "\uBA54\uB274 \uC7AC\uC870\uD68C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."))} />
      <ActionButton actionCode="SAVE" label={busy ? "처리 중…" : "메뉴 저장"} tone="primary" disabled={!canSave} onClick={() => void saveMenu()} />
    </div>} />
    <div className="menu-manage-layout">
      <aside className="data-section menu-tree-panel"><h2>메뉴 트리</h2>{menus.length ? renderTree(null) : loaded ? <p className="empty-detail">등록된 메뉴가 없습니다. 신규 메뉴로 시작하세요.</p> : <p>메뉴를 조회하고 있습니다…</p>}</aside>
      <section className="data-section menu-editor-panel" aria-label={"메뉴 상세"}>

        <h2>{creating ? '신규 메뉴 등록' : draft ? '메뉴 상세' : '메뉴 상세 및 실행 설정'}</h2>
        {draft ? <>
          <section className="detail-section metadata-editor menu-basic-section"><h2>{"메뉴 기본정보"}</h2><div className="standard-form-grid menu-editor-grid"><FormField labelPosition="TOP" label={"메뉴 식별자"}><input value={draft.MENU_KEY} disabled={!creating || busy} onChange={(event) => updateDraft('MENU_KEY', event.target.value)} /></FormField>
            <FormField labelPosition="TOP" label={"메뉴명"}><input value={draft.MENU_NAME} disabled={busy} onChange={(event) => updateDraft('MENU_NAME', event.target.value)} /></FormField>
            <FormField labelPosition="TOP" label={"상위 메뉴"}><select value={draft.PARENT_MENU_KEY ?? ''} disabled={busy} onChange={(event) => updateDraft('PARENT_MENU_KEY', event.target.value || null)}><option value="">최상위 메뉴</option>{parentChoices.map((menu) => <option key={menu.MENU_KEY} value={menu.MENU_KEY} disabled={!validParent(menu.MENU_KEY)}>{menu.MENU_NAME} ({menu.MENU_KEY})</option>)}</select></FormField>
            <FormField labelPosition="TOP" label={"메뉴 유형"}><select value={draft.MENU_TYPE_CODE} disabled={busy} onChange={(event) => { const type = event.target.value; updateDraft('MENU_TYPE_CODE', type); if (type === 'FOLDER') updateDraft('PROGRAM_KEY', null); }}><option value="FOLDER">FOLDER · 그룹</option><option value="PAGE" disabled={!creating && !!selectedKey && childrenOf(menus, selectedKey).length > 0}>PAGE · 실행</option></select></FormField>
            <FormField labelPosition="TOP" label={"형제 정렬 순서"}><input type="number" min="0" step="1" value={draft.SORT_ORDER} disabled={busy} onChange={(event) => updateDraft('SORT_ORDER', Number(event.target.value))} /></FormField>
            <FormField labelPosition="TOP" label={"사용 여부"}><select value={draft.USE_YN} disabled={busy} onChange={(event) => updateDraft('USE_YN', event.target.value as 'Y' | 'N')}><option value="Y">사용</option><option value="N">미사용</option></select></FormField></div></section>
          {draft.MENU_TYPE_CODE === 'PAGE' && <section className="detail-section metadata-editor menu-program-section"><h2>{"\uD504\uB85C\uADF8\uB7A8 \uC5F0\uACB0"}</h2><div className="standard-form-grid menu-editor-grid"><FormField labelPosition="TOP" label={"Program Registry"} className="form-full-row"><select value={draft.PROGRAM_KEY ?? ''} disabled={busy} onChange={(event) => updateDraft('PROGRAM_KEY', event.target.value || null)}><option value="">Program 선택</option>{programs.map((program) => <option key={program.PROGRAM_ID} value={program.PROGRAM_KEY}>{program.PROGRAM_KEY} · {program.PROGRAM_NAME}</option>)}</select><small>실행 경로: {programByKey.get(draft.PROGRAM_KEY ?? '')?.ROUTE ?? '선택한 Program의 Route가 없습니다.'}</small></FormField></div></section>}
          {!creating && selectedRoot && executionDraft && <section className="detail-section metadata-editor menu-execution-panel"><h2>{"실행 설정"}</h2><p>설정 기준: {selectedRoot.MENU_NAME} ({selectedRoot.MENU_KEY}){selectedRoot.MENU_KEY !== selectedKey && ' · 하위 메뉴는 1Depth 설정을 상속합니다.'}</p>{selectedRoot.MENU_KEY === selectedKey && !executionEditable && <p role="note">이 루트 메뉴는 기존 실행 설정 대상이 아니므로 기본 INNER / BASEKIT 설정을 사용합니다.</p>}<div className="standard-form-grid menu-editor-grid"><FormField labelPosition="TOP" label={"실행 유형"}><select value={executionDraft.EXECUTION_TYPE} disabled={!executionEditable || busy} onChange={(event) => setExecutionDraft({ ...executionDraft, EXECUTION_TYPE: event.target.value as MenuExecutionSetting['EXECUTION_TYPE'] })}><option value="INNER">기본 화면 (INNER)</option><option value="WINDOW">독립 창 (WINDOW)</option></select></FormField><FormField labelPosition="TOP" label={"디자인 유형"}><select value={executionDraft.DESIGN_TYPE} disabled={!executionEditable || busy} onChange={(event) => setExecutionDraft({ ...executionDraft, DESIGN_TYPE: event.target.value as MenuExecutionSetting['DESIGN_TYPE'] })}><option value="BASEKIT">BASEKIT</option><option value="LINEAR">LINEAR</option></select></FormField></div>{executionEditable && <ActionButton actionCode="SAVE" label={"실행 설정 저장"} tone="primary" disabled={busy} onClick={() => void saveExecution()} />}</section>}
        </> : <p className="empty-detail">왼쪽 트리에서 메뉴를 선택하거나 신규 메뉴를 등록하세요.</p>}
      </section>
    </div>
    <p className="status-message" role="status" aria-live="polite">{message}</p>
  </section>;
}
