import type { ProgramComponentMap, ProgramKey } from '../types/adminShell';

interface WorkspaceProps {
  activeProgramKey: ProgramKey;
  programComponents: ProgramComponentMap;
}

export default function Workspace({
  activeProgramKey,
  programComponents,
}: WorkspaceProps) {
  const renderProgram = programComponents[activeProgramKey];

  return <main className="workspace">{renderProgram()}</main>;
}
