import { codeGroups } from '../mock/codeGroups';
import { codes } from '../mock/codes';

export default function CodeManagePage() {
  return (
    <section className="page">
      <p className="eyebrow">System</p>
      <h1>공통코드관리</h1>
      <p>시스템 공통 코드와 코드 그룹을 관리합니다.</p>

      <div className="summary-grid">
        <div className="summary-item">
          <span>코드그룹</span>
          <strong>{codeGroups.length}</strong>
        </div>
        <div className="summary-item">
          <span>공통코드</span>
          <strong>{codes.length}</strong>
        </div>
      </div>

      <div className="data-section">
        <h2>코드그룹</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>그룹ID</th>
                <th>그룹명</th>
                <th>설명</th>
                <th>사용여부</th>
              </tr>
            </thead>
            <tbody>
              {codeGroups.map((group) => (
                <tr key={group.CODE_GROUP_ID}>
                  <td>{group.CODE_GROUP_ID}</td>
                  <td>{group.CODE_GROUP_NAME}</td>
                  <td>{group.DESCRIPTION}</td>
                  <td>{group.USE_YN}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="data-section">
        <h2>공통코드</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>그룹ID</th>
                <th>코드ID</th>
                <th>코드명</th>
                <th>정렬</th>
                <th>사용여부</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => (
                <tr key={`${code.CODE_GROUP_ID}-${code.CODE_ID}`}>
                  <td>{code.CODE_GROUP_ID}</td>
                  <td>{code.CODE_ID}</td>
                  <td>{code.CODE_NAME}</td>
                  <td>{code.SORT_ORDER}</td>
                  <td>{code.USE_YN}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
