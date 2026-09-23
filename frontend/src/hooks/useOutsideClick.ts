import { useEffect, type RefObject } from 'react';

export function useOutsideClick<T extends HTMLElement>(ref: RefObject<T | null>, onOutside: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOutside();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onOutside, ref]);
}
