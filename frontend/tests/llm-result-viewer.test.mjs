import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLlmResultModel, formatRawJson } from '../src/components/common/llmResultModel.ts';

const types = (model) => model.blocks.map((block) => block.type);

test('1. JSON string with title/summary/sections is parsed into structured blocks', () => {
  const json = JSON.stringify({
    title: '분석 결과',
    summary: '요약 문장',
    sections: [{ heading: '구분', items: ['A', 'B'] }],
  });
  const model = buildLlmResultModel(json, {});
  assert.equal(model.status, 'structured');
  assert.deepEqual(types(model), ['title', 'summary', 'cards']);
  assert.equal(model.blocks[0].body, '분석 결과');
  assert.equal(model.blocks[1].body, '요약 문장');
  assert.equal(model.blocks[2].heading, 'sections');
  assert.equal(model.blocks[2].cards[0].title, '구분');
});

test('2. JSON object input is handled the same as a JSON string', () => {
  const model = buildLlmResultModel({ title: 'T', summary: 'S' }, {});
  assert.equal(model.status, 'structured');
  assert.deepEqual(types(model), ['title', 'summary']);
  assert.equal(model.blocks[0].body, 'T');
  assert.equal(model.blocks[1].body, 'S');
});

test('3. top-level items array becomes a list block', () => {
  const model = buildLlmResultModel(JSON.stringify({ items: ['x', 'y', 'z'] }), {});
  assert.equal(model.status, 'structured');
  assert.deepEqual(types(model), ['list']);
  assert.equal(model.blocks[0].heading, 'items');
  assert.deepEqual(model.blocks[0].items, ['x', 'y', 'z']);
});

test('4. table as a record array becomes a table block with inferred headers', () => {
  const model = buildLlmResultModel(
    JSON.stringify({ table: [{ NAME: 'a', SCORE: 1 }, { NAME: 'b', SCORE: 2 }] }),
    {},
  );
  assert.equal(model.status, 'structured');
  assert.deepEqual(types(model), ['table']);
  assert.deepEqual(model.blocks[0].rows.headers, ['NAME', 'SCORE']);
  assert.deepEqual(model.blocks[0].rows.rows, [['a', '1'], ['b', '2']]);
});

test('5. groups as a record array becomes a cards block', () => {
  const model = buildLlmResultModel(
    JSON.stringify({ groups: [{ name: 'A', score: 1 }, { name: 'B', score: 2 }] }),
    {},
  );
  assert.equal(model.status, 'structured');
  assert.deepEqual(types(model), ['cards']);
  assert.equal(model.blocks[0].heading, 'groups');
  assert.equal(model.blocks[0].cards[0].title, 'A');
  assert.equal(model.blocks[0].cards[1].title, 'B');
});

test('6. nested object becomes a section block with child text blocks', () => {
  const model = buildLlmResultModel(JSON.stringify({ detail: { a: 1, b: 'two' } }), {});
  assert.equal(model.status, 'structured');
  assert.deepEqual(types(model), ['section', 'text', 'text']);
  assert.equal(model.blocks[0].heading, 'detail');
  assert.equal(model.blocks[1].heading, 'a');
  assert.equal(model.blocks[1].body, '1');
  assert.equal(model.blocks[2].heading, 'b');
  assert.equal(model.blocks[2].body, 'two');
});

test('7. top-level array of objects becomes a cards block', () => {
  const model = buildLlmResultModel(
    JSON.stringify([{ id: 1, name: 'a' }, { id: 2, name: 'b' }]),
    {},
  );
  assert.equal(model.status, 'structured');
  assert.deepEqual(types(model), ['cards']);
  assert.equal(model.blocks[0].cards[0].title, 'a');
  assert.equal(model.blocks[0].cards[1].title, 'b');
});

test('8. object with scalar values becomes text blocks', () => {
  const model = buildLlmResultModel(JSON.stringify({ count: 3, ok: true }), {});
  assert.equal(model.status, 'structured');
  assert.deepEqual(types(model), ['text', 'text']);
  assert.equal(model.blocks[0].heading, 'count');
  assert.equal(model.blocks[0].body, '3');
  assert.equal(model.blocks[1].heading, 'ok');
  assert.equal(model.blocks[1].body, 'true');
});

test('9. plain non-JSON text becomes a text result', () => {
  const model = buildLlmResultModel('회사 LLM 연결 성공', {});
  assert.equal(model.status, 'text');
  assert.equal(model.text, '회사 LLM 연결 성공');
  assert.equal(model.blocks.length, 0);
});

test('10. invalid JSON string falls back to a text result', () => {
  const model = buildLlmResultModel('{ "broken": ', {});
  assert.equal(model.status, 'text');
  assert.equal(model.text, '{ "broken": ');
  assert.equal(model.blocks.length, 0);
});

test('11. empty string input yields an error result', () => {
  const model = buildLlmResultModel('', {});
  assert.equal(model.status, 'error');
  assert.equal(model.blocks.length, 0);
});

test('12. JSON null value yields an empty result', () => {
  const model = buildLlmResultModel('null', {});
  assert.equal(model.status, 'empty');
  assert.equal(model.blocks.length, 0);
});

test('13. loading flag yields a loading model', () => {
  const model = buildLlmResultModel('anything', { loading: true });
  assert.equal(model.status, 'loading');
  assert.equal(model.blocks.length, 0);
});

test('14. formatRawJson pretty-prints a JSON object', () => {
  const model = buildLlmResultModel({ a: 1, b: [1, 2] }, {});
  const raw = formatRawJson(model);
  assert.equal(raw, JSON.stringify({ a: 1, b: [1, 2] }, null, 2));
});

test('15. formatRawJson returns the original text for non-JSON input', () => {
  const model = buildLlmResultModel('plain text', {});
  assert.equal(formatRawJson(model), 'plain text');
});