const metadataColumnPrefix = '__METADATA_FIELD__';

// Dynamic field IDs must not collide with fixed business column keys such as ATTRIBUTE_CODE.
export const toMetadataColumnKey = (fieldKey: string) => `${metadataColumnPrefix}${fieldKey}`;

export const isMetadataColumnKey = (columnKey: string) => columnKey.startsWith(metadataColumnPrefix);

export const fromMetadataColumnKey = (columnKey: string) =>
  isMetadataColumnKey(columnKey) ? columnKey.slice(metadataColumnPrefix.length) : null;
