import React, { useEffect, useState } from 'react';
import { dbService } from '../services/dbService';
import { authService } from '../lib/auth-service';
import { Store, ShieldAlert, LogOut, Activity, Trash2, Loader2, RefreshCw, UserPlus } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regTokoName, setRegTokoName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regMessage, setRegMessage] = useState('');

  // Counts
  const [users, setUsers] = useState<any[]>([]);
  const [cabangs, setCabangs] = useState<any[]>([]);

  useEffect(() => {
    const unsubStores = dbService.listenAllStores((data) => {
      setStores(data);
      setLoading(false);
    });
    
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
       setUsers(snap.docs.map(doc => doc.data()));
    });
    
    // In our simplified app, we might not have a cabang collection listening set up yet in dbService,
    // so we'll just listen to it directly.
    const unsubCabang = onSnapshot(collection(db, 'cabang'), (snap) => {
       setCabangs(snap.docs.map(doc => doc.data()));
    });

    return () => {
      unsubStores();
      unsubUsers();
      unsubCabang();
    };
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (window.confirm(`Ubah status toko ini menjadi ${newStatus.toUpperCase()}?`)) {
      try {
        await dbService.updateStoreStatus(id, newStatus);
      } catch (e: any) {
        alert('Gagal mengubah status: ' + e.message);
      }
    }
  };

  const handleDeleteStore = async (id: string) => {
    if (window.confirm('PERINGATAN: Apakah Anda yakin ingin MENGHAPUS secara permanen toko ini? Data yang terhapus tidak dapat dikembalikan.')) {
      try {
        await dbService.deleteStore(id);
      } catch (e: any) {
        alert('Gagal menghapus toko: ' + e.message);
      }
    }
  };

  const handleCreateToko = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setRegMessage('');
    try {
      await authService.registerTokoByAdmin(regEmail, regPassword, regName, regTokoName);
      setRegMessage('Berhasil membuat Toko!');
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegTokoName('');
    } catch (e: any) {
      setRegMessage('Gagal: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/portal-login');
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-zinc-50 font-sans">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">Super Admin</h1>
            <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">Pusat Kendali Sistem</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-600 border border-zinc-200 rounded-xl font-bold hover:bg-zinc-200 hover:text-red-600 transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </header>

      <main className="max-w-6xl mx-auto w-full p-6 md:p-8 space-y-8">
        
        {/* Form Tambah Toko */}
        <section className="bg-white p-6 md:p-8 rounded-3xl border border-zinc-200 shadow-sm">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Registrasi Toko Manual</h2>
                <p className="text-sm text-zinc-500 font-medium">Buat toko baru (Status otomatis ACTIVE)</p>
              </div>
           </div>

           {regMessage && (
             <div className={`p-4 mb-6 rounded-2xl text-sm font-bold border ${regMessage.startsWith('Berhasil') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
               {regMessage}
             </div>
           )}

           <form onSubmit={handleCreateToko} className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Nama Toko</label>
                <input type="text" value={regTokoName} onChange={e=>setRegTokoName(e.target.value)} required className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Toko Maju Jaya" />
             </div>
             <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Nama Owner</label>
                <input type="text" value={regName} onChange={e=>setRegName(e.target.value)} required className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Budi Santoso" />
             </div>
             <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Email Owner</label>
                <input type="email" value={regEmail} onChange={e=>setRegEmail(e.target.value)} required className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" placeholder="budi@example.com" />
             </div>
             <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Password</label>
                <input type="password" value={regPassword} onChange={e=>setRegPassword(e.target.value)} required minLength={6} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Minimal 6 karakter" />
             </div>
             <div className="md:col-span-2 pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white rounded-xl py-3.5 font-bold flex justify-center items-center shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buat Toko Sekarang'}
                </button>
             </div>
           </form>
        </section>

        {/* Daftar Toko */}
        <section className="bg-white p-6 md:p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Daftar Toko & Approval</h2>
              <p className="text-sm text-zinc-500 font-medium">Atur status aktivasi tenat yang mendaftar</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
            </div>
          ) : stores.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-zinc-200 rounded-2xl text-center">
              <Store className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <p className="text-zinc-500 font-medium text-sm">Belum ada toko yang terdaftar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {stores.map(store => {
                const storeUsers = users.filter(u => u.toko_id === store.toko_id);
                const storeCabangs = cabangs.filter(c => c.toko_id === store.toko_id);
                
                let statusColor = 'bg-zinc-100 text-zinc-500';
                if (store.status === 'active') statusColor = 'bg-emerald-100 text-emerald-700';
                if (store.status === 'inactive') statusColor = 'bg-red-100 text-red-700';
                if (store.status === 'pending') statusColor = 'bg-amber-100 text-amber-700';

                return (
                  <div key={store.id} className="p-5 rounded-2xl border border-zinc-200 flex flex-col justify-between hover:border-zinc-300 transition-colors bg-zinc-50/50">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-zinc-900 text-lg mb-1">{store.nama_toko}</h3>
                        <p className="text-xs font-mono text-zinc-500">ID: {store.toko_id}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${statusColor}`}>
                        {store.status || 'UNKNOWN'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-zinc-600 font-medium mb-6">
                      <div className="bg-white px-3 py-1.5 rounded-lg border border-zinc-200 shadow-sm">
                        <span className="font-bold text-zinc-900">{storeCabangs.length}</span> Cabang
                      </div>
                      <div className="bg-white px-3 py-1.5 rounded-lg border border-zinc-200 shadow-sm">
                        <span className="font-bold text-zinc-900">{storeUsers.length}</span> Admin/Kasir
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-zinc-200/60 w-full">
                       <select 
                         value={store.status} 
                         onChange={(e) => handleUpdateStatus(store.id, e.target.value)}
                         className="flex-1 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-sm font-bold text-zinc-700 cursor-pointer focus:outline-none focus:border-indigo-500"
                       >
                         <option value="pending">PENDING</option>
                         <option value="active">ACTIVE</option>
                         <option value="inactive">INACTIVE</option>
                       </select>

                       <button 
                         onClick={() => handleDeleteStore(store.id)}
                         className="p-2.5 bg-white border border-zinc-200 text-zinc-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors rounded-xl flex-shrink-0"
                         title="Hapus Toko"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
