import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import type { UploadOperation, UploadProgress } from '../../services/uploadTransport';
import './baseFileUpload.css';

export interface BaseUploadFile { id: string; name: string; size: number; mimeType: string }
export interface BaseUploadPolicy {
  maxFileSize: number;
  maxFiles: number;
  extensions: string[];
  mimeTypes: string[];
  mimeByExtension: Record<string, string>;
}
export type UploadStatus = 'QUEUED' | 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'CANCELED';
interface PendingFile { id: string; file: File; status: UploadStatus; progress: UploadProgress; error: string }
export interface BaseFileUploadProps<T> {
  files: BaseUploadFile[];
  policy: BaseUploadPolicy | null;
  disabled?: boolean;
  multiple?: boolean;
  concurrency?: number;
  onUpload: (file: File, onProgress: (progress: UploadProgress) => void) => UploadOperation<T>;
  onUploaded: (result: T) => void;
  onDelete: (id: string) => Promise<void>;
  onDeleted: (id: string) => void;
  onPreview?: (id: string) => void;
  onPreviewLocal?: (file: File) => void;
  onError?: (message: string) => void;
}
const statusLabel: Record<UploadStatus, string> = { QUEUED: '대기', UPLOADING: '업로드 중', COMPLETED: '완료', FAILED: '실패', CANCELED: '취소됨' };
const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function BaseFileUpload<T>({ files, policy, disabled = false, multiple = true, concurrency = 2,
  onUpload, onUploaded, onDelete, onDeleted, onPreview, onPreviewLocal, onError }: BaseFileUploadProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<PendingFile[]>([]);
  const operationsRef = useRef(new Map<string, UploadOperation<T>>());
  const activeRef = useRef(0);
  const mountedRef = useRef(true);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const setQueue = (next: PendingFile[]) => { pendingRef.current = next; if (mountedRef.current) setPending(next); };
  const change = (id: string, update: Partial<PendingFile>) => setQueue(pendingRef.current.map((item) => item.id === id ? { ...item, ...update } : item));

  // A small FIFO queue is enough for V1. The transport owns the actual request and cancellation.
  const pump = () => {
    while (activeRef.current < Math.max(1, concurrency)) {
      const entry = pendingRef.current.find((item) => item.status === 'QUEUED');
      if (!entry) break;
      activeRef.current += 1;
      change(entry.id, { status: 'UPLOADING' });
      try {
        const operation = onUpload(entry.file, (progress) => change(entry.id, { progress }));
        operationsRef.current.set(entry.id, operation);
        void operation.promise.then((result) => {
          if (!mountedRef.current) return;
          change(entry.id, { status: 'COMPLETED', progress: { loaded: entry.file.size, total: entry.file.size, percent: 100 } });
          onUploaded(result);
          setQueue(pendingRef.current.filter((item) => item.id !== entry.id));
        }).catch((error: unknown) => {
          if (!mountedRef.current || pendingRef.current.find((item) => item.id === entry.id)?.status === 'CANCELED') return;
          const text = error instanceof Error ? error.message : '파일 업로드에 실패했습니다.';
          change(entry.id, { status: 'FAILED', error: text });
          onError?.(text);
        }).finally(() => { operationsRef.current.delete(entry.id); activeRef.current -= 1; if (mountedRef.current) pump(); });
      } catch (error) {
        activeRef.current -= 1;
        const text = error instanceof Error ? error.message : '파일 업로드에 실패했습니다.';
        change(entry.id, { status: 'FAILED', error: text });
        onError?.(text);
      }
    }
  };
  useEffect(() => {
    const operations = operationsRef.current;
    mountedRef.current = true;
    return () => { mountedRef.current = false; operations.forEach((operation) => operation.cancel()); };
  }, []);
  const addFiles = (selected: File[]) => {
    if (disabled || !policy) return;
    const next = [...pendingRef.current];
    const seen = new Set([...files.map((file) => `${file.name.toLowerCase()}|${file.size}`),
      ...next.filter((item) => item.status !== 'CANCELED').map((item) => `${item.file.name.toLowerCase()}|${item.file.size}`)]);
    for (const file of multiple ? selected : selected.slice(0, 1)) {
      const extension = file.name.includes('.') ? file.name.split('.').at(-1)!.toLowerCase() : '';
      const signature = `${file.name.toLowerCase()}|${file.size}`;
      let issue = '';
      if (file.size === 0) issue = `${file.name}: 빈 파일은 추가할 수 없습니다.`;
      else if (file.size > policy.maxFileSize) issue = `${file.name}: 최대 크기 ${formatSize(policy.maxFileSize)}를 초과했습니다.`;
      else if (!policy.extensions.includes(extension) || policy.mimeByExtension[extension] !== file.type) issue = `${file.name}: 허용되지 않은 파일 형식입니다.`;
      else if (seen.has(signature)) issue = `${file.name}: 같은 이름과 크기의 파일이 이미 있습니다.`;
      else if (files.length + next.filter((item) => item.status !== 'CANCELED').length >= policy.maxFiles) issue = `첨부파일은 최대 ${policy.maxFiles}개입니다.`;
      if (issue) { onError?.(issue); continue; }
      seen.add(signature);
      next.push({ id: crypto.randomUUID(), file, status: 'QUEUED', progress: { loaded: 0, total: file.size, percent: 0 }, error: '' });
    }
    setQueue(next);
    pump();
  };
  const cancel = (id: string) => {
    change(id, { status: 'CANCELED' });
    operationsRef.current.get(id)?.cancel();
    if (!operationsRef.current.has(id)) pump();
  };
  const retry = (id: string) => { change(id, { status: 'QUEUED', error: '', progress: { loaded: 0, total: pendingRef.current.find((item) => item.id === id)?.file.size ?? 0, percent: 0 } }); pump(); };
  const remove = (id: string) => setQueue(pendingRef.current.filter((item) => item.id !== id));
  const drop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragOver(false); addFiles(Array.from(event.dataTransfer.files)); };
  const keySelect = (event: KeyboardEvent<HTMLDivElement>) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inputRef.current?.click(); } };
  const deleteSaved = (id: string) => {
    setDeleting((current) => new Set(current).add(id));
    void onDelete(id).then(() => onDeleted(id)).catch((error: unknown) => onError?.(error instanceof Error ? error.message : '첨부파일 삭제에 실패했습니다.'))
      .finally(() => setDeleting((current) => { const next = new Set(current); next.delete(id); return next; }));
  };
  return <div className="base-file-upload">
    <div className={`base-file-upload__drop ${dragOver ? 'drag-over' : ''} ${disabled || !policy ? 'disabled' : ''}`} role="button" tabIndex={disabled || !policy ? -1 : 0}
      aria-label="파일 선택 또는 끌어 놓기" onClick={() => inputRef.current?.click()} onKeyDown={keySelect}
      onDragOver={(event) => { event.preventDefault(); if (!disabled && policy) setDragOver(true); }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOver(false); }} onDrop={drop}>
      <strong>파일을 여기에 끌어 놓으세요</strong><span>또는 클릭하여 파일을 선택하세요</span>
      <small>{policy ? `지원 형식: ${policy.extensions.map((ext) => `.${ext}`).join(', ')} · 파일당 ${formatSize(policy.maxFileSize)} · 최대 ${policy.maxFiles}개` : '파일 정책을 불러오는 중입니다.'}</small>
      <input ref={inputRef} type="file" hidden multiple={multiple} disabled={disabled || !policy} accept={policy?.extensions.map((ext) => `.${ext}`).join(',')} onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
    </div>
    <div className="base-file-upload__list" aria-live="polite">
      {files.map((file) => <div className="base-file-upload__row" key={file.id}>
        <button type="button" className="base-file-upload__name" onClick={() => onPreview?.(file.id)} title={file.name}>{file.name}</button>
        <span>{file.mimeType.split('/').at(-1)?.toUpperCase()}</span><span>{formatSize(file.size)}</span><span>100% · 완료</span>
        <button type="button" className="secondary-button" disabled={disabled || deleting.has(file.id)} onClick={() => deleteSaved(file.id)}>{deleting.has(file.id) ? '삭제 중' : '삭제'}</button>
      </div>)}
      {pending.map((item) => <div className="base-file-upload__row" key={item.id}>
        <button type="button" className="base-file-upload__name" onClick={() => onPreviewLocal?.(item.file)} title={item.file.name}>{item.file.name}</button>
        <span>{item.file.name.split('.').at(-1)?.toUpperCase()}</span><span>{formatSize(item.file.size)}</span>
        <div className="base-file-upload__progress"><progress max="100" value={item.progress.percent} aria-label={`${item.file.name} 업로드 진행률`} /><span>{item.status === 'UPLOADING' ? `${item.progress.percent}% · ${formatSize(item.progress.loaded)} / ${formatSize(item.progress.total)}` : statusLabel[item.status]}</span></div>
        {item.status === 'UPLOADING' || item.status === 'QUEUED' ? <button type="button" className="secondary-button" onClick={() => cancel(item.id)}>취소</button> : item.status === 'FAILED' ? <button type="button" className="secondary-button" onClick={() => retry(item.id)}>재시도</button> : <button type="button" className="secondary-button" onClick={() => remove(item.id)}>제거</button>}
        {item.error ? <small className="base-file-upload__error">{item.error}</small> : null}
      </div>)}
    </div>
  </div>;
}
