import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  useGridRowState,
  type BatchChangeSet,
  type GridRowState,
  type TrackedGridRow,
} from '../grid/gridRowState';

const withoutInternalId = <T,>(row: TrackedGridRow<T>): T => {
  const { __GRID_ROW_ID: _id, ...data } = row;
  void _id;
  return data as T;
};

export function useTreeDataGridState<T>(initialRows: T[], getKey: (row: T) => string) {
  const grid = useGridRowState(getKey);
  const { rows: trackedRows, replace, add, update, remove, revert, getState: getGridState, changeSet: gridChangeSet, dirty } = grid;
  const initialized = useRef(false);
  const nextAddedId = useRef(initialRows.filter((row) => !getKey(row)).length);
  useEffect(() => {
    if (initialized.current) return;
    replace(initialRows);
    initialized.current = true;
  }, [initialRows, replace]);

  const updateField = useCallback((internalId: string, field: string, value: unknown) => {
    update(internalId, (row) => ({ ...row, [field]: value }));
  }, [update]);
  const addRow = useCallback((row: T) => {
    const id = `NEW_${nextAddedId.current++}`;
    add(row);
    return id;
  }, [add]);
  const removeRows = useCallback((internalIds: Iterable<string>) => remove(internalIds), [remove]);
  const cancel = useCallback(() => revert(trackedRows.map((row) => row.__GRID_ROW_ID)), [revert, trackedRows]);
  const accept = useCallback(() => replace(trackedRows.filter((row) => getGridState(row) !== 'DELETED').map(withoutInternalId)), [getGridState, replace, trackedRows]);
  const rows = useMemo(() => trackedRows.map(withoutInternalId), [trackedRows]);
  const states = useMemo(() => new Map(trackedRows.map((row) => [row.__GRID_ROW_ID, getGridState(row)])), [getGridState, trackedRows]);
  const changeSet = gridChangeSet as BatchChangeSet<T>;
  const getState = useCallback((internalId: string): GridRowState => states.get(internalId) ?? 'NORMAL', [states]);
  return { trackedRows, rows, states, changeSet, dirty, addRow, updateField, removeRows, cancel, accept, getState };
}
