import type { DesignProject } from '../design-lifecycle/designLifecycle.types.ts';
import { projectApi } from './projectApi.ts';

/**
 * In-memory copy of the server's project list plus the selected project ID (the only project value kept in the browser).
 * While the list is loading the stored selection is trusted so entry guards do not block a valid project.
 */
export type ProjectStoreStatus = 'IDLE' | 'LOADING' | 'READY' | 'ERROR';

const PROJECT_CONTEXT_KEY = 'basekit.standard-design.project-context.v1';

let status: ProjectStoreStatus = 'IDLE';
let projects: DesignProject[] = [];
let error = '';
let revision = 0;
let loadedOnce = false;
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
 revision += 1;
 listeners.forEach(listener => listener());
}

function storage(): Storage | null {
 try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

export function subscribeProjects(listener: () => void) {
 listeners.add(listener);
 return () => { listeners.delete(listener); };
}

export const getProjects = () => projects;
export const getProjectStatus = () => status;
export const getProjectError = () => error;
/** True after the first successful read; screens use it to start from the server list exactly once. */
export const hasLoadedProjects = () => loadedOnce;
/** Changes whenever the list, its status or the selection changes; usable as a store snapshot. */
export const getProjectSnapshot = () => `${status}:${revision}:${getSelectedProjectId()}`;

export function getSelectedProjectId(): string {
 const saved = storage()?.getItem(PROJECT_CONTEXT_KEY) ?? '';
 if (!saved) return '';
 if (status === 'READY') return projects.some(project => project.PROJECT_ID === saved) ? saved : '';
 return saved;
}

export const getSelectedProject = () => projects.find(project => project.PROJECT_ID === getSelectedProjectId()) ?? null;

export function setSelectedProjectId(projectId: string) {
 const store = storage();
 if (projectId) store?.setItem(PROJECT_CONTEXT_KEY, projectId); else store?.removeItem(PROJECT_CONTEXT_KEY);
 if (typeof window !== 'undefined') window.dispatchEvent(new Event('basekit:project-context-changed'));
 emit();
}

/** Reads the project list from the server; concurrent calls share one request. */
export function loadProjects(): Promise<void> {
 if (pending) return pending;
 status = 'LOADING';
 emit();
 pending = projectApi.list()
  .then(rows => { projects = rows; error = ''; status = 'READY'; loadedOnce = true; })
  .catch(cause => { error = cause instanceof Error ? cause.message : '프로젝트 목록을 조회하지 못했습니다.'; status = 'ERROR'; })
  .finally(() => { pending = null; emit(); });
 return pending;
}

export function ensureProjectsLoaded(): Promise<void> {
 return status === 'IDLE' ? loadProjects() : pending ?? Promise.resolve();
}

/** Keeps the cache in step after the server accepted a save. */
export function upsertProject(project: DesignProject) {
 projects = projects.some(item => item.PROJECT_ID === project.PROJECT_ID)
  ? projects.map(item => item.PROJECT_ID === project.PROJECT_ID ? project : item)
  : [...projects, project];
 emit();
}

export function removeProjectFromCache(projectId: string) {
 projects = projects.filter(project => project.PROJECT_ID !== projectId);
 emit();
}

/** For tests only. */
export function resetProjectStore() {
 status = 'IDLE'; projects = []; error = ''; loadedOnce = false; pending = null; revision = 0; listeners.clear();
}
