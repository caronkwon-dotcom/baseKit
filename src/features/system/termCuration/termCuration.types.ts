export type ReviewStatus = 'UNREVIEWED' | 'REVIEWING' | 'ADOPTED' | 'MODIFIED' | 'HOLD' | 'EXCLUDED';

export interface StandardTerm {
  id: string;
  logicalName: string;
  description: string;
  abbreviation: string;
  domainName: string;
  allowedValues: string;
  storageFormat: string;
  displayFormat: string;
  synonymList: string;
  revision: string;
  revisionType: string;
}

export interface TermReview {
  status: ReviewStatus;
  physicalName: string;
  domainName: string;
  description: string;
  alias: string;
  note: string;
  updatedAt: string;
}

export interface TermCurationDocument {
  version: 1;
  updatedAt: string | null;
  reviews: Record<string, TermReview>;
}

export interface TermSearchCondition {
  keyword: string;
  domainName: string;
  reviewStatus: '' | ReviewStatus;
  revisionType: string;
}
