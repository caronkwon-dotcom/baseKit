import test from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/modules/standard-design/screen-design/screenDesign.ts';
import { screenDesignApi, ScreenDesignApiError } from '../src/modules/standard-design/screen-design/screenDesignApi.ts';

const field = (id, label, extra = {}) => ({ FIELD_ID: id, LABEL: label, CONTROL_TYPE: 'TEXT', REQUIRED_YN: 'N', SOURCE: 'USER', ...extra });
const column = (id, label, extra = {}) => ({ FIELD_ID: id, LABEL: label, DATA_TYPE: 'TEXT', WIDTH: 120, ALIGN: 'LEFT', SOURCE: 'USER', ...extra });
const design = () => ({ SCREEN_TYPE: 'GRID_DETAIL', SEARCH_FIELDS: [field('S1', '요청번호')], GRID_COLUMNS: [column('G1', '요청번호')], DETAIL_FIELDS: [field('D1', '요청일', { CONTROL_TYPE: 'DATE', REQUIRED_YN: 'Y' })], ACTION_CODES: ['SEARCH'] });

test('new rows get distinct stable keys with the prefix of their list', () => {
  const ids = [d.newSearchField(), d.newSearchField(), d.newDetailField(), d.newColumn()].map(row => row.FIELD_ID);
  assert.equal(new Set(ids).size, 4);
  assert.match(ids[0], /^SF-/); assert.match(ids[2], /^DF-/); assert.match(ids[3], /^GC-/);
  assert.equal(d.newColumn().SOURCE, 'USER');
});

test('validation reports the first problem in plain language and accepts a good design', () => {
  assert.equal(d.validateDesign(design()), '');
  const blank = design(); blank.GRID_COLUMNS[0].LABEL = '  ';
  assert.match(d.validateDesign(blank), /그리드 컬럼 1번째 항목명/);
  const duplicate = design(); duplicate.SEARCH_FIELDS.push(field('S1', '다른 이름'));
  assert.match(d.validateDesign(duplicate), /중복/);
  const narrow = design(); narrow.GRID_COLUMNS[0].WIDTH = 10;
  assert.match(d.validateDesign(narrow), /너비/);
  const long = design(); long.DETAIL_FIELDS[0].LABEL = 'x'.repeat(101);
  assert.match(d.validateDesign(long), /100자/);
});

test('change detection ignores surrounding blanks and compares with the saved copy', () => {
  const saved = design();
  const edited = d.cloneDesign(saved);
  assert.equal(d.isDesignChanged(edited, saved), false);
  edited.SEARCH_FIELDS[0].LABEL = ' 요청번호 ';
  assert.equal(d.isDesignChanged(edited, saved), false);
  edited.SEARCH_FIELDS[0].LABEL = '요청 번호';
  assert.equal(d.isDesignChanged(edited, saved), true);
  edited.SEARCH_FIELDS[0].LABEL = '요청번호';
  edited.SCREEN_TYPE = 'POPUP';
  assert.equal(d.isDesignChanged(edited, saved), true);
  assert.equal(d.isDesignChanged(design(), null), true);
  assert.equal(d.isDesignChanged(null, saved), false);
  const copy = d.cloneDesign(saved); copy.SEARCH_FIELDS[0].LABEL = '변경';
  assert.equal(saved.SEARCH_FIELDS[0].LABEL, '요청번호');
});

test('key order and action order do not make a saved design look edited', () => {
  const saved = design(); saved.ACTION_CODES = ['SEARCH', 'SAVE'];
  const rebuilt = { ACTION_CODES: ['SAVE', 'SEARCH'], DETAIL_FIELDS: saved.DETAIL_FIELDS.map(row => ({ SOURCE: row.SOURCE, REQUIRED_YN: row.REQUIRED_YN, CONTROL_TYPE: row.CONTROL_TYPE, LABEL: row.LABEL, FIELD_ID: row.FIELD_ID })), GRID_COLUMNS: saved.GRID_COLUMNS, SEARCH_FIELDS: saved.SEARCH_FIELDS, SCREEN_TYPE: saved.SCREEN_TYPE };
  assert.equal(d.isDesignChanged(rebuilt, saved), false);
  rebuilt.ACTION_CODES = ['SAVE'];
  assert.equal(d.isDesignChanged(rebuilt, saved), true);
});

test('payload trims labels without touching the editable copy', () => {
  const edited = design(); edited.DETAIL_FIELDS[0].LABEL = ' 요청일 ';
  assert.equal(d.toPayload(edited).DETAIL_FIELDS[0].LABEL, '요청일');
  assert.equal(edited.DETAIL_FIELDS[0].LABEL, ' 요청일 ');
});

test('buttons follow the rules: save/revert need changes, confirm needs a saved unchanged draft', () => {
  const base = { hasDesign: true, saved: true, dirty: false, status: 'DRAFT', busy: false };
  assert.deepEqual(d.buttonState(base), { save: false, revert: false, confirm: true, aiDraft: true });
  assert.deepEqual(d.buttonState({ ...base, dirty: true }), { save: true, revert: true, confirm: false, aiDraft: true });
  assert.equal(d.buttonState({ ...base, status: 'CONFIRMED' }).confirm, false);
  assert.equal(d.buttonState({ ...base, saved: false }).confirm, false);
  assert.deepEqual(d.buttonState({ hasDesign: false, saved: false, dirty: false, status: 'NONE', busy: false }), { save: false, revert: false, confirm: false, aiDraft: true });
  assert.deepEqual(d.buttonState({ ...base, dirty: true, busy: true }), { save: false, revert: false, confirm: false, aiDraft: false });
  assert.equal(d.leaveBlocked(true), true);
  assert.equal(d.leaveBlocked(false), false);
});

