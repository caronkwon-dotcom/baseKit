import type { ColDef, EditableCallbackParams, ICellRendererParams, ITooltipParams, ValueGetterParams } from 'ag-grid-community';
import type { DataTableColumn } from '../common/DataTable';
import type { FieldDefinition } from '../metadata/fieldDefinition';
import { toMetadataColumnKey } from './metadataColumnKey';
import { RowStateIcon, ColorCellEditor, TextLengthCellEditor, MetadataSwitch } from './gridCellComponents';
import { validateGridField } from './gridFieldValidation';
import type { GridRowState } from './gridRowState';

export interface GridEditing<T> {
  mode?: 'cell' | 'row';
  keys: string[];
  onChange: (row: T, key: string, value: string) => void;
  isEditable?: (row: T, key: string) => boolean;
}

export interface GridColumnOptions<T> {
  columns: DataTableColumn<T>[];
  fields: FieldDefinition[];
  getFieldValue?: (row: T, field: FieldDefinition) => string | undefined;
  editing?: GridEditing<T>;
  getRowState?: (row: T) => GridRowState;
  validationClass: (row: T, key: string, field?: FieldDefinition) => string;
  changeSwitch: (row: T, key: string, value: string, field: FieldDefinition) => void;
}

export function renderMetadataValue(value: string, field: FieldDefinition) {
  if (!value) return '-';
  if (field.displayType === 'COLOR') return <span className="metadata-color-value"><i style={{ background: value }} />{value}</span>;
  const label = field.options?.find(option => option.value === value)?.label ?? value;
  if (field.displayType === 'BADGE') return <span className="metadata-badge">{label}</span>;
  if (field.displayType === 'BOOLEAN') return value === 'true' ? '예' : '아니오';
  return label;
}

export function canEditGridCell<T>(row: T, key: string, editing?: GridEditing<T>, getRowState?: (row: T) => GridRowState, policy: 'always' | 'insert-only' | 'read-only' = 'always') {
  if (!editing?.keys.includes(key) || policy === 'read-only') return false;
  const state = getRowState?.(row) ?? 'NORMAL';
  if (state === 'DELETED' || (policy === 'insert-only' && state !== 'INSERTED')) return false;
  return editing.isEditable?.(row, key) ?? true;
}

const alignment = (field?: FieldDefinition, fallback: 'left' | 'center' | 'right' = 'left') =>
  field?.dataType === 'NUMBER' ? 'right' : field?.controlType === 'SWITCH' || field?.dataType === 'BOOLEAN' ? 'center' : fallback;

const displayValue = (value: unknown, field?: FieldDefinition) => {
  if (field?.dataType !== 'NUMBER') return value ?? '';
  const normalized = String(value ?? '').trim();
  if (!normalized) return '';
  const numeric = typeof value === 'number' ? value : Number(normalized);
  return Number.isFinite(numeric) ? numeric : '';
};

const editorForField = (field?: FieldDefinition) =>
  field?.controlType === 'SELECT' ? 'agSelectCellEditor'
    : field?.controlType === 'COLOR_PICKER' ? ColorCellEditor
      : field?.dataType === 'NUMBER' ? 'agNumberCellEditor'
        : field?.dataType === 'DATE' ? 'agDateStringCellEditor'
          : field?.maxLength ? TextLengthCellEditor : 'agTextCellEditor';

const editorParamsForField = (field?: FieldDefinition) =>
  field?.controlType === 'SELECT' ? { values: field.options?.map((option) => option.value) ?? [] }
    : field?.maxLength ? { maxLength: field.maxLength } : undefined;

