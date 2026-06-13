import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { authService } from '../lib/auth-service';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { 
  LogOut, Loader2, TrendingUp, Users, ShoppingCart, DollarSign, Store,
  LayoutDashboard, MapPin, Package, Box, FileText, ChevronDown, Bell, AlertTriangle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

import MasterDataView from '../components/MasterDataView';
import InventoryView from '../components/InventoryView';
import HistoryView from '../components/HistoryView';
import POSView from '../components/POSView';
import SettingsView from '../components/SettingsView';
import { MENU_ITEMS, STOCK_DATA, MOCK_TRANSACTIONS } from '../constants';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [toko, setToko] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [cabangList, setCabangList] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  
  const [selectedCabang, setSelectedCabang] = useState<string>('all');
  const [activeMenu, setActiveMenu] = useState('dashboard');
  
  const [metrics, setMetrics] = useState({
    pendapatan: 0,
    transaksi: 0,
    rataRata: 0,
    stokKritis: 0
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [cabangPerformance, setCabangPerformance] = useState<any[]>([]);

  // POS Features state
  const [categories, setCategories] = useState([
    { name: 'All', isActive: true }, 
    { name: 'Burgers', isActive: false }, 
    { name: 'Beverages', isActive: false }, 
    { name: 'Sides', isActive: false }
  ]);
  const [payments, setPayments] = useState([
    { name: 'Tunai', isActive: true }, 
    { name: 'QRIS', isActive: true }, 
    { name: 'Debit', isActive: true }
  ]);
  const [menuItemsOld, setMenuItemsOld] = useState(MENU_ITEMS);
  const [inventoryOld, setInventoryOld] = useState(STOCK_DATA);
  const [mockTransactions, setMockTransactions] = useState(MOCK_TRANSACTIONS);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (authenticatedUser) => {
      try {
        let uid = authenticatedUser?.uid;
        if (!uid) uid = localStorage.getItem('ownerUid');

        if (!uid) {
          navigate('/portal-login');
          return;
        }

        const userData = await authService.getUserData(uid);
        if (!userData || userData.role !== 'owner') {
          localStorage.removeItem('ownerUid');
          navigate('/portal-login');
          return;
        }
        setUser(userData);

        if (userData.toko_id) {
          const tokoDoc = await getDoc(doc(db, 'toko', userData.toko_id));
          if (tokoDoc.exists()) {
            setToko(tokoDoc.data());
          }

          // Fetch Cabang
          const qCabang = query(collection(db, 'cabang'), where('toko_id', '==', userData.toko_id));
          const cabangSnap = await getDocs(qCabang);
          const cabangData = cabangSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setCabangList(cabangData);

          // Fetch Transactions
          const qTrans = query(collection(db, 'transaksi'), where('toko_id', '==', userData.toko_id));
          const transSnap = await getDocs(qTrans);
          const transData = transSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setAllTransactions(transData);

          // Fetch Staff (Users)
          const qUsers = query(collection(db, 'users'), where('toko_id', '==', userData.toko_id));
          const usersSnap = await getDocs(qUsers);
          const usersData = usersSnap.docs.map(d => ({id: d.id, ...d.data()}));
          setAllStaff(usersData);
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    // Filter data based on selectedCabang
    let filteredTrans = allTransactions;
    if (selectedCabang !== 'all') {
      filteredTrans = allTransactions.filter(t => t.cabang_id === selectedCabang);
    }

    // Calculate Metrics
    const totalPendapatan = filteredTrans.reduce((sum, t) => sum + (t.total || 0), 0);
    const totalTransaksi = filteredTrans.length;
    const rataRata = totalTransaksi > 0 ? totalPendapatan / totalTransaksi : 0;
    
    // Stok kritis (mocked for now, assumes stok_kritis threshold logic)
    const stokKritisCount = 0; 

    setMetrics({
      pendapatan: totalPendapatan,
      transaksi: totalTransaksi,
      rataRata: rataRata,
      stokKritis: stokKritisCount
    });

    // Chart Data (Mocking last 7 days from transactions if available, otherwise 0)
    // Here we just put a static week format for now.
    setChartData([
      { name: 'Sen', penjualan: 0 },
      { name: 'Sel', penjualan: 0 },
      { name: 'Rab', penjualan: 0 },
      { name: 'Kam', penjualan: 0 },
      { name: 'Jum', penjualan: 0 },
      { name: 'Sab', penjualan: 0 },
      { name: 'Min', penjualan: 0 },
    ]);

    // Cabang Performance Table
    let perfData: any[] = [];
    if (selectedCabang === 'all') {
      perfData = cabangList.map(c => {
        const transCabang = allTransactions.filter(t => t.cabang_id === c.id);
        const omset = transCabang.reduce((sum, t) => sum + (t.total || 0), 0);
        const kasirCount = allStaff.filter(u => u.cabang_id === c.id && u.role === 'kasir').length;
        
        return {
          id: c.id,
          nama: c.nama_cabang || 'Cabang Tanpa Nama',
          lokasi: c.alamat || '-',
          kasir: kasirCount,
          omset: omset
        };
      });
    } else {
      const c = cabangList.find(cb => cb.id === selectedCabang);
      if (c) {
        const kasirCount = allStaff.filter(u => u.cabang_id === c.id && u.role === 'kasir').length;
        perfData = [{
          id: c.id,
          nama: c.nama_cabang || 'Cabang Tanpa Nama',
          lokasi: c.alamat || '-',
          kasir: kasirCount,
          omset: totalPendapatan
        }];
      }
    }
    
    setCabangPerformance(perfData.sort((a, b) => b.omset - a.omset));

  }, [selectedCabang, allTransactions, cabangList, allStaff]);

  const handleLogout = async () => {
    localStorage.removeItem('ownerUid');
    await authService.logout();
    window.location.href = '/portal-login';
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-screen bg-zinc-50">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kasir', label: 'Mesin Kasir (POS)', icon: ShoppingCart },
    { id: 'cabang', label: 'Manajemen Cabang', icon: MapPin },
    { id: 'produk', label: 'Produk & HPP', icon: Package },
    { id: 'stok', label: 'Inventori Stok', icon: Box },
    { id: 'karyawan', label: 'Manajemen Karyawan', icon: Users },
    { id: 'laporan', label: 'Laporan Penjualan', icon: FileText },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-100 font-sans text-zinc-900">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col z-20 shadow-sm">
        <div className="h-16 flex items-center px-6 border-b border-zinc-100">
          <div className="flex items-center gap-2 text-indigo-600">
            <Store className="w-6 h-6" />
            <span className="font-black text-lg tracking-tight uppercase">POS Pro</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-3 mb-3 mt-4">Menu Utama</div>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-zinc-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-zinc-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8 z-10 shadow-sm shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-lg font-black tracking-tight text-zinc-900">{toko?.nama_toko || 'Toko Saya'}</h2>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{user?.name} (Owner)</p>
            </div>
            
            <div className="h-8 w-px bg-zinc-200 hidden md:block"></div>
            
            <div className="relative hidden md:flex items-center">
              <select 
                value={selectedCabang}
                onChange={(e) => setSelectedCabang(e.target.value)}
                className="appearance-none bg-zinc-50 border border-zinc-200 text-zinc-700 text-sm font-bold rounded-lg pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              >
                <option value="all">Semua Cabang</option>
                {cabangList.map(c => (
                  <option key={c.id} value={c.id}>{c.nama_cabang}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 pointer-events-none" />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-zinc-400 hover:text-zinc-600 transition-colors">
              <Bell className="w-5 h-5" />
              {metrics.stokKritis > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              )}
            </button>
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black pr-0.5 shadow-sm border border-indigo-200">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-8">
          
          {activeMenu === 'dashboard' ? (
            <div className="max-w-6xl mx-auto space-y-6">
              
              <div className="md:hidden mb-4">
                <select 
                  value={selectedCabang}
                  onChange={(e) => setSelectedCabang(e.target.value)}
                  className="w-full appearance-none bg-white border border-zinc-200 text-zinc-700 text-sm font-bold rounded-lg pl-4 pr-10 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-indigo-300 transition-all"
                >
                  <option value="all">💳 Filter: Semua Cabang</option>
                  {cabangList.map(c => (
                    <option key={c.id} value={c.id}>📍 {c.nama_cabang}</option>
                  ))}
                </select>
              </div>

              {/* 4 Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-all border border-zinc-200 flex flex-col justify-between group cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">Total Pendapatan</span>
                    <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-zinc-900 tracking-tight">{formatRupiah(metrics.pendapatan)}</p>
                    <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase tracking-widest flex items-center gap-1">Hari Ini</p>
                  </div>
                </div>
                
                <div className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-all border border-zinc-200 flex flex-col justify-between group cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Total Transaksi</span>
                    <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-zinc-900 tracking-tight">{metrics.transaksi}</p>
                    <p className="text-[10px] font-bold text-indigo-500 mt-1 uppercase tracking-widest flex items-center gap-1">Hari Ini</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-all border border-zinc-200 flex flex-col justify-between group cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest group-hover:text-amber-600 transition-colors">Rata-rata Nilai</span>
                    <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-zinc-900 tracking-tight">{formatRupiah(metrics.rataRata)}</p>
                    <p className="text-[10px] font-bold text-amber-500 mt-1 uppercase tracking-widest flex items-center gap-1">Per Transaksi</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-all border border-zinc-200 flex flex-col justify-between group cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest group-hover:text-red-600 transition-colors">Stok Kritis</span>
                    <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-zinc-900 tracking-tight">{metrics.stokKritis}</p>
                    <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-widest flex items-center gap-1">Item Perlu Restock</p>
                  </div>
                </div>
              </div>

              {/* Chart and Table Layer */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 lg:col-span-2">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-500" /> Tren Mingguan
                    </h3>
                  </div>
                  <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717A', fontWeight: 'bold' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717A', fontWeight: 'bold' }} tickFormatter={(value) => value === 0 ? '0' : `${value / 1000}k`} />
                        <RechartsTooltip cursor={{ fill: '#F4F4F5' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                        <Bar dataKey="penjualan" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Branch Performance Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-zinc-100 bg-white sticky top-0">
                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-indigo-500" /> Performa Cabang
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-0">
                    {cabangPerformance.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                        <Store className="w-8 h-8 text-zinc-300 mb-2" />
                        <p className="text-sm font-bold text-zinc-500">Belum ada cabang</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-100">
                        {cabangPerformance.map((c, i) => (
                          <div key={c.id} className="p-4 hover:bg-zinc-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-sm font-bold text-zinc-900">{c.nama}</p>
                                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 line-clamp-1">{c.lokasi}</p>
                              </div>
                              <span className="text-[10px] mt-0.5 font-bold uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                                #{i + 1}
                              </span>
                            </div>
                            <div className="flex justify-between items-end mt-3">
                              <div className="flex items-center gap-1.5 text-zinc-500">
                                <Users className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{c.kasir} Kasir</span>
                              </div>
                              <p className="text-sm font-black text-zinc-900">{formatRupiah(c.omset)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : activeMenu === 'produk' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden h-full">
              <MasterDataView 
                categories={categories}
                payments={payments}
                menuItems={menuItemsOld}
                inventory={inventoryOld}
                onToggleCategory={(name) => setCategories(c => c.map(cat => cat.name === name ? { ...cat, isActive: !cat.isActive } : cat))}
                onTogglePayment={(name) => setPayments(p => p.map(pay => pay.name === name ? { ...pay, isActive: !pay.isActive } : pay))}
                onAddMenuItem={(item) => setMenuItemsOld(m => [...m, { ...item, id: Date.now().toString() }])}
                onUpdateMenuItem={(id, item) => setMenuItemsOld(m => m.map(mi => mi.id === id ? { ...mi, ...item } : mi))}
                onDeleteMenuItem={(id) => setMenuItemsOld(m => m.filter(mi => mi.id !== id))}
                onAddCategory={(name, isActive) => setCategories(c => [...c, { name, isActive: !!isActive }])}
                onDeleteCategory={(name) => setCategories(c => c.filter(cat => cat.name !== name))}
                onAddPayment={(name, isActive) => setPayments(p => [...p, { name, isActive: !!isActive }])}
                onDeletePayment={(name) => setPayments(p => p.filter(pay => pay.name !== name))}
              />
            </div>
          ) : activeMenu === 'stok' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden h-full">
              <InventoryView 
                inventory={inventoryOld}
                onSetInventory={setInventoryOld}
                onToggleInventoryItem={(name) => setInventoryOld(i => i.map(item => item.name === name ? { ...item, isActive: !item.isActive } : item))}
              />
            </div>
          ) : activeMenu === 'laporan' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden h-full">
              <HistoryView 
                transactions={mockTransactions}
                onUpdateTransactions={setMockTransactions}
                onDeleteTransaction={(id) => setMockTransactions(t => t.filter(tr => tr.id !== id))}
                role="owner"
              />
            </div>
          ) : activeMenu === 'kasir' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden h-full">
              <POSView 
                categories={categories.filter(c => c.isActive !== false).map(c => c.name)}
                payments={payments.filter(p => p.isActive !== false).map(p => p.name as any)}
                menuItems={menuItemsOld}
                inventory={inventoryOld}
                onUpdateInventory={setInventoryOld}
                onCheckout={(transaction) => setMockTransactions(t => [transaction, ...t])}
                transactions={mockTransactions}
                role="ADMIN"
                businessName={toko?.nama_toko || 'Toko Saya'}
              />
            </div>
          ) : activeMenu === 'karyawan' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden h-full">
              <SettingsView 
                users={allStaff}
                onAddUser={() => {}}
                onDeleteUser={() => {}}
                onUpdateUser={() => {}}
                businessName={toko?.nama_toko || 'Toko Saya'}
                businessLogo=""
                onUpdateBusinessSettings={() => {}}
              />
            </div>
          ) : (
            <div className="max-w-6xl mx-auto bg-white p-12 rounded-2xl shadow-sm border border-zinc-200 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                <LayoutDashboard className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-zinc-900 mb-2">Modul Sedang Dikembangkan</h2>
              <p className="text-sm font-bold text-zinc-500">Anda sedang mengakses halaman <span className="uppercase text-indigo-500">{activeMenu}</span>. Fitur ini akan segera tersedia pada pembaruan berikutnya.</p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

