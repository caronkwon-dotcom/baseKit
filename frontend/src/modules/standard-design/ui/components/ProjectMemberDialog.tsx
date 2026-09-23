import { useMemo, useState } from 'react';
import DataTable, { type DataTableColumn } from '../../../../components/common/DataTable';
import FormModal from '../../../../components/common/FormModal';
import SearchPanel, { type SearchFieldConfig } from '../../../../components/common/SearchPanel';
import { users } from '../../../../mock/users';
import type { User } from '../../../../types';
import type { DesignMember, DesignProject, ProjectMember } from '../../design-lifecycle/designLifecycle.types';
import { PROJECT_GRADES, PROJECT_ROLES, PARTICIPATION_TYPES, isActiveProjectMemberDuplicate, nextDomainId, validateProjectAssignment } from './projectContext';

interface Props {
  project: DesignProject;
  members: DesignMember[];
  assignments: ProjectMember[];
  editing?: ProjectMember;
  onClose: () => void;
  onSave: (member: DesignMember, assignment: ProjectMember) => void;
}
interface UserSearch { name: string; loginId: string; organization: string; }
const initialSearch: UserSearch = { name: '', loginId: '', organization: '' };
const searchFields: SearchFieldConfig<UserSearch>[] = [
  { key: 'name', label: '사용자명' }, { key: 'loginId', label: '사용자 ID' }, { key: 'organization', label: '소속' },
];
const userColumns: DataTableColumn<User>[] = [
  { key: 'login', header: '사용자 ID', render: (user) => user.LOGIN_ID, width: 120 },
  { key: 'name', header: '사용자명', render: (user) => user.USER_NAME, minWidth: 130, flex: 1 },
  { key: 'organization', header: '소속', render: (user) => user.DEPARTMENT_NAME, minWidth: 140, flex: 1 },
];

