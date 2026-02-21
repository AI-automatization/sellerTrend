import { Outlet, NavLink, useNavigate } from 'react-router-dom';

export function Layout() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('access_token');
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="font-bold text-lg">Uzum Trend</h1>
          <p className="text-slate-400 text-xs">Analytics SaaS</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `block px-3 py-2 rounded text-sm ${isActive ? 'bg-blue-600' : 'hover:bg-slate-800'}`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/analyze"
            className={({ isActive }) =>
              `block px-3 py-2 rounded text-sm ${isActive ? 'bg-blue-600' : 'hover:bg-slate-800'}`
            }
          >
            URL Analyze
          </NavLink>
        </nav>
        <div className="p-3">
          <button
            onClick={logout}
            className="w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded text-left"
          >
            Chiqish
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
