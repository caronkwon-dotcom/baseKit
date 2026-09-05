import { useState } from 'react';
import DataTable, {
  type DataTableColumn,
} from '../components/common/DataTable';
import PageHeader from '../components/common/PageHeader';
import SearchPanel, { type SearchFieldConfig } from '../components/common/SearchPanel';
import { users } from '../mock/users';
import type { User } from '../types';

interface UserSearchCondition {
  userName: string;
  loginId: string;
  useYn: '' | 'Y' | 'N';
  departmentName: string;
}

const initialSearchCondition: UserSearchCondition = {
  userName: '',
  loginId: '',
  useYn: '',
  departmentName: '',
};

const userSearchFields: SearchFieldConfig<UserSearchCondition>[] = [
  { key: 'userName', label: '사용자명', placeholder: '사용자명' },
  { key: 'loginId', label: '사용자 ID', placeholder: '사용자 ID' },
  {
    key: 'useYn',
    label: '사용 여부',
    controlType: 'select',
    options: [
      { value: '', label: '전체' },
      { value: 'Y', label: '사용' },
      { value: 'N', label: '미사용' },
    ],
  },
  { key: 'departmentName', label: '소속/부서', placeholder: '소속 또는 부서' },
];

const userColumns: DataTableColumn<User>[] = [
  {
    key: 'LOGIN_ID',
    header: '사용자 ID',
    render: (user) => user.LOGIN_ID,
  },
  {
    key: 'USER_NAME',
    header: '사용자명',
    render: (user) => user.USER_NAME,
  },
  {
    key: 'DEPARTMENT_NAME',
    header: '소속',
    render: (user) => user.DEPARTMENT_NAME,
  },
  {
    key: 'ROLE_NAME',
    header: '역할',
    render: (user) => user.ROLE_NAME,
  },
  {
    key: 'USE_YN',
    header: '사용 여부',
    render: (user) => (user.USE_YN === 'Y' ? '사용' : '미사용'),
  },
  {
    key: 'REG_DT',
    header: '등록일시',
    render: (user) => formatDateTime(user.REG_DT),
  },
];

function formatDateTime(value: string) {
  return value.replace('T', ' ');
}

function filterUsers(condition: UserSearchCondition) {
  const userName = condition.userName.trim().toLowerCase();
  const loginId = condition.loginId.trim().toLowerCase();
  const departmentName = condition.departmentName.trim().toLowerCase();

  return users.filter((user) => {
    const matchesUserName =
      userName.length === 0 || user.USER_NAME.toLowerCase().includes(userName);
    const matchesLoginId =
      loginId.length === 0 || user.LOGIN_ID.toLowerCase().includes(loginId);
    const matchesUseYn =
      condition.useYn.length === 0 || user.USE_YN === condition.useYn;
    const matchesDepartment =
      departmentName.length === 0 ||
      user.DEPARTMENT_NAME.toLowerCase().includes(departmentName);

    return (
      matchesUserName && matchesLoginId && matchesUseYn && matchesDepartment
    );
  });
}

export default function UserManagePage() {
  const [condition, setCondition] = useState<UserSearchCondition>(
    initialSearchCondition,
  );
  const [filteredUsers, setFilteredUsers] = useState<User[]>(users);
  const [selectedUser, setSelectedUser] = useState<User | null>(users[0]);
  const [actionMessage, setActionMessage] = useState(
    '목록에서 사용자를 선택하면 상세 정보가 표시됩니다.',
  );

  const handleSearch = (nextCondition: UserSearchCondition) => {
    const nextUsers = filterUsers(nextCondition);

    setFilteredUsers(nextUsers);
    setSelectedUser(nextUsers[0] ?? null);
    setActionMessage(`${nextUsers.length}건이 조회되었습니다.`);
  };

  const handleReset = (nextCondition: UserSearchCondition) => {
    setCondition(nextCondition);
    setFilteredUsers(users);
    setSelectedUser(users[0]);
    setActionMessage('조회 조건과 목록을 초기 상태로 되돌렸습니다.');
  };

  const showPlaceholder = (actionName: string) => {
    setActionMessage(`${actionName} 기능은 API 연동 단계에서 구현합니다.`);
  };

  return (
    <section className="page">
      <PageHeader
        breadcrumbs={['시스템관리', '사용자관리']}
        description="시스템 사용자의 계정과 상태를 관리합니다."
      />

      <SearchPanel
        rows={1}
        fields={userSearchFields}
        value={condition}
        initialValue={initialSearchCondition}
        onValueChange={setCondition}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      <div className="button-area page-actions">
        <button
          type="button"
          className="primary-button"
          onClick={() => showPlaceholder('등록')}
        >
          등록
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => showPlaceholder('수정')}
        >
          수정
        </button>
        <button
          type="button"
          className="danger-button"
          onClick={() => showPlaceholder('삭제')}
        >
          삭제
        </button>
      </div>

      <DataTable
        title="사용자 목록"
        columns={userColumns}
        rows={filteredUsers}
        getRowKey={(user) => user.USER_ID}
        onRowClick={(user) => {
          setSelectedUser(user);
          setActionMessage(`${user.USER_NAME} 사용자를 선택했습니다.`);
        }}
        getRowClassName={(user) =>
          user.USER_ID === selectedUser?.USER_ID ? 'selected-row' : ''
        }
      />

      <p className="status-message">{actionMessage}</p>

      <div className="detail-section">
        <h2>상세 정보</h2>
        {selectedUser ? (
          <dl className="detail-grid">
            <div>
              <dt>사용자 ID</dt>
              <dd>{selectedUser.LOGIN_ID}</dd>
            </div>
            <div>
              <dt>사용자명</dt>
              <dd>{selectedUser.USER_NAME}</dd>
            </div>
            <div>
              <dt>이메일</dt>
              <dd>{selectedUser.EMAIL}</dd>
            </div>
            <div>
              <dt>소속</dt>
              <dd>{selectedUser.DEPARTMENT_NAME}</dd>
            </div>
            <div>
              <dt>역할</dt>
              <dd>{selectedUser.ROLE_NAME}</dd>
            </div>
            <div>
              <dt>사용 여부</dt>
              <dd>{selectedUser.USE_YN === 'Y' ? '사용' : '미사용'}</dd>
            </div>
            <div>
              <dt>등록일시</dt>
              <dd>{formatDateTime(selectedUser.REG_DT)}</dd>
            </div>
            <div>
              <dt>수정일시</dt>
              <dd>{formatDateTime(selectedUser.MOD_DT)}</dd>
            </div>
          </dl>
        ) : (
          <div className="empty-detail">선택된 사용자가 없습니다.</div>
        )}
      </div>
    </section>
  );
}
