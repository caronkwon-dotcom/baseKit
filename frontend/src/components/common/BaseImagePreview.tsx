interface BaseImagePreviewProps { url?: string; name?: string }

export default function BaseImagePreview({ url, name }: BaseImagePreviewProps) {
  return <div className="base-image-preview">{url
    ? <img src={url} alt={name ?? '첨부 이미지'} />
    : <span>파일을 선택하면 미리보기가 표시됩니다.</span>}</div>;
}
