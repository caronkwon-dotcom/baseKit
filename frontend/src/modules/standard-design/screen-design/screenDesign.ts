/** Pure screen-design logic (no React, no fetch) so it can be unit tested and reused by other shells such as /contest. */

export type ScreenType = 'GRID_DETAIL' | 'GRID_ONLY' | 'FORM_ONLY' | 'TREE_DETAIL' | 'POPUP';
export type ControlType = 'TEXT' | 'COMBO' | 'DATE' | 'DATE_RANGE' | 'CHECK' | 'POPUP_SELECT';
export type DataType = 'TEXT' | 'NUMBER' | 'DATE' | 'BADGE';
export type Align = 'LEFT' | 'CENTER' | 'RIGHT';
export type DesignSource = 'AI' | 'USER';
export type DesignStatus = 'NONE' | 'DRAFT' | 'CONFIRMED';
export type TabId = 'search' | 'cols' | 'detail' | 'actions';

export interface FieldRow { FIELD_ID: string; LABEL: string; CONTROL_TYPE: ControlType; REQUIRED_YN: 'Y' | 'N'; SOURCE: DesignSource }
export interface ColumnRow { FIELD_ID: string; LABEL: string; DATA_TYPE: DataType; WIDTH: number; ALIGN: Align; SOURCE: DesignSource }
export interface DesignBody { SCREEN_TYPE: ScreenType; SEARCH_FIELDS: FieldRow[]; GRID_COLUMNS: ColumnRow[]; DETAIL_FIELDS: FieldRow[]; ACTION_CODES: string[] }
export interface ScreenDesignRecord { SCREEN_DESIGN_ID: string; PROGRAM_ID: string; PROGRAM_VERSION: number | null; DESIGN_STATUS: 'DRAFT' | 'CONFIRMED'; VERSION: number; DESIGN: DesignBody }
export interface ScreenDesignSummary { PROGRAM_ID: string; DESIGN_STATUS: 'DRAFT' | 'CONFIRMED'; VERSION: number; PROGRAM_VERSION: number | null }

export const SCREEN_TYPES: ScreenType[] = ['GRID_DETAIL', 'GRID_ONLY', 'FORM_ONLY', 'TREE_DETAIL', 'POPUP'];
export const SCREEN_TYPE_LABELS: Record<ScreenType, string> = { GRID_DETAIL: '그리드 + 상세', GRID_ONLY: '그리드만', FORM_ONLY: '입력 폼만', TREE_DETAIL: '트리 + 상세', POPUP: '팝업' };
export const CONTROL_TYPES: ControlType[] = ['TEXT', 'COMBO', 'DATE', 'DATE_RANGE', 'CHECK', 'POPUP_SELECT'];
export const CONTROL_LABELS: Record<ControlType, string> = { TEXT: '텍스트', COMBO: '콤보', DATE: '날짜', DATE_RANGE: '기간', CHECK: '체크', POPUP_SELECT: '팝업선택' };
export const DATA_TYPES: DataType[] = ['TEXT', 'NUMBER', 'DATE', 'BADGE'];
export const DATA_TYPE_LABELS: Record<DataType, string> = { TEXT: '텍스트', NUMBER: '숫자', DATE: '날짜', BADGE: '배지' };
export const ALIGNS: Align[] = ['LEFT', 'CENTER', 'RIGHT'];
export const ALIGN_LABELS: Record<Align, string> = { LEFT: '좌', CENTER: '중앙', RIGHT: '우' };
export const ACTION_DEFS: { code: string; label: string }[] = [
  { code: 'SEARCH', label: '조회' }, { code: 'CREATE', label: '신규' }, { code: 'UPDATE', label: '수정' }, { code: 'DELETE', label: '삭제' },
  { code: 'SAVE', label: '저장' }, { code: 'EXCEL_UPLOAD', label: '엑셀 업로드' }, { code: 'EXCEL_DOWNLOAD', label: '엑셀 다운로드' }, { code: 'APPROVE', label: '승인' },
];
export const STATUS_LABELS: Record<DesignStatus, string> = { NONE: '미설계', DRAFT: '초안', CONFIRMED: '확정' };

