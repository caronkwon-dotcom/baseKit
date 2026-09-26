export interface UploadProgress { loaded: number; total: number; percent: number }
export interface UploadOperation<T> { promise: Promise<T>; cancel: () => void }

/** Multipart transport. XHR is scoped here because fetch does not expose upload progress. */
export function uploadMultipart<T>(url: string, file: File, onProgress: (progress: UploadProgress) => void): UploadOperation<T> {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<T>((resolve, reject) => {
    xhr.open('POST', url);
    xhr.upload.onprogress = (event) => {
      const total = event.lengthComputable ? event.total : file.size;
      onProgress({ loaded: event.loaded, total, percent: total > 0 ? Math.round(event.loaded / total * 100) : 0 });
    };
    xhr.onload = () => {
      let payload: { DATA?: T; MESSAGE?: string; FIELD_ERRORS?: { FIELD_NAME: string; MESSAGE: string }[] };
      try { payload = JSON.parse(xhr.responseText) as typeof payload; }
      catch { payload = {}; }
      if (xhr.status >= 200 && xhr.status < 300 && payload.DATA) resolve(payload.DATA);
      else reject(new Error(payload.FIELD_ERRORS?.map((field) => `${field.FIELD_NAME}: ${field.MESSAGE}`).join(', ') || payload.MESSAGE || '파일 업로드에 실패했습니다.'));
    };
    xhr.onerror = () => reject(new Error('네트워크 연결을 확인한 뒤 다시 시도하세요.'));
    xhr.onabort = () => reject(new Error('업로드가 취소되었습니다.'));
    const body = new FormData();
    body.set('file', file);
    xhr.send(body);
  });
  return { promise, cancel: () => xhr.abort() };
}
