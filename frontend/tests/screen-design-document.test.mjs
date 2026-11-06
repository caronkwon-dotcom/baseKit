import test from 'node:test';
import assert from 'node:assert/strict';
import * as doc from '../src/modules/standard-design/screen-design/designDocument.ts';
import * as fn from '../src/modules/standard-design/screen-design/functionSpec.ts';
import * as d from '../src/modules/standard-design/screen-design/screenDesign.ts';

const field = (id, label, extra = {}) => ({ FIELD_ID: id, LABEL: label, CONTROL_TYPE: 'TEXT', REQUIRED_YN: 'N', SOURCE: 'USER', ...extra });
const column = (id, label, extra = {}) => ({ FIELD_ID: id, LABEL: label, DATA_TYPE: 'TEXT', WIDTH: 120, ALIGN: 'LEFT', SOURCE: 'USER', ...extra });
const spec = (id, name, extra = {}) => ({ FUNCTION_ID: id, NAME: name, ACTION_CODE: 'SEARCH', DESCRIPTION: '설명', RULES: ['규칙 1'], VALIDATIONS: ['메시지'], ACCEPTANCE: ['Given A When B Then C'], REQUIREMENT_IDS: ['REQ-1'], SOURCE: 'AI', ...extra });
const body = (extra = {}) => ({ SCHEMA_VERSION: 2, SCREEN_TYPE: 'GRID_DETAIL', SEARCH_FIELDS: [field('S1', '요청번호', { RULE: '부분 일치' })], GRID_COLUMNS: [column('G1', '요청번호')], DETAIL_FIELDS: [field('D1', '요청일', { CONTROL_TYPE: 'DATE', REQUIRED_YN: 'Y', READONLY_YN: 'Y' })], ACTION_CODES: ['SEARCH', 'SAVE'], FUNCTION_SPECS: [spec('FN-01', '이력 조회')], ...extra });
const data = (extra = {}) => ({
  generatedAt: '2026-11-06', projectId: 'SDP-1', projectName: '구매 시스템',
  program: { PROGRAM_ID: 'SDPG-3d3d81e2-f020-4517-945b-04b1486ca531', PROGRAM_NAME: '요구사항 그룹 분석', PROGRAM_KIND_LABEL: '배치', SOURCE_GROUP_ID: 'RG-1', SOURCE_GROUP_NAME: '구매 업무', DESCRIPTION: '그룹을 분석한다.' },
  design: { VERSION: 3, DESIGN_STATUS: 'DRAFT' },
  evidence: [{ REQUIREMENT_ID: 'REQ-1', NAME: '분석 실행', SUMMARY: '분석을 실행한다.' }, { REQUIREMENT_ID: 'REQ-2', NAME: '이력 조회', SUMMARY: '' }],
  body: body(), ...extra,
});
const scripts = html => (html.match(/<script/g) ?? []).length;

test('document number and file name follow the program id and the design version', () => {
  assert.equal(doc.buildDocNo('SDPG-3d3d81e2-f020-4517-945b-04b1486ca531', 3), 'UI-SDPG-3D3D81E2-V3');
  assert.equal(doc.docFileName('SDPG-3d3d81e2-f020', 12), 'UI-SDPG-3D3D81E2-V12.html');
  assert.equal(doc.buildDocNo('', 1), 'UI-SDPG-UNKNOWN-V1');
});

test('every user or AI text is escaped, including quotes, in all places', () => {
  const evil = `<img src=x onerror=alert(1)> & "q" 'a' </script><script>alert(2)</script>`;
  const html = doc.renderDesignDocument(data({
    projectName: evil, program: { ...data().program, PROGRAM_NAME: evil, DESCRIPTION: evil, SOURCE_GROUP_NAME: evil },
    evidence: [{ REQUIREMENT_ID: evil, NAME: evil, SUMMARY: evil }],
    body: body({ SEARCH_FIELDS: [field('S1', evil, { RULE: evil })], GRID_COLUMNS: [column('G1', evil)], DETAIL_FIELDS: [field('D1', evil)], FUNCTION_SPECS: [spec('FN-01', evil, { DESCRIPTION: evil, RULES: [evil], VALIDATIONS: [evil], ACCEPTANCE: [evil], REQUIREMENT_IDS: [evil] })] }),
  }));
  assert.equal(scripts(html), 1, 'only the fixed script block exists');
  assert.ok(!html.includes('<img src=x'), 'no raw tag from data');
  assert.ok(!html.includes('alert(2)</script>'));
  assert.ok(!/onerror=alert/.test(html.replace(/&lt;img src=x onerror=alert\(1\)&gt;/g, '')), 'handler text only appears escaped');
  assert.ok(html.includes('&lt;/script&gt;&lt;script&gt;alert(2)&lt;/script&gt;'));
  assert.ok(html.includes('&quot;q&quot; &#39;a&#39;'));
});

