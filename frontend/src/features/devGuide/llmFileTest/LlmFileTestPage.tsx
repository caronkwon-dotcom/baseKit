import { useEffect, useState } from 'react';
import ActionButton from '../../../components/common/ActionButton';
import BaseKitMessage from '../../../components/common/BaseKitMessage';
import DataTable from '../../../components/common/DataTable';
import PageHeader from '../../../components/common/PageHeader';
import {
  fetchCapabilities, fetchFiles, queryFile, searchFile, uploadFile,
  type LlmFileCapability, type LlmFileHit, type LlmFileInfo,
} from './llmFileTest.repository';

const PROJECT_ID = 'BASEKIT';

interface RunLog {
  no: number; method: string; source: string; elapsedMs: number; requestBytes: number; fileBytes: number;
  fullFileSent: string; reused: string; fileId: string; error?: string;
}

type LogInput = Omit<RunLog, 'no'>;

export default function LlmFileTestPage() {
  const [capabilities, setCapabilities] = useState<LlmFileCapability[]>([]);
  const [files, setFiles] = useState<LlmFileInfo[]>([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [question, setQuestion] = useState('');
  const [topK, setTopK] = useState(5);
  const [hits, setHits] = useState<LlmFileHit[]>([]);
  const [answer, setAnswer] = useState('');
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [message, setMessage] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const reloadFiles = () => fetchFiles(PROJECT_ID).then(setFiles).catch((e: Error) => setMessage({ type: 'error', text: e.message }));

  useEffect(() => {
    void reloadFiles();
    fetchCapabilities().then(setCapabilities).catch((e: Error) => setMessage({ type: 'error', text: e.message }));
  }, []);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try { await task(); } catch (e) { setMessage({ type: 'error', text: (e as Error).message }); } finally { setBusy(false); }
  };

  const addLog = (log: LogInput) => setLogs((prev) => [{ ...log, no: prev.length + 1 }, ...prev]);

  const upload = () => run(async () => {
    if (!pickedFile) throw new Error('업로드할 파일을 선택해 주세요.');
    const info = await uploadFile(PROJECT_ID, pickedFile);
    setSelectedFileId(info.FILE_ID);
    await reloadFiles();
    setMessage({ type: 'success', text: `등록 완료: ${info.FILE_ID} (BaseKit 서버 보관, 회사 LLM 파일 API 아님)` });
  });

  const search = () => run(async () => {
    const result = await searchFile(PROJECT_ID, selectedFileId, question, topK);
    setHits(result.HITS);
    setAnswer('');
    addLog({ method: result.METHOD, source: 'BASEKIT_SERVER', elapsedMs: result.ELAPSED_MS, requestBytes: 0, fileBytes: 0, fullFileSent: 'N', reused: result.FILE_REUSED ? 'Y' : 'N', fileId: selectedFileId });
  });

  const query = (mode: 'RETRIEVAL' | 'FULL_FILE') => run(async () => {
    try {
      const result = await queryFile(PROJECT_ID, selectedFileId, question, topK, mode);
      setHits(result.HITS);
      setAnswer(result.ANSWER);
      addLog({ method: result.METHOD, source: result.SOURCE, elapsedMs: result.ELAPSED_MS, requestBytes: result.REQUEST_BYTES, fileBytes: result.FILE_SIZE_BYTES, fullFileSent: result.FULL_FILE_SENT ? 'Y' : 'N', reused: result.FILE_REUSED ? 'Y' : 'N', fileId: selectedFileId });
    } catch (e) {
      addLog({ method: mode, source: 'COMPANY_LLM', elapsedMs: 0, requestBytes: 0, fileBytes: 0, fullFileSent: '-', reused: '-', fileId: selectedFileId, error: (e as Error).message });
      throw e;
    }
  });

  const ready = Boolean(selectedFileId && question.trim()) && !busy;

  return (
    <div className="page">
      <PageHeader
        breadcrumbs={['개발자가이드', 'LLM 파일·검색 테스트']}
        description="회사 LLM 파일 등록·재사용·검색 가능 여부를 검증하는 PoC입니다. 회사 LLM 지원 기능과 BaseKit 서버 대체 기능을 구분해 표시합니다."
      />
      {message ? <BaseKitMessage type={message.type} message={message.text} dismissible onDismiss={() => setMessage(null)} /> : null}

      <DataTable
        title="회사 LLM 기능 확인"
        rows={capabilities}
        getRowKey={(row) => row.FEATURE}
        columns={[
          { key: 'f', header: '기능', render: (r) => r.FEATURE, flex: 2 },
          { key: 's', header: '상태', render: (r) => r.STATUS, width: 160 },
          { key: 'd', header: '상세', render: (r) => r.DETAIL, flex: 3 },
        ]}
      />

      <section className="document-center-toolbar">
        <label><span>파일 선택</span><input type="file" accept=".json,.csv,.txt,.md" onChange={(e) => setPickedFile(e.target.files?.[0] ?? null)} /></label>
        <ActionButton actionCode="CREATE" label="업로드" display="label" tone="primary" disabled={busy || !pickedFile} onClick={() => void upload()} />
      </section>

      <DataTable
        title="등록 파일 (BaseKit 서버 보관)"
        rows={files}
        getRowKey={(row) => row.FILE_ID}
        onRowClick={(row) => setSelectedFileId(row.FILE_ID)}
        getRowClassName={(row) => (row.FILE_ID === selectedFileId ? 'selected-row' : '')}
        columns={[
          { key: 'id', header: '파일 ID', render: (r) => r.FILE_ID, width: 130 },
          { key: 'n', header: '파일명', render: (r) => r.FILE_NAME, flex: 2 },
          { key: 'sz', header: '크기(B)', render: (r) => r.FILE_SIZE_BYTES.toLocaleString(), width: 100, align: 'right' },
          { key: 'c', header: '구간 수', render: (r) => r.CHUNK_COUNT, width: 80, align: 'right' },
          { key: 'st', header: '상태', render: (r) => r.STATUS, width: 100 },
          { key: 'sg', header: '저장 위치', render: (r) => r.STORAGE, width: 130 },
          { key: 'u', header: '사용 횟수', render: (r) => r.USE_COUNT, width: 90, align: 'right' },
        ]}
      />

      <section className="document-center-toolbar">
        <label><span>선택 파일</span><input value={selectedFileId} readOnly placeholder="목록에서 파일 선택" /></label>
        <label><span>질문</span><input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="예: 주문 취소 관련 요구사항" /></label>
        <label><span>검색 건수</span><input type="number" min={1} max={20} value={topK} onChange={(e) => setTopK(Number(e.target.value) || 5)} /></label>
        <ActionButton actionCode="SEARCH" label="검색" display="label" disabled={!ready} onClick={() => void search()} />
        <ActionButton actionCode="SEARCH" label="LLM 질의(검색 구간만)" display="label" tone="primary" disabled={!ready} onClick={() => void query('RETRIEVAL')} />
        <ActionButton actionCode="SEARCH" label="LLM 질의(원문 전체·비교)" display="label" disabled={!ready} onClick={() => void query('FULL_FILE')} />
      </section>

      <DataTable
        title="검색 결과 및 근거"
        rows={hits}
        getRowKey={(row) => row.POSITION}
        emptyMessage="검색 결과가 없습니다."
        columns={[
          { key: 'p', header: '위치', render: (r) => r.POSITION, width: 100 },
          { key: 'sc', header: '점수', render: (r) => r.SCORE, width: 70, align: 'right' },
          { key: 't', header: '근거 원문', render: (r) => r.TEXT.replace(/\s+/g, ' '), flex: 1 },
        ]}
      />

      <div className="data-section">
        <h2>LLM 응답</h2>
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{answer || '응답 없음'}</pre>
      </div>

      <DataTable
        title="실행 결과 (파일 재사용·전송량·시간)"
        rows={logs}
        getRowKey={(row) => String(row.no)}
        emptyMessage="실행 이력이 없습니다."
        columns={[
          { key: 'no', header: '#', render: (r) => r.no, width: 50, align: 'right' },
          { key: 'm', header: '요청 방식', render: (r) => r.method, flex: 2 },
          { key: 'src', header: '출처', render: (r) => r.source, width: 130 },
          { key: 'ms', header: '실행(ms)', render: (r) => r.elapsedMs.toLocaleString(), width: 90, align: 'right' },
          { key: 'rb', header: '전송 프롬프트(B)', render: (r) => r.requestBytes.toLocaleString(), width: 130, align: 'right' },
          { key: 'fb', header: '파일 원본(B)', render: (r) => r.fileBytes.toLocaleString(), width: 110, align: 'right' },
          { key: 'ff', header: '원문 전체 전송', render: (r) => r.fullFileSent, width: 110, align: 'center' },
          { key: 'ru', header: '파일 재사용', render: (r) => r.reused, width: 90, align: 'center' },
          { key: 'er', header: '오류', render: (r) => r.error ?? '', flex: 2 },
        ]}
      />
    </div>
  );
}
