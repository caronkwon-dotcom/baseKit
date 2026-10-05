import { useRef, useState, type CSSProperties, type ReactNode, type PointerEvent, type KeyboardEvent } from 'react';

interface MasterDetailMultiGridProps {
  master: ReactNode;
  detailTop: ReactNode;
  detailBottom: ReactNode;
  message?: ReactNode;
  equalRows?: boolean;
  masterWidth?: string;
  stacked?: boolean;
  resizable?: boolean;
}

export default function MasterDetailMultiGrid({ master, detailTop, detailBottom, message, equalRows = false, masterWidth, stacked = false, resizable = false }: MasterDetailMultiGridProps) {
  const workspace = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const [topRatio, setTopRatio] = useState(60);
  const [leftRatio, setLeftRatio] = useState(40);
  const resize = (axis: 'top' | 'left', value: number) => {
    const area = axis === 'top' ? workspace.current : bottom.current;
    if (!area) return;
    const tokens = getComputedStyle(area);
    const dimension = axis === 'top' ? area.clientHeight : area.clientWidth;
    const available = dimension - parseFloat(tokens.getPropertyValue('--multi-grid-gap'));
    const minimum = parseFloat(tokens.getPropertyValue(axis === 'top' ? '--multi-grid-detail-top-min-height' : '--multi-grid-master-min-width'));
    const otherMinimum = parseFloat(tokens.getPropertyValue(axis === 'top' ? '--multi-grid-detail-bottom-min-height' : '--multi-grid-master-min-width'));
    const bounded = available < minimum + otherMinimum ? minimum / (minimum + otherMinimum) * 100
      : Math.max(minimum / available * 100, Math.min(100 - otherMinimum / available * 100, value));
    (axis === 'top' ? setTopRatio : setLeftRatio)(bounded);
  };
  const divider = (axis: 'top' | 'left') => {
    const ratio = axis === 'top' ? topRatio : leftRatio;
    const move = (event: PointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      const area = axis === 'top' ? workspace.current : bottom.current;
      if (!area) return;
      const rect = area.getBoundingClientRect();
      resize(axis, (axis === 'top' ? (event.clientY - rect.top) / rect.height : (event.clientX - rect.left) / rect.width) * 100);
    };
    const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Home') { event.preventDefault(); resize(axis, axis === 'top' ? 60 : 40); }
      else if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
        event.preventDefault(); resize(axis, ratio + (['ArrowLeft','ArrowUp'].includes(event.key) ? -2 : 2));
      }
    };
    return <div className={`multi-grid-splitter ${axis}`} role="separator" tabIndex={0} aria-label={axis === 'top' ? '프로그램 목록과 상세 높이 조절' : '권한 그룹과 Endpoint 너비 조절'} aria-orientation={axis === 'top' ? 'horizontal' : 'vertical'} aria-valuenow={Math.round(ratio)} aria-valuemin={0} aria-valuemax={100}
      onPointerDown={event => { if (event.button === 0) { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); } }} onPointerMove={move}
      onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onKeyDown={keyboard} />;
  };
  const style = masterWidth ? { '--multi-grid-master-width': masterWidth } as CSSProperties : undefined;
  if (stacked && resizable) return <div className="multi-grid-workspace" style={style}>
    <div ref={workspace} className="master-detail-multi-grid resizable-stacked-grid" style={{ gridTemplateRows: `minmax(var(--multi-grid-detail-top-min-height), ${topRatio}fr) var(--multi-grid-gap) minmax(var(--multi-grid-detail-bottom-min-height), ${100-topRatio}fr)` }}>
      <div className="multi-grid-master">{master}</div>{divider('top')}
      <div ref={bottom} className="multi-grid-detail resizable-grid-details" style={{ gridTemplateColumns: `minmax(var(--multi-grid-master-min-width), ${leftRatio}fr) var(--multi-grid-gap) minmax(var(--multi-grid-master-min-width), ${100-leftRatio}fr)` }}>
        <div className="multi-grid-detail-top">{detailTop}</div>{divider('left')}<div className="multi-grid-detail-bottom">{detailBottom}</div>
      </div>
    </div><div className="multi-grid-message-area" aria-live="polite">{message}</div>
  </div>;
  return <div className={`multi-grid-workspace${equalRows ? ' equal-detail-rows' : ''}${stacked ? ' stacked-grid-workspace' : ''}`} style={style}>
    <div className={`master-detail-multi-grid${stacked ? ' stacked-grid-layout' : ''}`}>
      <div className="multi-grid-master">{master}</div>
      <div className="multi-grid-detail">
        <div className="multi-grid-detail-top">{detailTop}</div>
        <div className="multi-grid-detail-bottom">{detailBottom}</div>
      </div>
    </div>
    <div className="multi-grid-message-area" aria-live="polite">{message}</div>
  </div>;
}
