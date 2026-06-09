import { useState, useEffect } from 'react';
import { Settings, User, Bell, Shield, Smartphone, Globe, Moon, Sun, Save, MoreVertical, Users, Trash2, Plus, UserPlus, Key, Edit2, Printer, Search, Check, Bluetooth, Image as ImageIcon, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { AppUser, UserRole } from '../types';
import { BluetoothThermalPrinter } from '../lib/bluetooth';
import { Capacitor } from '@capacitor/core';

interface SettingsViewProps {
  onToggleSidebar?: () => void;
  users: AppUser[];
  onAddUser: (user: Omit<AppUser, 'id'>) => void;
  onDeleteUser: (id: string) => void;
  onUpdateUser?: (id: string, user: Partial<AppUser>) => void;
  businessName: string;
  businessLogo: string;
  onUpdateBusinessSettings: (settings: { name: string, logo: string }) => void;
  onPreviewBusinessSettings?: (settings: { name: string, logo: string }) => void;
}

export default function SettingsView({ 
  onToggleSidebar, 
  users, 
  onAddUser, 
  onDeleteUser, 
  onUpdateUser,
  businessName,
  businessLogo,
  onUpdateBusinessSettings,
  onPreviewBusinessSettings
}: SettingsViewProps) {
  const [activeSegment, setActiveSegment] = useState('umum');
  const [bName, setBName] = useState(businessName);
  const [bLogo, setBLogo] = useState(businessLogo);
  
  // Struk / Toko states
  const [bEmail, setBEmail] = useState(() => localStorage.getItem('bt_printer_email') || "admin@burgerpos.com");
  const [bAddress, setBAddress] = useState(() => localStorage.getItem('bt_printer_address_text') || "Jl. Sudirman No. 123, Jakarta");
  const [bFooterMessage, setBFooterMessage] = useState(() => localStorage.getItem('bt_printer_footer_text') || "Terima kasih atas kunjungan Anda!");

  useEffect(() => {
    setBName(businessName);
  }, [businessName]);

  useEffect(() => {
    setBLogo(businessLogo);
  }, [businessLogo]);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return !document.documentElement.classList.contains('light-mode');
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // User Form State
  const [showUserModal, setShowUserModal] = useState(false);
  const [userFormData, setUserFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    role: 'CASHIER' as UserRole
  });

  // Edit User State
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editFormData, setEditFormData] = useState({
    id: '',
    username: '',
    password: '',
    displayName: '',
    role: 'CASHIER' as UserRole
  });

  // Printer State
  const [isScanning, setIsScanning] = useState(false);
  const [pairedDevices, setPairedDevices] = useState<any[]>([]);
  const [selectedBtDevice, setSelectedBtDevice] = useState<any | null>(null);
  const [printerMessage, setPrinterMessage] = useState<string | null>(null);

  // Initialize selected device based on localStorage
  useEffect(() => {
    const savedAddress = localStorage.getItem('bt_printer_address');
    if (savedAddress) {
      // Create a dummy device object to display if we don't have the full name
      setSelectedBtDevice({ address: savedAddress, name: 'Printer Tersimpan' });
    }
  }, []);

  const scanPrinters = async () => {
    setIsScanning(true);
    setPrinterMessage(null);
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await BluetoothThermalPrinter.listPairedDevices();
        const list = result.devices || [];
        setPairedDevices(list);
        
        const savedAddress = localStorage.getItem('bt_printer_address');
        let found = null;
        if (savedAddress) {
          found = list.find((d: any) => d.address === savedAddress);
        }
        if (!found) {
          found = list.find((d: any) => d.name && d.name.toLowerCase().includes('rpp02n'));
          if (found) {
            localStorage.setItem('bt_printer_address', found.address);
            setPrinterMessage(`Printer "${found.name}" otomatis ditemukan dan disimpan!`);
          }
        }
        if (found) {
          setSelectedBtDevice(found);
        }

        if (list.length === 0) {
          setPrinterMessage("Tidak ada printer terdeteksi. Silakan pasangkan perangkat Bluetooth di pengaturan OS.");
        }
      } else {
        setPrinterMessage("Menjalankan simulasi Bluetooth di lingkungan Web...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        const mockList = [
          { name: "RPP02N (Virtual Thermal Printer)", address: "00:11:22:33:44:55" },
          { name: "MOCK-Zjiang-Receipt-POS (Virtual)", address: "88:0F:10:22:A3:4B" }
        ];
        setPairedDevices(mockList);

        const savedAddress = localStorage.getItem('bt_printer_address');
        let found = null;
        if (savedAddress) {
          found = mockList.find((d: any) => d.address === savedAddress);
        }
        if (!found) {
          found = mockList.find((d: any) => d.name && d.name.toLowerCase().includes('rpp02n'));
        }
        if (found) {
          setSelectedBtDevice(found);
        }
        setPrinterMessage("Simulasi: Berhasil mendeteksi 2 perangkat. Pilih salah satu.");
      }
    } catch (err: any) {
      console.error("Gagal memindai printer bluetooth:", err);
      setPrinterMessage("Gagal scan: " + (err.message || String(err)));
    } finally {
      setIsScanning(false);
    }
  };

  const selectPrinterDevice = (device: any) => {
    setSelectedBtDevice(device);
    localStorage.setItem('bt_printer_address', device.address);
    setPrinterMessage(`Printer "${device.name || 'Thermal'}" berhasil disimpan!`);
  };

  const handleStartEdit = (user: AppUser) => {
    setEditFormData({
      id: user.id,
      username: user.username,
      password: user.password,
      displayName: user.displayName || '',
      role: user.role
    });
    setEditingUser(user);
  };

  const handleUpdateUser = () => {
    if (!editFormData.username || !editFormData.password || !onUpdateUser) return;
    onUpdateUser(editFormData.id, {
      username: editFormData.username,
      displayName: editFormData.displayName,
      password: editFormData.password,
      role: editFormData.role
    });
    setEditingUser(null);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
    }
  }, [isDarkMode]);

  const segments = [
    { id: 'umum', label: 'Umum', icon: Settings },
    { id: 'profil', label: 'Profil Toko', icon: User },
    { id: 'notif', label: 'Notifikasi', icon: Bell },
    { id: 'keamanan', label: 'Manajemen User', icon: Users },
    { id: 'perangkat', label: 'Perangkat', icon: Smartphone },
  ];

  const handleCreateUser = () => {
    if (!userFormData.username || !userFormData.password) return;
    onAddUser(userFormData);
    setShowUserModal(false);
    setUserFormData({ username: '', password: '', displayName: '', role: 'CASHIER' });
  };

  const handleSave = () => {
    setIsSaving(true);
    // Persist preference
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    // Save business settings as well if changed
    onUpdateBusinessSettings({ name: bName || 'BurgerPOS', logo: bLogo || 'B' });
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-charcoal animate-fade-in">
      <header className="p-4 sm:p-6 md:p-8 border-b border-soft-cream/10 bg-charcoal/50 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onToggleSidebar}
              className="p-2 md:p-2.5 bg-amber text-charcoal rounded-xl shadow-lg shadow-amber/20 hover:scale-105 active:scale-95 transition-all shrink-0"
            >
              <MoreVertical className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Pengaturan</h1>
              <p className="text-[10px] sm:text-xs text-soft-cream/40 mt-0.5">Konfigurasi sistem dan preferensi aplikasi</p>
            </div>
          </div>
          
          <AnimatePresence>
            {showSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-amber text-charcoal px-4 py-2 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg self-end sm:self-auto"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Pengaturan Berhasil Disimpan</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar Pengaturan */}
        <div className="w-full md:w-64 md:h-full border-b md:border-b-0 md:border-r border-soft-cream/10 p-3 md:p-6 flex md:flex-col gap-1.5 md:space-y-1.5 bg-charcoal/30 overflow-x-auto md:overflow-x-visible custom-scrollbar shrink-0">
          {segments.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSegment(s.id)}
              className={cn(
                "flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap shrink-0",
                activeSegment === s.id 
                  ? "bg-amber text-charcoal shadow-md md:shadow-lg shadow-amber/10 md:scale-[1.02]" 
                  : "text-soft-cream/40 hover:text-soft-cream hover:bg-soft-cream/5"
              )}
            >
              <s.icon className="w-3.5 h-3.5" />
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Content Box */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar">
          <div className="max-w-3xl space-y-8 pb-20">
            {activeSegment === 'umum' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <section className="space-y-6">
                  <h2 className="text-xl font-bold border-b border-soft-cream/10 pb-4 uppercase tracking-widest text-[10px] text-soft-cream/40">Preferensi Tampilan</h2>
                  
                  <div className="flex items-center justify-between p-6 bg-soft-cream/5 border border-soft-cream/10 rounded-2xl group hover:border-amber/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-charcoal border border-soft-cream/10 group-hover:border-amber/30 transition-colors">
                        {isDarkMode ? <Moon className="w-6 h-6 text-amber" /> : <Sun className="w-6 h-6 text-amber" />}
                      </div>
                      <div>
                        <h4 className="font-bold">Mode Gelap</h4>
                        <p className="text-sm text-soft-cream/40">Navigasi lebih nyaman di malam hari</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className={cn(
                        "w-14 h-8 rounded-full relative transition-colors",
                        isDarkMode ? "bg-amber" : "bg-soft-cream/20"
                      )}
                    >
                      <motion.div 
                        animate={{ x: isDarkMode ? 24 : 4 }}
                        className="absolute top-1 left-0 w-6 h-6 bg-charcoal rounded-full"
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-soft-cream/5 border border-soft-cream/10 rounded-2xl group hover:border-amber/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-charcoal border border-soft-cream/10 group-hover:border-amber/30 transition-colors">
                        <Globe className="w-6 h-6 text-amber" />
                      </div>
                      <div>
                        <h4 className="font-bold">Bahasa Utama</h4>
                        <p className="text-sm text-soft-cream/40">Bahasa sistem yang digunakan di seluruh interface</p>
                      </div>
                    </div>
                    <select className="bg-charcoal border border-soft-cream/20 rounded-xl px-4 py-2 text-sm font-bold text-soft-cream focus:outline-none focus:border-amber transition-colors appearance-none min-w-[140px]">
                      <option>Indonesia (ID)</option>
                      <option>English (US)</option>
                      <option>English (UK)</option>
                    </select>
                  </div>
                </section>

                <section className="space-y-6">
                  <h2 className="text-xl font-bold border-b border-soft-cream/10 pb-4 uppercase tracking-widest text-[10px] text-soft-cream/40">Zona Waktu & Formaat</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 bg-soft-cream/5 border border-soft-cream/10 rounded-2xl">
                      <label className="text-xs font-bold text-soft-cream/40 uppercase tracking-widest mb-2 block">Zona Waktu</label>
                      <select className="w-full bg-charcoal border border-soft-cream/20 rounded-xl px-4 py-3 text-sm font-bold text-soft-cream focus:outline-none focus:border-amber transition-colors">
                        <option>(GMT+07:00) Jakarta</option>
                        <option>(GMT+08:00) Singapore</option>
                      </select>
                    </div>
                    <div className="p-6 bg-soft-cream/5 border border-soft-cream/10 rounded-2xl">
                      <label className="text-xs font-bold text-soft-cream/40 uppercase tracking-widest mb-2 block">Format Mata Uang</label>
                      <select className="w-full bg-charcoal border border-soft-cream/20 rounded-xl px-4 py-3 text-sm font-bold text-soft-cream focus:outline-none focus:border-amber transition-colors">
                        <option>Rupiah (IDR)</option>
                        <option>US Dollar (USD)</option>
                      </select>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeSegment === 'profil' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <section className="space-y-6">
                  <h2 className="text-xl font-bold border-b border-soft-cream/10 pb-4 uppercase tracking-widest text-[10px] text-soft-cream/40">Identitas Toko / Usaha</h2>
                  
                  <div className="bg-soft-cream/5 border border-soft-cream/10 rounded-2xl p-6 mb-6 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-20 h-20 bg-amber rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-amber/30">
                      {bLogo && (bLogo.length > 3 || bLogo.includes('.') || bLogo.includes('/') || bLogo.startsWith('data:')) ? (
                        <img src={bLogo} alt="Preview Logo" className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-charcoal font-black text-3xl italic uppercase font-mono">{bLogo || 'B'}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Preview Branding Usaha</h3>
                      <p className="text-sm text-soft-cream/40 mt-1">Ini adalah logo dan nama yang akan ditampilkan pada Sidebar utama dan layar masuk (login).</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-soft-cream/40 uppercase tracking-widest">Nama Usaha / Resto</label>
                      <input 
                        type="text" 
                        value={bName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBName(val);
                          onPreviewBusinessSettings?.({ name: val, logo: bLogo });
                        }}
                        placeholder="contoh: BurgerPOS"
                        className="w-full bg-soft-cream/5 border border-soft-cream/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber transition-colors text-soft-cream"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-soft-cream/40 uppercase tracking-widest">Logo Usaha (Foto/Gambar)</label>
                      <div className="relative">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const img = new Image();
                                img.onload = () => {
                                  const canvas = document.createElement('canvas');
                                  const SIZE = 200; // Small size for logo
                                  let sourceX = 0;
                                  let sourceY = 0;
                                  let sourceSize = Math.min(img.width, img.height);
                                  
                                  if (img.width > img.height) {
                                    sourceX = (img.width - sourceSize) / 2;
                                  } else {
                                    sourceY = (img.height - sourceSize) / 2;
                                  }
                                  
                                  canvas.width = SIZE;
                                  canvas.height = SIZE;
                                  const ctx = canvas.getContext('2d');
                                  if (ctx) {
                                    ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, SIZE, SIZE);
                                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                                    setBLogo(compressedDataUrl);
                                    onPreviewBusinessSettings?.({ name: bName, logo: compressedDataUrl });
                                  } else {
                                    const rawUrl = reader.result as string;
                                    setBLogo(rawUrl);
                                    onPreviewBusinessSettings?.({ name: bName, logo: rawUrl });
                                  }
                                };
                                img.src = reader.result as string;
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                          title="Upload Logo Usaha"
                        />
                        <div className="w-full bg-soft-cream/5 border border-soft-cream/10 border-dashed rounded-xl px-4 py-8 text-sm text-soft-cream flex flex-col items-center justify-center gap-3 hover:bg-soft-cream/10 transition-colors relative overflow-hidden group h-32">
                          {bLogo && bLogo.startsWith('data:image') ? (
                            <>
                              <img src={bLogo} alt="Preview Logo" className="absolute inset-0 w-full h-full object-contain bg-black/20 opacity-80 group-hover:opacity-40 transition-opacity" />
                              <div className="relative z-10 hidden group-hover:flex items-center gap-1.5 bg-black/50 px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm border border-soft-cream/10">
                                <Edit3 className="w-4 h-4 text-soft-cream/80" />
                                <span className="text-soft-cream/90 font-bold text-xs">Ganti Logo</span>
                              </div>
                            </>
                          ) : bLogo && bLogo.startsWith('http') ? (
                             <>
                              <img src={bLogo} alt="Preview Logo URL" className="absolute inset-0 w-full h-full object-contain bg-black/20 opacity-80 group-hover:opacity-40 transition-opacity" />
                              <div className="relative z-10 hidden group-hover:flex items-center gap-1.5 bg-black/50 px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm border border-soft-cream/10">
                                <Edit3 className="w-4 h-4 text-soft-cream/80" />
                                <span className="text-soft-cream/90 font-bold text-xs">Ganti Logo</span>
                              </div>
                             </>
                          ) : bLogo && bLogo.length === 1 ? (
                             <>
                                <div className="absolute inset-0 w-full h-full opacity-80 group-hover:opacity-40 transition-opacity bg-amber flex items-center justify-center text-charcoal font-black text-5xl">
                                  {bLogo.toUpperCase()}
                                </div>
                                <div className="relative z-10 hidden group-hover:flex items-center gap-1.5 bg-black/50 px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm border border-soft-cream/10">
                                  <Edit3 className="w-4 h-4 text-soft-cream/80" />
                                  <span className="text-soft-cream/90 font-bold text-xs">Ganti Jadi Foto</span>
                                </div>
                             </>
                          ) : (
                            <>
                              <ImageIcon className="w-8 h-8 text-soft-cream/30" />
                              <span className="text-soft-cream/60 font-semibold text-xs">Ketuk untuk pilih foto logo</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-soft-cream/40 uppercase tracking-widest">Alamat Email Kontak</label>
                      <input 
                        type="email" 
                        value={bEmail}
                        onChange={(e) => setBEmail(e.target.value)}
                        className="w-full bg-soft-cream/5 border border-soft-cream/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber transition-colors text-soft-cream"
                      />
                    </div>
                    
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-soft-cream/40 uppercase tracking-widest">Alamat Lengkap Toko</label>
                      <textarea 
                        rows={3}
                        value={bAddress}
                        onChange={(e) => setBAddress(e.target.value)}
                        className="w-full bg-soft-cream/5 border border-soft-cream/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber transition-colors resize-none text-soft-cream"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-soft-cream/40 uppercase tracking-widest">Pesan Penutup Struk (Footer)</label>
                      <textarea 
                        rows={2}
                        value={bFooterMessage}
                        onChange={(e) => setBFooterMessage(e.target.value)}
                        className="w-full bg-soft-cream/5 border border-soft-cream/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber transition-colors resize-none text-soft-cream"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 font-bold">
                    <button
                      onClick={() => {
                        setIsSaving(true);
                        localStorage.setItem('bt_printer_email', bEmail);
                        localStorage.setItem('bt_printer_address_text', bAddress);
                        localStorage.setItem('bt_printer_footer_text', bFooterMessage);
                        onUpdateBusinessSettings({ name: bName || 'BurgerPOS', logo: bLogo || 'B' });
                        setTimeout(() => {
                          setIsSaving(false);
                          setShowSuccess(true);
                          setTimeout(() => setShowSuccess(false), 3000);
                        }, 800);
                      }}
                      disabled={isSaving}
                      className="px-6 py-3 bg-amber text-charcoal font-black rounded-xl text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber/20 flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-charcoal border-t-transparent rounded-full animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Simpan Identitas Toko</span>
                        </>
                      )}
                    </button>
                  </div>
                </section>
              </motion.div>
            )}

            {activeSegment === 'keamanan' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center border-b border-soft-cream/10 pb-4">
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-widest text-[10px] text-soft-cream/40">Daftar Pengguna Sistem</h2>
                    <p className="text-xs text-soft-cream/30 mt-1">Kelola hak akses kasir dan administrator</p>
                  </div>
                  <button 
                    onClick={() => setShowUserModal(true)}
                    className="flex items-center gap-2 bg-amber text-charcoal px-4 py-2 rounded-xl font-bold text-xs hover:scale-105 transition-all shadow-lg shadow-amber/20"
                  >
                    <UserPlus className="w-4 h-4" />
                    TAMBAH USER
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {users.map(u => (
                    <div key={u.id} className="p-4 bg-soft-cream/5 border border-soft-cream/10 rounded-2xl flex items-center justify-between group hover:border-amber/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-charcoal border border-soft-cream/10 flex items-center justify-center text-amber font-bold">
                          {u.displayName?.charAt(0) || u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold">{u.displayName || u.username}</h4>
                            <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest",
                              u.role === 'ADMIN' ? "bg-amber text-charcoal" : "bg-soft-cream/10 text-soft-cream/60"
                            )}>
                              {u.role}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-soft-cream/40 font-mono">@{u.username}</p>
                            <span className="w-1 h-1 rounded-full bg-soft-cream/20" />
                            <div className="flex items-center gap-1 text-xs text-soft-cream/60 font-mono">
                              <Key className="w-3 h-3 text-amber/60" />
                              <span>{u.password}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handleStartEdit(u)}
                          className="p-2.5 text-amber hover:text-amber bg-amber/5 md:bg-transparent md:text-amber/60 hover:bg-amber/10 rounded-xl transition-all"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDeleteUser(u.id)}
                          className="p-2.5 text-soft-red hover:text-soft-red bg-soft-red/5 md:bg-transparent md:text-soft-red/40 hover:bg-soft-red/10 rounded-xl transition-all"
                          title="Hapus User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <div className="py-20 text-center border-2 border-dashed border-soft-cream/5 rounded-3xl">
                      <Users className="w-12 h-12 text-soft-cream/10 mx-auto mb-4" />
                      <p className="text-soft-cream/30 font-medium">Belum ada user terdaftar</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeSegment === 'notif' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center space-y-4"
              >
                <div className="w-20 h-20 bg-soft-cream/5 rounded-full flex items-center justify-center border border-soft-cream/10">
                  <Settings className="w-10 h-10 text-soft-cream/20" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Fitur Segera Hadir</h3>
                  <p className="text-soft-cream/40 max-w-xs">Bagian Notifikasi sedang dalam tahap pengembangan.</p>
                </div>
              </motion.div>
            )}

            {activeSegment === 'perangkat' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center border-b border-soft-cream/10 pb-4">
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-widest text-[10px] text-soft-cream/40">Pengaturan Perangkat</h2>
                    <p className="text-xs text-soft-cream/30 mt-1">Konfigurasi printer kasir</p>
                  </div>
                </div>

                <div className="bg-soft-cream/5 border border-soft-cream/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-amber/10 rounded-xl text-amber">
                        <Printer className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold">Printer Thermal (Bluetooth)</h3>
                        <p className="text-[10px] sm:text-xs text-soft-cream/40">Untuk cetak struk transaksi otomatis</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      disabled={isScanning}
                      onClick={scanPrinters}
                      className="px-4 py-2 bg-charcoal border border-soft-cream/20 hover:border-amber text-xs font-bold rounded-xl flex items-center gap-2 transition-all hover:text-amber"
                    >
                      <Search className={cn("w-3.5 h-3.5", isScanning && "animate-spin")} />
                      {isScanning ? 'Mencari...' : 'Scan Printer'}
                    </button>
                  </div>

                  {printerMessage && (
                    <div className="mt-3 mb-4 p-3 bg-amber/10 border border-amber/20 rounded-xl text-xs text-amber font-mono text-center">
                      {printerMessage}
                    </div>
                  )}

                  <div className="bg-charcoal/50 rounded-xl p-4 border border-soft-cream/5">
                    <p className="text-xs font-bold text-soft-cream/40 uppercase tracking-widest mb-3">Printer Tersimpan</p>
                    {selectedBtDevice ? (
                      <div className="flex items-center gap-3 bg-soft-cream/5 border border-amber/30 px-4 py-3 rounded-xl border-dashed">
                        <Bluetooth className="w-5 h-5 text-amber" />
                        <div>
                          <p className="text-sm font-bold text-amber">{selectedBtDevice.name || 'Printer'}</p>
                          <p className="text-[10px] text-soft-cream/40 font-mono mt-0.5">{selectedBtDevice.address}</p>
                        </div>
                        <div className="ml-auto flex items-center gap-1 bg-amber/10 text-amber px-2 py-1 rounded text-[10px] font-bold">
                          <Check className="w-3 h-3" />
                          Aktif
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-soft-cream/20 border-2 border-dashed border-soft-cream/5 rounded-xl">
                        <Bluetooth className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-medium">Belum ada printer Bluetooth yang dipilih.</p>
                      </div>
                    )}
                  </div>

                  {pairedDevices.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <p className="text-xs font-bold text-soft-cream/40 uppercase tracking-widest mb-2">Perangkat Ditemukan</p>
                      {pairedDevices.map((device, idx) => {
                        const isSelected = selectedBtDevice?.address === device.address;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectPrinterDevice(device)}
                            className={cn(
                              "w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between border",
                              isSelected 
                                ? "bg-amber text-charcoal font-bold border-amber" 
                                : "bg-charcoal hover:bg-soft-cream/5 text-soft-cream border-soft-cream/10"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Printer className={cn("w-4 h-4", isSelected ? "text-charcoal" : "text-soft-cream/50")} />
                              <div>
                                <span className="block text-sm">{device.name || 'Device Pos'}</span>
                                <span className={cn("text-[10px] font-mono tracking-wider", isSelected ? "text-charcoal/70" : "text-soft-cream/30" )}>
                                  {device.address}
                                </span>
                              </div>
                            </div>
                            {isSelected && <Check className="w-5 h-5" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <div className="fixed bottom-8 right-8">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "flex items-center gap-3 px-10 py-5 bg-amber text-charcoal rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-2xl shadow-amber/20 active:scale-95 group overflow-hidden relative",
                  isSaving && "opacity-80 pointer-events-none"
                )}
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-charcoal border-t-transparent rounded-full"
                    />
                    Menyimpan...
                  </div>
                ) : (
                  <>
                    <Save className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUserModal(false)}
              className="absolute inset-0 bg-charcoal/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-3xl overflow-hidden relative shadow-2xl"
            >
              <div className="p-8 bg-charcoal text-white">
                <div className="flex items-center gap-3 mb-2">
                  <UserPlus className="w-6 h-6 text-amber" />
                  <h3 className="text-xl font-bold">Daftarkan User Baru</h3>
                </div>
                <p className="text-soft-cream/40 text-sm">Berikan kredensial akses untuk staf Anda</p>
              </div>

              <div className="p-8 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-charcoal/30 uppercase tracking-widest pl-1">Username</label>
                  <input 
                    type="text" 
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({...userFormData, username: e.target.value.toLowerCase().replace(/\s+/g, '')})}
                    className="w-full bg-charcoal/5 border border-charcoal/10 rounded-xl px-4 py-3 text-charcoal focus:outline-none focus:border-amber transition-colors"
                    placeholder="misal: budikasir"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-charcoal/30 uppercase tracking-widest pl-1">Nama Tampilan</label>
                  <input 
                    type="text" 
                    value={userFormData.displayName}
                    onChange={(e) => setUserFormData({...userFormData, displayName: e.target.value})}
                    className="w-full bg-charcoal/5 border border-charcoal/10 rounded-xl px-4 py-3 text-charcoal focus:outline-none focus:border-amber transition-colors"
                    placeholder="misal: Budi Santoso"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-charcoal/30 uppercase tracking-widest pl-1">Password</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/30" />
                    <input 
                      type="password" 
                      value={userFormData.password}
                      onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
                      className="w-full bg-charcoal/5 border border-charcoal/10 rounded-xl pl-12 pr-4 py-3 text-charcoal focus:outline-none focus:border-amber transition-colors font-mono"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-charcoal/30 uppercase tracking-widest pl-1">Hak Akses (Role)</label>
                  <select 
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({...userFormData, role: e.target.value as UserRole})}
                    className="w-full bg-charcoal/5 border border-charcoal/10 rounded-xl px-4 py-3 text-charcoal focus:outline-none focus:border-amber transition-colors"
                  >
                    <option value="CASHIER">Kasir (Akses Terbatas)</option>
                    <option value="ADMIN">Admin (Akses Penuh)</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowUserModal(false)}
                    className="flex-1 px-6 py-4 border border-charcoal/10 rounded-2xl font-bold text-charcoal/60 hover:bg-charcoal/5 transition-all active:scale-95"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleCreateUser}
                    className="flex-1 px-6 py-4 bg-amber text-charcoal rounded-2xl font-black shadow-lg shadow-amber/20 hover:scale-105 transition-all active:scale-95"
                  >
                    Simpan User
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="absolute inset-0 bg-charcoal/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-3xl overflow-hidden relative shadow-2xl"
            >
              <div className="p-8 bg-charcoal text-white">
                <div className="flex items-center gap-3 mb-2">
                  <Edit2 className="w-6 h-6 text-amber" />
                  <h3 className="text-xl font-bold">Edit Pengguna</h3>
                </div>
                <p className="text-soft-cream/40 text-sm">Ubah kredensial akses pengguna sistem</p>
              </div>

              <div className="p-8 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-charcoal/30 uppercase tracking-widest pl-1">Username</label>
                  <input 
                    type="text" 
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({...editFormData, username: e.target.value.toLowerCase().replace(/\s+/g, '')})}
                    className="w-full bg-charcoal/5 border border-charcoal/10 rounded-xl px-4 py-3 text-charcoal focus:outline-none focus:border-amber transition-colors"
                    placeholder="misal: budikasir"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-charcoal/30 uppercase tracking-widest pl-1">Nama Tampilan</label>
                  <input 
                    type="text" 
                    value={editFormData.displayName}
                    onChange={(e) => setEditFormData({...editFormData, displayName: e.target.value})}
                    className="w-full bg-charcoal/5 border border-charcoal/10 rounded-xl px-4 py-3 text-charcoal focus:outline-none focus:border-amber transition-colors"
                    placeholder="misal: Budi Santoso"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-charcoal/30 uppercase tracking-widest pl-1">Password</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/30" />
                    <input 
                      type="text" 
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                      className="w-full bg-charcoal/5 border border-charcoal/10 rounded-xl pl-12 pr-4 py-3 text-charcoal focus:outline-none focus:border-amber transition-colors font-mono"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-charcoal/30 uppercase tracking-widest pl-1">Hak Akses (Role)</label>
                  <select 
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({...editFormData, role: e.target.value as UserRole})}
                    className="w-full bg-charcoal/5 border border-charcoal/10 rounded-xl px-4 py-3 text-charcoal focus:outline-none focus:border-amber transition-colors"
                  >
                    <option value="CASHIER">Kasir (Akses Terbatas)</option>
                    <option value="ADMIN">Admin (Akses Penuh)</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setEditingUser(null)}
                    className="flex-1 px-6 py-4 border border-charcoal/10 rounded-2xl font-bold text-charcoal/60 hover:bg-charcoal/5 transition-all active:scale-95"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleUpdateUser}
                    className="flex-1 px-6 py-4 bg-amber text-charcoal rounded-2xl font-black shadow-lg shadow-amber/20 hover:scale-105 transition-all active:scale-95"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
