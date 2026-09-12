export interface StandardDesignTerm {
  TERM_ID: string;
  SOURCE_ROW_NUMBER: number;
  COMMON_STANDARD_TERM_NAME: string;
  COMMON_STANDARD_TERM_DESCRIPTION: string;
  COMMON_STANDARD_TERM_ENGLISH_ABBREVIATION_NAME: string;
  COMMON_STANDARD_DOMAIN_NAME: string;
  ALLOWED_VALUES: string;
  STORAGE_FORMAT: string;
  DISPLAY_FORMAT: string;
  ADMINISTRATIVE_STANDARD_CODE_NAME: string;
  RESPONSIBLE_ORGANIZATION_NAME: string;
  TERM_SYNONYMS: string;
  ESTABLISHMENT_ROUND: string;
  REVISION_TYPE_NAME: string;
  REVISION_ITEM: string;
  REVISION_REASON: string;
}

export interface StandardDesignTermPage {
  ITEMS: StandardDesignTerm[];
  PAGE: number;
  SIZE: number;
  TOTAL_COUNT: number;
  TOTAL_PAGES: number;
}

export interface StandardTermCandidate {
  termId: string;
  name: string;
  englishAbbreviation: string;
  domain: string;
  dataType: string;
  matchType: string;
  reason: string;
}

export interface StandardDesignTermLlmResult {
  question: string;
  interpretedIntent: string;
  searchKeywords: string[];
  candidates: StandardTermCandidate[];
  recommendedTermId: string | null;
  answer: string;
  model: string;
}
