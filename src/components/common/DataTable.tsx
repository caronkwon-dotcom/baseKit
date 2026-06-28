import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  title: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T) => string;
  emptyMessage?: string;
}

export default function DataTable<T>({
  title,
  columns,
  rows,
  getRowKey,
  onRowClick,
  getRowClassName,
  emptyMessage = '조회 결과가 없습니다.',
}: DataTableProps<T>) {
  return (
    <div className="data-section">
      <h2>{title}</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="empty-cell" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowClassNames = [
                  onRowClick ? 'clickable-row' : '',
                  getRowClassName?.(row) ?? '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <tr
                    key={getRowKey(row)}
                    className={rowClassNames}
                    onClick={() => onRowClick?.(row)}
                  >
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
