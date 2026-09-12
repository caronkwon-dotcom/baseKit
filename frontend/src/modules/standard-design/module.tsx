import { COMMON_ACTIONS } from '../../constants/actionCodes';
import type { ApplicationModule } from '../../types/applicationModule';
import StandardDesignSkeletonPage from './ui/pages/StandardDesignSkeletonPage';
import ScreenDesignPage from './ui/pages/ScreenDesignPage';
import './standardDesign.css';

const MODULE_ID = 'standard-design';
const STANDARD_DESIGN_ACTIONS = {
  DESIGN_VALIDATE: 'SD_DESIGN_VALIDATE',
} as const;

const standardDesignModule: ApplicationModule = {
  id: MODULE_ID,
  programs: [
    {
      programKey: 'SD_PROJECT_MGMT',
      programName: '프로젝트 관리',
      componentName: 'StandardDesignProjectPage',
      screenType: 'GRID_DETAIL',
      routePath: '/standard-design/projects',
      dataScope: 'COMPANY',
      modifyScope: 'ROLE',
      actionCodes: [COMMON_ACTIONS.SEARCH, COMMON_ACTIONS.CREATE, COMMON_ACTIONS.UPDATE, COMMON_ACTIONS.DELETE],
      useYn: 'Y',
    },
    {
      programKey: 'SD_CUSTOMER_STANDARD',
      programName: '고객 표준 관리',
      componentName: 'StandardDesignCustomerStandardPage',
      screenType: 'GRID_DETAIL',
      routePath: '/standard-design/customer-standards',
      dataScope: 'COMPANY',
      modifyScope: 'ROLE',
      actionCodes: [COMMON_ACTIONS.SEARCH, COMMON_ACTIONS.CREATE, COMMON_ACTIONS.UPDATE, COMMON_ACTIONS.DELETE],
      useYn: 'Y',
    },
    {
      programKey: 'SD_SCREEN_DESIGN',
      programName: '화면 설계',
      componentName: 'StandardDesignScreenDesignPage',
      screenType: 'GRID_DETAIL',
      routePath: '/standard-design/screens',
      dataScope: 'COMPANY',
      modifyScope: 'ROLE',
      actionCodes: [COMMON_ACTIONS.SEARCH, COMMON_ACTIONS.CREATE, COMMON_ACTIONS.UPDATE, COMMON_ACTIONS.DELETE, STANDARD_DESIGN_ACTIONS.DESIGN_VALIDATE],
      useYn: 'Y',
    },
  ],
  menus: [
    {
      menuKey: 'STANDARD_DESIGN',
      parentMenuKey: null,
      menuName: 'Standard Design',
      menuLevel: 1,
      menuType: 'GROUP',
      programKey: null,
      sortOrder: 10,
      useYn: 'Y',
    },
    {
      menuKey: 'STANDARD_DESIGN.PROJECT',
      parentMenuKey: 'STANDARD_DESIGN',
      menuName: '프로젝트 관리',
      menuLevel: 2,
      menuType: 'SCREEN',
      programKey: 'SD_PROJECT_MGMT',
      sortOrder: 1,
      useYn: 'Y',
    },
    {
      menuKey: 'STANDARD_DESIGN.CUSTOMER_STANDARD',
      parentMenuKey: 'STANDARD_DESIGN',
      menuName: '고객 표준 관리',
      menuLevel: 2,
      menuType: 'SCREEN',
      programKey: 'SD_CUSTOMER_STANDARD',
      sortOrder: 2,
      useYn: 'Y',
    },
    {
      menuKey: 'STANDARD_DESIGN.SCREEN',
      parentMenuKey: 'STANDARD_DESIGN',
      menuName: '화면 설계',
      menuLevel: 2,
      menuType: 'SCREEN',
      programKey: 'SD_SCREEN_DESIGN',
      sortOrder: 3,
      useYn: 'Y',
    },
  ],
  actions: [
    { actionCode: STANDARD_DESIGN_ACTIONS.DESIGN_VALIDATE, actionName: '설계검증', auditYn: 'Y' },
  ],
  permissions: [
    { ROLE_CODE: 'ADMIN', PROGRAM_KEY: 'SD_PROJECT_MGMT', ACTION_CODE: COMMON_ACTIONS.SEARCH, ALLOW_YN: 'Y' },
    { ROLE_CODE: 'ADMIN', PROGRAM_KEY: 'SD_PROJECT_MGMT', ACTION_CODE: COMMON_ACTIONS.CREATE, ALLOW_YN: 'Y' },
    { ROLE_CODE: 'ADMIN', PROGRAM_KEY: 'SD_PROJECT_MGMT', ACTION_CODE: COMMON_ACTIONS.UPDATE, ALLOW_YN: 'Y' },
    { ROLE_CODE: 'ADMIN', PROGRAM_KEY: 'SD_PROJECT_MGMT', ACTION_CODE: COMMON_ACTIONS.DELETE, ALLOW_YN: 'Y' },
    { ROLE_CODE: 'ADMIN', PROGRAM_KEY: 'SD_CUSTOMER_STANDARD', ACTION_CODE: COMMON_ACTIONS.SEARCH, ALLOW_YN: 'Y' },
    { ROLE_CODE: 'ADMIN', PROGRAM_KEY: 'SD_CUSTOMER_STANDARD', ACTION_CODE: COMMON_ACTIONS.CREATE, ALLOW_YN: 'Y' },
    { ROLE_CODE: 'ADMIN', PROGRAM_KEY: 'SD_CUSTOMER_STANDARD', ACTION_CODE: COMMON_ACTIONS.UPDATE, ALLOW_YN: 'Y' },
    { ROLE_CODE: 'ADMIN', PROGRAM_KEY: 'SD_CUSTOMER_STANDARD', ACTION_CODE: COMMON_ACTIONS.DELETE, ALLOW_YN: 'Y' },
    { ROLE_CODE: 'ADMIN', PROGRAM_KEY: 'SD_SCREEN_DESIGN', ACTION_CODE: COMMON_ACTIONS.SEARCH, ALLOW_YN: 'Y' },
    { ROLE_CODE: 'ADMIN', PROGRAM_KEY: 'SD_SCREEN_DESIGN', ACTION_CODE: COMMON_ACTIONS.CREATE, ALLOW_YN: 'Y' },
    { ROLE_CODE: 'ADMIN', PROGRAM_KEY: 'SD_SCREEN_DESIGN', ACTION_CODE: COMMON_ACTIONS.UPDATE, ALLOW_YN: 'Y' },
    { ROLE_CODE: 'ADMIN', PROGRAM_KEY: 'SD_SCREEN_DESIGN', ACTION_CODE: COMMON_ACTIONS.DELETE, ALLOW_YN: 'Y' },
    { ROLE_CODE: 'ADMIN', PROGRAM_KEY: 'SD_SCREEN_DESIGN', ACTION_CODE: STANDARD_DESIGN_ACTIONS.DESIGN_VALIDATE, ALLOW_YN: 'Y' },
  ],
  components: {
    SD_PROJECT_MGMT: () => (
      <StandardDesignSkeletonPage
        title="프로젝트 관리"
        description="Standard Design 작업 단위와 고객 프로젝트를 관리하는 영역입니다."
        nextStep="프로젝트 기본정보와 고객 표준 연결 모델을 정의합니다."
      />
    ),
    SD_CUSTOMER_STANDARD: () => (
      <StandardDesignSkeletonPage
        title="고객 표준 관리"
        description="고객사가 제공한 용어·화면·DB 표준을 설계 기준으로 관리하는 영역입니다."
        nextStep="BaseKit Runtime 기준정보와 섞이지 않는 설계 Metadata 계약을 정의합니다."
      />
    ),
    SD_SCREEN_DESIGN: ScreenDesignPage,
  },
};

export default standardDesignModule;
