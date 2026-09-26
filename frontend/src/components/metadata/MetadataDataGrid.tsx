import { useMemo } from 'react';
import ProgramDataGrid, { type ProgramDataGridProps } from '../common/ProgramDataGrid';
import type { DataTableColumn } from '../common/DataTable';
import type { FieldDefinition } from './fieldDefinition';
import { renderMetadataValue } from '../grid/gridColumnAdapter';
import { toMetadataColumnKey } from '../grid/metadataColumnKey';

interface MetadataDataGridProps<T> extends Omit<ProgramDataGridProps<T>, 'columns'> {
  baseColumns: DataTableColumn<T>[];
  fields: FieldDefinition[];
  getFieldValue: (row: T, field: FieldDefinition) => string | undefined;
}

export default function MetadataDataGrid<T>({ baseColumns, fields, getFieldValue, ...gridProps }: MetadataDataGridProps<T>) {
  const columns = useMemo<DataTableColumn<T>[]>(() => [
    ...baseColumns,
    ...fields.map((field): DataTableColumn<T> => ({
      key: toMetadataColumnKey(field.key),
      header: field.label,
      width: field.displayType === 'COLOR' ? 112 : field.dataType === 'BOOLEAN' ? 76 : undefined,
      minWidth: field.displayType === 'COLOR' || field.dataType === 'BOOLEAN' ? undefined : 100,
      flex: field.displayType === 'COLOR' || field.dataType === 'BOOLEAN' ? undefined : 0.8,
      align: field.dataType === 'NUMBER' ? 'right' : field.dataType === 'BOOLEAN' ? 'center' : 'left',
      render: (row) => renderMetadataValue(getFieldValue(row, field) ?? '', field),
    })),
  ], [baseColumns, fields, getFieldValue]);
  return <ProgramDataGrid {...gridProps} columns={columns} />;
}
