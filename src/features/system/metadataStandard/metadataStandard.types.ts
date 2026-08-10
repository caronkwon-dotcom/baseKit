export type UseYn = 'Y' | 'N';

export interface StandardWord {
  wordKey: string;
  logicalName: string;
  englishName: string;
  abbreviation: string;
  wordType: 'GENERAL' | 'DOMAIN';
  description: string;
  useYn: UseYn;
  reviewStatus: 'DRAFT' | 'REVIEWING' | 'APPROVED';
}

export interface StandardDomain {
  domainKey: string;
  domain: string;
  domainName: string;
  domainWordKey: string;
  dataType: 'VARCHAR' | 'CHAR' | 'INTEGER' | 'DECIMAL' | 'DATE' | 'DATETIME' | 'JSON';
  length: number | null;
  scale: number | null;
  allowedValues: string;
  description: string;
  useYn: UseYn;
}
