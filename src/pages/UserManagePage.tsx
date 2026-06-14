import { useState } from 'react';
import DataTable, {
  type DataTableColumn,
} from '../components/common/DataTable';
import PageHeader from '../components/common/PageHeader';
import SummaryCard from '../components/common/SummaryCard';
import { users } from '../mock/users';
import type { User } from '../types';

const userColumns: DataTableColumn<User>[] = [
  {
    key: 'USER_ID',
    header: 'USER_ID',
    render: (user) => user.USER_ID,
  },
  {
    key: 'LOGIN_ID',
    header: 'LOGIN_ID',
    render: (user) => user.LOGIN_ID,
  },
  {
    key: 'USER_NAME',
    header: 'USER_NAME',
    render: (user) => user.USER_NAME,
  },
  {
    key: 'EMAIL',
    header: 'EMAIL',
    render: (user) => user.EMAIL,
  },
  {
    key: 'USER_TYPE_CODE',
    header: 'USER_TYPE_CODE',
    render: (user) => user.USER_TYPE_CODE,
  },
  {
    key: 'LANGUAGE_CODE',
    header: 'LANGUAGE_CODE',
    render: (user) => user.LANGUAGE_CODE,
  },
  {
    key: 'TIMEZONE_ID',
    header: 'TIMEZONE_ID',
    render: (user) => user.TIMEZONE_ID,
  },
  {
    key: 'LAST_LOGIN_AT',
    header: 'LAST_LOGIN_AT',
    render: (user) => user.LAST_LOGIN_AT,
  },
  {
    key: 'ACCOUNT_EXPIRED_AT',
    header: 'ACCOUNT_EXPIRED_AT',
    render: (user) => user.ACCOUNT_EXPIRED_AT,
  },
  {
    key: 'LOGIN_FAIL_COUNT',
    header: 'LOGIN_FAIL_COUNT',
    render: (user) => user.LOGIN_FAIL_COUNT,
  },
  {
    key: 'LOCKED_YN',
    header: 'LOCKED_YN',
    render: (user) => user.LOCKED_YN,
  },
  {
    key: 'STATUS_CODE',
    header: 'STATUS_CODE',
    render: (user) => user.STATUS_CODE,
  },
  {
    key: 'USE_YN',
    header: 'USE_YN',
    render: (user) => user.USE_YN,
  },
];

export default function UserManagePage() {
  const [selectedUser, setSelectedUser] = useState<User>(users[0]);

  return (
    <section className="page">
      <PageHeader
        eyebrow="System"
        title="사용자관리"
        description="시스템 사용자의 계정과 상태를 관리합니다."
      />

      <div className="summary-grid">
        <SummaryCard label="사용자 수" value={users.length} />
      </div>

      <DataTable
        title="사용자 목록"
        columns={userColumns}
        rows={users}
        getRowKey={(user) => user.USER_ID}
        onRowClick={setSelectedUser}
        getRowClassName={(user) =>
          user.USER_ID === selectedUser.USER_ID ? 'selected-row' : ''
        }
      />

      <div className="detail-section">
        <h2>선택된 사용자 상세</h2>
        <dl className="detail-grid">
          <div>
            <dt>USER_ID</dt>
            <dd>{selectedUser.USER_ID}</dd>
          </div>
          <div>
            <dt>LOGIN_ID</dt>
            <dd>{selectedUser.LOGIN_ID}</dd>
          </div>
          <div>
            <dt>USER_NAME</dt>
            <dd>{selectedUser.USER_NAME}</dd>
          </div>
          <div>
            <dt>EMAIL</dt>
            <dd>{selectedUser.EMAIL}</dd>
          </div>
          <div>
            <dt>USER_TYPE_CODE</dt>
            <dd>{selectedUser.USER_TYPE_CODE}</dd>
          </div>
          <div>
            <dt>LANGUAGE_CODE</dt>
            <dd>{selectedUser.LANGUAGE_CODE}</dd>
          </div>
          <div>
            <dt>TIMEZONE_ID</dt>
            <dd>{selectedUser.TIMEZONE_ID}</dd>
          </div>
          <div>
            <dt>STATUS_CODE</dt>
            <dd>{selectedUser.STATUS_CODE}</dd>
          </div>
          <div>
            <dt>LAST_LOGIN_AT</dt>
            <dd>{selectedUser.LAST_LOGIN_AT}</dd>
          </div>
          <div>
            <dt>ACCOUNT_EXPIRED_AT</dt>
            <dd>{selectedUser.ACCOUNT_EXPIRED_AT}</dd>
          </div>
          <div>
            <dt>PASSWORD_CHANGED_AT</dt>
            <dd>{selectedUser.PASSWORD_CHANGED_AT}</dd>
          </div>
          <div>
            <dt>LOGIN_FAIL_COUNT</dt>
            <dd>{selectedUser.LOGIN_FAIL_COUNT}</dd>
          </div>
          <div>
            <dt>LOCKED_YN</dt>
            <dd>{selectedUser.LOCKED_YN}</dd>
          </div>
          <div>
            <dt>USE_YN</dt>
            <dd>{selectedUser.USE_YN}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
