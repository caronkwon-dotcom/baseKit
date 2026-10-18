import { useRef, useState, type DragEvent, type PointerEvent } from 'react';
import { auxiliaryTarget, moveMenu, parseDraft, rows, sampleMenus, STORAGE_KEY, type MenuNode, type Position } from './menuBuilder';
import './menuBuilder.css';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const nodes = parseDraft(raw); return { nodes, saved: JSON.stringify(nodes), message: '이 브라우저에 저장한 초안을 불러왔습니다.' }; }
  } catch { return { nodes: sampleMenus, saved: '', message: '브라우저 초안을 읽지 못했습니다. 예시 초안을 표시합니다. 저장 시 기존 로컬 초안을 덮어씁니다.' }; }
  return { nodes: sampleMenus, saved: JSON.stringify(sampleMenus), message: '가상 분석 결과입니다. 모든 편집은 이 화면 안에서만 적용됩니다.' };
}
export default function MenuBuilderPage() {
  const [initial] = useState(load);
  const [history, setHistory] = useState({ past: [] as MenuNode[][], present: initial.nodes, future: [] as MenuNode[][] });
  const [saved, setSaved] = useState(initial.saved);
  const [message, setMessage] = useState(initial.message);
  const [selected, setSelected] = useState(initial.nodes[0].MENU_ID);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; position: Position; error?: string } | null>(null);
  const [resetting, setResetting] = useState(false);
  const pointerDrag = useRef<{ id: string; x: number; y: number; active: boolean; target?: { id: string; position: Position } } | null>(null);
  const editing = useRef<string | null>(null);
  const nodes = history.present;
  const flat = rows(nodes);
  const current = flat.find(r => r.node.MENU_ID === selected) ?? flat[0];
  const dirty = JSON.stringify(nodes) !== saved;
  const visible = flat.filter(r => {
    let parent = r.node.PARENT_ID;
    while (parent) { if (collapsed.has(parent)) return false; parent = nodes.find(n => n.MENU_ID === parent)?.PARENT_ID ?? null; }
    return true;
  });
  function change(next: MenuNode[], coalesce = false) {
    if (JSON.stringify(next) === JSON.stringify(nodes)) return;
    setHistory(h => ({ past: coalesce ? h.past : [...h.past.slice(-99), h.present], present: next, future: [] }));
  }
  function move(id: string, target: string, position: Position) {
    editing.current = null;
    const result = moveMenu(nodes, id, target, position);
    if (result.error) { setMessage(result.error); return; }
    change(result.nodes);
    setSelected(id);
    setCollapsed(new Set());
    setMessage('메뉴를 이동했습니다. 자손과 편집 내용도 함께 유지됩니다.');
  }
  function auxiliary(direction: 'up' | 'down' | 'indent' | 'outdent') {
    const target = auxiliaryTarget(nodes, current.node.MENU_ID, direction);
    if (target) move(current.node.MENU_ID, target.id, target.position);
  }
  function undo() { editing.current = null; setHistory(h => h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h); setMessage('이전 편집 상태로 돌아갔습니다.'); }
  function redo() { editing.current = null; setHistory(h => h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h); setMessage('편집을 다시 적용했습니다.'); }
  function patch(field: 'MENU_NAME' | 'DESCRIPTION' | 'MENU_TYPE', value: string) {
    const key = `${current.node.MENU_ID}:${field}`;
    change(nodes.map(n => n.MENU_ID === current.node.MENU_ID ? { ...n, [field]: value } : n), editing.current === key);
    editing.current = key;
  }
  function pointerMove(event: PointerEvent) {
    const drag = pointerDrag.current;
    if (!drag) return;
    if (!drag.active && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
    drag.active = true;
    setDragging(drag.id);
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-menu-id]');
    if (!hit) { drag.target = undefined; setDrop(null); return; }
    const box = hit.getBoundingClientRect();
    const ratio = (event.clientY - box.top) / box.height;
    const position: Position = ratio < .27 ? 'before' : ratio > .73 ? 'after' : 'inside';
    const id = hit.dataset.menuId!;
    drag.target = { id, position };
    setDrop({ id, position, error: moveMenu(nodes, drag.id, id, position).error });
    const tree = hit.closest('.mb-tree');
    if (tree) { const bounds = tree.getBoundingClientRect(); if (event.clientY > bounds.bottom - 35) tree.scrollTop += 12; else if (event.clientY < bounds.top + 35) tree.scrollTop -= 12; }
  }
  function pointerEnd() {
    const drag = pointerDrag.current;
    if (drag?.active && drag.target) move(drag.id, drag.target.id, drag.target.position);
    pointerDrag.current = null; setDragging(null); setDrop(null);
  }
  function dragOver(event: DragEvent, id: string) {
    if (!dragging) return;
    event.preventDefault();
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientY - box.top) / box.height;
    const position = ratio < .27 ? 'before' : ratio > .73 ? 'after' : 'inside';
    const result = moveMenu(nodes, dragging, id, position);
    event.dataTransfer.dropEffect = 'move';
    setDrop({ id, position, error: result.error });
  }
  return <main className="mb-workspace" onKeyDown={e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
  }}>
    <nav className="mb-breadcrumb"><span>STANDARD DESIGN</span><span>/</span><span>설계 실험실</span><span className="mb-local">독립 프로토타입 · DB 미연동</span></nav>
    <header className="mb-heading"><div><p className="mb-eyebrow">MENU BUILDER</p><h1>AI 메뉴 구성 초안</h1><p>메뉴 계층과 순서를 검토하고 확정합니다</p></div><div className="mb-heading-actions"><button onClick={() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes)); setSaved(JSON.stringify(nodes)); setMessage('이 브라우저에 초안을 저장했습니다. 서버·DB에는 저장하지 않습니다.'); } catch { setMessage('브라우저 저장에 실패했습니다. 현재 편집 내용은 화면에 유지됩니다.'); } }}>브라우저에 초안 저장</button><button disabled title="DB 미연동 시연 화면입니다">메뉴 확정 및 등록</button></div></header>
    <section className="mb-summary" aria-label="초안 요약"><strong><i />분석 초안 <small>예시 데이터</small></strong><span>메뉴 <b>{nodes.length}</b>개</span><span>현재 <b>{Math.max(...flat.map(r => r.depth))}Depth</b> / 최대 3Depth</span><span className="mb-dirty">{dirty ? '● 저장하지 않은 변경' : '변경 없음'}</span></section>
    <div className="mb-toolbar"><div><button onClick={undo} disabled={!history.past.length}>↶ Undo</button><button onClick={redo} disabled={!history.future.length}>↷ Redo</button><span>Ctrl/⌘ Z · Shift Z</span></div><div><button onClick={() => setCollapsed(new Set())}>모두 펼치기</button><button onClick={() => setCollapsed(new Set(nodes.filter(n => nodes.some(c => c.PARENT_ID === n.MENU_ID)).map(n => n.MENU_ID)))}>모두 접기</button><button onClick={() => setResetting(true)}>초안 초기화</button></div></div>
    {resetting && <div className="mb-confirm" role="alert">예시 초안으로 초기화합니다. Undo로 복구할 수 있으며 브라우저 저장본은 저장 버튼을 누를 때 바뀝니다.<button onClick={() => { change(sampleMenus); setSelected(sampleMenus[0].MENU_ID); setCollapsed(new Set()); setResetting(false); editing.current = null; setMessage('예시 초안으로 초기화했습니다.'); }}>초기화 실행</button><button onClick={() => setResetting(false)}>취소</button></div>}
    <div className="mb-columns"><section className="mb-tree-panel" aria-label="메뉴 구성"><div className="mb-section-title"><h2>메뉴 구조</h2><span>드래그로 순서·계층 변경</span></div><p className="mb-hint">행 위·아래는 같은 위치에 삽입 · 가운데는 하위로 이동</p>
      <div role="tree" aria-label="메뉴 초안" className="mb-tree" onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrop(null); }}>
      {visible.map(({ node, depth }) => {
        const hasChildren = nodes.some(n => n.PARENT_ID === node.MENU_ID);
        const activeDrop = drop?.id === node.MENU_ID ? drop : null;
        return <div key={node.MENU_ID} data-menu-id={node.MENU_ID} role="treeitem" aria-level={depth} aria-selected={current.node.MENU_ID === node.MENU_ID} aria-expanded={hasChildren ? !collapsed.has(node.MENU_ID) : undefined} tabIndex={0} draggable
          className={`mb-row ${current.node.MENU_ID === node.MENU_ID ? 'is-selected' : ''} ${dragging === node.MENU_ID ? 'is-dragging' : ''} ${activeDrop ? `drop-${activeDrop.error ? 'invalid' : activeDrop.position}` : ''}`}
          style={{ paddingLeft: 12 + (depth - 1) * 26 }} onClick={() => { setSelected(node.MENU_ID); editing.current = null; }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(node.MENU_ID); } }}
          onDragStart={e => { editing.current = null; setDragging(node.MENU_ID); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', node.MENU_ID); }} onDragOver={e => dragOver(e, node.MENU_ID)}
          onDrop={e => { e.preventDefault(); const source = e.dataTransfer.getData('text/plain'); const box = e.currentTarget.getBoundingClientRect(); const ratio = (e.clientY - box.top) / box.height; if (source) move(source, node.MENU_ID, ratio < .27 ? 'before' : ratio > .73 ? 'after' : 'inside'); setDragging(null); setDrop(null); }} onDragEnd={() => { setDragging(null); setDrop(null); }}>
          <span className="mb-grip" aria-hidden="true" onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); pointerDrag.current = { id: node.MENU_ID, x: e.clientX, y: e.clientY, active: false }; }} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={() => { pointerDrag.current = null; setDragging(null); setDrop(null); }}>⠿</span><button className="mb-toggle" aria-label={`${node.MENU_NAME} ${collapsed.has(node.MENU_ID) ? '펼치기' : '접기'}`} disabled={!hasChildren} onClick={e => { e.stopPropagation(); setCollapsed(s => { const next = new Set(s); if (next.has(node.MENU_ID)) next.delete(node.MENU_ID); else next.add(node.MENU_ID); return next; }); }}>{hasChildren ? collapsed.has(node.MENU_ID) ? '▸' : '▾' : '·'}</button><span className="mb-icon" aria-hidden="true">{node.MENU_TYPE === 'FOLDER' ? '▱' : '▤'}</span><span className="mb-name">{node.MENU_NAME || '이름 없는 메뉴'}</span><small>{depth}Depth</small>
        </div>;
      })}</div><p className={`mb-drop-feedback ${drop?.error ? 'is-error' : ''}`}>{drop ? drop.error ?? `${nodes.find(n => n.MENU_ID === drop.id)?.MENU_NAME} ${drop.position === 'inside' ? '하위로 이동' : drop.position === 'before' ? '앞에 삽입' : '뒤에 삽입'}` : '부모 메뉴를 이동하면 하위 메뉴도 함께 이동합니다.'}</p>
    </section><aside className="mb-editor" aria-label="선택 메뉴 편집"><div className="mb-section-title"><h2>메뉴 상세</h2><span>{current.depth}Depth</span></div><label>메뉴명<input value={current.node.MENU_NAME} maxLength={100} onBlur={() => { editing.current = null; }} onChange={e => patch('MENU_NAME', e.target.value)} /></label><label>설명<textarea value={current.node.DESCRIPTION} maxLength={2000} onBlur={() => { editing.current = null; }} onChange={e => patch('DESCRIPTION', e.target.value)} /></label><label>메뉴 유형<select value={current.node.MENU_TYPE} onChange={e => { editing.current = null; patch('MENU_TYPE', e.target.value); editing.current = null; }}><option value="FOLDER">폴더</option><option value="SCREEN">화면</option></select></label><p className="mb-hint">유형은 표시용입니다. 계층은 아래 이동 도구로 변경합니다.</p>
      <fieldset><legend>선택 메뉴 이동</legend><div className="mb-moves">{([['up', '↑ 위로'], ['down', '↓ 아래로'], ['indent', '→ 들여쓰기'], ['outdent', '← 내어쓰기']] as const).map(([direction, label]) => { const target = auxiliaryTarget(nodes, current.node.MENU_ID, direction); const error = target ? moveMenu(nodes, current.node.MENU_ID, target.id, target.position).error : '이동할 위치가 없습니다.'; return <button key={direction} disabled={!!error} title={error ?? label} onClick={() => auxiliary(direction)}>{label}</button>; })}</div></fieldset>
      <section className="mb-evidence"><h3>연결 요구사항 <small>예시</small></h3>{current.node.REQUIREMENTS.map(r => <div key={r.REQUIREMENT_ID}><small>{r.REQUIREMENT_ID}</small><p>{r.REQUIREMENT_NAME}</p></div>)}<h3>관련 그룹</h3><p>{current.node.GROUP_NAME}</p><h3>AI 추천 사유</h3><p>{current.node.AI_REASON}</p></section>
    </aside></div><footer className="mb-footer"><p role="status" aria-live="polite">{message}</p><span>DB·API·AI 호출 미연결 · 실제 등록 불가</span></footer>
  </main>;
}


