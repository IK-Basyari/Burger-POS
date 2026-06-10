import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { authService } from '../lib/auth-service';
import { LogOut, UserPlus, Loader2, Store } from 'lucide-react';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [cabangId, setCabangId] = useState(''); // Could be a text field or dropdown. Let's do text field for now or dummy dropdown
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        navigate('/portal-login');
        return;
      }
      const data = await authService.getUserData(currentUser.uid);
      if (!data || data.role !== 'owner') {
        navigate('/portal-login');
        return;
      }
      setUser(data);
      setLoading(false);
    };
    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/portal-login');
  };

  const handleAddLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    setMessage('');
    
    try {
      await authService.registerLeader(user.uid, username, password, name, cabangId || 'cabang_default');
      setMessage('Berhasil menambahkan Leader baru!');
      setUsername('');
      setPassword('');
      setName('');
      setCabangId('');
    } catch (err: any) {
      setMessage('Gagal: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Owner Dashboard</h1>
          <p className="text-sm text-zinc-500">Toko ID: {user.toko_id}</p>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-500">
          <LogOut className="w-4 h-4" /> Keluar
        </button>
      </header>

      <main className="max-w-xl mx-auto mt-8 p-6 bg-white rounded-2xl shadow-sm border border-zinc-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Tambah Akun Leader</h2>
            <p className="text-sm text-zinc-500">Buat akses untuk pimpinan cabang</p>
          </div>
        </div>

        {message && (
          <div className={`p-3 mb-4 rounded-xl text-sm font-bold ${message.startsWith('Berhasil') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleAddLeader} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1 uppercase">Nama Lengkap</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border rounded-xl px-4 py-2" placeholder="Nama Leader" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1 uppercase">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full border rounded-xl px-4 py-2" placeholder="username_leader" />
            <p className="text-[10px] text-zinc-400 mt-1">Tanpa spasi, gunakan huruf kecil.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1 uppercase">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="w-full border rounded-xl px-4 py-2" placeholder="Minimal 6 karakter" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1 uppercase">Cabang ID</label>
            <input type="text" value={cabangId} onChange={e => setCabangId(e.target.value)} required className="w-full border rounded-xl px-4 py-2" placeholder="Contoh: cb_01" />
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-500 text-white rounded-xl py-3 font-bold flex justify-center items-center mt-4">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buat Akun Leader'}
          </button>
        </form>
      </main>
    </div>
  );
}
