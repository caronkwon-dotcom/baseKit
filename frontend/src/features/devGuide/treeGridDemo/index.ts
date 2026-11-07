import TreeGridDemoPage from './TreeGridDemoPage';

export { default as TreeGridDemoPage } from './TreeGridDemoPage';

export const program = {
  programKey: 'DEV_TREE_GRID',
  programName: 'Tree Grid Demo',
  component: TreeGridDemoPage,
  actionCodes: ['SEARCH', 'CREATE', 'UPDATE', 'DELETE', 'SAVE', 'REVERT_CHANGES', 'MANUAL_VIEW'],
};
