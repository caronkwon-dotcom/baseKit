import { useMemo, useState } from 'react';
import { COMMON_ACTIONS, type ActionCode } from '../../constants/actionCodes';
import { hasAction, metadataRepository, programByKey } from '../../repositories/metadataRepository';
import type { ProgramKey } from '../../types/adminShell';
import DataTable, { type DataTableColumn, type DataTableProps } from './DataTable';
import type { ReactNode } from 'react';
import ActionButton, { type ActionButtonDisplay, type ActionButtonTone } from './ActionButton';

const GRID_ACTION_CODES = [
  COMMON_ACTIONS.CREATE,
  COMMON_ACTIONS.UPDATE,
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
export interface GridToolbarAction<T> { actionCode: ActionCode; label: string; tone?: ActionButtonTone; disabled?: boolean; onClick: (context: GridActionContext<T>) => void; }

export interface ProgramDataGridProps<T> {
  renderTable?: (props: DataTableProps<T>) => ReactNode;
  programKey: ProgramKey;
  roleCode: string;
  title?: string;
  metrics?: GridMetric[];
  actionHandlers?: GridActionHandlers<T>;
  toolbarActions?: GridToolbarAction<T>[];
  buttonDisplay?: ActionButtonDisplay;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  selectable?: boolean;
  scrollSample?: boolean;
  selectedRowKeys?: Set<string>;
  onSelectedRowKeysChange?: (keys: Set<string>) => void;
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T) => string;
}

export default function ProgramDataGrid<T>({
  programKey,
  roleCode,
  title,
  metrics = [],
  actionHandlers = {},
  toolbarActions,
  buttonDisplay = 'text',
  columns,
  rows,
  getRowKey,
  emptyMessage,
  selectable = true,
  scrollSample = false,
  selectedRowKeys: controlledSelectedRowKeys,
  onSelectedRowKeysChange,
  onRowClick,
  getRowClassName,
  renderTable = (tableProps) => <DataTable {...tableProps} />,
}: ProgramDataGridProps<T>) {
  const [internalSelectedRowKeys, setInternalSelectedRowKeys] = useState<Set<string>>(new Set());
  const selectedRowKeys = controlledSelectedRowKeys ?? internalSelectedRowKeys;
  const setSelectedRowKeys = onSelectedRowKeysChange ?? setInternalSelectedRowKeys;
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
          {toolbarActions ? toolbarActions.map((action) => <ActionButton key={action.actionCode} actionCode={action.actionCode} label={action.label} tone={action.tone} display={buttonDisplay} disabled={action.disabled} onClick={() => action.onClick({ rows, selectedRows })} />) : visibleActions.map((actionCode) => {
            const actionName = actionNames.get(actionCode) ?? actionCode;
            const iconOnly = actionCode === COMMON_ACTIONS.EXCEL_DOWNLOAD;
            return (
              <ActionButton key={actionCode} actionCode={actionCode} label={actionName} display={iconOnly ? 'icon' : buttonDisplay} tone={actionCode === COMMON_ACTIONS.DELETE ? 'danger' : 'default'} onClick={() => actionHandlers[actionCode]?.({ rows, selectedRows })} />
            );
          })}
        </div>
      </div>
      {renderTable({ columns, rows, getRowKey, emptyMessage, selectedRowKeys: selectable ? selectedRowKeys : undefined, onSelectedRowKeysChange: selectable ? setSelectedRowKeys : undefined, onRowClick, getRowClassName })}
    </section>
  );
}
