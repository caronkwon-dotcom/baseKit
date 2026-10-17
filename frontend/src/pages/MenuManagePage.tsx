import { useEffect, useState } from 'react';
import DataTable, { type DataTableColumn } from '../components/common/DataTable';
import PageHeader from '../components/common/PageHeader';
import { metadataRepository } from '../repositories/metadataRepository';
import type { MenuMeta } from '../types/adminShell';
import { listMenuExecutionSettings, saveMenuExecutionSetting, type MenuExecutionSetting } from '../services/menuExecutionApi';

const menus = metadataRepository.getMenus();
const menuColumns: DataTableColumn<MenuMeta>[] = [
  { key: 'menuKey', header: '메뉴 키', render: menu => menu.menuKey },
  { key: 'menuName', header: '메뉴명', render: menu => menu.menuName },
  { key: 'menuLevel', header: 'Depth', render: menu => menu.menuLevel },
  { key: 'programKey', header: '프로그램', render: menu => menu.programKey ?? '-' },
];
function rootOf(menu: MenuMeta): MenuMeta {
  const parent = menus.find(candidate => candidate.menuKey === menu.parentMenuKey);
  return parent ? rootOf(parent) : menu;
}
export default function MenuManagePage() {
  const [selectedMenu, setSelectedMenu] = useState<MenuMeta | null>(null);
  const [settings, setSettings] = useState<MenuExecutionSetting[]>([]);
  const [draft, setDraft] = useState<MenuExecutionSetting | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    listMenuExecutionSettings().then(rows => { if (active) { setSettings(rows); setLoaded(true); } })
      .catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : '조회 실패'); });
    return () => { active = false; };
  }, []);
  function selectMenu(menu: MenuMeta) {
    setSelectedMenu(menu);
    const root = rootOf(menu);
    setDraft(settings.find(row => row.MENU_ID === root.menuKey) ?? { MENU_ID: root.menuKey, EXECUTION_TYPE: 'INNER', DESIGN_TYPE: 'BASEKIT' });
    if (loaded) setMessage('');
  }
  async function save() {
    if (!draft || saving || !loaded) return;
    setSaving(true); setMessage('');
    try {
      const saved = await saveMenuExecutionSetting(draft);
      setSettings(rows => [...rows.filter(row => row.MENU_ID !== saved.MENU_ID), saved]);
      setDraft(saved); setMessage('저장했습니다. 다음 메뉴 실행부터 적용됩니다.');
      window.dispatchEvent(new Event('basekit:menu-execution-settings-changed'));
    } catch (error) { setMessage(error instanceof Error ? error.message : '저장 실패'); }
    finally { setSaving(false); }
  }
  const editable = selectedMenu?.menuLevel === 1 && selectedMenu.parentMenuKey === null;
  return <section className="page">
    <PageHeader breadcrumbs={['시스템관리', '메뉴관리']} description="메뉴 구조는 JSON/Module Manifest를 따르며, 1Depth 실행 설정만 저장합니다." />
    <DataTable title="메뉴 목록" columns={menuColumns} rows={menus} getRowKey={menu => menu.menuKey} onRowClick={!loaded || saving ? undefined : selectMenu} />
    <div className="detail-section"><h2>메뉴 실행 설정</h2>
      {selectedMenu && draft ? <div>
        <p>{selectedMenu.menuName} ({selectedMenu.menuKey}) · 프로그램: {selectedMenu.programKey ?? '-'}</p>
        <p>설정 기준: {draft.MENU_ID}{!editable && ' · 하위 메뉴는 1Depth 설정을 상속합니다.'}</p>
        <fieldset disabled={!editable || !loaded || saving}>
          <label htmlFor="executionType">실행 유형</label>
          <select id="executionType" value={draft.EXECUTION_TYPE} onChange={event => setDraft({ ...draft, EXECUTION_TYPE: event.target.value as MenuExecutionSetting['EXECUTION_TYPE'] })}>
            <option value="INNER">기본 화면 (INNER)</option><option value="WINDOW">독립 창 (WINDOW)</option>
          </select>
          <label htmlFor="designType">디자인</label>
          <select id="designType" value={draft.DESIGN_TYPE} onChange={event => setDraft({ ...draft, DESIGN_TYPE: event.target.value as MenuExecutionSetting['DESIGN_TYPE'] })}>
            <option value="BASEKIT">BASEKIT</option><option value="LINEAR">LINEAR</option>
          </select>
          {editable && <button type="button" onClick={() => void save()}>{saving ? '저장 중…' : '설정 저장'}</button>}
        </fieldset>
        <p>디자인은 독립 창에서 적용됩니다. 메뉴 ID·계층·프로그램 연결은 원본에서 관리합니다.</p>
      </div> : <p className="empty-detail">메뉴를 선택하세요.</p>}
      {message && <p role="status">{message}</p>}
    </div>
  </section>;
}
