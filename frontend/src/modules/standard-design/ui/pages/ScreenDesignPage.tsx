import { useState } from 'react';
import { testCompanyLlm, type CompanyLlmTestResult } from '../../llm/companyLlm.repository';
import StandardDesignSkeletonPage from './StandardDesignSkeletonPage';

export default function ScreenDesignPage() {
  const [result, setResult] = useState<CompanyLlmTestResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnectivityTest = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await testCompanyLlm("이 요청을 받았다면 '회사 LLM 연결 성공'이라고만 응답해 주세요."));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '회사 LLM 연결 확인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StandardDesignSkeletonPage
      title="화면 설계"
      description="업무 화면의 검색·그리드·상세·Action 구조를 설계하는 영역입니다."
      nextStep="Screen Design Schema v0.1을 정의한 뒤 편집 UI를 구현합니다."
    >
      <section className="standard-design-llm-test" aria-labelledby="company-llm-test-title">
        <div>
          <h3 id="company-llm-test-title">회사 LLM 연결 확인</h3>
          <p>Backend를 경유하는 임시 연결 점검입니다. 실제 설계 검증 기능과 권한은 아직 연결하지 않습니다.</p>
        </div>
        <button type="button" className="primary-button" disabled={loading} onClick={handleConnectivityTest}>
          {loading ? '확인 중...' : '회사 LLM 연결 확인'}
        </button>
        {result ? (
          <output className="standard-design-llm-result">
            <strong>연결 성공 · {result.MODEL}</strong>
            <span>{result.CONTENT}</span>
          </output>
        ) : null}
        {error ? <p className="standard-design-llm-error" role="alert">{error}</p> : null}
      </section>
    </StandardDesignSkeletonPage>
  );
}
