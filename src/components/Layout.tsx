import { NavLink, Outlet } from 'react-router-dom';

const icons = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  box: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5m0 0 9-5m-9 5v8" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2z" />
    </svg>
  ),
};

export default function Layout() {
  return (
    <div className="app">
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          {icons.home}
          Início
        </NavLink>
        <NavLink to="/novo" className={({ isActive }) => (isActive ? 'active' : '')}>
          {icons.plus}
          Novo
        </NavLink>
        <NavLink to="/catalogo" className={({ isActive }) => (isActive ? 'active' : '')}>
          {icons.box}
          Catálogo
        </NavLink>
        <NavLink to="/config" className={({ isActive }) => (isActive ? 'active' : '')}>
          {icons.gear}
          Ajustes
        </NavLink>
      </nav>
    </div>
  );
}
