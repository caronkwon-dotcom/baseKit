import type { CSSProperties, ReactNode } from 'react';

interface MasterDetailMultiGridProps {
  master: ReactNode;
  detailTop: ReactNode;
  detailBottom: ReactNode;
  message?: ReactNode;
  equalRows?: boolean;
  masterWidth?: string;
  stacked?: boolean;
}

export default function MasterDetailMultiGrid({ master, detailTop, detailBottom, message, equalRows = false, masterWidth, stacked = false }: MasterDetailMultiGridProps) {
  const style = masterWidth ? { '--multi-grid-master-width': masterWidth } as CSSProperties : undefined;
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
