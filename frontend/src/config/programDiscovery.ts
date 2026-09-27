import type { ComponentType } from 'react';
import type { ActionCode } from '../constants/actionCodes';
/**
 * 프로그램 자동 수집기.
 *
 * features 하위의 index.ts 파일을 검색하고,
 * `program` export가 존재하는 경우 프로그램으로 등록한다.
 *
 * 개발자는 공용 Registry를 직접 수정하지 않고
 * 각 프로그램 폴더의 index.ts에서 프로그램 정보를 선언한다.
 */
type DiscoveredProgram = {
    programKey: string;
    programName: string;
    component: ComponentType;
    actionCodes: ActionCode[];
};

type ProgramModule = {
    program?: DiscoveredProgram;
};

const modules = import.meta.glob<ProgramModule>(
    '../features/**/index.ts',
    { eager: true },
);

export const discoveredPrograms = Object.values(modules)
    .map(module => module.program)
    .filter((program): program is DiscoveredProgram => Boolean(program));