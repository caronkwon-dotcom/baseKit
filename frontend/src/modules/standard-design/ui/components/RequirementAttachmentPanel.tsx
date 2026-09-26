import { useEffect, useState } from 'react';
import BaseFileUpload, { type BaseUploadPolicy } from '../../../../components/common/BaseFileUpload';
import BaseImagePreview from '../../../../components/common/BaseImagePreview';
import { requirementApi, type RequirementAttachment } from '../../requirement/requirementApi';
import { uploadRequirementAttachment } from '../../requirement/requirementUploadTransport';

interface RequirementAttachmentPanelProps {
  requirementId: string;
  attachments: RequirementAttachment[];
  onUploaded: (file: RequirementAttachment) => void;
  onDeleted: (id: string) => void;
  onError: (message: string) => void;
}
interface Preview { url: string; name: string; download?: boolean }

export default function RequirementAttachmentPanel({ requirementId, attachments, onUploaded, onDeleted, onError }: RequirementAttachmentPanelProps) {
  const [policy, setPolicy] = useState<BaseUploadPolicy | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  useEffect(() => {
    let current = true;
    requirementApi.uploadPolicy().then((value) => {
      if (current) setPolicy({ maxFileSize: value.MAX_FILE_SIZE, maxFiles: value.MAX_FILES,
        extensions: value.ALLOWED_EXTENSIONS, mimeTypes: value.ALLOWED_MIME_TYPES, mimeByExtension: value.MIME_BY_EXTENSION });
    }).catch((error: Error) => { if (current) onError(error.message); });
    return () => { current = false; };
  }, [onError]);
  useEffect(() => () => { if (preview?.url.startsWith('blob:')) URL.revokeObjectURL(preview.url); }, [preview]);
  const showSaved = (id: string) => {
    const file = attachments.find((item) => item.ATTACHMENT_ID === id);
    if (!file) return;
    setPreview({ url: requirementApi.fileUrl(requirementId, id), name: file.ORIGINAL_FILE_NAME,
      download: !['image/png', 'image/jpeg', 'image/webp'].includes(file.MIME_TYPE) });
  };
  const showLocal = (file: File) => {
    if (['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
      setPreview({ url: URL.createObjectURL(file), name: file.name });
  };
  return <section className="sd-requirement-attachments" aria-label="첨부자료">
    <div className="sd-requirement-section-heading"><h2>첨부자료 ({attachments.length}건)</h2>{!requirementId ? <span>요구사항 저장 후 첨부할 수 있습니다.</span> : null}</div>
    <BaseFileUpload key={requirementId} files={attachments.map((file) => ({ id: file.ATTACHMENT_ID, name: file.ORIGINAL_FILE_NAME, size: file.FILE_SIZE, mimeType: file.MIME_TYPE }))}
      policy={policy} disabled={!requirementId} concurrency={2}
      onUpload={(file, progress) => uploadRequirementAttachment(requirementId, file, progress)}
      onUploaded={onUploaded} onDelete={(id) => requirementApi.deleteFile(requirementId, id)}
      onDeleted={(id) => { if (preview?.url === requirementApi.fileUrl(requirementId, id)) setPreview(null); onDeleted(id); }}
      onPreview={showSaved} onPreviewLocal={showLocal} onError={onError} />
    <div className="sd-requirement-preview">{preview?.download
      ? <a href={preview.url}>파일 다운로드: {preview.name}</a>
      : <BaseImagePreview url={preview?.url} name={preview?.name} />}</div>
  </section>;
}
