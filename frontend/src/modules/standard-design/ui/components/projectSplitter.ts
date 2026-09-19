export const DEFAULT_LIST_WIDTH_PERCENT = 30;
const MIN_LIST_WIDTH_PX = 360;
const MIN_DETAIL_WIDTH_PX = 480;

export function getBoundedListWidth(percent: number, workspaceWidth: number) {
  const availableWidth = Math.max(0, workspaceWidth - 12);
  if (workspaceWidth <= 0) return DEFAULT_LIST_WIDTH_PERCENT;

  // Reserve the splitter width; gracefully share undersized containers.
  if (availableWidth < MIN_LIST_WIDTH_PX + MIN_DETAIL_WIDTH_PX) {
    return (availableWidth * MIN_LIST_WIDTH_PX / (MIN_LIST_WIDTH_PX + MIN_DETAIL_WIDTH_PX) / workspaceWidth) * 100;
  }
  const minimum = (MIN_LIST_WIDTH_PX / workspaceWidth) * 100;
  const maximum = ((availableWidth - MIN_DETAIL_WIDTH_PX) / workspaceWidth) * 100;
  return Math.min(maximum, Math.max(minimum, percent));
}