export const emptyDesign = (): DesignBody => ({ SCREEN_TYPE: 'GRID_DETAIL', SEARCH_FIELDS: [], GRID_COLUMNS: [], DETAIL_FIELDS: [], ACTION_CODES: ['SEARCH'] });

let sequence = 0;
/** Stable client-side key for a new row; the server keeps it as FIELD_ID. */
export function newFieldId(prefix: 'SF' | 'GC' | 'DF'): string {
  sequence += 1;
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : `${Date.now().toString(36)}${sequence}`;
  return `${prefix}-${random}`;
}

export const newSearchField = (): FieldRow => ({ FIELD_ID: newFieldId('SF'), LABEL: '새 항목', CONTROL_TYPE: 'TEXT', REQUIRED_YN: 'N', SOURCE: 'USER' });
export const newDetailField = (): FieldRow => ({ FIELD_ID: newFieldId('DF'), LABEL: '새 항목', CONTROL_TYPE: 'TEXT', REQUIRED_YN: 'N', SOURCE: 'USER' });
export const newColumn = (): ColumnRow => ({ FIELD_ID: newFieldId('GC'), LABEL: '새 컬럼', DATA_TYPE: 'TEXT', WIDTH: 120, ALIGN: 'LEFT', SOURCE: 'USER' });

export function defaultAlign(dataType: DataType): Align {
  return dataType === 'NUMBER' ? 'RIGHT' : dataType === 'DATE' || dataType === 'BADGE' ? 'CENTER' : 'LEFT';
}

/** Client-side check before save; the server repeats it. Returns the first problem or an empty string. */
export function validateDesign(design: DesignBody): string {
  const lists: [string, { FIELD_ID: string; LABEL: string }[]][] = [['검색조건', design.SEARCH_FIELDS], ['그리드 컬럼', design.GRID_COLUMNS], ['상세 입력항목', design.DETAIL_FIELDS]];
  for (const [name, rows] of lists) {
    const seen = new Set<string>();
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (!row.LABEL.trim()) return `${name} ${index + 1}번째 항목명을 입력하세요.`;
      if (row.LABEL.trim().length > 100) return `${name} ${index + 1}번째 항목명은 100자 이하여야 합니다.`;
      if (seen.has(row.FIELD_ID)) return `${name}에 중복된 항목 키가 있습니다.`;
      seen.add(row.FIELD_ID);
    }
    if (rows.length > 100) return `${name}은 최대 100건까지 가능합니다.`;
  }
  for (const column of design.GRID_COLUMNS) {
    if (!Number.isInteger(column.WIDTH) || column.WIDTH < 40 || column.WIDTH > 800) return `그리드 컬럼 "${column.LABEL}"의 너비는 40~800 사이 정수여야 합니다.`;
  }
  return '';
}

/** Saved body → editable shape (deep copy so edits never touch the cached server copy). */
export function cloneDesign(design: DesignBody): DesignBody {
  return JSON.parse(JSON.stringify(design)) as DesignBody;
}

const trimRow = <T extends { LABEL: string }>(row: T): T => ({ ...row, LABEL: row.LABEL.trim() });
export function toPayload(design: DesignBody): DesignBody {
  return { ...design, SEARCH_FIELDS: design.SEARCH_FIELDS.map(trimRow), GRID_COLUMNS: design.GRID_COLUMNS.map(trimRow), DETAIL_FIELDS: design.DETAIL_FIELDS.map(trimRow) };
}

