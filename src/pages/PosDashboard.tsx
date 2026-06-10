import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { authService } from '../lib/auth-service';
import { dbService } from '../services/dbService';
import { LogOut, Calendar, ShoppingCart, Loader2, List, Trash2, TrendingUp, Users, UserPlus } from 'lucide-react';
import { Transaksi } from '../schema';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function PosDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // View State
  const [activeTab, setActiveTab] = useState<'checkout' | 'history' | 'employees'>('checkout');

  // Form State
  const [amount, setAmount] = useState('');
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [businessDate, setBusinessDate] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString('en-CA');
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History State
  const [transactions, setTransactions] = useState<Transaksi[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Employee Form State
  const [empUsername, setEmpUsername] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empName, setEmpName] = useState('');
  const [isEmpSubmitting, setIsEmpSubmitting] = useState(false);
  const [empMessage, setEmpMessage] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        navigate('/pos-login');
        return;
      }
      const data = await authService.getUserData(currentUser.uid);
      if (!data) {
        navigate('/pos-login');
        return;
      }
      setUser(data);
      setLoading(false);
    };
    fetchUser();
  }, [navigate]);

  useEffect(() => {
    if (!user || activeTab !== 'history') return;
    
    setHistoryLoading(true);
    // Limit to 7 days if user is kasir
    const limitDays = user.role === 'kasir' ? 7 : undefined;

    const unsub = dbService.listenTransaksi(user.cabang_id || 'default_cabang_id', limitDays, (trs) => {
      setTransactions(trs);
      setHistoryLoading(false);
    });

    return () => unsub();
  }, [user, activeTab]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!amount || isNaN(Number(amount))) {
      alert("Masukkan total bayar yang valid");
      return;
    }

    setIsSubmitting(true);
    try {
      await dbService.addTransaksi({
        cabang_id: user.cabang_id || 'default_cabang_id',
        kasir_id: user.uid,
        role_eksekutor: user.role,
        total_bayar: Number(amount),
        business_date: businessDate,
        status_transaksi: 'success'
      });
      alert('Transaksi berhasil disimpan!');
      setAmount('');
    } catch (e: any) {
      alert('Gagal menyimpan transaksi: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSoftDelete = async (id: string) => {
    if (!user) return;
    if (window.confirm('Yakin ingin menghapus transaksi ini? Data tidak akan benar-benar hilang melainkan ditandai sebagai dihapus (Soft Delete).')) {
      try {
        await dbService.softDeleteTransaksi(id, user.uid);
      } catch (err: any) {
        alert('Gagal menghapus: ' + err.message);
      }
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsEmpSubmitting(true);
    setEmpMessage('');
    
    try {
      await authService.registerKasir(user.uid, empUsername, empPassword, empName);
      setEmpMessage('Berhasil mendaftarkan Kasir baru!');
      setEmpUsername('');
      setEmpPassword('');
      setEmpName('');
    } catch (err: any) {
      setEmpMessage('Gagal: ' + err.message);
    } finally {
      setIsEmpSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/pos-login');
  };

  const chartData = useMemo(() => {
    if (!transactions.length) return [];
    
    // Group only successful transactions by business_date
    const grouped = transactions.reduce((acc, tr) => {
      if (tr.status_transaksi === 'success') {
        acc[tr.business_date] = (acc[tr.business_date] || 0) + tr.total_bayar;
      }
      return acc;
    }, {} as Record<string, number>);

    // Sort dates
    const dates = Object.keys(grouped).sort();
    return dates.map(date => ({
       date,
       total: grouped[date]
    }));
  }, [transactions]);

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center overflow-hidden min-h-screen bg-zinc-50">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const isKasir = user?.role === 'kasir';
  const isLeader = user?.role === 'leader';

  return (
    <div className="min-h-screen bg-zinc-50 font-sans flex flex-col">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">POS Dashboard</h1>
          <p className="text-sm font-medium text-zinc-500">
            {user?.name} <span className="uppercase text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 ml-2">{user?.role}</span>
          </p>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-zinc-400 hover:text-red-500 transition-colors rounded-xl bg-zinc-50 hover:bg-red-50 border border-zinc-200 hover:border-red-100 flex items-center gap-2 text-sm font-bold"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </header>

      <div className="max-w-4xl mx-auto w-full px-6 pt-6">
        <div className="flex bg-zinc-200/50 p-1 rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab('checkout')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'checkout' ? 'bg-white shadow-sm text-zinc-900 border border-zinc-200/50' : 'text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-700'}`}
          >
            <ShoppingCart className="w-4 h-4" /> Checkout
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-zinc-900 border border-zinc-200/50' : 'text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-700'}`}
          >
            <List className="w-4 h-4" /> Riwayat {isKasir && '(7 Hari)'}
          </button>
          {isLeader && (
            <button
              onClick={() => setActiveTab('employees')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'employees' ? 'bg-white shadow-sm text-zinc-900 border border-zinc-200/50' : 'text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-700'}`}
            >
              <Users className="w-4 h-4" /> Karyawan
            </button>
          )}
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-6 w-full flex-1">
        {activeTab === 'checkout' ? (
          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Checkout Transaksi</h2>
                <p className="text-sm text-zinc-500 font-medium">Input total dan simpan ke buku kas</p>
              </div>
            </div>

            <form onSubmit={handleCheckout} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-6 h-6 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-500">Rp</span> 
                  Total Bayar
                </label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-6 py-4 text-2xl font-bold text-zinc-900 focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="0"
                  required
                />
              </div>

              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 space-y-4">
                <div className="flex justify-between items-start flex-col sm:flex-row sm:items-center gap-2">
                   <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                     <Calendar className="w-4 h-4" /> 
                     Business Date (Buku Kas)
                   </label>
                   
                   {!isKasir && (
                     <label className="flex items-center gap-2 cursor-pointer">
                       <input 
                         type="checkbox" 
                         checked={useCustomDate} 
                         onChange={(e) => setUseCustomDate(e.target.checked)} 
                         className="w-4 h-4 text-amber-500 rounded border-zinc-300 focus:ring-amber-500"
                       />
                       <span className="text-xs font-bold text-zinc-600">Sesuaikan Tanggal Manual</span>
                     </label>
                   )}
                </div>

                <input 
                  type="date" 
                  value={businessDate}
                  onChange={(e) => setBusinessDate(e.target.value)}
                  readOnly={!useCustomDate || isKasir}
                  className={`w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-amber-500 transition-colors ${(!useCustomDate || isKasir) ? 'bg-zinc-100 text-zinc-500 cursor-not-allowed' : 'bg-white text-zinc-900'}`}
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-amber-500 text-white py-4 rounded-2xl font-bold tracking-wide shadow-lg shadow-amber-500/20 hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'SUBMIT PUSAT'}
              </button>
            </form>
          </div>
        ) : activeTab === 'history' ? (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
               <div className="flex items-center gap-3 mb-6">
                 <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
                   <TrendingUp className="w-6 h-6" />
                 </div>
                 <div>
                   <h2 className="text-lg font-bold text-zinc-900">Grafik Omset {isKasir && '(7 Hari Terakhir)'}</h2>
                   <p className="text-sm text-zinc-500 font-medium">Berdasarkan Business Date (Success)</p>
                 </div>
               </div>

               <div className="h-64 w-full">
                 {chartData.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                       <Tooltip cursor={{fill: 'transparent'}} formatter={(val: number) => `Rp ${val.toLocaleString('id-ID')}`} />
                       <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#71717a'}} dy={10} />
                       <Bar dataKey="total" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                     </BarChart>
                   </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex items-center justify-center text-zinc-400 text-sm font-medium">
                      Belum ada data omset
                    </div>
                 )}
               </div>
            </div>

            <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
               <div className="px-6 py-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                 <h2 className="text-lg font-bold text-zinc-900">Histori Transaksi</h2>
               </div>
               
               {historyLoading ? (
                 <div className="p-12 flex justify-center">
                   <Loader2 className="w-6 h-6 text-zinc-300 animate-spin" />
                 </div>
               ) : transactions.length === 0 ? (
                 <div className="p-12 text-center text-zinc-400 text-sm font-medium">
                   Belum ada histori transaksi.
                 </div>
               ) : (
                 <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm whitespace-nowrap">
                     <thead className="bg-zinc-50 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                       <tr>
                         <th className="px-6 py-4 border-b border-zinc-100">Status</th>
                         <th className="px-6 py-4 border-b border-zinc-100">Buku Kas</th>
                         <th className="px-6 py-4 border-b border-zinc-100">Total (Rp)</th>
                         <th className="px-6 py-4 border-b border-zinc-100">Kasir</th>
                         <th className="px-6 py-4 border-b border-zinc-100 text-right">Aksi</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-100">
                       {transactions.map(tr => {
                         const isDeleted = tr.status_transaksi === 'deleted';
                         return (
                           <tr key={tr.transaksi_id} className={`transition-colors ${isDeleted ? 'bg-red-50/50' : 'hover:bg-zinc-50/50'}`}>
                             <td className="px-6 py-4">
                               {isDeleted ? (
                                 <span className="px-2 py-1 rounded bg-red-100 text-red-600 text-xs font-bold uppercase">Deleted</span>
                               ) : (
                                 <span className="px-2 py-1 rounded bg-green-100 text-green-600 text-xs font-bold uppercase">Success</span>
                               )}
                             </td>
                             <td className={`px-6 py-4 font-mono text-zinc-600 ${isDeleted ? 'line-through text-red-400' : ''}`}>
                               {tr.business_date}
                             </td>
                             <td className={`px-6 py-4 font-bold text-zinc-900 ${isDeleted ? 'line-through text-red-400' : ''}`}>
                               Rp {tr.total_bayar.toLocaleString('id-ID')}
                             </td>
                             <td className="px-6 py-4 text-xs font-medium text-zinc-500">
                               <p className={isDeleted ? 'line-through text-red-300' : ''}>{tr.kasir_id.substring(0, 8)}...</p>
                               <p className="uppercase mt-0.5 text-[10px]">{tr.role_eksekutor}</p>
                             </td>
                             <td className="px-6 py-4 text-right">
                               <button
                                 disabled={isDeleted}
                                 onClick={() => handleSoftDelete(tr.transaksi_id)}
                                 className={`p-2 rounded-xl border transition-all ${isDeleted ? 'bg-zinc-100 text-zinc-300 border-zinc-100 cursor-not-allowed' : 'bg-white text-zinc-500 border-zinc-200 hover:text-red-500 hover:border-red-200 hover:bg-red-50'}`}
                                 title="Soft Delete"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
               )}
            </div>
          </div>
        ) : activeTab === 'employees' && isLeader ? (
          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Tambah Akun Kasir</h2>
                <p className="text-sm text-zinc-500 font-medium">Buat akses untuk kasir toko/cabang</p>
              </div>
            </div>

            {empMessage && (
              <div className={`p-4 mb-6 rounded-2xl text-sm font-bold ${empMessage.startsWith('Berhasil') ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                {empMessage}
              </div>
            )}

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Nama Lengkap</label>
                <input type="text" value={empName} onChange={e => setEmpName(e.target.value)} required className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors" placeholder="Nama Kasir" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Username</label>
                <input type="text" value={empUsername} onChange={e => setEmpUsername(e.target.value)} required className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors" placeholder="username_kasir" />
                <p className="text-[10px] text-zinc-400 mt-1 font-medium">Username unik tanpa spasi.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Password</label>
                <input type="password" value={empPassword} onChange={e => setEmpPassword(e.target.value)} required minLength={6} className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors" placeholder="Minimal 6 karakter" />
              </div>
              
              <div className="pt-2">
                <button type="submit" disabled={isEmpSubmitting} className="w-full bg-blue-500 text-white rounded-xl py-3.5 font-bold flex justify-center items-center shadow-lg shadow-blue-500/20 hover:bg-blue-600 active:scale-95 transition-all">
                  {isEmpSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buat Akun Kasir'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </main>
    </div>
  );
}
