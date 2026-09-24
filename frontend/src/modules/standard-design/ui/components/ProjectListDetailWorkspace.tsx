import { DEFAULT_LIST_WIDTH_PERCENT, getBoundedListWidth } from './projectSplitter';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

export type ProjectWorkspaceMode = 'LIST' | 'DETAIL' | 'DETAIL_EXPANDED';

interface ProjectListDetailWorkspaceProps {
  mode: ProjectWorkspaceMode;
  onModeChange: (mode: ProjectWorkspaceMode) => void;
  list: ReactNode;
  detail: ReactNode;
}

export default function ProjectListDetailWorkspace({
  mode,
  onModeChange,
  list,
  detail,
}: ProjectListDetailWorkspaceProps) {
  const workspaceRef = useRef<HTMLElement>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const [listWidthPercent, setListWidthPercent] = useState(DEFAULT_LIST_WIDTH_PERCENT);

  const updateListWidth = (nextWidthPercent: number) => {
    setListWidthPercent((currentWidthPercent) => getBoundedListWidth(nextWidthPercent, workspaceRef.current?.getBoundingClientRect().width ?? 0) || currentWidthPercent);
  };

  useEffect(() => {
    const keepWidthUseful = () => {
      setListWidthPercent((currentWidthPercent) => getBoundedListWidth(currentWidthPercent, workspaceRef.current?.getBoundingClientRect().width ?? 0));
    };

    const observer = new ResizeObserver(keepWidthUseful);
    if (workspaceRef.current) observer.observe(workspaceRef.current);
    return () => {
      observer.disconnect();
      resizeCleanupRef.current?.();
    };
  }, []);

  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    if (mode !== 'DETAIL' || event.button !== 0 || event.target instanceof Element && event.target.closest('button')) return;

    const workspace = workspaceRef.current;
    if (!workspace) return;

    event.preventDefault();
    resizeCleanupRef.current?.();
    const splitter = event.currentTarget;
    const pointerId = event.pointerId;
    splitter.setPointerCapture(pointerId);

    const updateFromPointer = (clientX: number) => {
      const bounds = workspace.getBoundingClientRect();
      if (bounds.width <= 0) return;
      updateListWidth(((clientX - bounds.left) / bounds.width) * 100);
    };
    const stopResize = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      if (splitter.hasPointerCapture(pointerId)) splitter.releasePointerCapture(pointerId);
      resizeCleanupRef.current = null;
    };
    const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
      if (moveEvent.pointerId === pointerId) updateFromPointer(moveEvent.clientX);
    };
    const onPointerUp = (upEvent: globalThis.PointerEvent) => {
      if (upEvent.pointerId === pointerId) stopResize();
    };

    resizeCleanupRef.current = stopResize;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const resizeWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (mode !== 'DETAIL') return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      updateListWidth(listWidthPercent - 2);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      updateListWidth(listWidthPercent + 2);
    }
    if (event.key === 'Home') {
      event.preventDefault();
      updateListWidth(DEFAULT_LIST_WIDTH_PERCENT);
    }
  };

  const toggleList = () => {
    onModeChange(mode === 'DETAIL' ? 'DETAIL_EXPANDED' : 'DETAIL');
  };

  const style = {
    '--project-list-width': `${listWidthPercent}%`,
  } as CSSProperties & Record<'--project-list-width', string>;

  return (
    <section
      ref={workspaceRef}
      className={`standard-design-project-workspace project-list-detail-workspace project-list-detail-workspace--${mode}`}
      style={style}
      aria-label="프로젝트 목록 및 상세"
    >
      {mode !== 'DETAIL_EXPANDED' ? <section className="project-list-detail-workspace__list">{list}</section> : null}
      {mode !== 'LIST' ? (
        <div
          className="project-list-detail-workspace__splitter"
        >
          <div
            className="project-list-detail-workspace__resize-handle"
            role="separator"
            aria-label="목록과 상세 영역의 너비 조절"
            aria-orientation="vertical"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={mode === 'DETAIL_EXPANDED' ? 0 : Math.round(listWidthPercent)}
            tabIndex={0}
            onPointerDown={startResize}
            onKeyDown={resizeWithKeyboard}
          />
          <button
            type="button"
            className="project-list-detail-workspace__toggle"
            aria-label={mode === 'DETAIL' ? '목록 접기' : '목록 펼치기'}
            title={mode === 'DETAIL' ? '목록 접기' : '목록 펼치기'}
            onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
            onClick={toggleList}
          >
            {mode === 'DETAIL' ? '<' : '>'}
          </button>
        </div>
      ) : null}
      {mode !== 'LIST' ? <section className="project-list-detail-workspace__detail">{detail}</section> : null}
    </section>
  );
}
