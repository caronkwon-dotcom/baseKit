import { useCallback, useMemo, useRef, useState } from 'react';
export type GridRowState = 'NORMAL' | 'INSERTED' | 'UPDATED' | 'DELETED';
export type TrackedGridRow<T> = T & { __GRID_ROW_ID: string };
export interface BatchChangeSet<T> { INSERTED: T[]; UPDATED: T[]; DELETED: string[]; }
export function useGridRowState<T>(getKey: (row: T) => string) {
  const [rows, setRows] = useState<TrackedGridRow<T>[]>([]); const [states, setStates] = useState(new Map<string, GridRowState>()); const sequence = useRef(0);
  const replace = useCallback((value: T[]) => { const next = value.map(row => ({ ...row, __GRID_ROW_ID: getKey(row) || `NEW_${sequence.current++}` })); setRows(next); setStates(new Map(next.map(row => [row.__GRID_ROW_ID, 'NORMAL']))); }, [getKey]);
  const add = useCallback((value: T) => { const row = { ...value, __GRID_ROW_ID: `NEW_${sequence.current++}` }; setRows(current => [...current, row]); setStates(current => new Map(current).set(row.__GRID_ROW_ID, 'INSERTED')); }, []);
  const update = useCallback((id: string, change: (row: TrackedGridRow<T>) => TrackedGridRow<T>) => { setRows(current => current.map(row => row.__GRID_ROW_ID === id ? change(row) : row)); setStates(current => { const next = new Map(current); if (next.get(id) === 'NORMAL') next.set(id, 'UPDATED'); return next; }); }, []);
  const remove = useCallback((ids: Iterable<string>) => { const selected = new Set(ids); setRows(current => current.filter(row => !(selected.has(row.__GRID_ROW_ID) && states.get(row.__GRID_ROW_ID) === 'INSERTED'))); setStates(current => { const next = new Map(current); selected.forEach(id => next.get(id) === 'INSERTED' ? next.delete(id) : next.set(id, 'DELETED')); return next; }); }, [states]);
  const changeSet = useMemo(() => { const result: BatchChangeSet<T> = { INSERTED: [], UPDATED: [], DELETED: [] }; rows.forEach(row => { const { __GRID_ROW_ID: id, ...value } = row; const state = states.get(id); if (state === 'INSERTED') result.INSERTED.push(value as T); if (state === 'UPDATED') result.UPDATED.push(value as T); if (state === 'DELETED') result.DELETED.push(getKey(value as T)); }); return result; }, [getKey, rows, states]);
  const getState = useCallback((row: TrackedGridRow<T>) => states.get(row.__GRID_ROW_ID) ?? 'NORMAL', [states]);
  return { rows, replace, add, update, remove, getState, changeSet, dirty: changeSet.INSERTED.length + changeSet.UPDATED.length + changeSet.DELETED.length > 0 };
}
