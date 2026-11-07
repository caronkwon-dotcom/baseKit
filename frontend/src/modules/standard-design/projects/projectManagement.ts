/** Entry and selection rules of the project management screen (pure). The screen opens straight into list + detail. */

export type ProjectLoadStatus = 'IDLE' | 'LOADING' | 'READY' | 'ERROR';
export type ProjectSelection = { kind: 'EDIT'; projectId: string } | { kind: 'NEW' } | { kind: 'NONE' };
export type ProjectMessageType = 'info' | 'warn' | 'error' | 'success';

/**
 * What to show first once the server list is read: the project selected in the project context, otherwise the first row,
 * and with no projects the new-project form. While the list is loading or failed nothing is selected, so no new form is
 * offered on top of a list that simply has not arrived.
 */
export function initialSelection(status: ProjectLoadStatus, rows: readonly { PROJECT_ID: string }[], contextProjectId: string): ProjectSelection {
  if (status !== 'READY') return { kind: 'NONE' };
  if (!rows.length) return { kind: 'NEW' };
  const inContext = contextProjectId ? rows.find(row => row.PROJECT_ID === contextProjectId) : undefined;
  return { kind: 'EDIT', projectId: (inContext ?? rows[0]).PROJECT_ID };
}

/** After a delete: the row that took its place, else the previous one, else the new-project form. */
export function selectionAfterDelete(rows: readonly { PROJECT_ID: string }[], deletedId: string): ProjectSelection {
  const index = rows.findIndex(row => row.PROJECT_ID === deletedId);
  const rest = rows.filter(row => row.PROJECT_ID !== deletedId);
  if (!rest.length) return { kind: 'NEW' };
  return { kind: 'EDIT', projectId: rest[Math.min(Math.max(index, 0), rest.length - 1)].PROJECT_ID };
}

/** Banner tone used by the page (warning) → the shared message component (warn). */
export const toMessageType = (tone: 'info' | 'warning' | 'error' | 'success'): ProjectMessageType => tone === 'warning' ? 'warn' : tone;

/** Which message the fixed message area shows: the screen's own message, else the load error, else the loading note. */
export function areaMessage(own: { tone: 'info' | 'warning' | 'error' | 'success'; text: string } | null, status: ProjectLoadStatus, error: string): { type: ProjectMessageType; text: string } | null {
  if (own) return { type: toMessageType(own.tone), text: own.text };
  if (status === 'ERROR') return { type: 'error', text: `${error} 프로젝트는 서버에서만 조회합니다.` };
  if (status === 'LOADING' || status === 'IDLE') return { type: 'info', text: '프로젝트 목록을 서버에서 조회하는 중입니다.' };
  return null;
}
