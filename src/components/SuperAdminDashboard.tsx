import React, { useEffect, useState } from 'react';
import { dbService } from '../services/dbService';
import { authService } from '../lib/auth-service';
import { Store, ShieldAlert, LogOut, Activity, Trash2, Loader2, RefreshCw, UserPlus, Mail, KeyRound, LayoutGrid, List } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Registration Form State
  const [formData, setFormData] = useState({
    namaOwner: '',
    email: '',
    password: '',
    alamat: '',
    namaToko: ''
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regMessage, setRegMessage] = useState('');

  // Counts
  const [users, setUsers] = useState<any[]>([]);
  const [cabangs, setCabangs] = useState<any[]>([]);
  const [activatingUid, setActivatingUid] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    const initAuth = async () => {
      try {
        let isSuperAdmin = false;
        
        // 1. Check Google Auth
        if (auth.currentUser) {
          const userDoc = await authService.getUserData(auth.currentUser.uid);
          if (userDoc && userDoc.role === 'super_admin') {
             isSuperAdmin = true;
          }
        }
        
        // 2. Check Local Storage
        if (!isSuperAdmin) {
          const suid = localStorage.getItem('superAdminUid');
          if (suid) {
             const userDoc = await authService.getUserData(suid);
             if (userDoc && userDoc.role === 'super_admin') {
                isSuperAdmin = true;
             }
          }
        }
        
        if (!isSuperAdmin) {
          navigate('/portal-login');
          return;
        }

        const unsubStores = dbService.listenAllStores((data) => {
          setStores(data);
          setLoading(false);
        });
        
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
           setUsers(snap.docs.map(doc => {
              return { id: doc.id, ...doc.data() };
           }));
        });
        
        const unsubCabang = onSnapshot(collection(db, 'cabang'), (snap) => {
           setCabangs(snap.docs.map(doc => doc.data()));
        });

        return () => {
          unsubStores();
          unsubUsers();
          unsubCabang();
        };
      } catch (err) {
        navigate('/portal-login');
      }
    };
    
    // We cannot return cleanup from async directly in useEffect, so wrap it
    let cleanup: any;
    initAuth().then(c => { cleanup = c; });
    return () => { if (cleanup) cleanup(); };
  }, [navigate]);

  const handleActivateToken = async (userId: string) => {
    setActivatingUid(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { token_status: 'siap_pakai' });
      alert('Token berhasil diaktifkan. Silakan berikan token kepada Owner.');
    } catch (e: any) {
      alert('Gagal mengaktifkan token: ' + e.message);
    } finally {
      setActivatingUid(null);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (window.confirm(`Ubah status toko ini menjadi ${newStatus.toUpperCase()}?`)) {
      try {
        await dbService.updateStoreStatus(id, newStatus);
      } catch (e: any) {
        alert('Gagal mengubah status: ' + e.message);
      }
    }
  };

  const handleResetPassword = async (uid: string) => {
    const newPassword = window.prompt("Masukkan password baru untuk Owner ini:");
    if (!newPassword) return;
    if (newPassword.length < 6) {
      alert("Password minimal 6 karakter.");
      return;
    }
    try {
      await dbService.updateUserPassword(uid, newPassword);
      alert("Password owner berhasil diubah!");
    } catch (e: any) {
      alert("Gagal mengubah password: " + e.message);
    }
  };

  const handleSuspendOwner = async (uid: string, currentStatus: string) => {
    if (!uid) {
      alert('Error: ID User tidak valid.');
      return;
    }
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await updateDoc(doc(db, 'users', uid), { account_status: newStatus });
      // Update local state per instruction (for immediate visual feedback)
      setUsers(prev => prev.map(u => (u.id === uid) ? { ...u, account_status: newStatus } : u));
    } catch (e: any) {
      alert('Gagal mengubah status: ' + e.message);
    }
  };

  const handleDeleteTotal = async (userId: string, userName: string) => {
    // Alert ini harus muncul karena tidak ada ganjalan import lagi di dalam fungsi
    alert('TEST KLIK: Masuk ke fungsi hapus. ID: ' + userId);
    
    if (!userId) {
      alert('Error: ID tidak valid atau undefined');
      return;
    }
    
    if (window.confirm(`⚠️ Apakah Anda yakin ingin menghapus permanen ${userName}?`)) {
      try {
        // Eksekusi langsung menggunakan static import yang sudah siap di atas
        await deleteDoc(doc(db, 'users', userId));
        
        // Cari dan hapus toko terkait di koleksi stores jika ada
        const ownerDoc = users.find(u => u.id === userId);
        if (ownerDoc && ownerDoc.toko_id) {
          const storeDoc = stores.find(s => s.toko_id === ownerDoc.toko_id);
          if (storeDoc && storeDoc.id) {
            await dbService.deleteStore(storeDoc.id);
          }
        }
        
        setUsers(prev => prev.filter(u => u.id !== userId));
        alert('Sukses! Akun telah terhapus permanen dari database.');
      } catch (e: any) {
        alert('Error Firebase: ' + e.message);
      }
    }
  };

  const handleCreateToko = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setRegMessage('');
    try {
      const usersRef = collection(db, 'users');
      
      // Check if email already exists
      const q = query(usersRef, where('email', '==', formData.email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        throw new Error("Email sudah terdaftar. Silakan gunakan email lain.");
      }

      const newUserRef = doc(usersRef);
      const uid = newUserRef.id;

      // generate activation key
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let activationKey = '';
      let isUnique = false;

      while (!isUnique) {
        activationKey = 'POS-';
        for (let i = 0; i < 4; i++) {
            activationKey += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const tokenQuery = query(usersRef, where('activation_key', '==', activationKey));
        const tokenSnap = await getDocs(tokenQuery);
        if (tokenSnap.empty) {
          isUnique = true;
        }
      }

      const tokoId = `toko_${Date.now()}`;

      const newUserData = {
        uid: uid,
        name: formData.namaOwner,
        nama_toko: formData.namaToko,
        alamat: formData.alamat,
        email: formData.email,
        password: formData.password,
        role: 'owner',
        account_status: 'pending',
        status: 'pending',
        toko_id: tokoId,
        token_status: 'belum_siap',
        activation_key: activationKey,
        created_at: Date.now()
      };

      await setDoc(newUserRef, newUserData);

      setRegMessage('Berhasil membuat Toko (Status Pending, Token Belum Siap)!');
      setFormData({
        namaOwner: '',
        email: '',
        password: '',
        alamat: '',
        namaToko: ''
      });
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
        
        {/* Ringkasan Global */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex flex-col justify-between">
             <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                 <Store className="w-5 h-5" />
               </div>
               <span className="font-bold text-zinc-600 text-sm tracking-wide">Total Toko</span>
             </div>
             <div>
                <span className="text-3xl font-black text-zinc-900">{stores.length}</span>
                <span className="text-sm font-medium text-zinc-500 ml-2">Terdaftar</span>
             </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex flex-col justify-between">
             <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                 <Activity className="w-5 h-5" />
               </div>
               <span className="font-bold text-zinc-600 text-sm tracking-wide">Toko Aktif</span>
             </div>
             <div>
                <span className="text-3xl font-black text-zinc-900">{stores.filter(s => s.status === 'active').length}</span>
                <span className="text-sm font-medium text-zinc-500 ml-2">Beroperasi</span>
             </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex flex-col justify-between">
             <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                 <KeyRound className="w-5 h-5" />
               </div>
               <span className="font-bold text-zinc-600 text-sm tracking-wide">Menunggu Aktivasi</span>
             </div>
             <div>
                <span className="text-3xl font-black text-zinc-900">
                  {users.filter(u => u.role === 'owner' && (u.token_status === 'belum_siap' || (!u.token_status && !u.is_token_used) || u.status === 'pending')).length}
                </span>
                <span className="text-sm font-medium text-zinc-500 ml-2">Token / Toko</span>
             </div>
          </div>
        </section>

        {/* Form Tambah Toko */}
        <section className="bg-white p-6 md:p-8 rounded-3xl border border-zinc-200 shadow-sm">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
               <h2 className="text-lg font-bold text-zinc-900">Registrasi Toko Manual</h2>
                <p className="text-sm text-zinc-500 font-medium">Buat toko baru (Status otomatis ACTIVE). Owner langsung dapat login dengan email & password.</p>
              </div>
           </div>

           {regMessage && (
             <div className={`p-4 mb-6 rounded-2xl text-sm font-bold border ${regMessage.startsWith('Berhasil') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
               {regMessage}
             </div>
           )}

           <form onSubmit={handleCreateToko} className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Nama Owner</label>
                <input 
                  type="text" 
                  name="namaOwner"
                  value={formData.namaOwner} 
                  onChange={handleInputChange} 
                  required 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-400 font-medium text-zinc-900" 
                  placeholder="Budi Santoso"
                />
             </div>
             <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Email Owner</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email} 
                  onChange={handleInputChange} 
                  required 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-400 font-medium text-zinc-900" 
                  placeholder="budi@gmail.com"
                />
             </div>
             <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Password</label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password} 
                  onChange={handleInputChange} 
                  required 
                  minLength={6}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-400 font-medium text-zinc-900" 
                  placeholder="Minimal 6 karakter"
                />
             </div>
             <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Nama Toko</label>
                <input 
                  type="text" 
                  name="namaToko"
                  value={formData.namaToko} 
                  onChange={handleInputChange} 
                  required 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-400 font-medium text-zinc-900" 
                  placeholder="Toko Maju Jaya"
                />
             </div>
             <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Alamat Lengkap</label>
                <input 
                  type="text" 
                  name="alamat"
                  value={formData.alamat} 
                  onChange={handleInputChange} 
                  required 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-400 font-medium text-zinc-900" 
                  placeholder="Jalan Raya Sudirman No 1"
                />
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Daftar Toko & Owner</h2>
                <p className="text-sm text-zinc-500 font-medium">Manajemen data pemilik toko dan statusnya</p>
              </div>
            </div>
            
            <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200/60 w-fit">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
            </div>
          ) : users.filter(u => u.role === 'owner').length === 0 ? (
            <div className="py-16 border-2 border-dashed border-zinc-200 rounded-3xl text-center">
              <Store className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <p className="text-zinc-500 font-medium text-sm">Belum ada owner / toko yang terdaftar.</p>
            </div>
          ) : viewMode === 'list' ? (
              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-zinc-50 border-b border-zinc-200">
                        <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">No</th>
                        <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">Toko / Owner</th>
                        <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">Email</th>
                        <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">Password</th>
                        <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">Token Serial</th>
                        <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">Status Akun</th>
                        <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-200">
                      {users.filter(u => u.role === 'owner').map((owner, idx) => {
                         const accStatus = owner.account_status || 'pending';
                         let accBadge = 'bg-amber-100 text-amber-700';
                         if (accStatus === 'active') accBadge = 'bg-emerald-100 text-emerald-700';
                         if (accStatus === 'suspended') accBadge = 'bg-red-100 text-red-700';
                         
                         return (
                           <tr key={owner.id} className="hover:bg-zinc-50/50 transition-colors">
                             <td className="py-3 px-4 text-sm text-zinc-500">{idx + 1}</td>
                             <td className="py-3 px-4">
                                <p className="font-bold text-zinc-900">{owner.nama_toko || 'Belum Ada Nama Toko'}</p>
                                <p className="text-xs text-zinc-500 font-medium">Oleh: {owner.name || '-'}</p>
                             </td>
                             <td className="py-3 px-4 text-sm text-zinc-700 font-medium">{owner.email}</td>
                             <td className="py-3 px-4 text-sm font-mono text-zinc-500">{owner.password || '***'}</td>
                             <td className="py-3 px-4">
                               <div className="flex gap-2 items-center">
                                  <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded border border-zinc-200 font-mono text-xs font-bold">{owner.activation_key || '-'}</span>
                                  {(!owner.token_status || owner.token_status === 'belum_siap') && (
                                     <button 
                                       onClick={() => handleActivateToken(owner.id)}
                                       className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors whitespace-nowrap"
                                     >
                                        Aktifkan
                                     </button>
                                  )}
                               </div>
                               <p className="text-[10px] mt-1 font-bold uppercase tracking-widest text-zinc-400">{owner.token_status || 'belum_siap'}</p>
                             </td>
                             <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded inline-flex text-[10px] font-black uppercase tracking-wider ${accBadge}`}>
                                  {accStatus}
                                </span>
                             </td>
                             <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <button onClick={() => handleSuspendOwner(owner.id, accStatus)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm whitespace-nowrap ${accStatus === 'suspended' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'}`}>
                                    {accStatus === 'suspended' ? 'Aktifkan Kembali' : 'Suspend'}
                                  </button>
                                  <button onClick={() => handleDeleteTotal(owner.id, owner.nama_toko || owner.name)} className="relative z-50 pointer-events-auto cursor-pointer px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 shadow-sm whitespace-nowrap">
                                    Hapus Total
                                  </button>
                                </div>
                             </td>
                           </tr>
                         );
                      })}
                   </tbody>
                 </table>
              </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.filter(u => u.role === 'owner').map(owner => {
                 const accStatus = owner.account_status || 'pending';
                 let accBadge = 'bg-amber-100 text-amber-700';
                 if (accStatus === 'active') accBadge = 'bg-emerald-100 text-emerald-700';
                 if (accStatus === 'suspended') accBadge = 'bg-red-100 text-red-700';
                 
                 return (
                   <div key={owner.id} className="bg-white rounded-2xl border border-zinc-200 p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-zinc-300 hover:shadow-md transition-all">
                     {/* Badge Status */}
                     <span className={`absolute top-4 right-4 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${accBadge}`}>
                        {accStatus}
                     </span>
                     
                     <div className="mb-6 pr-16">
                        <h3 className="font-black text-zinc-900 text-lg mb-1 truncate">{owner.nama_toko || 'Toko Belum Dinamai'}</h3>
                        <p className="text-xs text-zinc-500 font-medium truncate">Owner: {owner.name || '-'}</p>
                     </div>
                     
                     <div className="space-y-3 mb-6 bg-zinc-50/50 p-4 rounded-xl border border-zinc-100">
                        <div className="flex items-center gap-3">
                           <div className="w-7 h-7 rounded-lg bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                             <Mail className="w-3.5 h-3.5 text-zinc-500" />
                           </div>
                           <div className="min-w-0">
                             <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Email</p>
                             <p className="text-sm font-semibold text-zinc-700 truncate">{owner.email}</p>
                           </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                           <div className="w-7 h-7 rounded-lg bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                             <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
                           </div>
                           <div className="min-w-0">
                             <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Password</p>
                             <p className="text-sm font-mono text-zinc-600 truncate">{owner.password || '***'}</p>
                           </div>
                        </div>
                        
                        <div className="flex items-center gap-3 pt-1 border-t border-zinc-200/50">
                           <div className="min-w-0 w-full flex items-center justify-between">
                             <div>
                               <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-0.5">Token Serial ({owner.token_status || 'belum_siap'})</p>
                               <div className="flex items-center gap-2">
                                  <p className="text-sm font-mono font-bold text-indigo-600">{owner.activation_key || '-'}</p>
                               </div>
                             </div>
                             {(owner.token_status === 'belum_siap' || !owner.token_status && !owner.is_token_used) && (
                                <button 
                                  onClick={() => handleActivateToken(owner.id)}
                                  disabled={activatingUid === owner.id}
                                  className="text-[10px] font-bold px-2.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                >
                                  {activatingUid === owner.id ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                                  Aktifkan
                                </button>
                             )}
                           </div>
                        </div>
                     </div>
                     
                     <div className="flex justify-between items-center pt-4 border-t border-zinc-100 gap-3">
                        <button 
                           onClick={() => handleSuspendOwner(owner.id, accStatus)}
                           className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex-1 text-center shadow-sm ${accStatus === 'suspended' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'}`}
                        >
                           {accStatus === 'suspended' ? 'Aktifkan Kembali' : 'Suspend'}
                        </button>
                        <button 
                          onClick={() => handleDeleteTotal(owner.id, owner.nama_toko || owner.name)}
                          className="relative z-50 pointer-events-auto cursor-pointer px-4 py-2.5 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all shadow-sm flex-1 text-center"
                        >
                          Hapus Total
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
