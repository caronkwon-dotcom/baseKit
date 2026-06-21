import type { Yn } from './common';

export interface CommonCodeGroup {
  groupCode: string;
  groupName: string;
  useYn: Yn;
}

export interface CommonCode {
  groupCode: string;
  code: string;
  codeName: string;
  orderNo: number;
  useYn: Yn;
}
