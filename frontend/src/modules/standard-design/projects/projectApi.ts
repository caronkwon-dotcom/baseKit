import type { DesignProject, DesignStatus } from '../design-lifecycle/designLifecycle.types.ts';

/** Project master on the server (BSDPROJ). Nothing here falls back to browser storage. */
export class ProjectApiError extends Error {
 status: number;
 constructor(status: number, message: string, cause?: unknown) { super(message, cause === undefined ? undefined : { cause }); this.status = status; }
}

export interface ProjectInput { PROJECT_NAME: string; CUSTOMER_NAME: string; DESCRIPTION: string; STATUS: DesignStatus; START_DATE: string; END_DATE: string }

const base = '/api/standard-design/projects';

async function request<T>(path = '', init?: RequestInit): Promise<T> {
 let response: Response;
 try { response = await fetch(base + path, init); }
 catch (error) { throw new ProjectApiError(0, '서버에 연결하지 못했습니다. 백엔드 실행 상태를 확인하세요.', error); }
 if (!response.ok) {
  const body = await response.json().catch(() => ({})) as { MESSAGE?: string };
  throw new ProjectApiError(response.status, body.MESSAGE || '프로젝트 요청에 실패했습니다.');
 }
 return (await response.json() as { DATA: T }).DATA;
}

const json = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

interface ServerProject extends Omit<DesignProject, 'START_DATE' | 'END_DATE'> { START_DATE: string | null; END_DATE: string | null; VERSION: number }

/** The server may not have period dates yet (backfilled projects); the screen treats them as empty. */
export function toProject(row: ServerProject): DesignProject {
 return {
  PROJECT_ID: row.PROJECT_ID, PROJECT_NAME: row.PROJECT_NAME ?? row.PROJECT_ID, CUSTOMER_NAME: row.CUSTOMER_NAME ?? '', DESCRIPTION: row.DESCRIPTION ?? '',
  STATUS: row.STATUS ?? 'DRAFT', START_DATE: row.START_DATE ?? '', END_DATE: row.END_DATE ?? '', VERSION: row.VERSION,
 };
}

export const projectApi = {
 list: async () => (await request<ServerProject[]>()).map(toProject),
 create: async (input: ProjectInput) => toProject(await request<ServerProject>('', json('POST', input))),
 update: async (id: string, input: ProjectInput, version: number) => toProject(await request<ServerProject>(`/${encodeURIComponent(id)}`, json('PUT', { ...input, VERSION: version }))),
 remove: (id: string, version: number) => request<null>(`/${encodeURIComponent(id)}?VERSION=${version}`, { method: 'DELETE' }),
};
