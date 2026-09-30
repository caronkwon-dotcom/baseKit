import type { ReactNode } from 'react';

interface MasterDetailMultiGridProps {
  master: ReactNode;
  detailTop: ReactNode;
  detailBottom: ReactNode;
  message?: ReactNode;
  equalRows?: boolean;
}

export default function MasterDetailMultiGrid({ master, detailTop, detailBottom, message, equalRows = false }: MasterDetailMultiGridProps) {
  return <div className={`multi-grid-workspace${equalRows ? ' equal-detail-rows' : ''}`}>
    <div className="master-detail-multi-grid">
      <div className="multi-grid-master">{master}</div>
      <div className="multi-grid-detail">
        <div className="multi-grid-detail-top">{detailTop}</div>
        <div className="multi-grid-detail-bottom">{detailBottom}</div>
      </div>
    </div>
    <div className="multi-grid-message-area" aria-live="polite">{message}</div>
  </div>;
}
