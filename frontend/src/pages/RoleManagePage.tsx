import { useEffect, useMemo, useState } from 'react';
import DataTable, { type DataTableColumn } from '../components/common/DataTable';
import PageHeader from '../components/common/PageHeader';
import FormModal from '../components/common/FormModal';
import { roleApi, type Role, type RoleSave } from '../services/roleApi';
import { programApi, type ButtonGroup } from '../services/programApi';
import type { Program } from '../types/program';
import type { UseYn } from '../types/common';

interface ProgramButtonGroup extends ButtonGroup {
  PROGRAM_ID: string;
}

const roleColumns: DataTableColumn<Role>[] = [
  { key: 'ROLE_ID', header: 'Role ID', width: 150, render: (r) => r.ROLE_ID },
  { key: 'ROLE_CODE', header: 'Role Code', width: 150, render: (r) => r.ROLE_CODE },
  { key: 'ROLE_NAME', header: 'Role Name', flex: 2, render: (r) => r.ROLE_NAME },
  { key: 'USE_YN', header: '사용', width: 70, align: 'center', render: (r) => r.USE_YN },
];

const bgKey = (programId: string, groupCode: string) => `${programId}::${groupCode}`;

const emptyDraft: RoleSave = { ROLE_ID: '', ROLE_CODE: '', ROLE_NAME: '', DESCRIPTION: null, USE_YN: 'Y' };

