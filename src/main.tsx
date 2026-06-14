import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import CodeManagePage from './pages/CodeManagePage';
import HomePage from './pages/HomePage';
import MenuManagePage from './pages/MenuManagePage';
import RoleManagePage from './pages/RoleManagePage';
import SystemConfigPage from './pages/SystemConfigPage';
import UserManagePage from './pages/UserManagePage';
import './styles.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'system/codes', element: <CodeManagePage /> },
      { path: 'system/users', element: <UserManagePage /> },
      { path: 'system/menus', element: <MenuManagePage /> },
      { path: 'system/roles', element: <RoleManagePage /> },
      { path: 'system/config', element: <SystemConfigPage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
