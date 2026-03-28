import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, Settings, Plus, Target, CalendarDays, FolderKanban } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <main className="flex-1 overflow-y-auto app-shell-padding pb-safe-bottom">
        <Outlet />
      </main>

      <button
        onClick={() => navigate('/add')}
        className="fixed right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform fab-bottom"
        aria-label="Agregar transacción"
      >
        <Plus className="w-6 h-6" />
      </button>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          <NavItem to="/" icon={LayoutDashboard} label="Inicio" />
          <NavItem to="/transactions" icon={Receipt} label="Movimientos" />
          <NavItem to="/planning" icon={FolderKanban} label="Plan" />
          <NavItem to="/calendar" icon={CalendarDays} label="Calendario" />
          <NavItem to="/settings" icon={Settings} label="Ajustes" />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
  `flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
    isActive ? 'text-primary' : 'text-muted-foreground'
  }`
}
    >
      <Icon className="w-4.5 h-4.5 shrink-0" />
      <span className="truncate max-w-full">{label}</span>
    </NavLink>
  );
}
