import { useState } from 'react';
import { PageHeader } from '../../../components/common';
import TreeDataGrid, { type TreeDataGridChange, type TreeDataGridColumn } from '../../../components/treeDataGrid/TreeDataGrid';
import type { DemoTreeRow } from './treeGridDemo.data';
import { TREE_GRID_DEMO_ROWS } from './treeGridDemo.data';
import './treeGridDemo.css';

const fields = { idField: 'MENU_ID', parentIdField: 'PARENT_ID', nodeTypeField: 'NODE_TYPE', nameField: 'MENU_NAME', sortField: 'SORT_ORDER' };
const columns: TreeDataGridColumn<DemoTreeRow>[] = [
  { field: 'MENU_ID', headerName: 'Identifier', width: 180 },
  { field: 'NODE_TYPE', headerName: 'Type', width: 115, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['FOLDER', 'LEAF'] } },
  { field: 'SORT_ORDER', headerName: 'Order', width: 100, cellEditor: 'agNumberCellEditor' },
  { field: 'USE_YN', headerName: 'Enabled', width: 100, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Y', 'N'] } },
];

export default function TreeGridDemoPage() {
  const [lastSaved, setLastSaved] = useState(0);
  const [lastChange, setLastChange] = useState<TreeDataGridChange<DemoTreeRow> | null>(null);
  return <section className="page tree-grid-demo-page">
    <PageHeader breadcrumbs={['Developer Guide', 'Grid', 'Tree Grid']} description="AG Grid Community based editable hierarchy grid. Changes stay in this browser demo." />
    <TreeDataGrid
      initialRows={TREE_GRID_DEMO_ROWS}
      fields={fields}
      columns={columns}
      getKey={(row) => row.MENU_ID}
      maxDepth={3}
      onSave={(rows, changeSet) => { setLastSaved(rows.length - changeSet.DELETED.length); setLastChange({ rows, changeSet, dirty: false, issues: [] }); }}
      onChange={setLastChange}
      emptyMessage="No demo rows. Use New to add the first item."
    />
    <section className="tree-grid-guide" aria-labelledby="tree-grid-guide-title">
      <h2 id="tree-grid-guide-title">Developer Guide</h2>
      <div className="tree-grid-guide-grid">
        <article><h3>Basic use</h3><pre>{`<TreeDataGrid
  initialRows={rows}
  fields={{ idField, parentIdField, nodeTypeField, nameField, sortField }}
  columns={columns}
  getKey={(row) => row.ID}
  maxDepth={3}
  onSave={(rows, changeSet) => saveToApi(rows, changeSet)}
/>`}</pre></article>
        <article><h3>Props and events</h3><p><code>initialRows</code>, field mapping, editable columns, stable <code>getKey</code>, and optional <code>maxDepth</code> configure the grid. <code>onChange</code> reports rows, INSERTED / UPDATED / DELETED change sets, dirty state, and validation issues. <code>onSave</code> runs after validation.</p></article>
        <article><h3>Edit state and validation</h3><p>Rows use the shared grid state helper. New rows are INSERTED, changed rows UPDATED, and removed persisted rows DELETED. Cancel restores the last accepted state. Required identifiers/names, unique identifiers, parent folder, cycles, integer order, and maximum depth are validated before save.</p></article>
        <article><h3>API integration</h3><p>Send the change set through the owning screen's API. Apply the server response with the refreshed rows as the next accepted baseline. Handle optimistic concurrency and server-side validation there; this demo never calls an API or writes a database.</p><p>Last local save: {lastSaved || 'not saved'} rows. Current dirty: {lastChange?.dirty ? 'yes' : 'no'}.</p></article>
      </div>
    </section>
  </section>;
}
