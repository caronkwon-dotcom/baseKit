export type { BaseEntity, UseYn, Yn } from './common';
export type { Code, CodeGroup } from './code';
export type { Company } from './company';
export type { LoginLog } from './login';
export type { Role } from './role';
export type { SystemConfig } from './system';
export type { User } from './user';

export type SystemMenuPath =
  | '/system/companies'
  | '/system/users'
  | '/system/roles'
  | '/system/menus'
  | '/system/codes'
  | '/system/config';
