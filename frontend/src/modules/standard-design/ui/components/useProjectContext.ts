import { useSyncExternalStore } from 'react';
import { designLifecycleRepository } from '../../design-lifecycle/designLifecycle.repository';

const subscribe = (notify: () => void) => {
  window.addEventListener('basekit:project-context-changed', notify);
  window.addEventListener('storage', notify);
  return () => {
    window.removeEventListener('basekit:project-context-changed', notify);
    window.removeEventListener('storage', notify);
  };
};

export function useProjectContext() {
  const projectId = useSyncExternalStore(subscribe, designLifecycleRepository.getSelectedProjectId, () => '');
  const project = designLifecycleRepository.getData().projects.find((item) => item.PROJECT_ID === projectId) ?? null;
  return { projectId, project };
}
