export type FieldDataType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'DATETIME';
export type FieldControlType = 'TEXT' | 'NUMBER' | 'SWITCH' | 'SELECT' | 'DATE_PICKER' | 'COLOR_PICKER';
export type FieldDisplayType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'DATETIME' | 'COLOR' | 'BADGE';

export interface FieldOption { value: string; label: string }

export interface FieldDefinition {
  key: string;
  label: string;
  dataType: FieldDataType;
  controlType: FieldControlType;
  displayType: FieldDisplayType;
  required: boolean;
  maxLength?: number;
  defaultValue?: string;
  optionSource?: string;
  options?: FieldOption[];
}
