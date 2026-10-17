/**
 * COMMON-002 — LLM 분석 결과 공통 뷰어 모델.
 *
 * LLM이 반환한 JSON(또는 JSON 문자열)을 구조화된 읽기 전용 보고서 블록으로 변환한다.
 * 특정 SD 데이터 구조에 종속되지 않으며, 알 수 없는 필드는 원본 값 그대로 안전하게 표시한다.
 * 원본 데이터는 절대 변형하지 않는다(읽기 전용).
 */

export type LlmResultInput = unknown;

export type LlmResultStatus = 'loading' | 'empty' | 'error' | 'text' | 'structured';

export type LlmBlockType =
  | 'title'
  | 'summary'
  | 'callout'
  | 'tags'
  | 'list'
  | 'cards'
  | 'table'
  | 'section'
  | 'text'
  | 'raw';

export interface LlmBlock {
  id: string;
  type: LlmBlockType;
  heading?: string;
  body?: string;
  items?: string[];
  cards?: LlmCard[];
  rows?: LlmTableData;
  tone?: 'info' | 'warn' | 'error' | 'success';
  /** 원본 JSON 경로(예: 'summary', 'groups[0].name') — 데이터 누락 추적용 */
  sourcePath?: string;
}

export interface LlmCard {
  id: string;
  title: string;
  fields: { label: string; value: string }[];
}

export interface LlmTableData {
  headers: string[];
  rows: string[][];
}

export interface LlmEvidence {
  id: string;
  label: string;
}

export interface LlmResultModel {
  status: LlmResultStatus;
  /** 원본 JSON 문자열(입력이 문자열이면 그대로, 객체면 JSON.stringify) */
  rawJson: string;
  /** 원본 JSON 파싱 성공 여부 */
  parsed: boolean;
  /** 파싱 실패 시 오류 메시지 */
  error?: string;
  /** 일반 텍스트 결과(구조화 JSON이 아닌 경우) */
  text?: string;
  /** 구조화된 보고서 블록 */
  blocks: LlmBlock[];
  /** 근거 요구사항 ID 등 */
  evidence: LlmEvidence[];
  /** 원본 필드 수(객체/배열 기준) */
  fieldCount: number;
  /** 렌더링된 블록 수 */
  blockCount: number;
}

/* ------------------------------------------------------------------ */
/* 파싱                                                                 */
/* ------------------------------------------------------------------ */

export function parseLlmResult(input: LlmResultInput): { parsed: boolean; value: unknown; error?: string; rawJson: string } {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return { parsed: false, value: null, rawJson: input };
    try {
      return { parsed: true, value: JSON.parse(trimmed), rawJson: input };
    } catch (e) {
      return { parsed: false, value: null, error: (e as Error).message, rawJson: input };
    }
  }
  if (input === null || input === undefined) return { parsed: false, value: null, rawJson: '' };
  try {
    return { parsed: true, value: input, rawJson: JSON.stringify(input, null, 2) };
  } catch (e) {
    return { parsed: false, value: null, error: (e as Error).message, rawJson: String(input) };
  }
}

/* ------------------------------------------------------------------ */
/* 값 형식화                                                            */
/* ------------------------------------------------------------------ */

const EVIDENCE_KEY = /requirement|요구사항|evidence|근거|ref|id/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRecordArray(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => isPlainObject(item));
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    if (value.every((item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')) {
      return value.map((item) => formatScalar(item)).join(', ');
    }
    return JSON.stringify(value);
  }
  if (isPlainObject(value)) return JSON.stringify(value);
  return String(value);
}

/* ------------------------------------------------------------------ */
/* 블록 생성                                                            */
/* ------------------------------------------------------------------ */

let blockSeq = 0;
function nextId(prefix: string): string {
  blockSeq += 1;
  return `${prefix}-${blockSeq}`;
}

export function resetBlockSequence(): void {
  blockSeq = 0;
}

