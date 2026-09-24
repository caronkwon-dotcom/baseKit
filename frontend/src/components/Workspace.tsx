import type { ProgramComponentMap, ProgramKey } from '../types/adminShell';

interface WorkspaceProps {
  activeProgramKey: ProgramKey;
  programComponents: ProgramComponentMap;
}
/**
 * 업무 화면 표시 영역
 *
 * 현재 활성화된 programKey에 해당하는 화면 컴포넌트를 찾아
 * Workspace 영역에 렌더링한다.
 * AppLayout은 어떤 화면을 보여줄지 결정하고,
 * Workspace는 결정된 화면을 실제로 표시하는 역할만 담당한다.
 */
export default function Workspace({
  activeProgramKey,
  programComponents,
}: WorkspaceProps) {
  const renderProgram = programComponents[activeProgramKey];

  if (!renderProgram) {
    throw new Error(`PROGRAM_KEY에 등록된 Component가 없습니다: ${activeProgramKey}`);
  }

  return <main className="workspace">{renderProgram()}</main>;
}
