import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** 고정 폭(px). 식별자, 상태, 날짜처럼 예측 가능한 컬럼에 사용한다. */
  width?: number;
  /** 가변 컬럼의 최소 폭(px). */
  minWidth?: number;
  /** 남은 폭을 나누는 비율. width가 있으면 width를 우선한다. */
  flex?: number;
  align?: 'left' | 'center' | 'right';
  truncate?: boolean;
}

export interface DataTableProps<T> {
  title?: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T) => string;
  emptyMessage?: string;
  selectedRowKeys?: Set<string>;
  onSelectedRowKeysChange?: (keys: Set<string>) => void;
}

export default function DataTable<T>({
  title,
  columns,
  rows,
  getRowKey,
  onRowClick,
  getRowClassName,
  emptyMessage = '조회 결과가 없습니다.',
  selectedRowKeys,
  onSelectedRowKeysChange,
}: DataTableProps<T>) {
  const selectable = Boolean(selectedRowKeys && onSelectedRowKeysChange);
  const rowKeys = rows.map(getRowKey);
  const allSelected = rowKeys.length > 0 && rowKeys.every((key) => selectedRowKeys?.has(key));
  const fixedWidth = columns.reduce((sum, column) => sum + (column.width ?? 0), selectable ? 34 : 0);
  const totalFlex = columns.reduce((sum, column) => sum + (column.width ? 0 : column.flex ?? 1), 0);

  const getColumnStyle = (column: DataTableColumn<T>) => {
    if (column.width) return { width: `${column.width}px`, minWidth: `${column.width}px` };
    const ratio = (column.flex ?? 1) / totalFlex;
    const calculated = `calc((100% - ${fixedWidth}px) * ${ratio})`;
    return {
      width: column.minWidth ? `max(${column.minWidth}px, ${calculated})` : calculated,
      minWidth: column.minWidth ? `${column.minWidth}px` : undefined,
    };
  };

  const toggleAll = () => {
    onSelectedRowKeysChange?.(allSelected ? new Set() : new Set(rowKeys));
  };

  const toggleRow = (rowKey: string) => {
    const next = new Set(selectedRowKeys);
    if (next.has(rowKey)) next.delete(rowKey);
    else next.add(rowKey);
    onSelectedRowKeysChange?.(next);
  };

  return (
    <div className="data-section">
      {title && <h2>{title}</h2>}
      <div className="table-wrap standard-table-wrap">
        <table className="standard-data-table">
          <colgroup>
            {selectable ? <col style={{ width: '34px' }} /> : null}
            {columns.map((column) => <col key={column.key} style={getColumnStyle(column)} />)}
          </colgroup>
          <thead>
            <tr>
              {selectable && (
                <th className="selection-cell">
                  <input
                    type="checkbox"
                    aria-label="전체 선택"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th key={column.key} className={`cell-${column.align ?? 'left'}`}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="empty-cell" colSpan={columns.length + (selectable ? 1 : 0)}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowKey = getRowKey(row);
                const rowClassNames = [
                  onRowClick ? 'clickable-row' : '',
                  selectedRowKeys?.has(rowKey) ? 'selected-row' : '',
                  getRowClassName?.(row) ?? '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <tr
                    key={rowKey}
                    className={rowClassNames}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="selection-cell">
                        <input
                          type="checkbox"
                          aria-label={`${rowKey} 선택`}
                          checked={selectedRowKeys?.has(rowKey) ?? false}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleRow(rowKey)}
                        />
                      </td>
                    )}
                    {columns.map((column) => {
                      const content = column.render(row);
                      const title = typeof content === 'string' || typeof content === 'number' ? String(content) : undefined;
                      return (
                        <td key={column.key} className={`cell-${column.align ?? 'left'}`}>
                          <span className={column.truncate === false ? undefined : 'cell-content'} title={title}>{content}</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
