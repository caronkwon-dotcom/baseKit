import CodeManagePage from '../pages/CodeManagePage';
import HomePage from '../pages/HomePage';
import MenuManagePage from '../pages/MenuManagePage';
import UserManagePage from '../pages/UserManagePage';
import { SearchSampleType1Page } from '../features/devGuide/searchSampleType1';
import { SearchSampleType2Page } from '../features/devGuide/searchSampleType2';
import { TermCurationPage } from '../features/system/termCuration';
import { DomainManagePage } from '../features/system/domainManage';
import { WordManagePage } from '../features/system/wordManage';
import type { ProgramComponentMap } from '../types/adminShell';

/** PROGRAM_KEY와 실제 React 화면 구현의 연결만 담당한다. */
export const programComponents: ProgramComponentMap = {
  HOME: () => <HomePage />,
  USER_MGMT: () => <UserManagePage />,
  COMMON_CODE_MGMT: () => <CodeManagePage />,
  MENU_MGMT: () => <MenuManagePage />,
  TERM_CURATION: () => <TermCurationPage />,
  WORD_MGMT: () => <WordManagePage />,
  DOMAIN_MGMT: () => <DomainManagePage />,
  DEV_SEARCH_SAMPLE_TYPE_1: () => <SearchSampleType1Page />,
  DEV_SEARCH_SAMPLE_TYPE_2: () => <SearchSampleType2Page />,
};
