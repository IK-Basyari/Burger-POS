import { useState, useEffect, FormEvent } from 'react';
import Sidebar from './components/Sidebar';
import POSView from './components/POSView';
import DashboardView from './components/DashboardView';
import HistoryView from './components/HistoryView';
import InventoryView from './components/InventoryView';
import MasterDataView from './components/MasterDataView';
import SettingsView from './components/SettingsView';
import { motion, AnimatePresence } from 'motion/react';
import { MENU_ITEMS, STOCK_DATA, MOCK_TRANSACTIONS } from './constants';
import { MenuItem, StockItem, Transaction, UserRole, AppUser } from './types';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut, signInAnonymously, User } from 'firebase/auth';
import { dbService } from './services/dbService';
import { LayoutGrid, LogIn, Shield, Users, User as UserIcon, Lock, ChevronRight } from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<'pos' | 'dashboard' | 'history' | 'inventory' | 'master' | 'settings'>('pos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Custom Session State
  const [session, setSession] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('pos_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [fbUser, setFbUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [loginFormData, setLoginFormData] = useState({ username: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Global Configuration State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<{id?: string, name: string, isActive: boolean}[]>([]);
  const [payments, setPayments] = useState<{id?: string, name: string, isActive: boolean}[]>([]);
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [businessSettings, setBusinessSettings] = useState<{ name: string, logo: string }>({ name: 'BurgerPOS', logo: 'B' });

  // Real-time synchronization for Business Name & Logo settings
  useEffect(() => {
    const unsubBusiness = dbService.listenBusinessSettings((settings) => {
      setBusinessSettings(settings);
    });
    return () => unsubBusiness();
  }, []);

  // One-time deletion of existing default menu items
  useEffect(() => {
    const hasCleared = localStorage.getItem('pos_menus_cleared_v1');
    if (!hasCleared) {
      const clearAllMenus = async () => {
        try {
          const items = await dbService.getMenuItems();
          if (items && items.length > 0) {
            for (const item of items) {
              if (item.id) {
                await dbService.deleteMenuItem(item.id);
              }
            }
          }
          localStorage.setItem('pos_menus_cleared_v1', 'true');
        } catch (err) {
          console.error('Error clearing menus:', err);
        }
      };
      clearAllMenus();
    }
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setFbUser(u);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Data Sync Listeners
  useEffect(() => {
    // We allow listening even without fbUser because we use custom login + relaxed rules
    const unsubUsers = dbService.listenUsers((dbUsers) => {
      if (dbUsers.length > 0) setUsers(dbUsers as AppUser[]);
      else {
        // Seed default admin if no users exist
        dbService.addUser({
          username: 'admin',
          password: 'password123',
          displayName: 'Administrator',
          role: 'ADMIN'
        });
      }
    });

    if (!session) return () => unsubUsers();

    const unsubMenu = dbService.listenMenuItems((items) => {
      if (items.length > 0) {
        setMenuItems(items);
      } else {
        const initialMenu = MENU_ITEMS.map(item => ({
          ...item,
          isActive: true
        }));
        initialMenu.forEach(item => {
          dbService.addMenuItem(item);
        });
      }
    });

    const unsubCats = dbService.listenCategories((cats) => {
      if (cats.length > 0) setCategories(cats);
      else {
        const initialCats = [
          { name: 'Burgers', isActive: true },
          { name: 'Beverages', isActive: true },
          { name: 'Sides', isActive: true }
        ];
        dbService.setCategories(initialCats);
      }
    });

    const unsubTrans = dbService.listenTransactions((trs) => {
      if (trs.length > 0) {
        setTransactions(trs);
      } else {
        MOCK_TRANSACTIONS.forEach(tr => dbService.addTransaction(tr));
      }
    });

    const unsubInv = dbService.listenInventory((items) => {
      if (items.length > 0) setInventory(items);
      else {
        dbService.updateInventory(STOCK_DATA.map(i => ({ ...i, isActive: true })));
      }
    });

    const unsubPay = dbService.listenPayments((pays) => {
      if (pays.length > 0) setPayments(pays);
      else {
        const initialPayments = [
          { name: 'Tunai', isActive: true },
          { name: 'QRIS', isActive: true },
          { name: 'Debit', isActive: true },
          { name: 'Ojol', isActive: true }
        ];
        dbService.setPayments(initialPayments);
      }
    });

    return () => {
      unsubUsers();
      unsubMenu();
      unsubCats();
      unsubTrans();
      unsubInv();
      unsubPay();
    };
  }, [session]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const allUsers = await dbService.getUsers();
      const foundUser = allUsers.find(u => u.username === loginFormData.username && u.password === loginFormData.password);

      if (foundUser) {
        setSession(foundUser);
        localStorage.setItem('pos_session', JSON.stringify(foundUser));
      } else {
        setLoginError('Username atau password salah.');
      }
    } catch (e) {
      setLoginError('Terjadi kesalahan koneksi.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('pos_session');
    signOut(auth); // Also sign out from firebase if any
    setActiveView('pos');
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const addTransaction = (transaction: Transaction) => {
    dbService.addTransaction(transaction);
  };

  const updateTransactions = (newTransactions: Transaction[]) => {
    // Handle Additions (if any)
    if (newTransactions.length > transactions.length) {
      const added = newTransactions.find(t => !transactions.find(ot => ot.id === t.id));
      if (added) dbService.addTransaction(added);
      return;
    }

    // Handle Updates
    newTransactions.forEach(newTr => {
      const oldTr = transactions.find(t => t.id === newTr.id);
      if (oldTr && JSON.stringify(oldTr) !== JSON.stringify(newTr)) {
        dbService.updateTransaction(newTr.id, newTr);
      }
    });
  };

  const toggleCategory = (name: string) => {
    const cat = categories.find(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (cat) {
      const id = cat.id || name.trim().toLowerCase().replace(/\s+/g, '-');
      const currentActive = cat.isActive !== false;
      dbService.updateCategory(id, { isActive: !currentActive });
    }
  };

  const togglePayment = (name: string) => {
    const pay = payments.find(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (pay) {
      const id = pay.id || name.trim().toLowerCase().replace(/\s+/g, '-');
      const currentActive = pay.isActive !== false;
      dbService.updatePayment(id, { isActive: !currentActive });
    }
  };

  const addMenuItem = (item: Omit<MenuItem, 'id'>) => {
    dbService.addMenuItem(item);
  };

  const updateMenuItem = (id: string, item: Partial<MenuItem>) => {
    dbService.updateMenuItem(id, item);
  };

  const deleteMenuItem = (id: string) => {
    dbService.deleteMenuItem(id);
  };

  const addCategory = (name: string, isActive: boolean = true) => {
    const filtered = categories.filter(c => c.name.trim().toLowerCase() !== name.trim().toLowerCase());
    const newCats = [...filtered, { name, isActive }];
    dbService.setCategories(newCats);
  };

  const addPayment = (name: string, isActive: boolean = true) => {
    const filtered = payments.filter(p => p.name.trim().toLowerCase() !== name.trim().toLowerCase());
    const newPayments = [...filtered, { name, isActive }];
    dbService.setPayments(newPayments);
  };

  const deleteCategory = (name: string) => {
    dbService.deleteCategory(name);
  };

  const deletePayment = (name: string) => {
    dbService.deletePayment(name);
  };

  const addUser = (userData: Omit<AppUser, 'id'>) => {
    dbService.addUser(userData);
  };

  const deleteUser = (id: string) => {
    dbService.deleteUser(id);
  };

  const updateUser = (id: string, userData: Partial<AppUser>) => {
    dbService.updateUser(id, userData);
    if (session && session.id === id) {
      const updatedSession = { ...session, ...userData };
      setSession(updatedSession);
      localStorage.setItem('pos_session', JSON.stringify(updatedSession));
    }
  };

  const setInventoryAndSync = (newInv: StockItem[]) => {
    dbService.updateInventory(newInv);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light-mode');
    }
  }, []);

  const renderView = () => {
    if (loading) return (
      <div className="flex-1 flex items-center justify-center bg-charcoal">
        <div className="w-12 h-12 border-4 border-amber border-t-transparent rounded-full animate-spin" />
      </div>
    );

    if (!session) return (
      <div className="flex-1 flex flex-col md:flex-row bg-charcoal overflow-hidden">
        {/* Left Side: Branding */}
        <div className="hidden md:flex flex-1 flex-col justify-center p-20 relative overflow-hidden bg-amber">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-30 scale-110" />
          <div className="relative z-10 select-none">
            <div className="w-20 h-20 bg-charcoal rounded-3xl flex items-center justify-center mb-8 shadow-2xl overflow-hidden shrink-0 border border-charcoal/10">
              {businessSettings.logo && (businessSettings.logo.length > 3 || businessSettings.logo.includes('.') || businessSettings.logo.includes('/') || businessSettings.logo.startsWith('data:')) ? (
                <img src={businessSettings.logo} alt="Logo" className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-amber font-black text-4xl italic uppercase font-mono">{businessSettings.logo || 'B'}</span>
              )}
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-charcoal tracking-tight leading-none mb-6 uppercase break-words max-w-[500px]">
              {businessSettings.name || 'BURGERPOS'}
            </h1>
            <p className="text-charcoal/80 text-lg font-medium max-w-lg leading-relaxed mt-2">
              Solusi manajemen kasir modern untuk pertumbuhan bisnis {businessSettings.name || 'Anda'} yang lebih cepat.
            </p>
          </div>
          <div className="absolute bottom-10 left-20">
            <div className="flex gap-10">
              <div>
                <p className="text-charcoal font-black text-4xl">100%</p>
                <p className="text-charcoal/60 text-sm font-bold uppercase tracking-widest">Aman & Terpercaya</p>
              </div>
              <div>
                <p className="text-charcoal font-black text-4xl">24/7</p>
                <p className="text-charcoal/60 text-sm font-bold uppercase tracking-widest">Dukungan Sistem</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="flex-1 flex flex-col justify-center p-8 md:p-24 bg-charcoal relative">
          <div className="max-w-md w-full mx-auto space-y-12">
            <div>
              <h2 className="text-4xl font-black text-white mb-2">Selamat Datang</h2>
              <p className="text-soft-cream/40 font-medium">Masuk untuk mengelola restoran hari ini</p>
              {users.length === 1 && users[0].username === 'admin' && (
                <div className="mt-4 p-3 bg-amber/10 border border-amber/20 rounded-xl text-[10px] font-bold text-amber uppercase tracking-wider">
                  Info: Gunakan admin / password123 jika ini login pertama Anda.
                </div>
              )}
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-soft-cream/40 uppercase tracking-widest pl-1 flex items-center gap-2">
                    <UserIcon className="w-3 h-3" />
                    Username
                  </label>
                  <input 
                    type="text" 
                    value={loginFormData.username}
                    onChange={(e) => setLoginFormData({...loginFormData, username: e.target.value.toLowerCase()})}
                    className="w-full bg-soft-cream/5 border border-soft-cream/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-amber transition-all text-lg placeholder:text-soft-cream/10"
                    placeholder="Masukkan username"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-soft-cream/40 uppercase tracking-widest pl-1 flex items-center gap-2">
                    <Lock className="w-3 h-3" />
                    Password
                  </label>
                  <input 
                    type="password" 
                    value={loginFormData.password}
                    onChange={(e) => setLoginFormData({...loginFormData, password: e.target.value})}
                    className="w-full bg-soft-cream/5 border border-soft-cream/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-amber transition-all text-lg font-mono placeholder:text-soft-cream/10"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-soft-red/10 border border-soft-red/20 rounded-2xl text-soft-red text-sm font-bold flex items-center gap-3"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-soft-red animate-pulse" />
                  {loginError}
                </motion.div>
              )}

              <button 
                type="submit"
                disabled={isLoggingIn}
                className="w-full group bg-amber text-charcoal py-5 rounded-2xl font-black text-xl shadow-2xl shadow-amber/20 hover:scale-[1.02] active:scale-95 transition-all overflow-hidden relative flex items-center justify-center gap-3"
              >
                {isLoggingIn ? (
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 border-3 border-charcoal border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    MASUK SEKARANG
                    <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-10 border-t border-soft-cream/5 text-center">
              <p className="text-soft-cream/20 text-xs font-bold uppercase tracking-[0.2em]">Sistem Point of Sales v1.0</p>
            </div>
          </div>
        </div>
      </div>
    );

    switch (activeView) {
      case 'pos':
        return (
          <POSView 
            onToggleSidebar={toggleSidebar} 
            categories={categories.filter(c => c.isActive !== false).map(c => c.name)}
            payments={payments.filter(p => p.isActive !== false).map(p => p.name as any)}
            menuItems={menuItems.filter(item => {
              const isItemActive = item.isActive !== false;
              const cat = categories.find(c => (c.name || '').trim().toLowerCase() === (item.category || '').trim().toLowerCase());
              const isCategoryActive = cat ? cat.isActive !== false : true;
              
              // Hide menu items if any required ingredient is deactivated in inventory
              let areIngredientsActive = true;
              if (item.ingredients && item.ingredients.length > 0) {
                for (const ing of item.ingredients) {
                  const stock = inventory.find(i => 
                    i.name.trim().toLowerCase() === ing.stockItemId.trim().toLowerCase() || 
                    (i.id && i.id.trim().toLowerCase() === ing.stockItemId.trim().toLowerCase())
                  );
                  if (stock && stock.isActive === false) {
                    areIngredientsActive = false;
                    break;
                  }
                }
              }
              return isItemActive && isCategoryActive && areIngredientsActive;
            })}
            onCheckout={addTransaction}
            inventory={inventory}
            onUpdateInventory={setInventoryAndSync}
            role={session?.role}
            businessName={businessSettings.name}
            businessLogo={businessSettings.logo}
            cashierName={session?.displayName || session?.username || 'Kasir'}
          />
        );
      case 'dashboard':
        return (
          <DashboardView 
            onToggleSidebar={toggleSidebar} 
            transactions={transactions}
            menuItems={menuItems}
            inventory={inventory}
            role={session?.role}
          />
        );
      case 'history':
        return (
          <HistoryView 
            onToggleSidebar={toggleSidebar} 
            transactions={transactions}
            onUpdateTransactions={updateTransactions}
            onDeleteTransaction={(id) => dbService.deleteTransaction(id)}
            role={session?.role}
          />
        );
      case 'inventory':
        if (session?.role !== 'ADMIN') {
          setActiveView('pos');
          return null;
        }
        return (
          <InventoryView 
            onToggleSidebar={toggleSidebar} 
            inventory={inventory}
            onSetInventory={setInventoryAndSync}
            onToggleInventoryItem={(name) => {
              const newInv = inventory.map(item => item.name.trim().toLowerCase() === name.trim().toLowerCase() 
                ? { ...item, isActive: !(item.isActive !== false) } 
                : item
              );
              setInventoryAndSync(newInv);
            }}
          />
        );
      case 'master':
        if (session?.role !== 'ADMIN') {
          setActiveView('pos');
          return null;
        }
        return (
          <MasterDataView 
            onToggleSidebar={toggleSidebar} 
            categories={categories}
            payments={payments}
            menuItems={menuItems}
            inventory={inventory}
            onToggleCategory={toggleCategory}
            onTogglePayment={togglePayment}
            onAddMenuItem={addMenuItem}
            onUpdateMenuItem={updateMenuItem}
            onDeleteMenuItem={deleteMenuItem}
            onAddCategory={addCategory}
            onDeleteCategory={deleteCategory}
            onAddPayment={addPayment}
            onDeletePayment={deletePayment}
          />
        );
      case 'settings':
        if (session?.role !== 'ADMIN') {
          setActiveView('pos');
          return null;
        }
        return (
          <SettingsView 
            onToggleSidebar={toggleSidebar} 
            users={users}
            onAddUser={addUser}
            onDeleteUser={deleteUser}
            onUpdateUser={updateUser}
            businessName={businessSettings.name}
            businessLogo={businessSettings.logo}
            onPreviewBusinessSettings={(settings) => {
              setBusinessSettings(settings);
            }}
            onUpdateBusinessSettings={async (settings) => {
              setBusinessSettings(settings);
              try {
                await dbService.updateBusinessSettings(settings);
              } catch (err) {
                console.error("Failed to update business settings in database:", err);
              }
            }}
          />
        );
      default:
        return (
          <POSView 
            onToggleSidebar={toggleSidebar} 
            categories={categories.filter(c => c.isActive !== false).map(c => c.name)}
            payments={payments.filter(p => p.isActive !== false).map(p => p.name as any)}
            menuItems={menuItems.filter(item => {
              const isItemActive = item.isActive !== false;
              const cat = categories.find(c => (c.name || '').trim().toLowerCase() === (item.category || '').trim().toLowerCase());
              const isCategoryActive = cat ? cat.isActive !== false : true;
              
              // Hide menu items if any required ingredient is deactivated in inventory
              let areIngredientsActive = true;
              if (item.ingredients && item.ingredients.length > 0) {
                for (const ing of item.ingredients) {
                  const stock = inventory.find(i => 
                    i.name.trim().toLowerCase() === ing.stockItemId.trim().toLowerCase() || 
                    (i.id && i.id.trim().toLowerCase() === ing.stockItemId.trim().toLowerCase())
                  );
                  if (stock && stock.isActive === false) {
                    areIngredientsActive = false;
                    break;
                  }
                }
              }
              return isItemActive && isCategoryActive && areIngredientsActive;
            })}
            onCheckout={addTransaction}
            inventory={inventory}
            onUpdateInventory={setInventoryAndSync}
            role={session?.role}
            businessName={businessSettings.name}
            businessLogo={businessSettings.logo}
            cashierName={session?.displayName || session?.username || 'Kasir'}
          />
        );
    }
  };

  return (
    <div className="flex h-screen w-screen bg-charcoal overflow-hidden select-none relative">
      <AnimatePresence>
        {(isSidebarOpen && session) && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-40"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 shadow-2xl"
            >
              <Sidebar 
                activeView={activeView as any} 
                role={session.role}
                userName={session.displayName || session.username}
                onLogout={handleLogout}
                businessName={businessSettings.name}
                businessLogo={businessSettings.logo}
                onViewChange={(view) => {
                  setActiveView(view);
                  setIsSidebarOpen(false);
                }} 
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      <main className="flex-1 flex flex-col min-w-0 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex overflow-hidden"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
