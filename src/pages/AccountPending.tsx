import React from 'react';
import { Clock, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AccountPending() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10 transition-all text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-center justify-center">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
        </div>
        
        <h2 className="text-3xl font-black text-white tracking-tight uppercase mb-4">
          Status Pending
        </h2>
        
        <div className="bg-zinc-900/80 backdrop-blur-xl py-8 px-6 border border-zinc-800 shadow-2xl rounded-3xl">
          <p className="text-zinc-400 font-medium leading-relaxed mb-8 text-sm">
            Akun Anda belum diaktifkan oleh Super Admin. Silakan hubungi pemilik web untuk proses verifikasi.
          </p>
          
          <div className="space-y-3">
             <a 
               href="https://wa.me/6281234567890?text=Halo%20Admin,%20tolong%20aktivasi%20akun%20toko%20saya"
               target="_blank"
               rel="noopener noreferrer"
               className="w-full bg-emerald-500 text-white py-3.5 px-6 justify-center rounded-xl font-bold tracking-wide hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-3"
             >
               <MessageCircle className="w-5 h-5 text-white" />
               Hubungi Admin via WhatsApp
             </a>
             <button
               onClick={() => navigate('/portal-login')}
               className="w-full bg-zinc-800 text-zinc-300 py-3.5 px-6 justify-center rounded-xl font-bold tracking-wide hover:bg-zinc-700 active:scale-95 transition-all border border-zinc-700"
             >
               Kembali ke Login
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