const TITLE_KEYS = ['title', 'TITLE', 'name', 'NAME', 'subject', 'heading', 'report_title', '제목'];
const SUMMARY_KEYS = ['summary', 'SUMMARY', 'overview', 'abstract', 'description', 'desc', '요약', '설명'];
const CALLTOUT_KEYS = ['note', 'NOTE', 'warning', 'WARNING', 'caution', 'message', 'msg', 'remark', 'comment', 'memo', '메모', '비고', '주의'];
const TAG_KEYS = ['tags', 'TAGS', 'keywords', 'KEYWORDS', 'labels', 'LABELS', 'categories', 'keywords_list', '키워드', '태그', '분류'];
const LIST_KEYS = ['items', 'ITEMS', 'list', 'LIST', 'points', 'POINTS', 'details', 'DETAILS', 'actions', 'ACTIONS', 'steps', 'findings', 'items_list', '항목', '목록', '세부사항'];
const CARD_KEYS = ['cards', 'CARDS', 'groups', 'GROUPS', 'sections', 'SECTIONS', 'results', 'RESULTS', 'items_detail', 'cards_list', '그룹', '카드', '섹션'];
const TABLE_KEYS = ['table', 'TABLE', 'rows', 'ROWS', 'records', 'RECORDS', 'data', 'DATA', 'table_data', '테이블', '행'];
const SECTION_KEYS = ['section', 'SECTION', 'sections_detail', 'detail', 'DETAIL', 'details_block', '섹션', '상세'];
const TEXT_KEYS = ['text', 'TEXT', 'content', 'CONTENT', 'body', 'BODY', 'answer', 'ANSWER', 'result', 'RESULT', 'output', 'message_text', '본문', '내용', '응답'];
const EVIDENCE_KEYS = ['evidence', 'EVIDENCE', 'evidence_ids', 'EVIDENCE_IDS', 'requirement_ids', 'REQUIREMENT_IDS', 'requirementIds', 'requirement_ids_list', 'references', 'REFERENCES', 'refs', 'basis', 'BASIS', '근거', '근거요구사항', '참조'];

function keyMatches(key: string, candidates: string[]): boolean {
  const normalized = key.trim().toLowerCase();
  return candidates.some((candidate) => candidate.toLowerCase() === normalized);
}

function extractListItems(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items: string[] = [];
  for (const item of value) {
    if (item === null || item === undefined) continue;
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      items.push(formatScalar(item));
    } else if (isPlainObject(item)) {
      const text = (item as Record<string, unknown>);
      const primary = text.text ?? item.text ?? item.name ?? item.label ?? item.title ?? item.value;
      if (primary !== undefined && primary !== null) items.push(formatValue(primary));
      else items.push(JSON.stringify(item));
    } else {
      items.push(formatValue(item));
    }
  }
  return items.length > 0 ? items : null;
}

function extractCards(value: unknown): LlmCard[] | null {
  if (!isRecordArray(value)) return null;
  const cards: LlmCard[] = [];
  for (const record of value) {
    const fields: { label: string; value: string }[] = [];
    for (const [key, val] of Object.entries(record)) {
      if (val === null || val === undefined) continue;
      fields.push({ label: key, value: formatValue(val) });
    }
    if (fields.length === 0) continue;
    const titleField = fields.find((f) => keyMatches(f.label, TITLE_KEYS));
    const title = titleField ? titleField.value : fields[0].value;
    cards.push({ id: nextId('card'), title, fields });
  }
  return cards.length > 0 ? cards : null;
}

function extractTable(value: unknown): LlmTableData | null {
  if (!isRecordArray(value)) return null;
  const headers = Array.from(new Set(value.flatMap((record) => Object.keys(record))));
  if (headers.length === 0) return null;
  const rows = value.map((record) => headers.map((header) => formatValue(record[header])));
  return { headers, rows };
}

