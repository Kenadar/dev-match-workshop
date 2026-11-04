import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './layout/Layout.js';
import { RequireAuth } from './layout/RequireAuth.js';
import { CatalogPage } from './pages/CatalogPage.js';
import { LoginPage, RegisterPage } from './pages/AuthPages.js';
import { ManageProjectPage } from './pages/ManageProjectPage.js';
import { MyApplicationsPage } from './pages/MyApplicationsPage.js';
import { MyProjectsPage } from './pages/MyProjectsPage.js';
import { NewProjectPage } from './pages/NewProjectPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';
import { OnboardingPage } from './pages/OnboardingPage.js';
import { ProjectPage } from './pages/ProjectPage.js';

// Routes ↔ stories: docs/architecture/overview.md → "Frontend pages → user stories".
export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <CatalogPage /> },
      { path: '/projects/:id', element: <ProjectPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: '/onboarding', element: <OnboardingPage /> },
          { path: '/my/projects', element: <MyProjectsPage /> },
          { path: '/my/projects/new', element: <NewProjectPage /> },
          { path: '/my/projects/:id', element: <ManageProjectPage /> },
          { path: '/my/applications', element: <MyApplicationsPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
