/** Program type chosen by the AI program list; the stored layout type of a program is a different thing. */
export type ProgramKind = 'SCREEN' | 'BATCH' | 'INTERFACE' | 'REPORT';

const labels: Record<ProgramKind, string> = { SCREEN: '화면', BATCH: '배치', INTERFACE: '연동', REPORT: '보고서' };

/** Unknown or missing kinds (manual programs, older analyses) have no label instead of a guessed one. */
export function programKindLabel(kind: string | null | undefined): string {
 return kind && Object.hasOwn(labels, kind) ? labels[kind as ProgramKind] : '';
}

/** Screen design applies to online screens only. */
export const isScreenKind = (kind: string | null | undefined) => kind === 'SCREEN';
