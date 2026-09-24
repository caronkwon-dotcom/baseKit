import { createRoot } from 'react-dom/client';
import GridPoc from './GridPoc';
import UiPreferencesProvider from '../preferences/UiPreferencesProvider';

if (import.meta.env.DEV) {
  const root = createRoot(document.getElementById('root')!);
  root.render(<UiPreferencesProvider><GridPoc /></UiPreferencesProvider>);
  import.meta.hot?.dispose(() => root.unmount());
}
