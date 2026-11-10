export type MemberDialogStep = 'SELECT' | 'DETAIL';

/** 수정 모드는 투입 정보 단계로 바로 시작하고, 추가 모드는 사용자 선택부터 시작한다. */
export function initialStep(editing: boolean): MemberDialogStep {
  return editing ? 'DETAIL' : 'SELECT';
}

/** 사용자를 선택해야만 다음 단계로 이동할 수 있다. */
export function canGoNext(selectedUserId: string | null | undefined): boolean {
  return Boolean(selectedUserId);
}
