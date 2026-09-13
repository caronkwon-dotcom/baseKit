import { useMemo } from 'react';
import ProgramDataGrid, { type ProgramDataGridProps } from '../common/ProgramDataGrid';
import type { DataTableColumn } from '../common/DataTable';
import type { FieldDefinition } from './fieldDefinition';

interface MetadataDataGridProps<T> extends Omit<ProgramDataGridProps<T>, 'columns'> {
  baseColumns: DataTableColumn<T>[];
  fields: FieldDefinition[];
  getFieldValue: (row: T, field: FieldDefinition) => string | undefined;
}

function renderValue(value: string, field: FieldDefinition) {
  if (!value) return '-';
  if (field.displayType === 'COLOR') return <span className="metadata-color-value"><i style={{ background: value }} />{value}</span>;
  if (field.displayType === 'BADGE') {
    const label = field.options?.find((option) => option.value === value)?.label ?? value;
    return <span className="metadata-badge">{label}</span>;
  }
  if (field.displayType === 'BOOLEAN') return value === 'true' ? '예' : '아니오';
  return field.options?.find((option) => option.value === value)?.label ?? value;
}

export default function MetadataDataGrid<T>({ baseColumns, fields, getFieldValue, ...gridProps }: MetadataDataGridProps<T>) {
  const columns = useMemo<DataTableColumn<T>[]>(() => [
    ...baseColumns,
    ...fields.map((field): DataTableColumn<T> => ({
      key: `ATTRIBUTE_${field.key}`,
      header: field.label,
      width: field.displayType === 'COLOR' ? 112 : field.dataType === 'BOOLEAN' ? 76 : undefined,
      minWidth: field.displayType === 'COLOR' || field.dataType === 'BOOLEAN' ? undefined : 100,
      flex: field.displayType === 'COLOR' || field.dataType === 'BOOLEAN' ? undefined : 0.8,
      align: field.dataType === 'NUMBER' ? 'right' : field.dataType === 'BOOLEAN' ? 'center' : 'left',
      render: (row) => renderValue(getFieldValue(row, field) ?? '', field),
    })),
  ], [baseColumns, fields, getFieldValue]);
  return <ProgramDataGrid {...gridProps} columns={columns} />;
}
