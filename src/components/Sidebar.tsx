import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '../lib/api';
import { 
  LayoutDashboard, 
  ReceiptText, 
  PieChart as BudgetIcon, 
  Sparkles, 
  LogOut,
  ChevronRight
} from 'lucide-react';
import { cn } from './ui';

export function Sidebar() {
  const logout = useAppStore(state => state.logout);
  const user = useAppStore(state => state.user);

  const menuItems = [
    { label: 'Panel de Control', icon: LayoutDashboard, path: '/' },
    { label: 'Transacciones', icon: ReceiptText, path: '/transacciones' },
    { label: 'Presupuestos', icon: BudgetIcon, path: '/presupuestos' },
    { label: 'Perspectivas IA', icon: Sparkles, path: '/perspectivas' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col sticky top-0">
      <div className="p-6 border-bottom border-gray-100 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">FS</span>
          </div>
          <span className="font-bold text-lg tracking-tight">FinSight</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
              isActive 
                ? "bg-black text-white shadow-md shadow-black/10" 
                : "text-gray-500 hover:bg-gray-50 hover:text-black"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-gray-400 group-hover:text-black")} />
                {item.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-4 mb-2">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">
            <span className="text-gray-600 font-bold uppercase text-xs">
              {user?.nombre?.[0]}
            </span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold truncate">{user?.nombre}</span>
            <span className="text-xs text-gray-500 truncate">{user?.correo}</span>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

