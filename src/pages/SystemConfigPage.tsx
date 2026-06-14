import PageHeader from '../components/common/PageHeader';
import { systemConfig } from '../mock/systemConfig';

export default function SystemConfigPage() {
  return (
    <section className="page">
      <PageHeader
        eyebrow="System"
        title="시스템설정"
        description="BaseKit 시스템의 기본 언어와 저장 기준 타임존을 확인합니다."
      />

      <div className="detail-section">
        <h2>기본 설정</h2>
        <dl className="detail-grid">
          <div>
            <dt>시스템명</dt>
            <dd>{systemConfig.SYSTEM_NAME}</dd>
          </div>
          <div>
            <dt>기본 언어</dt>
            <dd>{systemConfig.SYSTEM_LANGUAGE_CODE}</dd>
          </div>
          <div className="readonly-field">
            <dt>저장 기준 타임존</dt>
            <dd>{systemConfig.SYSTEM_TIMEZONE_ID}</dd>
          </div>
          <div>
            <dt>설정 잠금 여부</dt>
            <dd>{systemConfig.CONFIG_LOCKED_YN}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
