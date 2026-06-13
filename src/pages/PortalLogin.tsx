import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../lib/auth-service';
import { Loader2, LayoutGrid, Chrome, Mail, Lock, KeyRound } from 'lucide-react';

export default function PortalLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = location.state || {}; // Message from registration
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(message || '');

  // Formulir Owner Login
  const [emailOwner, setEmailOwner] = useState('');
  const [passwordOwner, setPasswordOwner] = useState('');
  
  // Aktivasi Modal State
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationKey, setActivationKey] = useState('');
  const [pendingUid, setPendingUid] = useState('');
  const [activationError, setActivationError] = useState('');
  const [activationLoading, setActivationLoading] = useState(false);

  // Fungsi Login Super Admin (Tetap Google Auth)
  const handleGoogleLogin = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const result = await authService.loginPortalGoogle();
      
      if (result.status === 'super_admin') {
        navigate('/super-admin/dashboard');
      } else {
         setError("Akses dengan Google Auth khusus Super Admin.");
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        console.error("Login popup error:", err);
      }
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        setError('Popup terblokir. Silakan buka aplikasi ini di tab baru (icon jendela di kanan atas preview) untuk login Google.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`Domain belum diizinkan. Buka Firebase Console > Authentication > Settings > Authorized domains. Tambahkan: ${window.location.hostname}`);
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Google Login belum diaktifkan. Buka Firebase Console > Authentication > Sign-in method > Aktifkan Google.');
      } else {
        setError(err.message || 'Gagal login: ' + (err.code || 'Silakan coba lagi.'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Fungsi Login Owner Email & Password
  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const { user, userData } = await authService.loginPortalManual(emailOwner, passwordOwner);
      
      if (userData.role === 'super_admin') {
        navigate('/super-admin/dashboard');
      } else if (userData.status === 'pending') {
        setPendingUid(user.uid);
        setShowActivationModal(true);
      } else {
        navigate('/owner/dashboard');
      }
    } catch (err: any) {
      setError(err.message || "Gagal login. Periksa kembali email dan password Anda.");
    } finally {
      setLoading(false);
    }
  };

  const handleActivateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivationError('');
    setActivationLoading(true);

    try {
       await authService.activateOwnerAccount(pendingUid, activationKey);
       // Aktivasi berhasil, arahkan langsung ke dashboard
       setShowActivationModal(false);
       window.location.href = '/owner/dashboard';
    } catch (err: any) {
       setActivationError(err.message || "Kode aktivasi tidak valid.");
    } finally {
       setActivationLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4 py-12 font-sans relative overflow-x-hidden overflow-y-auto">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md flex flex-col gap-8 relative z-10 shrink-0">
        <div className="transition-all">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-zinc-800 border border-zinc-700 rounded-2xl flex items-center justify-center shadow-inner">
              <LayoutGrid className="w-8 h-8 text-indigo-400" />
            </div>
          </div>
          <h2 className="text-center text-2xl font-black text-white tracking-tight uppercase">
            Portal Mates
          </h2>
          <p className="mt-2 text-center text-sm font-medium text-zinc-400">
            Akses khusus Owner & Super Admin
          </p>
        </div>

        <div>
          <div className="bg-zinc-900/80 backdrop-blur-xl py-8 px-6 border border-zinc-800 shadow-2xl rounded-3xl sm:px-10">
          {error && (
            <div className="bg-red-500/10 text-red-500 p-4 rounded-xl text-xs font-bold border border-red-500/20 mb-6 flex items-center gap-3">
              <span className="flex-1">{error}</span>
            </div>
          )}
          {successMsg && !error && (
            <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-xl text-xs font-bold border border-emerald-500/20 mb-6 flex items-center gap-3">
              <span className="flex-1">{successMsg}</span>
            </div>
          )}

          <div className="space-y-6">
            
            <form onSubmit={handleOwnerLogin} className="space-y-4 border-b border-zinc-800 pb-6 pt-2">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1 mb-1.5 flex items-center gap-2">
                  <Mail className="w-3 h-3" /> Email Owner
                </label>
                <input 
                  type="email" 
                  required 
                  value={emailOwner}
                  onChange={(e) => setEmailOwner(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
                  placeholder="owner@toko.com"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1 mb-1.5 flex items-center gap-2">
                  <Lock className="w-3 h-3" /> Password
                </label>
                <input 
                  type="password" 
                  required 
                  value={passwordOwner}
                  onChange={(e) => setPasswordOwner(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
                  placeholder="••••••••"
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white mt-4 py-3 px-6 justify-center rounded-xl font-bold text-sm tracking-wide hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Masuk sebagai Owner'}
              </button>
              
              <div className="text-center pt-3">
                <button type="button" onClick={() => navigate('/register-toko')} className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
                  Belum punya akun? Daftar Toko
                </button>
              </div>
            </form>

            <div className="text-center pt-2">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">Akses Super Admin</p>
              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white text-zinc-900 py-3 px-6 justify-center rounded-xl font-bold text-sm tracking-wide hover:bg-zinc-200 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-white/5"
              >
                <Chrome className="w-4 h-4 text-indigo-600" />
                Masuk dengan Google
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Activation Modal */}
      {showActivationModal && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 shadow-2xl rounded-3xl w-full max-w-sm overflow-hidden shrink-0">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-4 border border-indigo-500/30">
                 <KeyRound className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Aktivasi Akun</h3>
              <p className="text-zinc-400 text-sm mb-6">
                Akun Anda belum aktif. Silakan masukkan Kode Aktivasi yang diberikan oleh Super Admin.
              </p>

              {activationError && (
                 <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-xs font-bold mb-4 border border-red-500/20">
                   {activationError}
                 </div>
              )}

              <form onSubmit={handleActivateAccount}>
                <input 
                  type="text" 
                  required
                  value={activationKey}
                  onChange={(e) => setActivationKey(e.target.value)}
                  placeholder="POS-XXXX"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-base text-center font-mono font-bold tracking-widest text-white focus:outline-none focus:border-indigo-500 transition-colors uppercase mb-4 placeholder:text-zinc-600"
                />
                <button 
                  type="submit"
                  disabled={activationLoading}
                  className="w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold flex justify-center items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-900/20"
                >
                  {activationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aktivasi Sekarang'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowActivationModal(false)}
                  className="w-full bg-transparent text-zinc-500 rounded-xl py-3 text-sm font-bold mt-2 hover:text-white transition-colors active:scale-95"
                >
                  Batal
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
