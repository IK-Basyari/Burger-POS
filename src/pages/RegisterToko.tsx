import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../lib/auth-service';
import { Loader2, Store, User } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function RegisterToko() {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, displayName, uid } = location.state || {};

  const [name, setName] = useState(displayName || '');
  const [namaToko, setNamaToko] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !email) {
      setError('Data akses Google tidak valid. Silakan login kembali.');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      await authService.registerOwnerGoogle(uid, email, name, namaToko);
      navigate('/account-pending');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat pendaftaran.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await signOut(auth);
    navigate('/portal-login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl p-8 rounded-3xl border border-zinc-800 shadow-2xl z-10">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-zinc-800 border border-zinc-700 rounded-2xl flex items-center justify-center">
            <Store className="w-8 h-8 text-indigo-400" />
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Registrasi Toko</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Lengkapi data diri dan nama toko Anda.
          </p>
          <div className="mt-3 px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg inline-flex items-center text-xs font-mono text-zinc-300">
            {email}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
              <User className="w-3 h-3" /> Nama Pemilik
            </label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Nama lengkap owner"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
              <Store className="w-3 h-3" /> Nama Toko
            </label>
            <input 
              type="text" 
              value={namaToko}
              onChange={e => setNamaToko(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Nama toko"
              required
            />
          </div>

          <div className="pt-4 flex flex-col gap-3">
             <button 
               type="submit"
               disabled={loading}
               className="w-full bg-white text-zinc-900 py-3.5 rounded-xl font-bold text-sm hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center gap-2"
             >
               {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Selesaikan Registrasi'}
             </button>
             <button 
               type="button"
               onClick={handleCancel}
               className="w-full bg-transparent text-zinc-400 py-3 rounded-xl font-bold text-sm hover:bg-zinc-800 active:scale-95 transition-all"
             >
               Batal login
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
