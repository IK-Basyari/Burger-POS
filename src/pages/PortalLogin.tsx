import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../lib/auth-service';
import { Loader2, LayoutGrid, Chrome } from 'lucide-react';

export default function PortalLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await authService.loginPortalGoogle();
      
      if (result.status === 'super_admin') {
        navigate('/super-admin/dashboard');
      } else if (result.status === 'new_user') {
        navigate('/register-toko', { state: { email: result.user?.email, displayName: result.user?.displayName, uid: result.user?.uid } });
      } else if (result.status === 'pending') {
        navigate('/account-pending');
      } else if (result.status === 'active_owner') {
        navigate('/owner/dashboard');
      }
    } catch (err: any) {
      console.error("Login popup error:", err);
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

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 transition-all">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-zinc-800 border border-zinc-700 rounded-2xl flex items-center justify-center">
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

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-zinc-900/80 backdrop-blur-xl py-8 px-6 border border-zinc-800 shadow-2xl rounded-3xl sm:px-10">
          {error && (
            <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-xs font-bold border border-red-500/20 mb-6 flex items-center gap-3">
              <span className="flex-1">{error}</span>
            </div>
          )}

          <div className="text-center space-y-6">
            <p className="text-sm font-medium text-zinc-400">
              Silakan login menggunakan akun Google Anda untuk melanjutkan ke dashboard atau mendaftarkan toko baru.
            </p>

            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white text-zinc-900 py-3.5 px-6 justify-center rounded-xl font-bold tracking-wide hover:bg-zinc-200 active:scale-95 transition-all flex items-center gap-3"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
              ) : (
                <>
                  <Chrome className="w-5 h-5 text-indigo-600" />
                  Masuk dengan Google
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