export default function ProjectMemberDialog({ project, members, assignments, editing, onClose, onSave }: Props) {
  const existingMember = editing ? members.find((item) => item.MEMBER_ID === editing.MEMBER_ID) : undefined;
  const [condition, setCondition] = useState(initialSearch);
  const [applied, setApplied] = useState(initialSearch);
  const [selectedUser, setSelectedUser] = useState<User | null>(() => users.find((item) => item.USER_ID === existingMember?.USER_ID) ?? null);
  const [participation, setParticipation] = useState<ProjectMember['PARTICIPATION_TYPE_CD']>(editing?.PARTICIPATION_TYPE_CD ?? 'INTERNAL');
  const [role, setRole] = useState(editing?.ROLE_CD ?? 'DV');
  const [grade, setGrade] = useState<ProjectMember['GRADE_CD']>(editing?.GRADE_CD ?? 'INTERMEDIATE');
  const [startDate, setStartDate] = useState(editing?.START_DATE ?? project.START_DATE);
  const [endDate, setEndDate] = useState(editing?.END_DATE ?? project.END_DATE);
  const [planMm, setPlanMm] = useState(String(editing?.PLAN_MM ?? 1));
  const [status, setStatus] = useState<ProjectMember['STATUS_CD']>(editing?.STATUS_CD ?? 'ACTIVE');
  const [note, setNote] = useState(editing?.NOTE ?? '');
  const [error, setError] = useState('');
  const filtered = useMemo(() => users.filter((user) => user.USE_YN === 'Y' && user.DEL_YN === 'N' && user.STATUS_CODE === 'ACTIVE' && user.LOCKED_YN === 'N'
    && (!applied.name || user.USER_NAME.toLocaleLowerCase().includes(applied.name.trim().toLocaleLowerCase()))
    && (!applied.loginId || user.LOGIN_ID.toLocaleLowerCase().includes(applied.loginId.trim().toLocaleLowerCase()))
    && (!applied.organization || user.DEPARTMENT_NAME.toLocaleLowerCase().includes(applied.organization.trim().toLocaleLowerCase()))), [applied]);

  const save = () => {
    if (!selectedUser) { setError('Project Member로 추가할 사용자를 선택하세요.'); return; }
    const member = existingMember ?? members.find((item) => item.USER_ID === selectedUser.USER_ID) ?? {
      MEMBER_ID: nextDomainId('MEM', members.map((item) => item.MEMBER_ID)), USER_ID: selectedUser.USER_ID,
      MEMBER_NAME: selectedUser.USER_NAME, ORG_ID: selectedUser.DEPARTMENT_NAME, CAREER_YEARS: null, MAIN_SKILL: '', NOTE: '',
    };
    const assignment: ProjectMember = {
      PROJECT_MEMBER_ID: editing?.PROJECT_MEMBER_ID ?? nextDomainId('PMB', assignments.map((item) => item.PROJECT_MEMBER_ID)),
      PROJECT_ID: project.PROJECT_ID, MEMBER_ID: member.MEMBER_ID, PARTICIPATION_TYPE_CD: participation,
      ROLE_CD: role, GRADE_CD: grade, START_DATE: startDate, END_DATE: endDate,
      PLAN_MM: Number(planMm), STATUS_CD: status, NOTE: note.trim(),
    };
    const validation = validateProjectAssignment(assignment, project);
    if (validation) { setError(validation); return; }
    if (status === 'ACTIVE' && isActiveProjectMemberDuplicate(assignments, project.PROJECT_ID, member.MEMBER_ID, editing?.PROJECT_MEMBER_ID)) {
      setError('동일 프로젝트에 활성 상태의 Project Member가 이미 등록되어 있습니다.');
      return;
    }
    onSave(member, assignment);
  };

  return <div className="sd-project-member-modal">
    <FormModal open title={editing ? 'Project Member 수정' : '인원 추가'} submitLabel="저장" onClose={onClose} onSubmit={save}>
      <p className="sd-member-project-name">프로젝트: <strong>{project.PROJECT_ID} / {project.PROJECT_NAME}</strong></p>
      {!editing ? <>
        <SearchPanel rows={1} fields={searchFields} value={condition} initialValue={initialSearch} onValueChange={setCondition} onSearch={setApplied}
          onReset={(next) => { setCondition(next); setApplied(next); }} />
        <DataTable title={`활성 사용자 (${filtered.length}명)`} columns={userColumns} rows={filtered} getRowKey={(user) => user.USER_ID}
          onRowClick={setSelectedUser} getRowClassName={(user) => user.USER_ID === selectedUser?.USER_ID ? 'selected-row' : ''}
          emptyMessage="검색 조건에 맞는 활성 사용자가 없습니다." />
      </> : null}
      <section className="sd-member-assignment-form" aria-label="프로젝트 투입정보">
        <h3>{editing ? '회원 프로필' : '선택한 사용자'}: {selectedUser?.USER_NAME ?? existingMember?.MEMBER_NAME ?? '사용자를 먼저 선택하세요.'}</h3>
        <p>{selectedUser?.LOGIN_ID ?? ''} {selectedUser ? `/ ${selectedUser.DEPARTMENT_NAME}` : ''}</p>
        <label>참여구분<select value={participation} onChange={(event) => setParticipation(event.target.value as ProjectMember['PARTICIPATION_TYPE_CD'])}>{PARTICIPATION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>역할<select value={role} onChange={(event) => setRole(event.target.value)}>{PROJECT_ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>프로젝트 등급<select value={grade} onChange={(event) => setGrade(event.target.value as ProjectMember['GRADE_CD'])}>{PROJECT_GRADES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>투입 시작일<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label>투입 종료일<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        <label>계획 MM<input type="number" min="0" step="0.1" value={planMm} onChange={(event) => setPlanMm(event.target.value)} /></label>
        <label>참여 상태<select value={status} onChange={(event) => setStatus(event.target.value as ProjectMember['STATUS_CD'])}><option value="ACTIVE">참여</option><option value="INACTIVE">미참여</option></select></label>
        <label className="sd-member-note">비고<textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      </section>
      {error ? <p role="alert" className="page-message error">{error}</p> : null}
    </FormModal>
  </div>;
}
