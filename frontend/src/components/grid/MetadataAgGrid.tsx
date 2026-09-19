import BaseKitDataGrid, { type BaseKitDataGridProps } from './BaseKitDataGrid';
import type { DataTableColumn } from '../common/DataTable';
import type { FieldDefinition } from '../metadata/fieldDefinition';

interface MetadataAgGridProps<T> extends Omit<BaseKitDataGridProps<T>, 'columns' | 'fields' | 'getFieldValue'> {
  baseColumns: DataTableColumn<T>[];
  fields: FieldDefinition[];
  getFieldValue: (row: T, field: FieldDefinition) => string | undefined;
}

export default function MetadataAgGrid<T>({ baseColumns, ...props }: MetadataAgGridProps<T>) {
  return <BaseKitDataGrid {...props} columns={baseColumns} />;
}
