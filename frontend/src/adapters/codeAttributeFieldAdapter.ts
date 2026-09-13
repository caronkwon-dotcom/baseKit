import { resolveOptionSources, type FieldDefinition, type FieldOption } from '../components/metadata';
import { coreCodeApi } from '../services/coreCodeApi';
import type { CodeAttributeDefinition } from '../types';

export function toFieldDefinitions(definitions: CodeAttributeDefinition[], optionsBySource: Map<string, FieldOption[]>): FieldDefinition[] {
  return definitions.filter((item) => item.USE_YN === 'Y').map((item) => ({
    key: item.ATTRIBUTE_CODE,
    label: item.ATTRIBUTE_NAME,
    dataType: item.DATA_TYPE,
    controlType: item.CONTROL_TYPE,
    displayType: item.DISPLAY_TYPE,
    required: item.REQUIRED_YN === 'Y',
    defaultValue: item.DEFAULT_VALUE ?? undefined,
    optionSource: item.OPTION_SOURCE ?? undefined,
    options: item.OPTION_SOURCE ? optionsBySource.get(item.OPTION_SOURCE) : undefined,
  }));
}

export function resolveCodeAttributeOptions(definitions: CodeAttributeDefinition[]) {
  return resolveOptionSources(
    definitions.map((item) => item.OPTION_SOURCE ?? ''),
    { CODE_GROUP: async (groupId) => (await coreCodeApi.findCodes(groupId, '', 'Y')).map((code) => ({ value: code.CODE, label: code.CODE_NAME })) },
  );
}
