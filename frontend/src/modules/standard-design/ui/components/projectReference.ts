import type { DesignProject, DesignStatus } from '../../design-lifecycle/designLifecycle.types';

export type ProjectSearchCondition = {
  PROJECT_NAME: string;
  CUSTOMER_NAME: string;
  STATUS: '' | DesignStatus;
};

export type ProjectEditorMode = 'EDIT' | 'NEW' | 'COPY';

export interface ProjectSearchResult {
  condition: ProjectSearchCondition;
  rows: DesignProject[];
}

export const emptyProjectSearchCondition: ProjectSearchCondition = {
  PROJECT_NAME: '', CUSTOMER_NAME: '', STATUS: '',
};

/** Keep the executed query and its entire result together, apart from draft inputs. */
export function searchProjectSnapshot(projects: DesignProject[], condition: ProjectSearchCondition): ProjectSearchResult {
  return { condition: { ...condition }, rows: filterProjects(projects, condition).map((project) => ({ ...project })) };
}

/** Editing must not silently re-filter the user's current working set. */
export function saveToProjectWorkingSet(rows: DesignProject[], saved: DesignProject, mode: ProjectEditorMode): DesignProject[] {
  return rows.some((project) => project.PROJECT_ID === saved.PROJECT_ID)
    ? rows.map((project) => project.PROJECT_ID === saved.PROJECT_ID ? saved : project)
    : mode === 'EDIT' ? rows : [...rows, saved];
}
export type ProjectMessageTone = 'info' | 'warning' | 'error' | 'success';

export interface ProjectDraft {
  PROJECT_NAME: string;
  CUSTOMER_NAME: string;
  DESCRIPTION: string;
  STATUS: DesignStatus;
}

export interface ProjectEditor {
  mode: ProjectEditorMode;
  sourceProjectId?: string;
  initialDraft: ProjectDraft;
  draft: ProjectDraft;
}

export function toProjectDraft(project: DesignProject): ProjectDraft {
  return {
    PROJECT_NAME: project.PROJECT_NAME,
    CUSTOMER_NAME: project.CUSTOMER_NAME,
    DESCRIPTION: project.DESCRIPTION,
    STATUS: project.STATUS,
  };
}

export function createEmptyProjectDraft(): ProjectDraft {
  return {
    PROJECT_NAME: '',
    CUSTOMER_NAME: '',
    DESCRIPTION: '',
    STATUS: 'DRAFT',
  };
}

export function filterProjects(projects: DesignProject[], condition: ProjectSearchCondition) {
  const projectName = condition.PROJECT_NAME.trim().toLocaleLowerCase();
  const customerName = condition.CUSTOMER_NAME.trim().toLocaleLowerCase();

  return projects.filter((project) => (
    (!projectName || project.PROJECT_NAME.toLocaleLowerCase().includes(projectName))
    && (!customerName || project.CUSTOMER_NAME.toLocaleLowerCase().includes(customerName))
    && (!condition.STATUS || project.STATUS === condition.STATUS)
  ));
}

export function getAppliedSearchDescription(condition: ProjectSearchCondition) {
  const filters = [
    condition.PROJECT_NAME.trim() ? `프로젝트명: ${condition.PROJECT_NAME.trim()}` : null,
    condition.CUSTOMER_NAME.trim() ? `고객명: ${condition.CUSTOMER_NAME.trim()}` : null,
    condition.STATUS ? `상태: ${condition.STATUS}` : null,
  ].filter((filter): filter is string => Boolean(filter));

  return filters.length ? filters.join(' / ') : '전체';
}

export function getNextProjectId(projects: DesignProject[]) {
  const maxProjectNumber = projects.reduce((maximum, project) => {
    const match = /^SDP-(\d+)$/.exec(project.PROJECT_ID);
    return match ? Math.max(maximum, Number(match[1])) : maximum;
  }, 0);

  return `SDP-${String(maxProjectNumber + 1).padStart(3, '0')}`;
}

export function isProjectDraftDirty(editor: ProjectEditor | null) {
  return Boolean(editor && (editor.mode === 'COPY' || JSON.stringify(editor.draft) !== JSON.stringify(editor.initialDraft)));
}

/** Saved detail identity must remain available even outside the current search result. */
export function getEditorProject(editor: ProjectEditor | null): DesignProject | undefined {
  return editor?.mode === 'EDIT' && editor.sourceProjectId
    ? { PROJECT_ID: editor.sourceProjectId, ...editor.initialDraft }
    : undefined;
}
