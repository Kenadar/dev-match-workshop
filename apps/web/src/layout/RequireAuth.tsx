import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMe } from '../queries/auth.js';

/** Route guard for /my/* and /onboarding (overview.md → router). UX only: the API enforces access on its own. */
export function RequireAuth() {
  const me = useMe();
  const location = useLocation();

  if (me.isPending) return <p className="muted">Loading…</p>;
  if (!me.data) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <Outlet />;
}