function extractEvidence(value: unknown): LlmEvidence[] {
  const evidence: LlmEvidence[] = [];
  const push = (id: string, label: string) => {
    const clean = id.trim();
    if (!clean) return;
    if (!evidence.some((item) => item.id === clean)) evidence.push({ id: clean, label });
  };
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item === null || item === undefined) continue;
      if (typeof item === 'string' || typeof item === 'number') push(formatScalar(item), '요구사항');
      else if (isPlainObject(item)) {
        const record = item as Record<string, unknown>;
        const id = record.id ?? record.ID ?? record.requirement_id ?? record.REQUIREMENT_ID ?? record.code ?? record.CODE;
        const label = record.name ?? record.NAME ?? record.title ?? record.TITLE ?? '요구사항';
        if (id !== undefined && id !== null) push(formatValue(id), formatValue(label));
      }
    }
  } else if (typeof value === 'string') {
    value.split(/[,;\s]+/).forEach((part) => push(part, '요구사항'));
  }
  return evidence;
}

function collectEvidenceFromObject(record: Record<string, unknown>, evidence: LlmEvidence[]): void {
  for (const [key, value] of Object.entries(record)) {
    if (EVIDENCE_KEY.test(key) && (Array.isArray(value) || typeof value === 'string')) {
      for (const item of extractEvidence(value)) evidence.push(item);
    }
  }
}

