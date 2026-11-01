import { useEffect, useMemo, useState } from 'react';
import { SIDEBAR_MENU_SOURCE, type SidebarMenuSource } from '../config/sidebarMenuSource';
import { programComponents } from '../config/programRegistry';
import { fetchRuntimeMenus, MENU_RUNTIME_CHANGED_EVENT } from '../services/menuRuntimeApi';
import { metadataRepository, programByKey } from '../repositories/metadataRepository';
import { convertDbMenuTree, type InvalidRuntimeMenu } from './dbMenuTree';
import type { MenuNode } from '../types/adminShell';

export type SidebarMenuStatus = 'loading' | 'ready' | 'empty' | 'error';

export interface SidebarMenuTreeState {
  source: SidebarMenuSource;
  status: SidebarMenuStatus;
  menuTree: MenuNode[];
  invalidProgramMenus: InvalidRuntimeMenu[];
  errorMessage: string;
}

export function useSidebarMenuTree(): SidebarMenuTreeState {
  const staticMenuTree = useMemo(() => metadataRepository.getMenuTree(), []);
  const [dbState, setDbState] = useState<SidebarMenuTreeState>({
    source: 'DB', status: 'loading', menuTree: [], invalidProgramMenus: [], errorMessage: '',
  });

  useEffect(() => {
    if (SIDEBAR_MENU_SOURCE !== 'DB') return;
    let active = true;
    let revision = 0;
    const load = () => {
      const requestRevision = ++revision;
      setDbState({ source: 'DB', status: 'loading', menuTree: [], invalidProgramMenus: [], errorMessage: '' });
      void fetchRuntimeMenus().then(response => {
        const converted = convertDbMenuTree(response.MENUS, response.INVALID_PROGRAM_MENUS, programByKey, programComponents);
        if (active && requestRevision === revision) setDbState({
          source: 'DB',
          status: converted.menuTree.length ? 'ready' : 'empty',
          menuTree: converted.menuTree,
          invalidProgramMenus: converted.invalidProgramMenus,
          errorMessage: '',
        });
      }).catch((error: unknown) => {
        if (active && requestRevision === revision) setDbState({
          source: 'DB', status: 'error', menuTree: [], invalidProgramMenus: [],
          errorMessage: error instanceof Error ? error.message : 'An error occurred while loading DB menus.',
        });
      });
    };
    load();
    window.addEventListener(MENU_RUNTIME_CHANGED_EVENT, load);
    return () => { active = false; window.removeEventListener(MENU_RUNTIME_CHANGED_EVENT, load); };
  }, []);

  if (SIDEBAR_MENU_SOURCE === 'STATIC') {
    return { source: 'STATIC', status: 'ready', menuTree: staticMenuTree, invalidProgramMenus: [], errorMessage: '' };
  }
  return dbState;
}
