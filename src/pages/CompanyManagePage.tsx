import { useState } from 'react';
import DataTable, {
  type DataTableColumn,
} from '../components/common/DataTable';
import PageHeader from '../components/common/PageHeader';
import SummaryCard from '../components/common/SummaryCard';
import { companies } from '../mock/companies';
import type { Company } from '../types';

const companyColumns: DataTableColumn<Company>[] = [
  {
    key: 'COMPANY_ID',
    header: 'COMPANY_ID',
    render: (company) => company.COMPANY_ID,
  },
  {
    key: 'COMPANY_NAME',
    header: 'COMPANY_NAME',
    render: (company) => company.COMPANY_NAME,
  },
  {
    key: 'COMPANY_TYPE_CODE',
    header: 'COMPANY_TYPE_CODE',
    render: (company) => company.COMPANY_TYPE_CODE,
  },
  {
    key: 'LANGUAGE_CODE',
    header: 'LANGUAGE_CODE',
    render: (company) => company.LANGUAGE_CODE,
  },
  {
    key: 'TIMEZONE_ID',
    header: 'TIMEZONE_ID',
    render: (company) => company.TIMEZONE_ID,
  },
  {
    key: 'USE_YN',
    header: 'USE_YN',
    render: (company) => company.USE_YN,
  },
];

export default function CompanyManagePage() {
  const [selectedCompany, setSelectedCompany] = useState<Company>(
    companies[0],
  );

  return (
    <section className="page">
      <PageHeader
        eyebrow="System"
        title="회사관리"
        description="시스템에서 관리하는 회사와 고객사, 협력사 정보를 조회합니다."
      />

      <div className="summary-grid">
        <SummaryCard label="회사 수" value={companies.length} />
      </div>

      <DataTable
        title="회사 목록"
        columns={companyColumns}
        rows={companies}
        getRowKey={(company) => company.COMPANY_ID}
        onRowClick={setSelectedCompany}
        getRowClassName={(company) =>
          company.COMPANY_ID === selectedCompany.COMPANY_ID
            ? 'selected-row'
            : ''
        }
      />

      <div className="detail-section">
        <h2>선택된 회사 상세</h2>
        <dl className="detail-grid">
          <div>
            <dt>COMPANY_ID</dt>
            <dd>{selectedCompany.COMPANY_ID}</dd>
          </div>
          <div>
            <dt>COMPANY_NAME</dt>
            <dd>{selectedCompany.COMPANY_NAME}</dd>
          </div>
          <div>
            <dt>COMPANY_TYPE_CODE</dt>
            <dd>{selectedCompany.COMPANY_TYPE_CODE}</dd>
          </div>
          <div>
            <dt>LANGUAGE_CODE</dt>
            <dd>{selectedCompany.LANGUAGE_CODE}</dd>
          </div>
          <div>
            <dt>TIMEZONE_ID</dt>
            <dd>{selectedCompany.TIMEZONE_ID}</dd>
          </div>
          <div>
            <dt>USE_YN</dt>
            <dd>{selectedCompany.USE_YN}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