export function toGridColumns<T>({ columns, fields, getFieldValue, editing, getRowState, validationClass, changeSwitch }: GridColumnOptions<T>): ColDef<T>[] {
  const isEditable = (row: T, key: string, policy?: 'always' | 'insert-only' | 'read-only') =>
    canEditGridCell(row, key, editing, getRowState, policy);

  return [
    ...(getRowState ? [{
      colId: '__GRID_ROW_STATE', headerName: '', width: 30, minWidth: 30, maxWidth: 30,
      sortable: false, filter: false, resizable: false, suppressHeaderMenuButton: true, lockPosition: 'left' as const,
      cellClass: 'basekit-row-state-cell',
      cellRenderer: (params: ICellRendererParams<T>) => {
        if (!params.data) return null;
        const state = getRowState(params.data);
        return state === 'NORMAL' ? null : <RowStateIcon state={state} />;
      },
    } satisfies ColDef<T>] : []),
    ...columns.map((column): ColDef<T> => {
      const field = column.fieldDefinition;
      return {
        colId: column.key, headerName: column.header, initialWidth: column.width, minWidth: field?.controlType === 'SWITCH' ? Math.max(column.minWidth ?? 0, 64) : column.minWidth,
        flex: column.width ? undefined : column.flex ?? 1,
        valueGetter: (params: ValueGetterParams<T>) => params.data ? displayValue((params.data as Record<string, unknown>)[column.key], field) : '',
        cellRenderer: (params: ICellRendererParams<T>) => {
          if (!params.data) return null;
          const editable = isEditable(params.data, column.key, column.editPolicy);
          if (field?.controlType === 'SWITCH') return <MetadataSwitch value={(params.data as Record<string, unknown>)[column.key]} field={field} editable={editable} onChange={(value) => changeSwitch(params.data!, column.key, value, field)} />;
          if (field && (field.controlType === 'SELECT' || field.displayType === 'COLOR' || field.displayType === 'BADGE' || field.displayType === 'BOOLEAN')) return renderMetadataValue(String(params.value ?? ''), field);
          if (field?.dataType === 'NUMBER') return params.value;
          return column.render(params.data);
        },
        cellClass: (params: EditableCallbackParams<T>) => params.data ? [isEditable(params.data, column.key, column.editPolicy) ? 'basekit-editable-cell' : '', field?.controlType === 'SWITCH' ? 'basekit-grid-switch-cell' : '', `basekit-grid-cell-${alignment(field, column.align)}`, validationClass(params.data, column.key, field)].filter(Boolean).join(' ') : '',
        editable: (params: EditableCallbackParams<T>) => Boolean(params.data && field?.controlType !== 'SWITCH' && isEditable(params.data, column.key, column.editPolicy)),
        cellEditor: editorForField(field),
        cellEditorParams: editorParamsForField(field),
        tooltipValueGetter: (params: ITooltipParams<T>) => field && validateGridField(params.value, field) ? `${field.label}: ${validateGridField(params.value, field)}` : String(params.value ?? ''),
      };
    }),
    ...fields.map((field): ColDef<T> => {
      const key = toMetadataColumnKey(field.key);
      return {
        colId: key, headerName: field.label, flex: 1, minWidth: field.controlType === 'SWITCH' ? 64 : 100,
        valueGetter: (params: ValueGetterParams<T>) => params.data ? displayValue(getFieldValue?.(params.data, field), field) : '',
        cellClass: (params: EditableCallbackParams<T>) => params.data ? [isEditable(params.data, key) ? 'basekit-editable-cell' : '', field.controlType === 'SWITCH' ? 'basekit-grid-switch-cell' : '', `basekit-grid-cell-${alignment(field)}`, validationClass(params.data, key, field)].filter(Boolean).join(' ') : '',
        cellRenderer: (params: ICellRendererParams<T>) => {
          if (!params.data) return null;
          if (field.controlType === 'SWITCH') return <MetadataSwitch value={getFieldValue?.(params.data, field)} field={field} editable={isEditable(params.data, key)} onChange={(value) => changeSwitch(params.data!, key, value, field)} />;
          return renderMetadataValue(params.value == null ? '' : String(params.value), field);
        },
        editable: (params: EditableCallbackParams<T>) => Boolean(params.data && field.controlType !== 'SWITCH' && isEditable(params.data, key)),
        cellEditor: editorForField(field),
        cellEditorParams: editorParamsForField(field),
        tooltipValueGetter: (params: ITooltipParams<T>) => validateGridField(params.value, field) ? `${field.label}: ${validateGridField(params.value, field)}` : String(params.value ?? ''),
      };
    }),
  ];
}
