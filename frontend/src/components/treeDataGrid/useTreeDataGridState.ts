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
  const { rows: trackedRows, replace, add, update, remove, revert, accept: acceptGridRows, getState: getGridState, changeSet: gridChangeSet, dirty } = grid;
  const initialized = useRef(false);
  const previousInitialRows = useRef(initialRows);
  const nextAddedId = useRef(initialRows.filter((row) => !getKey(row)).length);
  useEffect(() => {
    if (initialized.current) return;
    replace(initialRows);
    initialized.current = true;
  }, [initialRows, replace]);
  useEffect(() => {
    if (!initialized.current || previousInitialRows.current === initialRows) return;
    previousInitialRows.current = initialRows;
    replace(initialRows);
  }, [initialRows, replace]);

  const updateField = useCallback((internalId: string, field: string, value: unknown) => {
    update(internalId, (row) => ({ ...row, [field]: value }));
  }, [update]);
  const updateRow = useCallback((internalId: string, change: (row: T) => Partial<T>) => {
    update(internalId, (row) => ({ ...row, ...change(withoutInternalId(row)) }));
  }, [update]);
  const addRow = useCallback((row: T) => {
    const id = `NEW_${nextAddedId.current++}`;
    add(row);
    return id;
  }, [add]);
  const removeRows = useCallback((internalIds: Iterable<string>) => remove(internalIds), [remove]);
  const cancel = useCallback(() => revert(trackedRows.map((row) => row.__GRID_ROW_ID)), [revert, trackedRows]);
  const accept = useCallback((internalIds?: Iterable<string>) => {
    const ids = internalIds ?? trackedRows.filter((row) => getGridState(row) !== 'NORMAL').map((row) => row.__GRID_ROW_ID);
    acceptGridRows(ids);
  }, [acceptGridRows, getGridState, trackedRows]);
  const rows = useMemo(() => trackedRows.map(withoutInternalId), [trackedRows]);
  const states = useMemo(() => new Map(trackedRows.map((row) => [row.__GRID_ROW_ID, getGridState(row)])), [getGridState, trackedRows]);
  const changeSet = gridChangeSet as BatchChangeSet<T>;
  const getState = useCallback((internalId: string): GridRowState => states.get(internalId) ?? 'NORMAL', [states]);
  return { trackedRows, rows, states, changeSet, dirty, addRow, updateField, updateRow, removeRows, cancel, accept, getState };
}
