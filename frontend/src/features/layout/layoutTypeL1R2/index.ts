import LayoutTypeL1R2 from './layoutTypeL1R2';
import { COMMON_ACTIONS } from '../../../constants/actionCodes';
/**
 * [STANDARD] Program Auto Discovery 규칙
 *
 * - 메뉴에서 프로그램을 선택하려면 해당 Program의 index.ts 등록이 필수입니다.
 * - BaseKit은 features 하위의 index.ts를 자동 탐색하여 프로그램 목록을 구성합니다.
 * - Page.tsx 파일만 생성하면 메뉴의 프로그램 목록에서 조회되지 않습니다.
 *
 * 신규 프로그램 생성 순서
 * 1. Program 폴더 생성
 * 2. index.ts 생성 및 program 정보 선언
 * 3. <ProgramName>Page.tsx 생성
 * 4. 메뉴관리에서 programKey를 선택하여 메뉴와 연결
 *
 * 기본 구조
 *
 * customerManage/
 * ├─ index.ts
 * └─ CustomerManagePage.tsx
 */

/**
 * [STANDARD] Program Registration
 *
 * 이 파일은 BaseKit Program Auto Discovery 대상입니다.
 *
 * 주의:
 * - Page.tsx만 생성하면 프로그램으로 등록되지 않습니다.
 * - 신규 화면은 반드시 동일 폴더에 index.ts를 생성해야 합니다.
 * - programKey는 메뉴관리에서 화면과 메뉴를 연결하는 기준 Key입니다.
 */
export const program = {
  programKey: 'LYT_L1R2',
  programName: 'Layout L1R2',
  component: LayoutTypeL1R2,

  actionCodes: [
    COMMON_ACTIONS.CREATE,
    COMMON_ACTIONS.DELETE,
  ],
};

export { default as LayoutTypeL1R2Page } from './layoutTypeL1R2';