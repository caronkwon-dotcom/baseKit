import { createRoot } from 'react-dom/client';
import GridPoc from './GridPoc';

if (import.meta.env.DEV) {
  const root = createRoot(document.getElementById('root')!);
  root.render(<GridPoc />);
  import.meta.hot?.dispose(() => root.unmount());
}
