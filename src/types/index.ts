export type { BaseEntity, UseYn } from './common';
export type { Code, CodeGroup } from './code';
export type { Company } from './company';
export type { LoginLog } from './login';
export type { Menu } from './menu';
export type { Role } from './role';
export type { User } from './user';

export type SystemMenuPath =
  | '/system/users'
  | '/system/roles'
  | '/system/menus'
  | '/system/codes';
