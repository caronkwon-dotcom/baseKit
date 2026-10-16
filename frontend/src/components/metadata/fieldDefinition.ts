export type FieldDataType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'DATETIME';
export type FieldControlType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'SWITCH' | 'SELECT' | 'DATE_PICKER' | 'COLOR_PICKER';
export type FormLabelPosition = 'LEFT' | 'TOP';
export type FieldDisplayType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'DATETIME' | 'COLOR' | 'BADGE';

export interface FieldOption { value: string; label: string }

export interface FieldDefinition {
  key: string;
  label: string;
  dataType: FieldDataType;
  controlType: FieldControlType;
  displayType: FieldDisplayType;
  required?: boolean;
  /** Form presentation only; textarea defaults to TOP, other controls to LEFT. */
  labelPosition?: FormLabelPosition;
  maxLength?: number;
  defaultValue?: string;
  optionSource?: string;
  options?: FieldOption[];
  /** Opt in to a persistent SELECT control in editable grids. */
  gridControlDisplay?: 'always';
}
