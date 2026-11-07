import type { RuleSave } from './documentNumberApi';

export function validateDocumentNumberRule(draft: RuleSave): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.RULE_KEY.trim()) errors.RULE_KEY = 'RULE KEY는 필수입니다.';
  else if (!/^[A-Z0-9][A-Z0-9_]*$/.test(draft.RULE_KEY)) errors.RULE_KEY = '영문 대문자, 숫자, 밑줄만 사용할 수 있습니다.';
  if (!draft.RULE_NAME.trim()) errors.RULE_NAME = '규칙명은 필수입니다.';
  if (!draft.PREFIX.trim()) errors.PREFIX = '접두어는 필수입니다.';
  if (draft.SEQUENCE_LENGTH < 1 || draft.SEQUENCE_LENGTH > 18) errors.SEQUENCE_LENGTH = '1~18자리로 입력하세요.';
  if (String(draft.START_VALUE).length > draft.SEQUENCE_LENGTH) errors.START_VALUE = '시작값이 순번 자리수를 초과합니다.';
  if (draft.INCREMENT_VALUE < 1) errors.INCREMENT_VALUE = '증가량은 1 이상이어야 합니다.';
  if (draft.RESET_CYCLE === 'NONE' && draft.DATE_FORMAT !== 'NONE') errors.DATE_FORMAT = '초기화 없음은 날짜 형식도 없음이어야 합니다.';
  if (draft.RESET_CYCLE === 'YEAR' && !['YYYY', 'YYYYMM'].includes(draft.DATE_FORMAT)) errors.DATE_FORMAT = '연 초기화는 연도 형식이 필요합니다.';
  if (draft.RESET_CYCLE === 'MONTH' && draft.DATE_FORMAT !== 'YYYYMM') errors.DATE_FORMAT = '월 초기화는 YYYYMM 형식이 필요합니다.';
  return errors;
}