test('program rows join status and group names; manual programs are labelled and filterable', () => {
  const programs = [
    { PROGRAM_ID: 'P1', PROGRAM_NAME: '구매요청 관리', DESCRIPTION: '', PROGRAM_KIND: 'SCREEN', SOURCE_GROUP_ID: 'G1', EVIDENCE: [1, 2] },
    { PROGRAM_ID: 'P2', PROGRAM_NAME: '재고 조회', DESCRIPTION: '', SOURCE_GROUP_ID: 'G9', EVIDENCE: [] },
    { PROGRAM_ID: 'P3', PROGRAM_NAME: '공통코드 연계', DESCRIPTION: '', SOURCE_GROUP_ID: null, EVIDENCE: [] },
  ];
  const rows = d.buildProgramRows(programs, [{ PROGRAM_ID: 'P1', DESIGN_STATUS: 'CONFIRMED', VERSION: 3, PROGRAM_VERSION: 1 }], new Map([['G1', '구매요청 업무']]));
  assert.deepEqual(rows.map(row => [row.GROUP_NAME, row.STATUS, row.EVIDENCE_COUNT, row.MANUAL]), [['구매요청 업무', 'CONFIRMED', 2, false], ['G9', 'NONE', 0, false], ['수동 추가', 'NONE', 0, true]]);
  assert.equal(d.filterProgramRows(rows, d.initialSearch).length, 3);
  assert.deepEqual(d.filterProgramRows(rows, { keyword: '조회', group: '', status: '' }).map(row => row.PROGRAM_ID), ['P2']);
  assert.deepEqual(d.filterProgramRows(rows, { keyword: '', group: 'MANUAL', status: '' }).map(row => row.PROGRAM_ID), ['P3']);
  assert.deepEqual(d.filterProgramRows(rows, { keyword: '', group: 'G1', status: 'CONFIRMED' }).map(row => row.PROGRAM_ID), ['P1']);
  assert.deepEqual(d.filterProgramRows(rows, { keyword: '', group: '', status: 'NONE' }).map(row => row.PROGRAM_ID), ['P2', 'P3']);
});

test('default alignment follows the data type', () => {
  assert.equal(d.defaultAlign('NUMBER'), 'RIGHT');
  assert.equal(d.defaultAlign('DATE'), 'CENTER');
  assert.equal(d.defaultAlign('TEXT'), 'LEFT');
});

function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return handler(String(url), init); };
  return calls;
}
const ok = data => ({ ok: true, status: 200, json: async () => ({ SUCCESS: true, DATA: data }) });
const fail = (status, message) => ({ ok: false, status, json: async () => ({ MESSAGE: message }) });

test('api calls use the program paths and send VERSION only when given', async () => {
  const calls = mockFetch(() => ok({}));
  await screenDesignApi.summaries('P/1');
  await screenDesignApi.get('P/1', 'SDPG-1');
  await screenDesignApi.save('P/1', 'SDPG-1', design());
  await screenDesignApi.save('P/1', 'SDPG-1', design(), 4);
  await screenDesignApi.confirm('P/1', 'SDPG-1', 5);
  await screenDesignApi.aiDraft('P/1', 'SDPG-1');
  assert.equal(calls[0].url, '/api/standard-design/projects/P%2F1/screen-designs');
  assert.equal(calls[1].url, '/api/standard-design/projects/P%2F1/programs/SDPG-1/screen-design');
  assert.equal(calls[2].init.method, 'PUT');
  assert.equal('VERSION' in JSON.parse(calls[2].init.body), false);
  assert.equal(JSON.parse(calls[3].init.body).VERSION, 4);
  assert.equal(calls[4].url.endsWith('/screen-design/confirm'), true);
  assert.deepEqual(JSON.parse(calls[4].init.body), { VERSION: 5 });
  assert.equal(calls[5].url.endsWith('/screen-design/ai-draft'), true);
});

test('api passes server messages and status, and reports a missing server clearly', async () => {
  mockFetch(() => fail(409, '다른 곳에서 설계가 변경되었습니다. 다시 조회하세요.'));
  await assert.rejects(screenDesignApi.save('P', 'G', design(), 1), error => error instanceof ScreenDesignApiError && error.status === 409 && /다시 조회/.test(error.message));
  mockFetch(() => { throw new TypeError('fetch failed'); });
  await assert.rejects(screenDesignApi.aiDraft('P', 'G'), error => error.status === 0 && /서버에 연결하지 못했습니다/.test(error.message));
  mockFetch(() => ({ ok: false, status: 500, json: async () => { throw new Error('not json'); } }));
  await assert.rejects(screenDesignApi.get('P', 'G'), error => error.status === 500 && /요청에 실패/.test(error.message));
});
