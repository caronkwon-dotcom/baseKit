import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
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
      <div className="table-wrap">
        <table>
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
                <th key={column.key}>{column.header}</th>
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
                    {columns.map((column) => (
                      <td key={column.key}>{column.render(row)}</td>
                    ))}
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
