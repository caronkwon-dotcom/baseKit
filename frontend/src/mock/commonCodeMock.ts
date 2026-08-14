import type { CommonCode, CommonCodeGroup } from '../types/commonCode';

export const commonCodeGroupMock: CommonCodeGroup[] = [
  {
    groupCode: 'USE_YN',
    groupName: '사용여부',
    useYn: 'Y',
  },
  {
    groupCode: 'USER_TYPE',
    groupName: '사용자유형',
    useYn: 'Y',
  },
];

export const commonCodeMock: CommonCode[] = [
  {
    groupCode: 'USE_YN',
    code: 'Y',
    codeName: '사용',
    orderNo: 1,
    useYn: 'Y',
  },
  {
    groupCode: 'USE_YN',
    code: 'N',
    codeName: '미사용',
    orderNo: 2,
    useYn: 'Y',
  },
  {
    groupCode: 'USER_TYPE',
    code: 'INTERNAL',
    codeName: '내부사용자',
    orderNo: 1,
    useYn: 'Y',
  },
  {
    groupCode: 'USER_TYPE',
    code: 'VENDOR',
    codeName: '협력업체',
    orderNo: 2,
    useYn: 'Y',
  },
];
