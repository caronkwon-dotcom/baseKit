import test from 'node:test';
import assert from 'node:assert/strict';
import { compareGroupingResult, groupingNotices, groupingSourceOf } from '../src/modules/standard-design/requirementgroup/groupingResult.ts';

const group = (ids) => ({ GROUP_ID: 'g1', TITLE: 'T', REASON: 'R', REVIEW_STATUS: 'APPROVED', MEMBERS: ids.map(([id, reason = `r-${id}`]) => ({ REQUIREMENT_ID: id, REASON: reason })) });
const finalOf = (ids) => ids.map(([id, reason = `r-${id}`]) => ({ REQUIREMENT_ID: id, INCLUSION_REASON: reason }));
const row = (result, id) => result.rows.find(item => item.requirementId === id);

test('AI grouping source is read from REQUEST_ID and anything else has no source', () => {
 assert.deepEqual(groupingSourceOf('PG-0a1b2c:3f8e-44'), { analysisId: 'PG-0a1b2c', draftGroupId: '3f8e-44' });
 assert.equal(groupingSourceOf('723cebc7-d190-45c7-b47f-67549e88fadb'), null);
 assert.equal(groupingSourceOf('PG-0a1b2c'), null);
 assert.equal(groupingSourceOf('PG-:x'), null);
 assert.equal(groupingSourceOf(''), null);
 assert.equal(groupingSourceOf(undefined), null);
});

test('AI recommendation, review and final composition are separated per requirement', () => {
 const ai = group([['A'], ['B'], ['C']]);
 const reviewed = group([['A'], ['C'], ['D']]);
 const result = compareGroupingResult(finalOf([['A'], ['D'], ['E']]), reviewed, ai);
 assert.deepEqual([row(result, 'A').origin, row(result, 'A').stage], ['KEPT', '']);
 assert.deepEqual([row(result, 'B').origin, row(result, 'B').stage], ['EXCLUDED', 'REVIEW']);
 assert.deepEqual([row(result, 'C').origin, row(result, 'C').stage], ['EXCLUDED', 'AFTER']);
 assert.deepEqual([row(result, 'D').origin, row(result, 'D').stage], ['ADDED', 'REVIEW']);
 assert.deepEqual([row(result, 'E').origin, row(result, 'E').stage], ['ADDED', 'AFTER']);
 assert.deepEqual(result.summary, { finalCount: 3, kept: 1, unknown: 0, reasonChanged: 0, added: { review: 1, after: 1 }, excluded: { review: 1, after: 1 } });
 assert.equal(row(result, 'A').inAi, true);
 assert.equal(row(result, 'E').inAi, false);
});

test('a requirement added in review and removed afterwards is reported once as excluded after registration', () => {
 const result = compareGroupingResult(finalOf([['A']]), group([['A'], ['D']]), group([['A']]));
 assert.deepEqual([row(result, 'D').origin, row(result, 'D').stage], ['EXCLUDED', 'AFTER']);
});

test('reason changes are detected only for members present in both reviewed and final', () => {
 const reviewed = group([['A', '업무 유사'], ['B', '같은 화면']]);
 const result = compareGroupingResult(finalOf([['A', '업무 유사 '], ['B', '수정한 사유']]), reviewed, group([['A'], ['B']]));
 assert.equal(row(result, 'A').reasonChanged, false);
 assert.equal(row(result, 'B').reasonChanged, true);
 assert.equal(result.summary.reasonChanged, 1);
 assert.equal(row(result, 'B').reviewedReason, '같은 화면');
 assert.equal(row(result, 'B').finalReason, '수정한 사유');
});

test('without an AI baseline only changes after registration are claimed and the rest is unknown', () => {
 const result = compareGroupingResult(finalOf([['A'], ['E']]), group([['A'], ['C']]), null);
 assert.equal(row(result, 'A').origin, 'UNKNOWN');
 assert.equal(row(result, 'A').inAi, null);
 assert.deepEqual([row(result, 'E').origin, row(result, 'E').stage], ['ADDED', 'AFTER']);
 assert.deepEqual([row(result, 'C').origin, row(result, 'C').stage], ['EXCLUDED', 'AFTER']);
 assert.equal(result.summary.unknown, 1);
 assert.equal(result.summary.kept, 0);
});

const notice = (patch = {}) => groupingNotices({ source: { analysisId: 'PG-1', draftGroupId: 'g' }, load: 'READY', linked: true, hasReviewed: true, hasAi: true, groupStatus: 'CONFIRMED', revisionMismatch: 0, discarded: 0, ...patch });

test('a fully linked confirmed group has no notices', () => {
 assert.deepEqual(notice(), []);
});

test('missing or unlinked AI evidence is explained and never replaced', () => {
 assert.match(notice({ source: null, load: 'NONE' })[0].text, /AI 추천 근거가 없습니다/);
 assert.equal(notice({ load: 'LOADING' })[0].level, 'info');
 assert.equal(notice({ load: 'ERROR' })[0].level, 'error');
 assert.match(notice({ linked: false })[0].text, /연결을 확인하지 못했습니다/);
 assert.match(notice({ hasReviewed: false })[0].text, /검토본을 찾지 못했습니다/);
 assert.match(notice({ hasAi: false })[0].text, /원본이 저장되어 있지 않습니다/);
 assert.match(notice({ hasAi: false, humanCreated: true })[0].text, /사람이 만든 그룹/);
});

test('group status and requirement drift are reported as mismatches', () => {
 assert.match(notice({ groupStatus: 'DRAFT' })[0].text, /확정 버전이 없습니다/);
 assert.match(notice({ groupStatus: 'REVIEW_REQUIRED' })[0].text, /재검토가 필요/);
 assert.match(notice({ revisionMismatch: 2 })[0].text, /2건의 요구사항/);
 assert.match(notice({ discarded: 1 })[0].text, /폐기/);
});

test('card badge is shown only when the origin is proven', async () => {
 const { memberBadge } = await import('../src/modules/standard-design/requirementgroup/groupingResult.ts');
 assert.equal(memberBadge({ origin: 'KEPT' }), 'AI 추천');
 assert.equal(memberBadge({ origin: 'ADDED' }), '직접 추가');
 assert.equal(memberBadge({ origin: 'UNKNOWN' }), '');
 assert.equal(memberBadge({ origin: 'EXCLUDED' }), '');
 assert.equal(memberBadge(undefined), '');
});
