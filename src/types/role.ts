import type { Yn } from './common';

export interface Role {
  roleCode: string;
  roleName: string;
  description?: string;
  orderNo: number;
  useYn: Yn;
}
