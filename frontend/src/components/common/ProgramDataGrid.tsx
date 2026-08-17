import { useMemo, useState } from 'react';
import { COMMON_ACTIONS, type ActionCode } from '../../constants/actionCodes';
import { hasAction, metadataRepository, programByKey } from '../../repositories/metadataRepository';
import type { ProgramKey } from '../../types/adminShell';
import DataTable, { type DataTableColumn } from './DataTable';

const GRID_ACTION_CODES = [
  COMMON_ACTIONS.CREATE,
  COMMON_ACTIONS.DELETE,
  COMMON_ACTIONS.EXCEL_DOWNLOAD,
] as const;

export interface GridMetric {
  label: string;
  value: number;
  tone?: 'default' | 'accent' | 'danger';
}

export interface GridActionContext<T> {
  rows: T[];
  selectedRows: T[];
}

export type GridActionHandlers<T> = Partial<
  Record<ActionCode, (context: GridActionContext<T>) => void>
>;

interface ProgramDataGridProps<T> {
  programKey: ProgramKey;
  roleCode: string;
  title?: string;
  metrics?: GridMetric[];
  actionHandlers?: GridActionHandlers<T>;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  selectable?: boolean;
  scrollSample?: boolean;
}

function ExcelIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5M9 12l5 5m0-5-5 5" />
    </svg>
  );
}

export default function ProgramDataGrid<T>({
  programKey,
  roleCode,
  title,
  metrics = [],
  actionHandlers = {},
  columns,
  rows,
  getRowKey,
  emptyMessage,
  selectable = true,
  scrollSample = false,
}: ProgramDataGridProps<T>) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
  const program = programByKey[programKey];
  const actionNames = useMemo(
    () => new Map(metadataRepository.getActions().map((action) => [action.actionCode, action.actionName])),
    [],
  );
  const menuName = metadataRepository.getMenuNameByProgram(programKey);
  const resolvedTitle = title ?? `${menuName ?? program.programName} 목록`;
  const visibleActions = GRID_ACTION_CODES.filter(
    (actionCode) => program.actionCodes.includes(actionCode) && hasAction(roleCode, programKey, actionCode),
  );
  const selectedRows = rows.filter((row) => selectedRowKeys.has(getRowKey(row)));

  return (
    <section className={scrollSample ? 'program-data-grid scroll-sample' : 'program-data-grid'} aria-label={resolvedTitle}>
      <div className="grid-toolbar">
        <div className="grid-heading-group">
          <h2>{resolvedTitle}</h2>
          <span className="grid-total">총 <strong>{rows.length}</strong>건</span>
          {metrics.map((metric) => (
            <span key={metric.label} className={`grid-metric ${metric.tone ?? 'default'}`}>
              {metric.label} <strong>{metric.value}</strong>건
            </span>
          ))}
        </div>
        <div className="grid-actions" aria-label="목록 기능">
          {visibleActions.map((actionCode) => {
            const actionName = actionNames.get(actionCode) ?? actionCode;
            const iconOnly = actionCode === COMMON_ACTIONS.EXCEL_DOWNLOAD;
            return (
              <button
                key={actionCode}
                type="button"
                className={iconOnly ? 'grid-icon-button excel' : actionCode === COMMON_ACTIONS.DELETE ? 'danger-button' : 'primary-button'}
                data-action-code={actionCode}
                aria-label={actionName}
                title={actionName}
                onClick={() => actionHandlers[actionCode]?.({ rows, selectedRows })}
              >
                {iconOnly ? <ExcelIcon /> : actionName}
              </button>
            );
          })}
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={getRowKey}
        emptyMessage={emptyMessage}
        selectedRowKeys={selectable ? selectedRowKeys : undefined}
        onSelectedRowKeysChange={selectable ? setSelectedRowKeys : undefined}
      />
    </section>
  );
}
