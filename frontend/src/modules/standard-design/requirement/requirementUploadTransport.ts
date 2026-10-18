import { uploadMultipart, type UploadProgress } from '../../../services/uploadTransport';
import type { RequirementAttachment } from './requirementApi';

export function uploadRequirementAttachment(requirementId: string, file: File, onProgress: (progress: UploadProgress) => void, change?: { REVISION: number; VERSION: number }) {
  return uploadMultipart<RequirementAttachment>(`/api/standard-design/requirements/${encodeURIComponent(requirementId)}/attachments${change ? `?REVISION=${change.REVISION}&VERSION=${change.VERSION}` : ''}`, file, onProgress);
}
