import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { programComponents } from '../../config/programRegistry';
import { metadataRepository, programByKey } from '../../repositories/metadataRepository';
import type { MenuNode } from '../../types/adminShell';
import { designLifecycleRepository } from '../../modules/standard-design/design-lifecycle/designLifecycle.repository';
import { ProjectContextDialog } from '../../modules/standard-design/ui/components/ProjectContextSelector';
import { listMenuExecutionSettings, type MenuExecutionSetting } from '../../services/menuExecutionApi';
import './standalone.css';

function programs(node: MenuNode): string[] {
  return [...(node.programKey ? [node.programKey] : []), ...node.children.flatMap(programs)];
}
function decode(value: string | undefined) {
  try { return decodeURIComponent(value ?? ''); } catch { return ''; }
}
export default function StandaloneShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const parts = location.pathname.split('/');
  const menuId = decode(parts[2]);
  const programKey = decode(parts[3]);
  const root = metadataRepository.getMenuTree().find(menu => menu.menuKey === menuId);
  const keys = root ? programs(root).filter(key => programByKey[key]?.useYn === 'Y' && programComponents[key]) : [];
  const [settings, setSettings] = useState<MenuExecutionSetting[]>([]);
  const [projectDialog, setProjectDialog] = useState(false);
  const [, refreshContext] = useState(0);
  const designType = settings.find(setting => setting.MENU_ID === menuId)?.DESIGN_TYPE ?? 'BASEKIT';
  const program = programByKey[programKey];
  const contextMissing = program?.requiresProjectContext && !designLifecycleRepository.getSelectedProjectId();
  useEffect(() => {
    let active = true;
    // Presentation only: a missing settings server must never block the screen.
    void listMenuExecutionSettings().then(value => { if (active) setSettings(value); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const open = (key: string) => {
    if (!keys.includes(key)) return;
    const resume = () => navigate(`/window/${encodeURIComponent(menuId)}/${encodeURIComponent(key)}`);
    if (window.dispatchEvent(new CustomEvent('basekit:before-program-change', { cancelable: true, detail: { resume } }))) resume();
  };
  useEffect(() => {
    const linked = (event: Event) => {
      const key = (event as CustomEvent<{ PROGRAM_KEY: string }>).detail?.PROGRAM_KEY;
      if (!root || !programs(root).includes(key) || !programComponents[key]) return;
      const resume = () => navigate(`/window/${encodeURIComponent(menuId)}/${encodeURIComponent(key)}`);
      if (window.dispatchEvent(new CustomEvent('basekit:before-program-change', { cancelable: true, detail: { resume } }))) resume();
    };
    window.addEventListener('basekit:open-program', linked);
    return () => window.removeEventListener('basekit:open-program', linked);
  }, [menuId, navigate, root]);
  if (!root || !keys.includes(programKey) || parts.length !== 4) return <main role="alert">등록되지 않은 독립 창 주소입니다.</main>;
  return <div className={`standalone-shell standalone-shell--${designType.toLowerCase()}`}>
    <header className="standalone-shell__header"><strong>{root.menuName}</strong><span>{program.programName}</span></header>
    <nav className="standalone-shell__navigation" aria-label="모듈 메뉴">{keys.map(key => <button key={key} aria-current={key === programKey ? 'page' : undefined} onClick={() => open(key)}>{programByKey[key].programName}</button>)}</nav>
    {contextMissing ? <main className="standalone-shell__content"><p>이 화면을 사용하려면 프로젝트를 선택하세요.</p><button onClick={() => setProjectDialog(true)}>프로젝트 선택</button></main>
      : <main className="standalone-shell__content" key={programKey}>{programComponents[programKey]()}</main>}
    {projectDialog && <ProjectContextDialog onClose={() => { setProjectDialog(false); refreshContext(value => value + 1); }} />}
  </div>;
}
