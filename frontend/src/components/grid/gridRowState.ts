import { useCallback, useMemo, useState } from 'react';

export type GridRowState = 'NORMAL' | 'INSERTED' | 'UPDATED' | 'DELETED';
export type TrackedGridRow<T> = T & { __GRID_ROW_ID: string };
export interface BatchChangeSet<T> { INSERTED: T[]; UPDATED: T[]; DELETED: string[]; }

export interface GridRowStore<T> {
  rows: TrackedGridRow<T>[];
  states: Map<string, GridRowState>;
  originals: Map<string, TrackedGridRow<T>>;
  beforeDeleteStates: Map<string, Exclude<GridRowState, 'DELETED'>>;
  sequence: number;
}

const clone = <T,>(value: T): T => structuredClone(value);

function rowValue<T>(row: TrackedGridRow<T>): T {
  const { __GRID_ROW_ID: _id, ...value } = row;
  void _id;
  return value as T;
}

function matchesOriginal<T>(row: TrackedGridRow<T>, original?: TrackedGridRow<T>) {
  return Boolean(original && JSON.stringify(rowValue(row)) === JSON.stringify(rowValue(original)));
}

export function replaceGridRows<T>(current: GridRowStore<T>, value: T[], getKey: (row: T) => string): GridRowStore<T> {
  let sequence = current.sequence;
  const rows = value.map((source) => {
    const data = clone(source);
    return { ...data, __GRID_ROW_ID: getKey(data) || `NEW_${sequence++}` } as TrackedGridRow<T>;
  });
  return {
    rows,
    states: new Map<string, GridRowState>(rows.map((row) => [row.__GRID_ROW_ID, 'NORMAL'])),
    originals: new Map(rows.map((row) => [row.__GRID_ROW_ID, clone(row)])),
    beforeDeleteStates: new Map(),
    sequence,
  };
}

export function addGridRow<T>(current: GridRowStore<T>, value: T): GridRowStore<T> {
  const row = { ...clone(value), __GRID_ROW_ID: `NEW_${current.sequence}` } as TrackedGridRow<T>;
  return {
    ...current,
    rows: [...current.rows, row],
    states: new Map(current.states).set(row.__GRID_ROW_ID, 'INSERTED'),
    sequence: current.sequence + 1,
  };
}

export function updateGridRow<T>(current: GridRowStore<T>, id: string, change: (row: TrackedGridRow<T>) => TrackedGridRow<T>): GridRowStore<T> {
  let changedRow: TrackedGridRow<T> | undefined;
  const rows = current.rows.map((row) => {
    if (row.__GRID_ROW_ID !== id) return row;
    changedRow = change(row);
    return changedRow;
  });
  if (!changedRow) return current;
  const previousState = current.states.get(id) ?? 'NORMAL';
  const nextState = previousState === 'INSERTED' || previousState === 'DELETED'
    ? previousState
    : matchesOriginal(changedRow, current.originals.get(id)) ? 'NORMAL' : 'UPDATED';
  return { ...current, rows, states: new Map(current.states).set(id, nextState) };
}

export function removeGridRows<T>(current: GridRowStore<T>, ids: Iterable<string>): GridRowStore<T> {
  const selected = new Set(ids);
  const states = new Map(current.states);
  const beforeDeleteStates = new Map(current.beforeDeleteStates);
  const rows = current.rows.filter((row) => {
    const id = row.__GRID_ROW_ID;
    if (!selected.has(id)) return true;
    const state = states.get(id) ?? 'NORMAL';
    if (state === 'INSERTED') {
      states.delete(id);
      return false;
    }
    if (state !== 'DELETED') {
      beforeDeleteStates.set(id, state === 'UPDATED' ? 'UPDATED' : 'NORMAL');
      states.set(id, 'DELETED');
    }
    return true;
  });
  return { ...current, rows, states, beforeDeleteStates };
}

export function revertGridRows<T>(current: GridRowStore<T>, ids: Iterable<string>): GridRowStore<T> {
  const selected = new Set(ids);
  const states = new Map(current.states);
  const beforeDeleteStates = new Map(current.beforeDeleteStates);
  const rows = current.rows.flatMap((row): TrackedGridRow<T>[] => {
    const id = row.__GRID_ROW_ID;
    if (!selected.has(id)) return [row];
    const state = states.get(id) ?? 'NORMAL';
    if (state === 'INSERTED') {
      states.delete(id);
      beforeDeleteStates.delete(id);
      return [];
    }
    if (state === 'UPDATED') {
      const original = current.originals.get(id);
      states.set(id, 'NORMAL');
      beforeDeleteStates.delete(id);
      return original ? [clone(original)] : [row];
    }
    if (state === 'DELETED') {
      const original = current.originals.get(id);
      const previousState = beforeDeleteStates.get(id) ?? (matchesOriginal(row, original) ? 'NORMAL' : 'UPDATED');
      states.set(id, previousState);
      beforeDeleteStates.delete(id);
    }
    return [row];
  });
  return { ...current, rows, states, beforeDeleteStates };
}

export function getGridChangeSet<T>(current: GridRowStore<T>, getKey: (row: T) => string): BatchChangeSet<T> {
  const result: BatchChangeSet<T> = { INSERTED: [], UPDATED: [], DELETED: [] };
  current.rows.forEach((row) => {
    const id = row.__GRID_ROW_ID;
    const state = current.states.get(id);
    if (state === 'INSERTED') result.INSERTED.push(rowValue(row));
    if (state === 'UPDATED') result.UPDATED.push(rowValue(row));
    if (state === 'DELETED') result.DELETED.push(getKey(rowValue(current.originals.get(id) ?? row)));
  });
  return result;
}

const emptyStore = <T,>(): GridRowStore<T> => ({
  rows: [],
  states: new Map(),
  originals: new Map(),
  beforeDeleteStates: new Map(),
  sequence: 0,
});

export function useGridRowState<T>(getKey: (row: T) => string) {
  const [store, setStore] = useState<GridRowStore<T>>(emptyStore);
  const replace = useCallback((value: T[]) => setStore((current) => replaceGridRows(current, value, getKey)), [getKey]);
  const add = useCallback((value: T) => setStore((current) => addGridRow(current, value)), []);
  const update = useCallback((id: string, change: (row: TrackedGridRow<T>) => TrackedGridRow<T>) => setStore((current) => updateGridRow(current, id, change)), []);
  const remove = useCallback((ids: Iterable<string>) => setStore((current) => removeGridRows(current, ids)), []);
  const revert = useCallback((ids: Iterable<string>) => setStore((current) => revertGridRows(current, ids)), []);
  const changeSet = useMemo(() => getGridChangeSet(store, getKey), [getKey, store]);
  const getState = useCallback((row: TrackedGridRow<T>) => store.states.get(row.__GRID_ROW_ID) ?? 'NORMAL', [store.states]);
  const hasChanges = useCallback((ids: Iterable<string>) => {
    const selected = new Set(ids);
    return store.rows.some((row) => selected.has(row.__GRID_ROW_ID) && (store.states.get(row.__GRID_ROW_ID) ?? 'NORMAL') !== 'NORMAL');
  }, [store.rows, store.states]);
  return {
    rows: store.rows,
    replace,
    add,
    update,
    remove,
    revert,
    hasChanges,
    getState,
    changeSet,
    dirty: changeSet.INSERTED.length + changeSet.UPDATED.length + changeSet.DELETED.length > 0,
  };
}