test('the document is one self-contained file: no external resources and a closed content policy', () => {
  const html = doc.renderDesignDocument(data());
  assert.match(html, /^<!DOCTYPE html>/);
  assert.ok(!/(src|href)="https?:/i.test(html) && !/<link\b|<img\b|<iframe\b|url\(/i.test(html));
  assert.match(html, /Content-Security-Policy" content="default-src 'none'/);
  const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map(m => m[1]);
  assert.ok(hrefs.every(h => h.startsWith('#')));
  assert.ok(html.includes('id="cover"') && html.includes('id="a6"') && html.includes('id="b8"'));
});

test('the design JSON and the AI prompt are text in the page, never script data, and carry the same design', () => {
  const html = doc.renderDesignDocument(data());
  assert.ok(!html.includes('application/json'));
  assert.ok(html.includes('id="jsonOut"') && html.includes('id="aiPrompt"'));
  const json = doc.buildDesignJson(data());
  assert.equal(json.DOC_NO, 'UI-SDPG-3D3D81E2-V3');
  assert.equal(json.FUNCTION_SPECS.length, 1);
  assert.deepEqual(json.ACTIONS.map(a => a.LABEL), ['조회', '저장']);
  const prompt = doc.buildAiPrompt(data());
  assert.ok(prompt.includes('PLAN(설계 이해 목록)까지만') && prompt.includes(json.DOC_NO) && prompt.includes('FN-01 이력 조회 (SEARCH)'));
  assert.ok(prompt.endsWith(JSON.stringify(json)));
});

test('uncovered requirements are shown as missing candidates and covered ones are not', () => {
  assert.deepEqual(fn.uncoveredRequirements([spec('FN-01', 'a')], ['REQ-1', 'REQ-2']), ['REQ-2']);
  const html = doc.renderDesignDocument(data());
  assert.ok(html.includes('<b>누락 후보</b>: REQ-2'));
  const covered = doc.renderDesignDocument(data({ body: body({ FUNCTION_SPECS: [spec('FN-01', 'a', { REQUIREMENT_IDS: ['REQ-1', 'REQ-2'] })] }) }));
  assert.ok(covered.includes('모든 근거 요구사항이 1개 이상의 기능에 반영되어 있습니다.'));
  assert.ok(!covered.includes('<b>누락 후보</b>'));
});

test('a design without function specs says so and still renders every part', () => {
  const html = doc.renderDesignDocument(data({ body: body({ FUNCTION_SPECS: [] }) }));
  assert.ok(html.includes('기능 요건이 아직 없습니다.'));
  assert.ok(html.includes('모든 근거 요구사항이 미연결입니다.'));
  assert.ok(html.includes('id="a6"') && html.includes('id="b8"'));
  assert.ok(doc.buildAiPrompt(data({ body: body({ FUNCTION_SPECS: [] }) })).includes('기능 요건 없음'));
  const old = d.normalizeDesign({ SCREEN_TYPE: 'GRID_DETAIL', SEARCH_FIELDS: [field('S1', 'a')] });
  assert.doesNotThrow(() => doc.renderDesignDocument(data({ body: old })));
});

test('an empty design and a program without evidence do not break the document', () => {
  const html = doc.renderDesignDocument(data({ evidence: [], body: { ...d.emptyDesign(), FUNCTION_SPECS: [] } }));
  assert.ok(html.includes('검색조건이 없습니다.') && html.includes('그리드 컬럼이 없습니다.') && html.includes('상세 입력항목이 없습니다.'));
  assert.ok(html.includes('근거 요구사항이 없습니다(수동 추가).'));
  assert.ok(html.includes('추적할 요구사항이 없습니다.'));
  assert.equal(scripts(html), 1);
});

test('the cover tells draft from confirmed and keeps source marks', () => {
  const draft = doc.renderDesignDocument(data());
  assert.ok(draft.includes('<span class="stamp">초안 · 현업 검토 전</span>'));
  assert.ok(draft.includes('v3 (초안)'));
  const confirmed = doc.renderDesignDocument(data({ design: { VERSION: 4, DESIGN_STATUS: 'CONFIRMED' } }));
  assert.ok(confirmed.includes('<span class="stamp ok">확정</span>') && confirmed.includes('UI-SDPG-3D3D81E2-V4'));
  assert.ok(draft.includes('AI 제안') && draft.includes('직접 작성'));
});

test('guidance is fixed per screen type and warns about what the common components cannot do', () => {
  assert.deepEqual(doc.componentGuide('GRID_DETAIL', 3).map(r => r[0]), ['PageHeader', 'SearchPanel', 'MasterDetailMultiGrid', 'BaseKitDataGrid', 'ActionButton', 'BaseKitMessage']);
  assert.equal(doc.componentGuide('GRID_DETAIL', 3)[1][1], 'rows=1 (한 단에 검색조건 최대 4개)');
  assert.equal(doc.componentGuide('GRID_DETAIL', 5)[1][1], 'rows=2 (한 단에 검색조건 최대 4개)');
  assert.match(doc.componentGuide('GRID_DETAIL', 21)[1][1], /5단/);
  assert.match(doc.componentGuide('TREE_DETAIL', 0).map(r => r.join(' ')).join(' '), /Tree가 없습니다/);
  assert.ok(doc.componentGuide('POPUP', 0).some(r => r[0] === 'FormModal'));
  assert.deepEqual(doc.componentGuide('GRID_DETAIL', 3), doc.componentGuide('GRID_DETAIL', 3));
  const html = doc.renderDesignDocument(data({ body: body({ SCREEN_TYPE: 'TREE_DETAIL' }) }));
  assert.ok(html.includes('공통 Tree 컴포넌트 없음'));
});

test('very long text is kept whole and the page stays one document', () => {
  const long = '가'.repeat(20000);
  const html = doc.renderDesignDocument(data({ program: { ...data().program, DESCRIPTION: long }, body: body({ FUNCTION_SPECS: [spec('FN-01', 'a', { DESCRIPTION: long })] }) }));
  assert.ok(html.includes(long));
  assert.equal(scripts(html), 1);
  assert.equal((html.match(/<\/html>/g) ?? []).length, 1);
  assert.ok(html.includes('overflow-wrap:anywhere'));
});

test('evidence rows come from the stored snapshot; unreadable snapshots only lose their text', () => {
  const rows = doc.evidenceFromProgram([
    { REQUIREMENT_ID: 'REQ-1', SNAPSHOT_JSON: JSON.stringify({ name: '이름', description: '긴 설명  \n'.repeat(100) }) },
    { REQUIREMENT_ID: 'REQ-2', SNAPSHOT_JSON: 'not json' }, { REQUIREMENT_ID: 'REQ-3', SNAPSHOT_JSON: null },
  ]);
  assert.equal(rows[0].NAME, '이름');
  assert.ok(rows[0].SUMMARY.length <= 201 && rows[0].SUMMARY.endsWith('…') && !rows[0].SUMMARY.includes('\n'));
  assert.deepEqual(rows.slice(1).map(r => [r.NAME, r.SUMMARY]), [['', ''], ['', '']]);
});

test('function ids are stable and never reused', () => {
  assert.equal(fn.nextFunctionId([]), 'FN-01');
  assert.equal(fn.nextFunctionId([{ FUNCTION_ID: 'FN-01' }, { FUNCTION_ID: 'FN-04' }]), 'FN-05');
  assert.equal(fn.nextFunctionId([{ FUNCTION_ID: 'custom' }]), 'FN-01');
  assert.equal(fn.newFunctionSpec([{ FUNCTION_ID: 'FN-02' }]).FUNCTION_ID, 'FN-03');
  assert.equal(fn.newFunctionSpec([]).SOURCE, 'USER');
});

test('line text round trips one item per line and drops blanks', () => {
  assert.deepEqual(fn.textToLines(' a \r\n\n b\n  '), ['a', 'b']);
  assert.equal(fn.linesToText(['a', 'b']), 'a\nb');
});

test('function spec validation names the first problem', () => {
  const ok = [spec('FN-01', 'a')];
  assert.equal(fn.validateFunctionSpecs(ok, ['SEARCH'], ['REQ-1']), '');
  assert.match(fn.validateFunctionSpecs([spec('FN-01', ' ')], ['SEARCH']), /기능명/);
  assert.match(fn.validateFunctionSpecs([spec('FN-01', 'a'), spec('FN-01', 'b')], ['SEARCH']), /중복/);
  assert.match(fn.validateFunctionSpecs([spec('FN-01', 'a', { ACTION_CODE: 'SAVE' })], ['SEARCH']), /버튼 · Action/);
  assert.match(fn.validateFunctionSpecs([spec('FN-01', 'a', { ACTION_CODE: 'HACK' })], ['SEARCH', 'HACK']), /허용되지 않습니다/);
  assert.match(fn.validateFunctionSpecs([spec('FN-01', 'a', { REQUIREMENT_IDS: ['REQ-9'] })], ['SEARCH'], ['REQ-1']), /REQ-9/);
  assert.equal(fn.validateFunctionSpecs([spec('FN-01', 'a', { REQUIREMENT_IDS: ['REQ-9'] })], ['SEARCH']), '', 'evidence is only checked when known');
  assert.match(fn.validateFunctionSpecs([spec('FN-01', 'a', { RULES: Array(21).fill('x') })], ['SEARCH']), /최대 20건/);
  assert.match(fn.validateFunctionSpecs([spec('FN-01', 'a', { ACCEPTANCE: ['x'.repeat(501)] })], ['SEARCH']), /500자/);
  assert.match(fn.validateFunctionSpecs(Array.from({ length: 51 }, (_, i) => spec(`FN-${i}`, 'a')), ['SEARCH']), /최대 50건/);
});

test('the design check includes function specs, and changes to them make the design look edited', () => {
  const saved = body();
  assert.equal(d.validateDesign(saved, ['REQ-1']), '');
  const bad = body({ FUNCTION_SPECS: [spec('FN-01', 'a', { REQUIREMENT_IDS: ['REQ-9'] })] });
  assert.match(d.validateDesign(bad, ['REQ-1']), /REQ-9/);
  const edited = d.cloneDesign(saved);
  assert.equal(d.isDesignChanged(edited, saved), false);
  edited.FUNCTION_SPECS[0].RULES = ['다른 규칙'];
  assert.equal(d.isDesignChanged(edited, saved), true);
  edited.FUNCTION_SPECS[0].RULES = ['규칙 1']; edited.FUNCTION_SPECS[0].REQUIREMENT_IDS = ['REQ-2'];
  assert.equal(d.isDesignChanged(edited, saved), true);
  const rule = d.cloneDesign(saved); rule.SEARCH_FIELDS[0].RULE = '다름';
  assert.equal(d.isDesignChanged(rule, saved), true);
  const readonly = d.cloneDesign(saved); readonly.DETAIL_FIELDS[0].READONLY_YN = 'N';
  assert.equal(d.isDesignChanged(readonly, saved), true);
  const noSpecs = { ...saved }; delete noSpecs.FUNCTION_SPECS;
  assert.equal(d.isDesignChanged({ ...saved, FUNCTION_SPECS: [] }, noSpecs), false, 'a design saved before version 2 equals an empty list');
  const blanks = d.cloneDesign(saved); blanks.FUNCTION_SPECS[0].RULES = ['규칙 1', '  '];
  assert.equal(d.isDesignChanged(blanks, saved), false, 'blank lines are not a change');
});
