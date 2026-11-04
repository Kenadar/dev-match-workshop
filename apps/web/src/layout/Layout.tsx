import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useLogout, useMe } from '../queries/auth.js';

export function Layout() {
  const me = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <>
      <header className="nav">
        <NavLink to="/" className="brand">DevMatch</NavLink>
        <nav>
          <NavLink to="/">Catalog</NavLink>
          <NavLink to="/my/projects">My projects</NavLink>
          <NavLink to="/my/applications">My applications</NavLink>
          {me.data ? (
            <>
              <span className="muted">{me.data.displayName}</span>
              <button type="button" className="link" onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/') })}>
                Sign out
              </button>
            </>
          ) : (
            <NavLink to="/login">Sign in</NavLink>
          )}
        </nav>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
