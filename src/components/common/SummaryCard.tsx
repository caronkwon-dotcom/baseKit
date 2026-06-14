import type { ReactNode } from 'react';

interface SummaryCardProps {
  label: string;
  value: ReactNode;
}

export default function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
