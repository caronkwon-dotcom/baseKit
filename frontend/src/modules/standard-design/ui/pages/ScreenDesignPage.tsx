import { useState, type FormEvent } from 'react';
import { promptCompanyLlm, testCompanyLlm, type CompanyLlmTestResult } from '../../llm/companyLlm.repository';
import StandardDesignSkeletonPage from './StandardDesignSkeletonPage';

export default function ScreenDesignPage() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<CompanyLlmTestResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCompanyLlm = async (
    request: (message: string) => Promise<CompanyLlmTestResult>,
    message: string,
  ) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await request(message));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '회사 LLM 요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectivityTest = () => {
    void requestCompanyLlm(testCompanyLlm, "이 요청을 받았다면 '회사 LLM 연결 성공'이라고만 응답해 주세요.");
  };

  const handlePromptSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = prompt.trim();
    if (message) void requestCompanyLlm(promptCompanyLlm, message);
  };

  return (
    <StandardDesignSkeletonPage
      title="화면 설계"
      description="업무 화면의 검색·그리드·상세·Action 구조를 설계하는 영역입니다."
      nextStep="Screen Design Schema v0.1을 정의한 뒤 편집 UI를 구현합니다."
    >
      <section className="standard-design-llm-test" aria-labelledby="company-llm-test-title">
        <div className="standard-design-llm-heading">
          <div>
            <h3 id="company-llm-test-title">회사 LLM 프롬프트</h3>
            <p>입력 내용은 BaseKit Spring Backend를 통해 회사 LLM에 전달됩니다. 대화이력은 저장하지 않습니다.</p>
          </div>
          <button type="button" className="secondary-button" disabled={loading} onClick={handleConnectivityTest}>
            연결 확인
          </button>
        </div>
        <form className="standard-design-llm-form" onSubmit={handlePromptSubmit}>
          <label htmlFor="company-llm-prompt">프롬프트</label>
          <textarea
            id="company-llm-prompt"
            rows={4}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="회사 LLM에 질문할 내용을 입력하세요."
            disabled={loading}
          />
          <div className="standard-design-llm-actions">
            <span>{prompt.length.toLocaleString()}자</span>
            <button type="submit" className="primary-button" disabled={loading || !prompt.trim()}>
              {loading ? '응답 대기 중...' : '전송'}
            </button>
          </div>
        </form>
        {result ? (
          <output className="standard-design-llm-result">
            <strong>응답 완료 · {result.MODEL}</strong>
            <span>{result.CONTENT}</span>
          </output>
        ) : null}
        {error ? <p className="standard-design-llm-error" role="alert">{error}</p> : null}
      </section>
    </StandardDesignSkeletonPage>
  );
}
