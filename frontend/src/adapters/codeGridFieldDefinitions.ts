import type { FieldControlType, FieldDataType, FieldDefinition, FieldDisplayType, FieldOption } from '../components/metadata/fieldDefinition';
import schemaTablesJson from '../../meta/schema-tables.json';

interface SchemaFieldSource {
  tableKey: string;
  columns: Array<{ physicalName: string; dataType: string }>;
}

const schemaTables = schemaTablesJson as SchemaFieldSource[];

const maxLengthFromSchema = (tableKey: string, key: string) => {
  const dataType = schemaTables.find((table) => table.tableKey === tableKey)?.columns.find((column) => column.physicalName === key)?.dataType;
  const match = dataType?.match(/^(?:VAR)?CHAR\((\d+)\)$/i);
  return match ? Number(match[1]) : undefined;
};

const option = (value: string, label: string): FieldOption => ({ value, label });

const field = (
  key: string,
  label: string,
  dataType: FieldDataType,
  controlType: FieldControlType,
  displayType: FieldDisplayType,
  required: boolean,
  options?: FieldOption[],
  maxLength?: number,
): FieldDefinition => ({ key, label, dataType, controlType, displayType, required, options, maxLength });

const text = (tableKey: string, key: string, label: string, required = false) => field(key, label, 'STRING', 'TEXT', 'TEXT', required, undefined, maxLengthFromSchema(tableKey, key));
const number = (key: string, label: string, required = false) => field(key, label, 'NUMBER', 'NUMBER', 'NUMBER', required);
const yn = (key: string, label: string) => field(key, label, 'STRING', 'SWITCH', 'BOOLEAN', true, [option('Y', '사용'), option('N', '미사용')]);
const select = (key: string, label: string, values: string[]) => field(key, label, 'STRING', 'SELECT', 'TEXT', true, values.map((value) => option(value, value)));

export const codeGroupGridFields = {
  CODE_GROUP_ID: text('CODE_GROUP', 'CODE_GROUP_ID', '그룹 ID', true),
  CODE_GROUP_NAME: text('CODE_GROUP', 'CODE_GROUP_NAME', '그룹명', true),
  DESCRIPTION: text('CODE_GROUP', 'DESCRIPTION', '설명'),
  USE_YN: yn('USE_YN', '사용'),
} satisfies Record<string, FieldDefinition>;

export const codeGridFields = {
  CODE_ID: text('COMMON_CODE', 'CODE_ID', '코드 ID', true),
  CODE: text('COMMON_CODE', 'CODE', '코드', true),
  CODE_NAME: text('COMMON_CODE', 'CODE_NAME', '코드명', true),
  SORT_ORDER: number('SORT_ORDER', '정렬순서', true),
  USE_YN: yn('USE_YN', '사용'),
} satisfies Record<string, FieldDefinition>;

export const codeAttributeGridFields = {
  ATTRIBUTE_CODE: text('CODE_ATTRIBUTE_DEF', 'ATTRIBUTE_CODE', '속성코드', true),
  ATTRIBUTE_NAME: text('CODE_ATTRIBUTE_DEF', 'ATTRIBUTE_NAME', '속성명', true),
  DATA_TYPE: select('DATA_TYPE', '데이터 타입', ['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'DATETIME']),
  CONTROL_TYPE: select('CONTROL_TYPE', '컨트롤 타입', ['TEXT', 'NUMBER', 'SWITCH', 'SELECT', 'DATE_PICKER', 'COLOR_PICKER']),
  DISPLAY_TYPE: select('DISPLAY_TYPE', '표시 타입', ['TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'DATETIME', 'COLOR', 'BADGE']),
  REQUIRED_YN: field('REQUIRED_YN', '필수 여부', 'STRING', 'SWITCH', 'BOOLEAN', true, [option('Y', '필수'), option('N', '선택')]),
  OPTION_SOURCE: text('CODE_ATTRIBUTE_DEF', 'OPTION_SOURCE', 'Option Source'),
  SORT_ORDER: number('SORT_ORDER', '정렬순서', true),
  USE_YN: yn('USE_YN', '사용'),
} satisfies Record<string, FieldDefinition>;
