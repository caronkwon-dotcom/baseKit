export type SchemaReviewStatus = 'EXISTING' | 'APPROVED' | 'REVIEW';

export interface SchemaColumn {
  logicalName: string;
  physicalName: string;
  domain: string;
  dataType: string;
  pkYn: 'Y' | 'N';
  nullableYn: 'Y' | 'N';
  termStatus: SchemaReviewStatus;
  fk?: string;
  description: string;
}

export interface SchemaTable {
  tableKey: string;
  logicalName: string;
  physicalName: string;
  category: '기준정보' | '조직' | '사용자' | '권한';
  status: 'REVIEW' | 'WARNING';
  description: string;
  columns: SchemaColumn[];
}