/** Order-independent fingerprint: object key order and the order of ACTION_CODES must not make a saved design look edited. */
function fingerprint(design: DesignBody): string {
  const d = toPayload(design);
  const field = (row: FieldRow) => [row.FIELD_ID, row.LABEL, row.CONTROL_TYPE, row.REQUIRED_YN, row.SOURCE];
  const column = (row: ColumnRow) => [row.FIELD_ID, row.LABEL, row.DATA_TYPE, row.WIDTH, row.ALIGN, row.SOURCE];
  return JSON.stringify([d.SCREEN_TYPE, d.SEARCH_FIELDS.map(field), d.GRID_COLUMNS.map(column), d.DETAIL_FIELDS.map(field), [...d.ACTION_CODES].sort()]);
}

/** True when the editable design differs from the saved one (or nothing is saved yet and something was added). */
export function isDesignChanged(current: DesignBody | null, saved: DesignBody | null): boolean {
  if (!current) return false;
  if (!saved) return true;
  return fingerprint(current) !== fingerprint(saved);
}

export interface ButtonState { save: boolean; revert: boolean; confirm: boolean; aiDraft: boolean }
/** Save/revert need a change, confirm needs a saved, unchanged, not yet confirmed design. */
export function buttonState(input: { hasDesign: boolean; saved: boolean; dirty: boolean; status: DesignStatus; busy: boolean }): ButtonState {
  const { hasDesign, saved, dirty, status, busy } = input;
  return { save: !busy && hasDesign && dirty, revert: !busy && dirty, confirm: !busy && hasDesign && saved && !dirty && status !== 'CONFIRMED', aiDraft: !busy };
}

/** Moving to another program is blocked while there are unsaved changes. */
export const leaveBlocked = (dirty: boolean) => dirty;
export const LEAVE_BLOCKED_MESSAGE = '저장하지 않은 변경이 있습니다. 저장 또는 되돌리기 후 이동하세요.';

export interface ProgramLike { PROGRAM_ID: string; PROGRAM_NAME: string; DESCRIPTION: string; PROGRAM_KIND?: string | null; SOURCE_GROUP_ID: string | null; EVIDENCE: unknown[] }
export interface ProgramRow { PROGRAM_ID: string; PROGRAM_NAME: string; GROUP_ID: string; GROUP_NAME: string; KIND: string; EVIDENCE_COUNT: number; STATUS: DesignStatus; MANUAL: boolean }

/** Joins the program ledger with design summaries and group names (groups may be missing, e.g. deleted or not loaded). */
export function buildProgramRows(programs: ProgramLike[], summaries: ScreenDesignSummary[], groupNames: Map<string, string>): ProgramRow[] {
  const status = new Map(summaries.map(item => [item.PROGRAM_ID, item.DESIGN_STATUS]));
  return programs.map(program => ({
    PROGRAM_ID: program.PROGRAM_ID, PROGRAM_NAME: program.PROGRAM_NAME,
    GROUP_ID: program.SOURCE_GROUP_ID ?? '', GROUP_NAME: program.SOURCE_GROUP_ID ? groupNames.get(program.SOURCE_GROUP_ID) ?? program.SOURCE_GROUP_ID : '수동 추가',
    KIND: program.PROGRAM_KIND ?? '', EVIDENCE_COUNT: program.EVIDENCE.length, STATUS: status.get(program.PROGRAM_ID) ?? 'NONE', MANUAL: !program.SOURCE_GROUP_ID,
  }));
}

export interface SearchCondition { keyword: string; group: string; status: string }
export const initialSearch: SearchCondition = { keyword: '', group: '', status: '' };
export function filterProgramRows(rows: ProgramRow[], condition: SearchCondition): ProgramRow[] {
  const keyword = condition.keyword.trim().toLocaleLowerCase();
  return rows.filter(row =>
    (!keyword || row.PROGRAM_NAME.toLocaleLowerCase().includes(keyword))
    && (!condition.group || (condition.group === 'MANUAL' ? row.MANUAL : row.GROUP_ID === condition.group))
    && (!condition.status || row.STATUS === condition.status));
}
