import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BaseKitMessage from './BaseKitMessage';
import { buildLlmResultModel, formatRawJson, type LlmBlock, type LlmResultInput, type LlmResultModel } from './llmResultModel';
import './llmResultViewer.css';

interface LlmResultViewerProps {
  /** LLM이 반환한 JSON 객체 또는 JSON 문자열(또는 일반 텍스트) */
  result: LlmResultInput;
  /** 로딩 상태(요청 중) */
  loading?: boolean;
  /** 결과 제목(없으면 데이터 title 사용) */
  title?: string;
  /** 원본 JSON 보기/복사 섹션 표시 여부 */
  showRaw?: boolean;
  /** 결과 소스 라벨(예: '회사 LLM', '샘플') */
  sourceLabel?: string;
}

const STATUS_LABEL: Record<LlmResultModel['status'], string> = {
  loading: '로딩',
  empty: '빈 결과',
  error: '오류',
  text: '텍스트',
  structured: '구조화',
};

function Markdown({ text }: { text: string }) {
  return (
    <div className="llm-result-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

function BlockView({ block }: { block: LlmBlock }) {
  switch (block.type) {
    case 'title':
      return <h3 className="llm-result-title">{block.body}</h3>;
    case 'summary':
      return <div className="llm-result-summary"><Markdown text={block.body ?? ''} /></div>;
    case 'callout':
      return <div className={`llm-result-callout ${block.tone ?? 'info'}`}>{block.body}</div>;
    case 'tags':
      return (
        <div className="llm-result-tags">
          {(block.items ?? []).map((item, index) => <span key={index} className="llm-result-tag">{item}</span>)}
        </div>
      );
    case 'list':
      return (
        <div className="llm-result-list">
          {block.heading ? <h4 className="llm-result-subheading">{block.heading}</h4> : null}
          <ul>
            {(block.items ?? []).map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        </div>
      );
    case 'cards':
      return (
        <div className="llm-result-cards">
          {block.heading ? <h4 className="llm-result-subheading">{block.heading}</h4> : null}
          <div className="llm-result-card-grid">
            {(block.cards ?? []).map((card) => (
              <div key={card.id} className="llm-result-card">
                <strong className="llm-result-card-title">{card.title}</strong>
                <dl>
                  {card.fields.map((field, index) => (
                    <div key={index} className="llm-result-card-field">
                      <dt>{field.label}</dt>
                      <dd>{field.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      );
    case 'table':
      return (
        <div className="llm-result-table-wrap">
          {block.heading ? <h4 className="llm-result-subheading">{block.heading}</h4> : null}
          <table className="llm-result-table">
            <thead>
              <tr>{(block.rows?.headers ?? []).map((header, index) => <th key={index}>{header}</th>)}</tr>
            </thead>
            <tbody>
              {(block.rows?.rows ?? []).map((row, rowIndex) => (
                <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'section':
      return (
        <div className="llm-result-section">
          <h4 className="llm-result-subheading">{block.heading}</h4>
        </div>
      );
    case 'raw':
      return (
        <div className="llm-result-raw">
          {block.heading ? <h4 className="llm-result-subheading">{block.heading}</h4> : null}
          <pre>{block.body}</pre>
        </div>
      );
    case 'text':
    default:
      return (
        <div className="llm-result-text">
          {block.heading ? <h4 className="llm-result-subheading">{block.heading}</h4> : null}
          <Markdown text={block.body ?? ''} />
        </div>
      );
  }
}

export default function LlmResultViewer({ result, loading = false, title, showRaw = true, sourceLabel }: LlmResultViewerProps) {
  const [rawOpen, setRawOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const model = useMemo(() => buildLlmResultModel(result, { loading }), [result, loading]);
  const rawJson = useMemo(() => formatRawJson(model), [model]);

  const copyRaw = async () => {
    try {
      await navigator.clipboard.writeText(rawJson);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const heading = title ?? (model.blocks.find((block) => block.type === 'title')?.body ?? 'LLM 분석 결과');

  return (
    <section className="llm-result-viewer">
      <header className="llm-result-header">
        <div className="llm-result-header-left">
          <h3>{heading}</h3>
          {sourceLabel ? <span className="llm-result-source">{sourceLabel}</span> : null}
        </div>
        <div className="llm-result-header-right">
          <span className={`llm-result-status ${model.status}`}>{STATUS_LABEL[model.status]}</span>
          {model.status === 'structured' ? <span className="llm-result-meta">{model.fieldCount}개 필드 · {model.blockCount}개 블록</span> : null}
        </div>
      </header>

      {model.status === 'loading' ? (
        <div className="llm-result-state">
          <BaseKitMessage type="info" message="LLM 결과를 불러오는 중입니다." />
        </div>
      ) : model.status === 'error' ? (
        <div className="llm-result-state">
          <BaseKitMessage type="error" message="JSON을 파싱할 수 없습니다." detail={model.error} />
        </div>
      ) : model.status === 'empty' ? (
        <div className="llm-result-state">
          <BaseKitMessage type="info" message="표시할 결과가 없습니다." />
        </div>
      ) : model.status === 'text' ? (
        <div className="llm-result-text llm-result-text--plain">
          <Markdown text={model.text ?? ''} />
        </div>
      ) : (
        <div className="llm-result-body">
          {model.blocks.map((block) => <BlockView key={block.id} block={block} />)}
          {model.evidence.length > 0 ? (
            <div className="llm-result-evidence">
              <h4 className="llm-result-subheading">근거 요구사항</h4>
              <div className="llm-result-tags">
                {model.evidence.map((item) => (
                  <span key={item.id} className="llm-result-tag llm-result-tag--evidence" title={item.label}>{item.id}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {showRaw && model.parsed ? (
        <div className="llm-result-raw-toggle">
          <button type="button" className="llm-result-raw-btn" aria-expanded={rawOpen} onClick={() => setRawOpen((open) => !open)}>
            {rawOpen ? '원본 JSON 접기' : '원본 JSON 보기'}
          </button>
          <button type="button" className="llm-result-raw-btn" onClick={() => void copyRaw()} disabled={!rawJson}>
            {copied ? '복사됨' : 'JSON 복사'}
          </button>
          {rawOpen ? <pre className="llm-result-raw-pre">{rawJson}</pre> : null}
        </div>
      ) : null}
    </section>
  );
}