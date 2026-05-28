import { LayoutDashboard, ShoppingCart, History, Database, Package, Settings, LogOut, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { UserRole } from '../types';

interface SidebarProps {
  activeView: 'pos' | 'dashboard' | 'history' | 'inventory' | 'master' | 'settings';
  onViewChange: (view: 'pos' | 'dashboard' | 'history' | 'inventory' | 'master' | 'settings') => void;
  role: UserRole;
  userName?: string | null;
  onLogout: () => void;
  businessName: string;
  businessLogo: string;
}

export default function Sidebar({ activeView, onViewChange, role, userName, onLogout, businessName, businessLogo }: SidebarProps) {
  const allMenuItems = [
    { id: 'pos', icon: ShoppingCart, label: 'Kasir', roles: ['ADMIN', 'CASHIER'] },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Analitik', roles: ['ADMIN', 'CASHIER'] },
    { id: 'history', icon: History, label: 'Riwayat', roles: ['ADMIN', 'CASHIER'] },
    { id: 'inventory', icon: Package, label: 'Bahan Baku', roles: ['ADMIN'] },
    { id: 'master', icon: Database, label: 'Master Data', roles: ['ADMIN'] },
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(role));

  return (
    <div className="w-64 border-r border-soft-cream/10 flex flex-col h-screen bg-charcoal">
      <div className="p-6 flex flex-col gap-1">
        <div className="flex items-center gap-3 mb-4 select-none">
          <div className="w-10 h-10 bg-amber rounded-xl flex items-center justify-center overflow-hidden shrink-0">
            {businessLogo && (businessLogo.length > 3 || businessLogo.includes('.') || businessLogo.includes('/') || businessLogo.startsWith('data:')) ? (
              <img src={businessLogo} alt="Logo" className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-charcoal font-black text-xl italic uppercase font-mono">{businessLogo || 'B'}</span>
            )}
          </div>
          <span className="text-xl font-bold tracking-tight truncate flex-1" title={businessName}>{businessName || 'BurgerPOS'}</span>
        </div>
        
        <div className="flex items-center gap-3 px-2 py-3 bg-soft-cream/5 rounded-2xl border border-soft-cream/10">
          <div className="w-8 h-8 rounded-full bg-charcoal border border-amber/30 flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-amber" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold truncate">{userName || 'User'}</p>
            <p className="text-[10px] font-black text-amber uppercase tracking-widest">{role}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onViewChange(item.id as any);
            }}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative",
              activeView === item.id 
                ? "bg-amber text-charcoal font-bold" 
                : "text-soft-cream/60 hover:bg-soft-cream/5 hover:text-soft-cream"
            )}
          >
            <item.icon className={cn("w-6 h-6", activeView === item.id ? "text-charcoal" : "group-hover:scale-110 transition-transform")} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-soft-cream/10 space-y-2">
        {role === 'ADMIN' && (
          <button 
            onClick={() => onViewChange('settings')}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group",
              activeView === 'settings' 
                ? "bg-amber text-charcoal font-bold" 
                : "text-soft-cream/60 hover:bg-soft-cream/5 hover:text-soft-cream"
            )}
          >
            <Settings className={cn("w-6 h-6", activeView === 'settings' ? "" : "group-hover:rotate-45 transition-transform")} />
            <span className="font-medium">Pengaturan</span>
          </button>
        )}
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-soft-red/60 hover:bg-soft-red/10 hover:text-soft-red transition-all group"
        >
          <LogOut className="w-6 h-6" />
          <span className="font-medium">Keluar</span>
        </button>
      </div>
    </div>
  );
}