function addObjectBlocks(record: Record<string, unknown>, path: string, blocks: LlmBlock[], evidence: LlmEvidence[], depth: number): void {
  if (depth > 6) {
    blocks.push({ id: nextId('raw'), type: 'raw', heading: path || '원본', body: JSON.stringify(record, null, 2), sourcePath: path });
    return;
  }
  const used = new Set<string>();
  const ordered = (keys: string[]) => {
    for (const key of Object.keys(record)) {
      if (used.has(key)) continue;
      if (keyMatches(key, keys)) {
        used.add(key);
        return key;
      }
    }
    return null;
  };

  const titleKey = ordered(TITLE_KEYS);
  if (titleKey) {
    const value = formatValue(record[titleKey]);
    if (value) blocks.push({ id: nextId('title'), type: 'title', body: value, sourcePath: path ? `${path}.${titleKey}` : titleKey });
  }
  const summaryKey = ordered(SUMMARY_KEYS);
  if (summaryKey) {
    const value = formatValue(record[summaryKey]);
    if (value) blocks.push({ id: nextId('summary'), type: 'summary', body: value, sourcePath: path ? `${path}.${summaryKey}` : summaryKey });
  }
  const calloutKey = ordered(CALLTOUT_KEYS);
  if (calloutKey) {
    const value = formatValue(record[calloutKey]);
    if (value) {
      const tone = /warn|caution|주의|경고/i.test(calloutKey) ? 'warn' : 'info';
      blocks.push({ id: nextId('callout'), type: 'callout', body: value, tone, sourcePath: path ? `${path}.${calloutKey}` : calloutKey });
    }
  }
  const tagKey = ordered(TAG_KEYS);
  if (tagKey) {
    const items = extractListItems(record[tagKey]);
    if (items) blocks.push({ id: nextId('tags'), type: 'tags', items, sourcePath: path ? `${path}.${tagKey}` : tagKey });
  }
  const listKey = ordered(LIST_KEYS);
  if (listKey) {
    const items = extractListItems(record[listKey]);
    if (items) blocks.push({ id: nextId('list'), type: 'list', heading: listKey, items, sourcePath: path ? `${path}.${listKey}` : listKey });
  }
  const cardKey = ordered(CARD_KEYS);
  if (cardKey) {
    const cards = extractCards(record[cardKey]);
    if (cards) blocks.push({ id: nextId('cards'), type: 'cards', heading: cardKey, cards, sourcePath: path ? `${path}.${cardKey}` : cardKey });
  }
  const tableKey = ordered(TABLE_KEYS);
  if (tableKey) {
    const table = extractTable(record[tableKey]);
    if (table) blocks.push({ id: nextId('table'), type: 'table', heading: tableKey, rows: table, sourcePath: path ? `${path}.${tableKey}` : tableKey });
  }
  const sectionKey = ordered(SECTION_KEYS);
  if (sectionKey) {
    const value = record[sectionKey];
    if (isPlainObject(value)) {
      const childPath = path ? `${path}.${sectionKey}` : sectionKey;
      blocks.push({ id: nextId('section'), type: 'section', heading: formatValue(value.title ?? value.name ?? sectionKey) || sectionKey, sourcePath: childPath });
      addObjectBlocks(value as Record<string, unknown>, childPath, blocks, evidence, depth + 1);
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) {
        const item = value[i];
        if (isPlainObject(item)) {
          const childPath = `${path ? `${path}.` : ''}${sectionKey}[${i}]`;
          blocks.push({ id: nextId('section'), type: 'section', heading: formatValue((item as Record<string, unknown>).title ?? (item as Record<string, unknown>).name ?? `${sectionKey} ${i + 1}`), sourcePath: childPath });
          addObjectBlocks(item as Record<string, unknown>, childPath, blocks, evidence, depth + 1);
        }
      }
    }
  }
  const textKey = ordered(TEXT_KEYS);
  if (textKey) {
    const value = formatValue(record[textKey]);
    if (value) blocks.push({ id: nextId('text'), type: 'text', heading: textKey, body: value, sourcePath: path ? `${path}.${textKey}` : textKey });
  }
  const evidenceKey = ordered(EVIDENCE_KEYS);
  if (evidenceKey) {
    for (const item of extractEvidence(record[evidenceKey])) evidence.push(item);
  }

  // 알 수 없는 필드: 원본 값 그대로 안전하게 표시(임의 필드 손실 금지)
  for (const key of Object.keys(record)) {
    if (used.has(key)) continue;
    const value = record[key];
    if (value === null || value === undefined) continue;
    if (isPlainObject(value)) {
      const childPath = path ? `${path}.${key}` : key;
      blocks.push({ id: nextId('section'), type: 'section', heading: key, sourcePath: childPath });
      addObjectBlocks(value as Record<string, unknown>, childPath, blocks, evidence, depth + 1);
    } else if (Array.isArray(value)) {
      const items = extractListItems(value);
      if (items) {
        blocks.push({ id: nextId('list'), type: 'list', heading: key, items, sourcePath: path ? `${path}.${key}` : key });
      } else {
        const cards = extractCards(value);
        if (cards) blocks.push({ id: nextId('cards'), type: 'cards', heading: key, cards, sourcePath: path ? `${path}.${key}` : key });
        else {
          const table = extractTable(value);
          if (table) blocks.push({ id: nextId('table'), type: 'table', heading: key, rows: table, sourcePath: path ? `${path}.${key}` : key });
        }
      }
      collectEvidenceFromObject({ [key]: value }, evidence);
    } else {
      blocks.push({ id: nextId('text'), type: 'text', heading: key, body: formatValue(value), sourcePath: path ? `${path}.${key}` : key });
    }
  }
}

