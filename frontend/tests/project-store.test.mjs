import test from 'node:test';
import assert from 'node:assert/strict';
import { projectApi, ProjectApiError, toProject } from '../src/modules/standard-design/projects/projectApi.ts';
import * as store from '../src/modules/standard-design/projects/projectStore.ts';

const server = (id, extra = {}) => ({ PROJECT_ID: id, PROJECT_NAME: `이름 ${id}`, CUSTOMER_NAME: '고객', DESCRIPTION: '', STATUS: 'DRAFT', START_DATE: '2026-11-01', END_DATE: '2027-03-31', VERSION: 1, ...extra });
const ok = data => ({ ok: true, status: 200, json: async () => ({ SUCCESS: true, DATA: data }) });
const fail = (status, message) => ({ ok: false, status, json: async () => ({ MESSAGE: message }) });

function setup(handler) {
 const calls = [];
 const memory = new Map();
 globalThis.localStorage = { getItem: key => memory.has(key) ? memory.get(key) : null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
 globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return handler(String(url), init); };
 store.resetProjectStore();
 return { calls, memory };
}

test('the list is read from the server and period dates the server does not have yet become empty', async () => {
 const { calls } = setup(() => ok([server('SDP-1'), server('SDP-2', { START_DATE: null, END_DATE: null, CUSTOMER_NAME: null })]));
 assert.equal(store.getProjectStatus(), 'IDLE');
 await store.loadProjects();
 assert.equal(calls.length, 1);
 assert.equal(calls[0].url, '/api/standard-design/projects');
 assert.equal(store.getProjectStatus(), 'READY');
 assert.equal(store.hasLoadedProjects(), true);
 assert.deepEqual(store.getProjects().map(project => project.PROJECT_ID), ['SDP-1', 'SDP-2']);
 assert.equal(store.getProjects()[1].START_DATE, '');
 assert.equal(store.getProjects()[1].CUSTOMER_NAME, '');
 assert.equal(store.getProjects()[0].VERSION, 1);
});

test('concurrent loads share one request and a loaded list is not read again', async () => {
 const { calls } = setup(() => ok([server('SDP-1')]));
 await Promise.all([store.ensureProjectsLoaded(), store.ensureProjectsLoaded(), store.loadProjects()]);
 assert.equal(calls.length, 1);
 await store.ensureProjectsLoaded();
 assert.equal(calls.length, 1);
});

test('the stored selection is trusted while loading and checked against the server list afterwards', async () => {
 const { memory } = setup(() => ok([server('SDP-1')]));
 memory.set('basekit.standard-design.project-context.v1', 'SDP-9');
 assert.equal(store.getSelectedProjectId(), 'SDP-9');
 await store.loadProjects();
 assert.equal(store.getSelectedProjectId(), '');
 store.setSelectedProjectId('SDP-1');
 assert.equal(store.getSelectedProjectId(), 'SDP-1');
 assert.equal(store.getSelectedProject().PROJECT_NAME, '이름 SDP-1');
 store.setSelectedProjectId('');
 assert.equal(memory.has('basekit.standard-design.project-context.v1'), false);
});

test('a server failure is shown and never replaced by browser data; a retry recovers', async () => {
 let down = true;
 setup(() => { if (down) throw new TypeError('fetch failed'); return ok([server('SDP-1')]); });
 await store.loadProjects();
 assert.equal(store.getProjectStatus(), 'ERROR');
 assert.match(store.getProjectError(), /서버에 연결하지 못했습니다/);
 assert.deepEqual(store.getProjects(), []);
 assert.equal(store.hasLoadedProjects(), false);
 down = false;
 await store.loadProjects();
 assert.equal(store.getProjectStatus(), 'READY');
 assert.equal(store.getProjects().length, 1);
});

test('server messages and status codes are passed through', async () => {
 setup(() => fail(422, '프로젝트명과 고객명은 필수입니다.'));
 await assert.rejects(projectApi.create({ PROJECT_NAME: '', CUSTOMER_NAME: '', DESCRIPTION: '', STATUS: 'DRAFT', START_DATE: '', END_DATE: '' }),
  error => error instanceof ProjectApiError && error.status === 422 && error.message === '프로젝트명과 고객명은 필수입니다.');
 setup(() => fail(409, '하위 데이터가 있어 삭제할 수 없습니다: 요구사항 3건'));
 await assert.rejects(projectApi.remove('SDP-1', 2), error => error.status === 409 && /요구사항 3건/.test(error.message));
});

test('create, update and delete send what the server contract expects', async () => {
 const { calls } = setup(() => ok(server('SDP-1', { VERSION: 2 })));
 const input = { PROJECT_NAME: '이름', CUSTOMER_NAME: '고객', DESCRIPTION: '', STATUS: 'DRAFT', START_DATE: '2026-11-01', END_DATE: '2027-03-31' };
 await projectApi.create(input);
 assert.equal(calls[0].init.method, 'POST');
 assert.deepEqual(JSON.parse(calls[0].init.body), input);
 const updated = await projectApi.update('SDP/1', input, 1);
 assert.equal(calls[1].url, '/api/standard-design/projects/SDP%2F1');
 assert.equal(calls[1].init.method, 'PUT');
 assert.equal(JSON.parse(calls[1].init.body).VERSION, 1);
 assert.equal(updated.VERSION, 2);
 await projectApi.remove('SDP-1', 2);
 assert.equal(calls[2].url, '/api/standard-design/projects/SDP-1?VERSION=2');
 assert.equal(calls[2].init.method, 'DELETE');
});

test('the cache follows saves and deletes without another read', async () => {
 const { calls } = setup(() => ok([server('SDP-1')]));
 await store.loadProjects();
 store.upsertProject(toProject(server('SDP-2')));
 store.upsertProject(toProject(server('SDP-1', { PROJECT_NAME: '바뀐 이름', VERSION: 2 })));
 assert.deepEqual(store.getProjects().map(project => project.PROJECT_NAME), ['바뀐 이름', '이름 SDP-2']);
 store.removeProjectFromCache('SDP-1');
 assert.deepEqual(store.getProjects().map(project => project.PROJECT_ID), ['SDP-2']);
 assert.equal(calls.length, 1);
});

test('subscribers are told about every change and the snapshot changes with them', async () => {
 setup(() => ok([server('SDP-1')]));
 let notified = 0;
 const unsubscribe = store.subscribeProjects(() => { notified += 1; });
 const before = store.getProjectSnapshot();
 await store.loadProjects();
 assert.ok(notified >= 2);
 assert.notEqual(store.getProjectSnapshot(), before);
 unsubscribe();
 const count = notified;
 store.setSelectedProjectId('SDP-1');
 assert.equal(notified, count);
});
