import { useEffect, useSyncExternalStore } from 'react';
import { ensureProjectsLoaded, getProjectError, getProjectSnapshot, getProjectStatus, getSelectedProject, getSelectedProjectId, subscribeProjects } from '../../projects/projectStore';

const subscribe = (notify: () => void) => {
  const unsubscribe = subscribeProjects(notify);
  window.addEventListener('storage', notify);
  return () => {
    unsubscribe();
    window.removeEventListener('storage', notify);
  };
};

/** projectId/project follow the server list; status tells whether that list has been read yet. */
export function useProjectContext() {
  useSyncExternalStore(subscribe, getProjectSnapshot, () => '');
  useEffect(() => { void ensureProjectsLoaded(); }, []);
  const projectId = getSelectedProjectId();
  return { projectId, project: getSelectedProject(), status: getProjectStatus(), error: getProjectError() };
}
