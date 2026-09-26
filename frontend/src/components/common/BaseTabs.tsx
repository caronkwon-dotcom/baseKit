import type { ReactNode } from 'react';
import './baseTabs.css';

export interface BaseTabDefinition {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

interface BaseTabsProps {
  tabs: BaseTabDefinition[];
  activeTab: string;
  onChange: (tabId: string) => void;
  ariaLabel?: string;
}

export default function BaseTabs({ tabs, activeTab, onChange, ariaLabel = '상세 탭' }: BaseTabsProps) {
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  if (!active) return null;

  return (
    <div className="base-tabs">
      <div className="base-tabs__list" role="tablist" aria-label={ariaLabel}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`base-tab-${tab.id}`}
            className={`base-tabs__tab${tab.id === active.id ? ' is-active' : ''}`}
            aria-selected={tab.id === active.id}
            aria-controls={`base-tab-panel-${tab.id}`}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id={`base-tab-panel-${active.id}`}
        className="base-tabs__panel"
        role="tabpanel"
        aria-labelledby={`base-tab-${active.id}`}
      >
        {active.content}
      </div>
    </div>
  );
}
