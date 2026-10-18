import { useLocation } from 'react-router-dom';
import MenuBuilderPage from '../../modules/standard-design/menu-builder/AnalysisMenuBuilderPage';
import AppLayout from '../AppLayout';
import StandaloneShell from './StandaloneShell';

export default function RootLayout() {
  const { pathname } = useLocation();
  if (pathname === '/standard-design/prototypes/menu-builder') return <MenuBuilderPage />;
  return pathname === '/window' || pathname.startsWith('/window/') ? <StandaloneShell /> : <AppLayout />;
}
