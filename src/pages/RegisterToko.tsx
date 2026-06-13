import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../lib/auth-service';
import { Loader2, Store, User, MapPin, Phone, Lock, Mail } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function RegisterToko() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [namaToko, setNamaToko] = useState('');
  const [alamat, setAlamat] = useState('');
  const [noHp, setNoHp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.registerOwnerEmailPassword(email, password, name, namaToko, alamat, noHp);
      
      // Mengamankan DNA Struktur Parameter (Sama dengan Super Admin) seperti yg diinstruksikan
      const userId = response.userData.uid;
      const usersRef = collection(db, 'users');
      
      // Generator token acak POS-XXXX anti-bentrok
      let activationKey = '';
      let isUnique = false;
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      
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

      await setDoc(doc(db, 'users', userId), {
        id: userId,
        uid: userId,
        name: name,
        nama_toko: namaToko,
        alamat: alamat,
        no_hp: noHp,
        email: email,
        password: password,
        role: 'owner',
        account_status: 'pending',
        status: 'pending',
        token_status: 'belum_siap',
        activation_key: activationKey,
        created_at: Date.now()
      }, { merge: true });

      // Wait for registration and then redirect to login portal
      navigate('/portal-login', { state: { message: "Pendaftaran berhasil! Silakan login untuk melakukan aktivasi." } });
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat pendaftaran.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4 py-12 font-sans relative overflow-x-hidden overflow-y-auto">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-zinc-900/80 backdrop-blur-xl p-8 rounded-3xl border border-zinc-800 shadow-2xl z-10 relative shrink-0">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-zinc-800 border border-zinc-700 rounded-2xl flex items-center justify-center shadow-inner">
            <Store className="w-7 h-7 text-indigo-400" />
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Registrasi Toko</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Lengkapi data diri dan toko Anda.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                <User className="w-3 h-3" /> Nama Pemilik
              </label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
                placeholder="Nama lengkap"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                <Phone className="w-3 h-3" /> No HP / WA
              </label>
              <input 
                type="text" 
                value={noHp}
                onChange={e => setNoHp(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
                placeholder="0812..."
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                <Mail className="w-3 h-3" /> Email
              </label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
                placeholder="email@example.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                <Lock className="w-3 h-3" /> Password
              </label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={6}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
                placeholder="Min. 6 karakter"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
              <Store className="w-3 h-3" /> Nama Toko
            </label>
            <input 
              type="text" 
              value={namaToko}
              onChange={e => setNamaToko(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
              placeholder="Nama toko Anda"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Alamat Toko
            </label>
            <textarea 
              value={alamat}
              onChange={e => setAlamat(e.target.value)}
              rows={2}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none placeholder:text-zinc-600"
              placeholder="Alamat lengkap toko"
              required
            />
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
             <button 
               type="submit"
               disabled={loading}
               className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
             >
               {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Daftar Sekarang'}
             </button>
             <button 
               type="button"
               onClick={() => navigate('/portal-login')}
               className="sm:w-1/3 bg-zinc-800/50 text-zinc-300 py-3 rounded-xl font-bold text-sm hover:bg-zinc-800 hover:text-white active:scale-95 transition-all"
             >
               Batal
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