function addArrayBlocks(value: unknown[], path: string, blocks: LlmBlock[], evidence: LlmEvidence[], depth: number): void {
  if (depth > 6) {
    blocks.push({ id: nextId('raw'), type: 'raw', heading: path || '원본', body: JSON.stringify(value, null, 2), sourcePath: path });
    return;
  }
  if (value.every((item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')) {
    const items = value.map((item) => formatScalar(item));
    if (items.length > 0) blocks.push({ id: nextId('list'), type: 'list', heading: path || '목록', items, sourcePath: path });
    return;
  }
  if (isRecordArray(value)) {
    const cards = extractCards(value);
    if (cards) {
      blocks.push({ id: nextId('cards'), type: 'cards', heading: path || '항목', cards, sourcePath: path });
      for (const record of value) collectEvidenceFromObject(record, evidence);
      return;
    }
    const table = extractTable(value);
    if (table) {
      blocks.push({ id: nextId('table'), type: 'table', heading: path || '항목', rows: table, sourcePath: path });
      for (const record of value) collectEvidenceFromObject(record, evidence);
      return;
    }
  }
  for (let i = 0; i < value.length; i += 1) {
    const item = value[i];
    const childPath = path ? `${path}[${i}]` : `[${i}]`;
    if (isPlainObject(item)) {
      blocks.push({ id: nextId('section'), type: 'section', heading: formatValue((item as Record<string, unknown>).title ?? (item as Record<string, unknown>).name ?? `항목 ${i + 1}`), sourcePath: childPath });
      addObjectBlocks(item as Record<string, unknown>, childPath, blocks, evidence, depth + 1);
    } else if (Array.isArray(item)) {
      addArrayBlocks(item, childPath, blocks, evidence, depth + 1);
    } else if (item !== null && item !== undefined) {
      blocks.push({ id: nextId('text'), type: 'text', heading: path || '항목', body: formatValue(item), sourcePath: childPath });
    }
  }
}

/* ------------------------------------------------------------------ */
/* 모델 생성                                                            */
/* ------------------------------------------------------------------ */

export function buildLlmResultModel(input: LlmResultInput, options?: { loading?: boolean }): LlmResultModel {
  resetBlockSequence();
  if (options?.loading) {
    return { status: 'loading', rawJson: '', parsed: false, blocks: [], evidence: [], fieldCount: 0, blockCount: 0 };
  }

  const { parsed, value, error, rawJson } = parseLlmResult(input);

  if (!parsed) {
    if (typeof input === 'string' && input.trim()) {
      // JSON이 아닌 일반 텍스트 결과
      return { status: 'text', rawJson, parsed: false, text: input, blocks: [], evidence: [], fieldCount: 0, blockCount: 0 };
    }
    return {
      status: 'error',
      rawJson,
      parsed: false,
      error: error ?? 'JSON을 파싱할 수 없습니다.',
      blocks: [],
      evidence: [],
      fieldCount: 0,
      blockCount: 0,
    };
  }

  if (value === null || value === undefined) {
    return { status: 'empty', rawJson, parsed: true, blocks: [], evidence: [], fieldCount: 0, blockCount: 0 };
  }

  if (typeof value === 'string') {
    return { status: 'text', rawJson, parsed: true, text: value, blocks: [], evidence: [], fieldCount: 0, blockCount: 0 };
  }

  const blocks: LlmBlock[] = [];
  const evidence: LlmEvidence[] = [];
  if (isPlainObject(value)) {
    addObjectBlocks(value as Record<string, unknown>, '', blocks, evidence, 0);
  } else if (Array.isArray(value)) {
    addArrayBlocks(value, '', blocks, evidence, 0);
  } else {
    blocks.push({ id: nextId('text'), type: 'text', body: formatValue(value) });
  }

  const fieldCount = countFields(value);
  if (blocks.length === 0) {
    return { status: 'empty', rawJson, parsed: true, blocks: [], evidence, fieldCount, blockCount: 0 };
  }
  return { status: 'structured', rawJson, parsed: true, blocks, evidence, fieldCount, blockCount: blocks.length };
}

function countFields(value: unknown): number {
  if (isPlainObject(value)) return Object.keys(value).length;
  if (Array.isArray(value)) return value.length;
  return 1;
}

/* ------------------------------------------------------------------ */
/* 원본 JSON 보기                                                       */
/* ------------------------------------------------------------------ */

export function formatRawJson(model: LlmResultModel): string {
  if (!model.parsed) return model.rawJson || '';
  try {
    const value = JSON.parse(model.rawJson);
    return JSON.stringify(value, null, 2);
  } catch {
    return model.rawJson;
  }
}