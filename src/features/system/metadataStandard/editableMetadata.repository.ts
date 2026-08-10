export type MetadataFileName = 'words' | 'domains';
export type PersistenceMode = 'FILE' | 'BROWSER';

export async function loadEditableMetadata<T>(fileName: MetadataFileName, initialData: T[]) {
  try {
    const response = await fetch(`/api/metadata/${fileName}`);
    if (response.ok) return { rows: await response.json() as T[], mode: 'FILE' as const };
  } catch { /* 정적 배포에서는 브라우저 저장소로 전환한다. */ }

  const saved = localStorage.getItem(`basekit.metadata.${fileName}.v1`);
  return { rows: saved ? JSON.parse(saved) as T[] : initialData, mode: 'BROWSER' as const };
}

export async function saveEditableMetadata<T>(fileName: MetadataFileName, rows: T[], mode: PersistenceMode) {
  if (mode === 'FILE') {
    const response = await fetch(`/api/metadata/${fileName}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rows),
    });
    if (!response.ok) throw new Error((await response.json() as { message?: string }).message ?? '저장 실패');
    return;
  }
  localStorage.setItem(`basekit.metadata.${fileName}.v1`, JSON.stringify(rows));
}
