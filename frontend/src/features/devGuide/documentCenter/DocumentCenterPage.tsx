import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import documents, { type BaseKitDocument } from 'virtual:basekit-documents';
import PageHeader from '../../../components/common/PageHeader';

const CATEGORY_LABELS: Record<BaseKitDocument['category'], string> = {
  RELEASE: '배포공지',
  STATUS: '현재상태',
  DECISION: '확정규약',
  GUIDE: '설계·가이드',
  SAMPLE: '개발샘플',
  IDEA: '아이디어',
};

const STATUS_LABELS: Record<string, string> = {
  DEV_PM: '개발반영',
  CURRENT: '현재기준',
  ACCEPTED: '확정',
  REFERENCE: '참고',
  IDEA: '아이디어',
  REVIEW: '검토중',
  PLANNED: '예정',
  MOVED: '이관',
  REJECTED: '미채택',
  IDEA_ACCEPTED: '아이디어 승인',
  IMPLEMENTED_PHASE_1: '1단계 구현',
};

function resolveDocumentLink(sourcePath: string, href: string) {
  if (!href.endsWith('.md') && !href.includes('.md#')) return undefined;
  const sourceUrl = new URL(sourcePath, 'https://basekit.local/');
  const resolvedPath = new URL(href, sourceUrl).pathname.replace(/^\//, '').split('#')[0];
  return documents.find((document) => document.path === resolvedPath);
}

export default function DocumentCenterPage() {
  const releaseDocument = documents.find((document) => document.category === 'RELEASE');
  const [category, setCategory] = useState<BaseKitDocument['category'] | 'ALL'>('ALL');
  const [keyword, setKeyword] = useState('');
  const [selectedKey, setSelectedKey] = useState(releaseDocument?.key ?? documents[0]?.key ?? '');

  const filteredDocuments = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return documents.filter((document) => {
      const categoryMatched = category === 'ALL' || document.category === category;
      const keywordMatched = !normalizedKeyword || [document.title, document.path, document.content]
        .some((value) => value.toLowerCase().includes(normalizedKeyword));
      return categoryMatched && keywordMatched;
    });
  }, [category, keyword]);

  const selectedDocument = documents.find((document) => document.key === selectedKey)
    ?? filteredDocuments[0];

  const selectCategory = (nextCategory: BaseKitDocument['category'] | 'ALL') => {
    setCategory(nextCategory);
    const firstDocument = documents.find((document) => nextCategory === 'ALL' || document.category === nextCategory);
    if (firstDocument) setSelectedKey(firstDocument.key);
  };

  return (
    <div className="page document-center-page">
      <PageHeader
        breadcrumbs={['개발자가이드', 'BaseKit 문서센터']}
        description="배포 내용, 확정 규약, 설계 문서와 개발 샘플 가이드를 Repository 기준으로 확인합니다."
      />

      <section className="document-center-toolbar">
        <div className="document-category-tabs" role="tablist" aria-label="문서 분류">
          <button type="button" className={category === 'ALL' ? 'active' : ''} onClick={() => selectCategory('ALL')}>전체</button>
          {(Object.keys(CATEGORY_LABELS) as BaseKitDocument['category'][]).map((categoryKey) => (
            <button key={categoryKey} type="button" className={category === categoryKey ? 'active' : ''} onClick={() => selectCategory(categoryKey)}>
              {CATEGORY_LABELS[categoryKey]}
            </button>
          ))}
        </div>
        <label>
          <span>문서검색</span>
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="제목·경로·본문" />
        </label>
      </section>

      <div className="document-center-layout">
        <aside className="document-list-panel">
          <div className="document-list-heading"><h2>문서 목록</h2><span>총 {filteredDocuments.length}건</span></div>
          <div className="document-list-scroll">
            {filteredDocuments.map((document) => (
              <button key={document.key} type="button" className={document.key === selectedDocument?.key ? 'active' : ''} onClick={() => setSelectedKey(document.key)}>
                <span className={`document-category category-${document.category.toLowerCase()}`}>{CATEGORY_LABELS[document.category]}</span>
                <strong>{document.title}</strong>
                <small>{document.path}</small>
                <em className={`document-status status-${document.status.toLowerCase()}`}>{STATUS_LABELS[document.status] ?? document.status}</em>
              </button>
            ))}
            {filteredDocuments.length === 0 ? <p className="document-empty">조건에 맞는 문서가 없습니다.</p> : null}
          </div>
        </aside>

        <section className="document-viewer-panel">
          {selectedDocument ? (
            <>
              <header>
                <div><span>{CATEGORY_LABELS[selectedDocument.category]}</span><strong>{STATUS_LABELS[selectedDocument.status] ?? selectedDocument.status}</strong></div>
                <code>{selectedDocument.path}</code>
              </header>
              <article className="markdown-document">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href = '', children }) => {
                      const linkedDocument = resolveDocumentLink(selectedDocument.path, href);
                      return linkedDocument
                        ? <a href={`#${linkedDocument.path}`} onClick={(event) => { event.preventDefault(); setSelectedKey(linkedDocument.key); }}>{children}</a>
                        : <a href={href} target="_blank" rel="noreferrer">{children}</a>;
                    },
                  }}
                >
                  {selectedDocument.content}
                </ReactMarkdown>
              </article>
            </>
          ) : <div className="document-empty">표시할 문서가 없습니다.</div>}
        </section>
      </div>
    </div>
  );
}