export default function RoleManagePage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [roleDraft, setRoleDraft] = useState<RoleSave>(emptyDraft);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [buttonGroups, setButtonGroups] = useState<ProgramButtonGroup[]>([]);
  const [programAllow, setProgramAllow] = useState<Map<string, UseYn>>(new Map());
  const [buttonGroupAllow, setButtonGroupAllow] = useState<Map<string, UseYn>>(new Map());
  const [loading, setLoading] = useState(true);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [permReady, setPermReady] = useState(false);
  const selectedRoleId = selectedRole?.ROLE_ID ?? null;
  const [message, setMessage] = useState('');

  // Load roles and programs (with their button groups) on mount.
  useEffect(() => {
    let active = true;
    Promise.all([roleApi.find(), programApi.find({ USE_YN: 'Y' })])
      .then(async ([roleRows, programRows]) => {
        if (!active) return;
        const bgResults = await Promise.all(
          programRows.map((p) =>
            programApi.groups(p.PROGRAM_ID)
              .then((groups) => groups.map((g) => ({ ...g, PROGRAM_ID: p.PROGRAM_ID }))),
          ),
        );
        if (!active) return;
        setRoles(roleRows);
        setPrograms(programRows);
        setButtonGroups(bgResults.flat());
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : 'Role/Program 조회 실패');
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, []);

  // Selection events reset permission state; only the current request may publish results.
  useEffect(() => {
    if (!selectedRoleId) return;
    let active = true;
    roleApi.permissions(selectedRoleId)
      .then((perm) => {
        if (!active) return;
        const programMap = new Map<string, UseYn>();
        const bgMap = new Map<string, UseYn>();
        perm.PROGRAMS.forEach((p) => programMap.set(p.PROGRAM_ID, p.ALLOW_YN));
        perm.BUTTON_GROUPS.forEach((bg) => bgMap.set(bgKey(bg.PROGRAM_ID, bg.GROUP_CODE), bg.ALLOW_YN));
        setProgramAllow(programMap);
        setButtonGroupAllow(bgMap);
        setPermReady(true);
        setPermLoading(false);
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : 'Role 권한 조회 실패');
          setPermLoading(false);
        }
      });
    return () => { active = false; };
  }, [selectedRoleId]);

  function selectRole(role: Role | null) {
    if (permSaving || formSubmitting) return;
    setSelectedRole(role);
    if (role?.ROLE_ID === selectedRoleId) return;
    setProgramAllow(new Map());
    setButtonGroupAllow(new Map());
    setPermReady(false);
    setPermLoading(role !== null);
    setMessage('');
  }

  const groupedButtonGroups = useMemo(() => {
    const map = new Map<string, { program: Program; groups: ProgramButtonGroup[] }>();
    programs.forEach((p) => map.set(p.PROGRAM_ID, { program: p, groups: [] }));
    buttonGroups.forEach((bg) => {
      const entry = map.get(bg.PROGRAM_ID);
      if (entry) entry.groups.push(bg);
    });
    return Array.from(map.values()).filter((e) => e.groups.length > 0);
  }, [programs, buttonGroups]);

  function openCreateForm() {
    setFormMode('create');
    setRoleDraft(emptyDraft);
    setFormOpen(true);
  }

  function openEditForm(role: Role) {
    setFormMode('edit');
    setRoleDraft({ ROLE_ID: role.ROLE_ID, ROLE_CODE: role.ROLE_CODE, ROLE_NAME: role.ROLE_NAME, DESCRIPTION: role.DESCRIPTION, USE_YN: role.USE_YN });
    setFormOpen(true);
  }

  async function saveRole() {
    if (formSubmitting) return;
    if (!roleDraft.ROLE_ID.trim() || !roleDraft.ROLE_CODE.trim() || !roleDraft.ROLE_NAME.trim()) {
      setMessage('Role ID, Code, Name은 필수입니다.');
      return;
    }
    setFormSubmitting(true);
    setMessage('');
    try {
      const saved = formMode === 'create' ? await roleApi.create(roleDraft) : await roleApi.update(roleDraft);
      const roleRows = await roleApi.find();
      setRoles(roleRows);
      setFormOpen(false);
      if (saved.ROLE_ID !== selectedRoleId) {
        setProgramAllow(new Map());
        setButtonGroupAllow(new Map());
        setPermReady(false);
        setPermLoading(true);
      }
      setSelectedRole(saved);
      setMessage(formMode === 'create' ? 'Role을 생성했습니다.' : 'Role을 수정했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Role 저장 실패');
    } finally {
      setFormSubmitting(false);
    }
  }

  async function deleteRole(role: Role) {
    if (permSaving || formSubmitting || permLoading) return;
    if (!window.confirm(`${role.ROLE_NAME} Role을 삭제할까요?`)) return;
    setMessage('');
    try {
      await roleApi.delete(role.ROLE_ID);
      const roleRows = await roleApi.find();
      setRoles(roleRows);
      if (selectedRole?.ROLE_ID === role.ROLE_ID) selectRole(null);
      setMessage('Role을 삭제했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Role 삭제 실패');
    }
  }

  function toggleProgram(programId: string) {
    setProgramAllow((prev) => {
      const next = new Map(prev);
      next.set(programId, next.get(programId) === 'Y' ? 'N' : 'Y');
      return next;
    });
  }

  function toggleButtonGroup(programId: string, groupCode: string) {
    setButtonGroupAllow((prev) => {
      const next = new Map(prev);
      const key = bgKey(programId, groupCode);
      next.set(key, next.get(key) === 'Y' ? 'N' : 'Y');
      return next;
    });
  }

  async function savePermissions() {
    if (!selectedRole || !permReady || permSaving || permLoading || loading) return;
    setPermSaving(true);
    setMessage('');
    try {
      const programItems = programs.map((p) => ({
        PROGRAM_ID: p.PROGRAM_ID,
        PROGRAM_NAME: p.PROGRAM_NAME,
        MODULE_CODE: p.MODULE_CODE,
        ALLOW_YN: programAllow.get(p.PROGRAM_ID) ?? 'N',
      }));
      const bgItems = buttonGroups.map((bg) => ({
        PROGRAM_ID: bg.PROGRAM_ID,
        GROUP_CODE: bg.GROUP_CODE,
        GROUP_NAME: bg.GROUP_NAME,
        ALLOW_YN: buttonGroupAllow.get(bgKey(bg.PROGRAM_ID, bg.GROUP_CODE)) ?? 'N',
      }));
      const saved = await roleApi.savePermissions(selectedRole.ROLE_ID, { PROGRAMS: programItems, BUTTON_GROUPS: bgItems });
      const programMap = new Map<string, UseYn>();
      const bgMap = new Map<string, UseYn>();
      programs.forEach((p) => programMap.set(p.PROGRAM_ID, 'N'));
      buttonGroups.forEach((bg) => bgMap.set(bgKey(bg.PROGRAM_ID, bg.GROUP_CODE), 'N'));
      saved.PROGRAMS.forEach((p) => programMap.set(p.PROGRAM_ID, p.ALLOW_YN));
      saved.BUTTON_GROUPS.forEach((bg) => bgMap.set(bgKey(bg.PROGRAM_ID, bg.GROUP_CODE), bg.ALLOW_YN));
      setProgramAllow(programMap);
      setButtonGroupAllow(bgMap);
      setMessage('Role 권한을 저장했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Role 권한 저장 실패');
    } finally {
      setPermSaving(false);
    }
  }

  return (
    <section className="page">
      <PageHeader
        breadcrumbs={['시스템관리', 'Role 관리']}
        description="Role CRUD와 Role→Program, Role→ButtonGroup DB 권한(BSYROLEPROG/BSYROLEBTGP)을 관리합니다. 기존 ACTION_CODE legacy 권한과 혼용하지 않습니다."
      />
      <div className="role-manage-layout">
        <div className="role-manage-master">
          <div className="data-section">
            <div className="data-section-header">
              <h2>Role 목록</h2>
              <button type="button" className="primary-button" onClick={openCreateForm} disabled={loading || permSaving || formSubmitting}>Role 추가</button>
            </div>
            <DataTable
              columns={roleColumns}
              rows={roles}
              getRowKey={(r) => r.ROLE_ID}
              onRowClick={selectRole}
              selectedRowKeys={selectedRole ? new Set([selectedRole.ROLE_ID]) : undefined}
              emptyMessage={loading ? 'Role을 조회하고 있습니다.' : 'Role이 없습니다.'}
            />
          </div>
        </div>

        <div className="role-manage-detail">
          <h2>Role 권한</h2>
          {selectedRole ? (
            <div>
              <div className="role-detail-header">
                <p className="role-detail-title">{selectedRole.ROLE_NAME} <span className="muted">({selectedRole.ROLE_ID})</span></p>
                <div className="role-detail-actions">
                  <button type="button" className="secondary-button" onClick={() => openEditForm(selectedRole)} disabled={permSaving || formSubmitting}>Role 수정</button>
                  <button type="button" className="danger-button" onClick={() => void deleteRole(selectedRole)} disabled={permSaving || formSubmitting || permLoading}>Role 삭제</button>
                </div>
              </div>

              <h3>Program 권한</h3>
              <div className="permission-grid">
                <table className="standard-data-table">
                  <thead>
                    <tr>
                      <th className="cell-left">Program</th>
                      <th className="cell-left">Module</th>
                      <th className="cell-center">허용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programs.map((p) => (
                      <tr key={p.PROGRAM_ID}>
                        <td className="cell-left"><span className="cell-content" title={p.PROGRAM_NAME}>{p.PROGRAM_NAME}</span></td>
                        <td className="cell-left"><span className="cell-content">{p.MODULE_CODE}</span></td>
                        <td className="cell-center">
                          <input
                            type="checkbox"
                            aria-label={`${p.PROGRAM_NAME} 허용`}
                            checked={programAllow.get(p.PROGRAM_ID) === 'Y'}
                            disabled={!permReady || permLoading || permSaving}
                            onChange={() => toggleProgram(p.PROGRAM_ID)}
                          />
                        </td>
                      </tr>
                    ))}
                    {programs.length === 0 && (
                      <tr><td className="empty-cell" colSpan={3}>Program이 없습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <h3>ButtonGroup 권한</h3>
              <div className="permission-grid">
                {groupedButtonGroups.map(({ program, groups }) => (
                  <div key={program.PROGRAM_ID} className="permission-group">
                    <div className="permission-group-header">{program.PROGRAM_NAME}</div>
                    <table className="standard-data-table">
                      <tbody>
                        {groups.map((bg) => (
                          <tr key={bg.GROUP_CODE}>
                            <td className="cell-left"><span className="cell-content" title={bg.GROUP_NAME}>{bg.GROUP_NAME}</span></td>
                            <td className="cell-center">
                              <input
                                type="checkbox"
                                aria-label={`${bg.GROUP_NAME} 허용`}
                                checked={buttonGroupAllow.get(bgKey(bg.PROGRAM_ID, bg.GROUP_CODE)) === 'Y'}
                                disabled={!permReady || permLoading || permSaving}
                                onChange={() => toggleButtonGroup(bg.PROGRAM_ID, bg.GROUP_CODE)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
                {groupedButtonGroups.length === 0 && <p className="empty-detail">ButtonGroup이 없습니다.</p>}
              </div>

              <div className="role-detail-footer">
                <button type="button" className="primary-button" onClick={() => void savePermissions()} disabled={!permReady || permSaving || permLoading || loading}>
                  {permSaving ? '저장 중…' : '권한 저장'}
                </button>
              </div>
            </div>
          ) : (
            <p className="empty-detail">Role를 선택하세요.</p>
          )}
          {message && <p role="status" className="role-message">{message}</p>}
        </div>
      </div>

      <FormModal
        open={formOpen}
        title={formMode === 'create' ? 'Role 추가' : 'Role 수정'}
        submitLabel={formMode === 'create' ? '생성' : '저장'}
        submitting={formSubmitting}
        onSubmit={() => void saveRole()}
        onClose={() => !formSubmitting && setFormOpen(false)}
      >
        <label htmlFor="role-id">Role ID</label>
        <input
          id="role-id"
          value={roleDraft.ROLE_ID}
          disabled={formMode === 'edit'}
          onChange={(e) => setRoleDraft({ ...roleDraft, ROLE_ID: e.target.value })}
        />
        <label htmlFor="role-code">Role Code</label>
        <input
          id="role-code"
          value={roleDraft.ROLE_CODE}
          onChange={(e) => setRoleDraft({ ...roleDraft, ROLE_CODE: e.target.value })}
        />
        <label htmlFor="role-name">Role Name</label>
        <input
          id="role-name"
          value={roleDraft.ROLE_NAME}
          onChange={(e) => setRoleDraft({ ...roleDraft, ROLE_NAME: e.target.value })}
        />
        <label htmlFor="role-desc">Description</label>
        <textarea
          id="role-desc"
          value={roleDraft.DESCRIPTION ?? ''}
          onChange={(e) => setRoleDraft({ ...roleDraft, DESCRIPTION: e.target.value || null })}
        />
        <label htmlFor="role-use">사용 여부</label>
        <select
          id="role-use"
          value={roleDraft.USE_YN}
          onChange={(e) => setRoleDraft({ ...roleDraft, USE_YN: e.target.value as UseYn })}
        >
          <option value="Y">사용 (Y)</option>
          <option value="N">미사용 (N)</option>
        </select>
      </FormModal>
    </section>
  );
}
