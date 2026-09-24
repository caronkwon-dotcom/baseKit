import schemaTablesJson from '../../../../meta/schema-tables.json';
import schemaCommonColumnsJson from '../../../../meta/schema-common-columns.json';
import type { SchemaColumn, SchemaTable } from './tableManage.types';

const TABLE_NAME_PATTERN = /^B[A-Z]{2}[A-Z0-9]{4}$/;
const TABLE_ALIAS_PATTERN = /^[A-Z0-9]{4}$/;

function validateSchemaCatalog(rows: SchemaTable[]) {
  const physicalNames = new Set<string>();
  const aliases = new Set<string>();

  rows.forEach((table) => {
    if (!TABLE_NAME_PATTERN.test(table.physicalName)) {
      throw new Error(`[Schema Catalog] ${table.tableKey} 물리명은 B + 모듈 2자리 + 테이블 코드 4자리여야 합니다.`);
    }
    if (!TABLE_ALIAS_PATTERN.test(table.tableAlias)) {
      throw new Error(`[Schema Catalog] ${table.tableKey} Alias는 영문 대문자·숫자 4자리여야 합니다.`);
    }
    if (table.physicalName !== `B${table.moduleCode}${table.tableCode}`) {
      throw new Error(`[Schema Catalog] ${table.tableKey} 물리명과 모듈·테이블 코드 조합이 일치하지 않습니다.`);
    }
    if (table.tableAlias !== table.tableCode || table.tableAlias !== table.physicalName.slice(-4)) {
      throw new Error(`[Schema Catalog] ${table.tableKey} Alias는 물리명 마지막 4자리와 같아야 합니다.`);
    }
    if (!table.logicalName.trim() || !table.fullName.trim()) {
      throw new Error(`[Schema Catalog] ${table.tableKey} 논리명과 Full Name은 필수입니다.`);
    }
    if (physicalNames.has(table.physicalName)) {
      throw new Error(`[Schema Catalog] 중복 물리명입니다: ${table.physicalName}`);
    }
    if (aliases.has(table.tableAlias)) {
      throw new Error(`[Schema Catalog] 중복 Alias입니다: ${table.tableAlias}`);
    }
    const columnNames = table.columns.map((column) => column.physicalName);
    const duplicatedColumn = columnNames.find((columnName, index) => columnNames.indexOf(columnName) !== index);
    if (duplicatedColumn) {
      throw new Error(`[Schema Catalog] ${table.tableKey}의 중복 컬럼입니다: ${duplicatedColumn}`);
    }
    commonColumns.forEach((commonColumn) => {
      if (!columnNames.includes(commonColumn.physicalName)) {
        throw new Error(`[Schema Catalog] ${table.tableKey}에 공통 컬럼이 없습니다: ${commonColumn.physicalName}`);
      }
    });

    physicalNames.add(table.physicalName);
    aliases.add(table.tableAlias);
  });
}

const commonColumns = schemaCommonColumnsJson as SchemaColumn[];
const schemaTables = (schemaTablesJson as SchemaTable[]).map((table) => ({
  ...table,
  columns: [
    ...table.columns.filter((column) => !commonColumns.some((commonColumn) => commonColumn.physicalName === column.physicalName)),
    ...commonColumns,
  ],
}));
validateSchemaCatalog(schemaTables);

export const schemaCatalogRepository = {
  getTables: () => schemaTables,
};
