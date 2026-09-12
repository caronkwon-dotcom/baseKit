import CodeManagePage from '../pages/CodeManagePage';
import HomePage from '../pages/HomePage';
import MenuManagePage from '../pages/MenuManagePage';
import UserManagePage from '../pages/UserManagePage';
import { SearchSampleType1Page } from '../features/devGuide/searchSampleType1';
import { SearchSampleType2Page } from '../features/devGuide/searchSampleType2';
import { TermCurationPage } from '../features/system/termCuration';
import { DomainManagePage } from '../features/system/domainManage';
import { WordManagePage } from '../features/system/wordManage';
import { TableManagePage } from '../features/system/tableManage';
import { DocumentCenterPage } from '../features/devGuide/documentCenter';
import { applicationModules } from './moduleRegistry';
import type { ProgramComponentMap } from '../types/adminShell';

/** BaseKit Core PROGRAM_KEY와 실제 React 화면 구현의 연결이다. */
const coreProgramComponents: ProgramComponentMap = {
  HOME: () => <HomePage />,
  USER_MGMT: () => <UserManagePage />,
  COMMON_CODE_MGMT: () => <CodeManagePage />,
  MENU_MGMT: () => <MenuManagePage />,
  TABLE_MGMT: () => <TableManagePage />,
  TERM_CURATION: () => <TermCurationPage />,
  WORD_MGMT: () => <WordManagePage />,
  DOMAIN_MGMT: () => <DomainManagePage />,
  DOCUMENT_CENTER: () => <DocumentCenterPage />,
  DEV_SEARCH_SAMPLE_TYPE_1: () => <SearchSampleType1Page />,
  DEV_SEARCH_SAMPLE_TYPE_2: () => <SearchSampleType2Page />,
};

const moduleProgramComponents = applicationModules.reduce<ProgramComponentMap>((components, module) => {
  Object.keys(module.components).forEach((programKey) => {
    if (coreProgramComponents[programKey] || components[programKey]) {
      throw new Error(`Module Component PROGRAM_KEY 중복: ${programKey}`);
    }
  });
  return { ...components, ...module.components };
}, {});

/** Host가 Core와 Product Module Component를 최종 조립한다. */
export const programComponents: ProgramComponentMap = {
  ...coreProgramComponents,
  ...moduleProgramComponents,
};
