import schemaTablesJson from '../../../../meta/schema-tables.json';
import type { SchemaTable } from './tableManage.types';

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

    physicalNames.add(table.physicalName);
    aliases.add(table.tableAlias);
  });
}

const schemaTables = schemaTablesJson as SchemaTable[];
validateSchemaCatalog(schemaTables);

export const schemaCatalogRepository = {
  getTables: () => schemaTables,
};
