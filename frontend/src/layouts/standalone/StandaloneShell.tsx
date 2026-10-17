import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { programComponents } from '../../config/programRegistry';
import { metadataRepository, programByKey } from '../../repositories/metadataRepository';
import type { MenuNode } from '../../types/adminShell';
import { designLifecycleRepository } from '../../modules/standard-design/design-lifecycle/designLifecycle.repository';
import { ProjectContextDialog } from '../../modules/standard-design/ui/components/ProjectContextSelector';
import './standalone.css';

type Access = { MENU_ID: string; EXECUTION_TYPE: 'WINDOW'; DESIGN_TYPE: 'BASEKIT' | 'LINEAR' };
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
  const root = useMemo(() => metadataRepository.getMenuTree().find(menu => menu.menuKey === menuId), [menuId]);
  const keys = root ? programs(root).filter(key => programByKey[key]?.useYn === 'Y' && programComponents[key]) : [];
  const [result, setResult] = useState<{ route: string; access?: Access; error?: string }>();
  const [projectDialog, setProjectDialog] = useState(false);
  const [, refreshContext] = useState(0);
  const route = `${menuId}/${programKey}`;
  const access = result?.route === route ? result.access : undefined;
  const error = result?.route === route ? result.error : undefined;
  const program = programByKey[programKey];
  const contextMissing = program?.requiresProjectContext && !designLifecycleRepository.getSelectedProjectId();
  useEffect(() => {
    const abort = new AbortController();
    if (!root || !programComponents[programKey] || !program || program.useYn !== 'Y' || !programs(root).includes(programKey) || parts.length !== 4) {
      return;
    }
    fetch(`/api/core/window-access?${new URLSearchParams({ MENU_ID: menuId, PROGRAM_KEY: programKey })}`, {
      credentials: 'same-origin', signal: abort.signal,
    }).then(async response => {
      if (!response.ok) throw new Error('독립 창 실행 설정·권한·서버 실행 환경을 확인하세요.');
      const data: Access = await response.json();
      if (data.MENU_ID !== menuId || data.EXECUTION_TYPE !== 'WINDOW' || !['BASEKIT', 'LINEAR'].includes(data.DESIGN_TYPE)) throw new Error('실행 설정을 확인할 수 없습니다.');
      setResult({ route, access: data });
    }).catch((reason: unknown) => {
      if (!abort.signal.aborted) setResult({ route, error: reason instanceof Error ? reason.message : '접근 확인에 실패했습니다.' });
    });
    return () => abort.abort();
  }, [menuId, programKey, program, root, route, parts.length]);
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
  if (!access) return <main role={error ? 'alert' : 'status'}>{error ?? '접근 권한을 확인하고 있습니다.'}</main>;
  return <div className={`standalone-shell standalone-shell--${access.DESIGN_TYPE.toLowerCase()}`}>
    <header className="standalone-shell__header"><strong>{root.menuName}</strong><span>{program.programName}</span></header>
    <nav className="standalone-shell__navigation" aria-label="모듈 메뉴">{keys.map(key => <button key={key} aria-current={key === programKey ? 'page' : undefined} onClick={() => open(key)}>{programByKey[key].programName}</button>)}</nav>
    {contextMissing ? <main className="standalone-shell__content"><p>이 화면을 사용하려면 프로젝트를 선택하세요.</p><button onClick={() => setProjectDialog(true)}>프로젝트 선택</button></main>
      : <main className="standalone-shell__content" key={programKey}>{programComponents[programKey]()}</main>}
    {projectDialog && <ProjectContextDialog onClose={() => { setProjectDialog(false); refreshContext(value => value + 1); }} />}
  </div>;
}
