import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDescription, parseProcess } from '../src/modules/standard-design/requirementgroup/requirementText.ts';

test('description keeps line breaks and shows blank lines as a gap', () => {
 assert.deepEqual(parseDescription('첫 줄\n\n둘째 줄'), [{ kind: 'bullet', text: '첫 줄' }, { kind: 'gap' }, { kind: 'bullet', text: '둘째 줄' }]);
 assert.deepEqual(parseDescription('a\r\n\r\n\r\nb').map(line => line.kind), ['bullet', 'gap', 'bullet']);
});

test('description splits sentences after a period and space only', () => {
 assert.deepEqual(parseDescription('추출한다. 추천한다. v1.2는 유지한다.').map(line => line.text), ['추출한다.', '추천한다.', 'v1.2는 유지한다.']);
 assert.deepEqual(parseDescription('한 문장입니다').map(line => line.text), ['한 문장입니다']);
});

test('description keeps a leading list number with its sentence', () => {
 assert.deepEqual(parseDescription('1. 등록한다. 2. 확인한다.').map(line => line.text), ['1. 등록한다.', '2. 확인한다.']);
});

test('bracket lines are one supporting line without sentence splitting', () => {
 const lines = parseDescription('본문이다.\n\n[원본 식별자] SD-AI-022\n[기능 분류] 설계 협업. 추가 문장');
 assert.deepEqual(lines.filter(line => line.kind === 'meta').map(line => line.text), ['[원본 식별자] SD-AI-022', '[기능 분류] 설계 협업. 추가 문장']);
});

test('empty description gives nothing and edge gaps are removed', () => {
 assert.deepEqual(parseDescription(''), []);
 assert.deepEqual(parseDescription(null), []);
 assert.deepEqual(parseDescription('\n\n본문\n\n'), [{ kind: 'bullet', text: '본문' }]);
});

test('process is split on arrows and trimmed', () => {
 const view = parseProcess('설계 확정 → 변경 접수 ->  신규 초안 → → 차이 검토 ');
 assert.equal(view.mode, 'CHIPS');
 assert.deepEqual(view.steps, ['설계 확정', '변경 접수', '신규 초안', '차이 검토']);
});

test('process is split on numbered lines in several formats', () => {
 assert.deepEqual(parseProcess('1. 접수\n2. 검토\n3. 승인').steps, ['접수', '검토', '승인']);
 assert.deepEqual(parseProcess('1) 접수\n2) 검토').steps, ['접수', '검토']);
 assert.deepEqual(parseProcess('① 접수\n② 검토').steps, ['접수', '검토']);
 assert.deepEqual(parseProcess('1. 접수\n   추가 설명\n2. 검토').steps, ['접수 추가 설명', '검토']);
});

test('process without a separator keeps the original paragraph', () => {
 const view = parseProcess('접수 후 검토하고 승인한다.');
 assert.equal(view.mode, 'TEXT');
 assert.equal(view.text, '접수 후 검토하고 승인한다.');
 assert.equal(parseProcess('1. 단 하나').mode, 'TEXT');
});

test('empty process is reported as empty', () => {
 assert.equal(parseProcess('').mode, 'EMPTY');
 assert.equal(parseProcess('   ').mode, 'EMPTY');
 assert.equal(parseProcess(undefined).mode, 'EMPTY');
});

test('many or long steps switch from chips to a vertical list', () => {
 assert.equal(parseProcess(Array.from({ length: 10 }, (_, i) => `단계${i}`).join(' → ')).mode, 'CHIPS');
 assert.equal(parseProcess(Array.from({ length: 11 }, (_, i) => `단계${i}`).join(' → ')).mode, 'LIST');
 assert.equal(parseProcess(`짧음 → ${'가'.repeat(41)}`).mode, 'LIST');
 assert.equal(parseProcess(`짧음 → ${'가'.repeat(40)}`).mode, 'CHIPS');
});
