import type { ActionMeta, MenuMeta, ProgramComponentMap, ProgramMeta, RoleProgramAction } from './adminShell';

/**
 * Product Module이 BaseKit Host에 제공하는 최소 Manifest 계약이다.
 * Module 내부 구현은 Host가 알지 않고 이 공개 정보만 조립한다.
 */
export interface ApplicationModule {
  id: string;
  programs: ProgramMeta[];
  menus: MenuMeta[];
  actions: ActionMeta[];
  permissions: RoleProgramAction[];
  components: ProgramComponentMap;
}
