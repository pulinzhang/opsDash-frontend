import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export const Layout = () => {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">
          <Link to="/dashboard">OpsDash</Link>
        </div>
        <nav className="nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/users">Users</NavLink>
          <NavLink to="/shifts">Shifts</NavLink>
          <NavLink to="/tasks">Tasks</NavLink>
          <NavLink to="/logs">Logs</NavLink>
          <NavLink to="/handover-logs">Handover Logs</NavLink>
          <NavLink to="/incidents">Incidents</NavLink>
          <NavLink to="/reports">Reports</NavLink>
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div />
          <div className="topbar-right">
            {user && (
              <>
                <span className="user-info">
                  {user.name} ({user.role})
                </span>
                <button type="button" onClick={logout} className="btn-secondary">
                  Logout
                </button>
              </>
            )}
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

