import ProgramRegister from './ProgramRegister';

/** 프로그램 대장 독립 프로그램(SD_PROGRAM_REGISTER). 화면 설계에서 분리했으며 등록·AI 후보 채택 동작은 ProgramRegister 그대로다. */
export default function ProgramRegisterPage() {
  return <section className="page"><ProgramRegister /></section>;
}
