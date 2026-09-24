import standardDesignModule from '../modules/standard-design/module';
import type { ApplicationModule } from '../types/applicationModule';

/**
 * BaseKit Host의 Product Module 조립 지점이다.
 * Product Module 제거 시 이 파일의 import와 배열 항목만 제거한다.
 */
export const applicationModules: ApplicationModule[] = [
  standardDesignModule,
];
