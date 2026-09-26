import { uploadMultipart, type UploadProgress } from '../../../services/uploadTransport';
import type { RequirementAttachment } from './requirementApi';

export function uploadRequirementAttachment(requirementId: string, file: File, onProgress: (progress: UploadProgress) => void) {
  return uploadMultipart<RequirementAttachment>(`/api/standard-design/requirements/${encodeURIComponent(requirementId)}/attachments`, file, onProgress);
}
