export interface BaseEntity {
  REG_DT: string;
  REG_BY: string;
  MOD_DT: string;
  MOD_BY: string;
}

export type UseYn = 'Y' | 'N';
export type Yn = UseYn;

export interface ManagedEntity extends BaseEntity {
  USE_YN: UseYn;
  DEL_YN: Yn;
}
