import LayoutTypeL1R2 from './layoutTypeL1R2';
import { COMMON_ACTIONS } from '../../../constants/actionCodes';

/**
 * [PROGRAM]
 * 프로그램 자동 수집을 위한 자기선언 정보.
 * 공용 Registry를 직접 수정하지 않고,
 * PROGRAM_KEY와 실제 화면 Component를 프로그램 단위로 정의한다.
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