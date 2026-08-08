import { useState } from 'react';

export type SearchPanelRows = 1 | 2 | 3 | 4 | 5;
export type SearchControlType = 'text' | 'select' | 'date';

export interface SearchFieldOption {
  value: string;
  label: string;
}

export interface SearchFieldConfig<T extends object> {
  key: Extract<keyof T, string>;
  label: string;
  controlType?: SearchControlType;
  placeholder?: string;
  options?: SearchFieldOption[];
}

interface SearchPanelProps<T extends object> {
  fields: SearchFieldConfig<T>[];
  value: T;
  initialValue: T;
  onValueChange: (nextValue: T) => void;
  onSearch: (condition: T) => void;
  onReset?: (initialValue: T) => void;
  rows?: SearchPanelRows;
}

const SEARCH_COLUMN_COUNT = 4;

function ResetIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6" /></svg>;
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={expanded ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} /></svg>;
}

export default function SearchPanel<T extends object>({
  fields,
  value,
  initialValue,
  onValueChange,
  onSearch,
  onReset,
  rows = 1,
}: SearchPanelProps<T>) {
  const [collapsed, setCollapsed] = useState(false);
  const maxConditionCount = rows * SEARCH_COLUMN_COUNT;

  if (fields.length > maxConditionCount) {
    throw new Error(
      `SearchPanel ${rows}단은 검색조건을 최대 ${maxConditionCount}개까지 배치할 수 있습니다.`,
    );
  }

  const collapsible = rows > 1;
  const visibleFields = collapsed ? fields.slice(0, SEARCH_COLUMN_COUNT) : fields;
  const hiddenCount = fields.length - visibleFields.length;

  const updateValue = (key: Extract<keyof T, string>, nextFieldValue: string) => {
    onValueChange({ ...value, [key]: nextFieldValue });
  };

  const reset = () => {
    const nextInitialValue = { ...initialValue };
    onValueChange(nextInitialValue);
    onReset?.(nextInitialValue);
  };

  return (
    <section className="search-panel" aria-label="조회 조건">
      <div className={`search-panel-layout search-panel-rows-${rows}${collapsed ? ' collapsed' : ''}`}>
        <div className="search-grid">
          {visibleFields.map((field) => {
            const fieldValue = String(value[field.key] ?? '');
            return (
              <label key={field.key}>
                <span>{field.label}</span>
                {field.controlType === 'select' ? (
                  <select value={fieldValue} onChange={(event) => updateValue(field.key, event.target.value)}>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.controlType ?? 'text'}
                    value={fieldValue}
                    placeholder={field.placeholder}
                    onChange={(event) => updateValue(field.key, event.target.value)}
                  />
                )}
              </label>
            );
          })}
        </div>

        {collapsed && hiddenCount > 0 ? (
          <button type="button" className="hidden-condition-indicator" onClick={() => setCollapsed(false)}>
            +{hiddenCount} 추가조건 <ChevronIcon expanded={false} />
          </button>
        ) : null}

        <div className="search-action-rail">
          <button type="button" className="search-submit-button" onClick={() => onSearch(value)}>조회</button>
          <div className="search-icon-actions">
            <button type="button" className="search-icon-button" aria-label="검색조건 초기화" title="검색조건 초기화" onClick={reset}>
              <ResetIcon />
            </button>
            {collapsible ? (
              <button
                type="button"
                className="search-icon-button"
                aria-label={collapsed ? '검색조건 펼치기' : '검색조건 접기'}
                title={collapsed ? '검색조건 펼치기' : '검색조건 접기'}
                onClick={() => setCollapsed((current) => !current)}
              >
                <ChevronIcon expanded={!collapsed} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
