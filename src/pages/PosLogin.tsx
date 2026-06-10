import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../lib/auth-service';
import { Loader2, LayoutGrid, Lock, User, Store } from 'lucide-react';

export default function PosLogin() {
  const navigate = useNavigate();
  const [kodeToko, setKodeToko] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const combinedEmail = `${username}_${kodeToko}@pos-system.com`;
      const { userData } = await authService.loginPOS(combinedEmail, password);
      if (userData?.role === 'owner') {
        navigate('/owner/dashboard'); // Will show dropdown
      } else if (userData?.role === 'leader' || userData?.role === 'kasir') {
        navigate('/pos/dashboard'); // Locked to cabang
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan pada server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4 font-sans border-t-8 border-amber-500">
      <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-zinc-100">
        
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
            <LayoutGrid className="w-8 h-8" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Login POS</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Masuk sebagai Kasir, Leader, atau Owner
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 flex items-center gap-2">
              <Store className="w-3 h-3" /> Kode Toko
            </label>
            <input 
              type="text" 
              value={kodeToko}
              onChange={e => setKodeToko(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="Contoh: toko_171800"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 flex items-center gap-2">
              <User className="w-3 h-3" /> Username
            </label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="username_anda"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 flex items-center gap-2">
              <Lock className="w-3 h-3" /> PIN / Password
            </label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 text-white py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-md shadow-amber-500/20 hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'MASUK SISTEM'}
          </button>
        </form>
      </div>
    </div>
  );
}
