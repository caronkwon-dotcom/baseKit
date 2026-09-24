import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import type { DataTableColumn } from '../common/DataTable';
import type { FieldDefinition } from '../metadata/fieldDefinition';

export interface GridFields<T> {
  fields?: FieldDefinition[];
  getFieldValue?: (row: T, field: FieldDefinition) => string | undefined;
}

/** Editing is opt-in and immutable. Persistence/validation remain BaseKit responsibilities. */
export interface GridEditing<T> {
  mode?: 'cell' | 'row';
  keys: string[];
  onChange: (row: T, key: string, value: string) => void;
}

export function renderMetadataValue(value: string, field: FieldDefinition) {
  if (!value) return '-';
  if (field.displayType === 'COLOR') return <span className="metadata-color-value"><i style={{ background: value }} />{value}</span>;
  const label = field.options?.find(option => option.value === value)?.label ?? value;
  if (field.displayType === 'BADGE') return <span className="metadata-badge">{label}</span>;
  if (field.displayType === 'BOOLEAN') return value === 'true' ? '예' : '아니오';
  return label;
}

export function toGridColumns<T>(columns: DataTableColumn<T>[], metadata: GridFields<T>, editing?: GridEditing<T>): ColDef<T>[] {
  return [
    ...columns.map((column): ColDef<T> => ({
      colId: column.key, headerName: column.header, headerTooltip: column.header,
      initialWidth: column.width, minWidth: column.minWidth ?? Math.min(column.width ?? 100, 48),
      initialFlex: column.width ? undefined : column.flex ?? 1,
      cellClass: `basekit-grid-cell-${column.align ?? 'left'}`,
      cellDataType: false,
      valueGetter: params => {
        if (!params.data) return null;
        const raw = (params.data as Record<string, unknown>)[column.key];
        if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return raw;
        const rendered = column.render(params.data);
        return typeof rendered === 'string' || typeof rendered === 'number' ? rendered : null;
      },
      cellRenderer: (params: ICellRendererParams<T>) => params.data ? column.render(params.data) : null,
      tooltipValueGetter: params => params.value == null ? '' : String(params.value),
      editable: editing?.keys.includes(column.key) ?? false,
    })),
    ...(metadata.fields ?? []).map((field): ColDef<T> => ({
      colId: `ATTRIBUTE_${field.key}`, headerName: field.label, headerTooltip: field.label,
      initialWidth: field.displayType === 'COLOR' ? 112 : field.dataType === 'BOOLEAN' ? 76 : undefined,
      minWidth: field.dataType === 'BOOLEAN' ? 76 : 100,
      initialFlex: field.displayType === 'COLOR' || field.dataType === 'BOOLEAN' ? undefined : 0.8,
      cellClass: `basekit-grid-cell-${field.dataType === 'NUMBER' ? 'right' : field.dataType === 'BOOLEAN' ? 'center' : 'left'}`,
      cellDataType: false,
      valueGetter: params => {
        const value = params.data ? metadata.getFieldValue?.(params.data, field) : undefined;
        if (value == null || value === '') return null;
        return field.dataType === 'NUMBER' ? Number(value) : field.dataType === 'BOOLEAN' ? value === 'true' : value;
      },
      cellRenderer: (params: ICellRendererParams<T>) => renderMetadataValue(params.value == null ? '' : String(params.value), field),
      tooltipValueGetter: params => params.value == null ? '' : String(params.value),
      editable: editing?.keys.includes(`ATTRIBUTE_${field.key}`) ?? false,
      cellEditor: field.controlType === 'SELECT' ? 'agSelectCellEditor' : field.dataType === 'BOOLEAN' ? 'agCheckboxCellEditor' : field.dataType === 'NUMBER' ? 'agNumberCellEditor' : 'agTextCellEditor',
      cellEditorParams: field.controlType === 'SELECT' ? { values: (field.options ?? []).map(option => option.value) } : undefined,
    })),
  ];
}
