import { useLocation } from 'react-router-dom';
import AppLayout from '../AppLayout';
import StandaloneShell from './StandaloneShell';

export default function RootLayout() {
  const { pathname } = useLocation();
  return pathname === '/window' || pathname.startsWith('/window/') ? <StandaloneShell /> : <AppLayout />;
}
