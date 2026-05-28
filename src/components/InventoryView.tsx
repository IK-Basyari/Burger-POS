import { useState } from 'react';
import { Package, AlertCircle, CheckCircle2, RefreshCw, Search, Plus, Trash2, Edit3, MoreVertical, Eye, EyeOff, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { StockItem } from '../types';
import { STOCK_DATA } from '../constants';
import { cn } from '../lib/utils';

interface InventoryViewProps {
  onToggleSidebar?: () => void;
  inventory: StockItem[];
  onSetInventory: (val: StockItem[]) => void;
  onToggleInventoryItem: (name: string) => void;
}

export default function InventoryView({ 
  onToggleSidebar, 
  inventory, 
  onSetInventory,
  onToggleInventoryItem 
}: InventoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItemName, setEditingItemName] = useState<string | null>(null);
  const [openMenuName, setOpenMenuName] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemStock, setItemStock] = useState('0');
  const [itemUnit, setItemUnit] = useState('pcs');
  const [customUnit, setCustomUnit] = useState('');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const presetUnits = ['pcs', 'ml', 'gr', 'kg', 'liter', 'porsi', 'box'];

  const handleResetInventory = () => {
    const resetData = inventory.map(item => ({
      ...item,
      used: 0,
      remaining: 0,
      status: 'KRITIS' as const
    }));
    onSetInventory(resetData);
    setShowResetConfirm(false);
    triggerNotification('Semua sisa stok & bahan terpakai disetel menjadi nol');
  };

  const exportToExcel = () => {
    if (filteredInventory.length === 0) {
      triggerNotification('Tidak ada data bahan yang dapat diekspor');
      return;
    }

    const excelData = filteredInventory.map((item) => ({
      'Nama Bahan': item.name,
      'Terpakai (Hari Ini)': `${item.used} ${item.unit || 'pcs'}`,
      'Sisa Stok': `${item.remaining} ${item.unit || 'pcs'}`,
      'Status': item.status,
      'Status Aktif': item.isActive !== false ? 'Aktif' : 'Nonaktif'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    worksheet['!cols'] = [
      { wch: 25 },
      { wch: 22 },
      { wch: 18 },
      { wch: 12 },
      { wch: 15 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Stok');

    XLSX.writeFile(workbook, 'Laporan_Stok_Bahan_Baku.xlsx');
    triggerNotification('Daftar bahan baku excel berhasil diunduh!');
  };

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredInventory = inventory.filter(item => 
    (item.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const deleteItem = (name: string) => {
    onSetInventory(inventory.filter(item => item.name !== name));
    triggerNotification('Data bahan berhasil dihapus');
  };

  const topUp = (name: string) => {
    onSetInventory(inventory.map(item => {
      if (item.name === name) {
        const newRemaining = item.remaining + 10;
        return { 
          ...item, 
          remaining: newRemaining,
          status: newRemaining <= 10 ? 'KRITIS' : 'AMAN'
        };
      }
      return item;
    }));
    triggerNotification('Stok berhasil ditambahkan (+10)');
  };

  const saveItem = () => {
    if (!itemName) return;
    const stock = parseInt(itemStock) || 0;
    const finalUnit = itemUnit === 'custom' ? (customUnit.trim() || 'pcs') : itemUnit;

    if (editingItemName) {
      onSetInventory(inventory.map(item => {
        if (item.name === editingItemName) {
          return {
            ...item,
            name: itemName,
            remaining: stock,
            status: stock <= 10 ? 'KRITIS' : 'AMAN',
            unit: finalUnit
          };
        }
        return item;
      }));
      triggerNotification('Data bahan berhasil diperbarui');
    } else {
      const newItem: StockItem = {
        name: itemName,
        used: 0,
        remaining: stock,
        status: stock <= 10 ? 'KRITIS' : 'AMAN',
        isActive: true,
        unit: finalUnit
      };
      onSetInventory([newItem, ...inventory]);
      triggerNotification('Bahan baru berhasil ditambahkan');
    }

    closeModal();
  };

  const openAddModal = () => {
    setEditingItemName(null);
    setItemName('');
    setItemStock('0');
    setItemUnit('pcs');
    setCustomUnit('');
    setIsCustomUnit(false);
    setShowModal(true);
  };

  const openEditModal = (item: StockItem) => {
    setEditingItemName(item.name);
    setItemName(item.name);
    setItemStock(item.remaining.toString());
    const unitVal = item.unit || 'pcs';
    if (presetUnits.includes(unitVal)) {
      setItemUnit(unitVal);
      setIsCustomUnit(false);
      setCustomUnit('');
    } else {
      setItemUnit('custom');
      setIsCustomUnit(true);
      setCustomUnit(unitVal);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItemName(null);
    setItemName('');
    setItemStock('0');
    setItemUnit('pcs');
    setCustomUnit('');
    setIsCustomUnit(false);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-charcoal">
      <header className="p-4 sm:p-6 md:p-8 border-b border-soft-cream/10 bg-charcoal/50 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onToggleSidebar}
              className="p-2 md:p-2.5 bg-amber text-charcoal rounded-xl shadow-lg shadow-amber/20 hover:scale-105 active:scale-95 transition-all shrink-0"
            >
              <MoreVertical className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Manajemen Bahan Baku</h1>
              <p className="text-[10px] sm:text-xs text-soft-cream/40 mt-0.5">Pelacakan stok dan ketersediaan real-time</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <div className="relative flex-1 min-w-[130px] md:min-w-64 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-soft-cream/40" />
              <input 
                type="text" 
                placeholder="Cari bahan..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-soft-cream/5 border border-soft-cream/10 rounded-xl py-2 pl-9 pr-3 text-xs md:text-sm focus:outline-none focus:border-amber/50 transition-colors"
              />
            </div>
            <button 
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber text-charcoal rounded-xl font-bold text-xs md:text-sm hover:scale-105 transition-transform shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Stok</span>
            </button>
            
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs md:text-sm hover:scale-105 active:scale-95 transition-all shrink-0 shadow-lg shadow-emerald-600/20"
              title="Ekspor list ketersediaan bahan ke Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="p-2.5 bg-soft-cream/5 border border-soft-cream/10 rounded-xl text-soft-cream/60 hover:text-soft-cream transition-colors shrink-0"
              title="Reset Semua Bahan"
            >
              <RefreshCw className="w-4 h-4 md:w-5 md:h-5 text-soft-cream" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="bg-soft-red/10 border border-soft-red/20 rounded-xl p-3.5 w-44">
            <div className="flex items-center gap-3 text-soft-red">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider opacity-60">Stok Kritis</p>
                <h3 className="text-base font-bold leading-tight">
                  {inventory.filter(i => i.status === 'KRITIS').length} Item
                </h3>
              </div>
            </div>
          </div>
          <div className="bg-green-400/10 border border-green-400/20 rounded-xl p-3.5 w-44">
            <div className="flex items-center gap-3 text-green-400">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider opacity-60">Stok Aman</p>
                <h3 className="text-base font-bold leading-tight">
                  {inventory.filter(i => i.status === 'AMAN').length} Item
                </h3>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-soft-cream/5 border border-soft-cream/10 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[550px]">
              <thead>
                <tr className="bg-soft-cream/5 text-soft-cream/40 text-xs uppercase tracking-widest border-b border-soft-cream/10">
                  <th className="px-5 py-3.5 font-bold">Nama Bahan</th>
                  <th className="px-5 py-3.5 font-bold">Terpakai (Hari Ini)</th>
                  <th className="px-5 py-3.5 font-bold">Sisa Stok</th>
                  <th className="px-5 py-3.5 font-bold">Status</th>
                  <th className="px-5 py-3.5 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-cream/5 text-xs">
              <AnimatePresence mode="popLayout">
                {filteredInventory.map((item, i) => (
                  <motion.tr 
                    key={`${item.name}-${i}`}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      "hover:bg-soft-cream/5 transition-colors group",
                      item.isActive === false && "opacity-50 grayscale-[0.5]"
                    )}
                  >
                    <td className="px-6 py-4 font-bold flex items-center gap-3">
                      {item.isActive === false && <EyeOff className="w-4 h-4 text-soft-cream/20" />}
                      <span className={cn(item.isActive === false && "line-through text-soft-cream/40")}>{item.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("text-soft-red font-bold", item.isActive === false && "text-soft-cream/20")}>-{item.used} {item.unit || 'pcs'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("font-bold", item.isActive === false && "text-soft-cream/40")}>{item.remaining} {item.unit || 'pcs'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        item.isActive === false 
                          ? "bg-soft-cream/10 text-soft-cream/40"
                          : item.status === 'KRITIS' 
                            ? "bg-soft-red/10 text-soft-red" 
                            : "bg-green-400/10 text-green-400"
                      )}>
                        {item.status === 'KRITIS' ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        {item.isActive !== false ? item.status : 'NON-AKTIF'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => onToggleInventoryItem(item.name)}
                          className={cn(
                            "p-2 rounded-xl transition-all border",
                            item.isActive !== false 
                              ? "bg-amber/10 border-amber/20 text-amber hover:bg-amber/20" 
                              : "bg-soft-cream/5 border-soft-cream/10 text-soft-cream/40 hover:bg-soft-cream/10"
                          )}
                          title={item.isActive !== false ? "Sembunyikan" : "Tampilkan"}
                        >
                          {item.isActive !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button 
                          disabled={item.isActive === false}
                          onClick={() => topUp(item.name)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                            item.isActive !== false 
                              ? "bg-amber/10 hover:bg-amber text-amber hover:text-charcoal" 
                              : "bg-soft-cream/5 text-soft-cream/20 cursor-not-allowed"
                          )}
                        >
                          +10
                        </button>
                        
                        <div className="relative">
                          <button 
                            onClick={() => setOpenMenuName(openMenuName === item.name ? null : item.name)}
                            className={cn(
                              "p-2 rounded-xl transition-all",
                              openMenuName === item.name ? "bg-amber text-charcoal shadow-lg" : "hover:bg-soft-cream/10 text-soft-cream/40"
                            )}
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>

                          <AnimatePresence>
                            {openMenuName === item.name && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuName(null)} />
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.9, x: 10 }}
                                  animate={{ opacity: 1, scale: 1, x: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, x: 10 }}
                                  className="absolute right-0 top-0 w-40 bg-charcoal border border-soft-cream/10 rounded-2xl shadow-2xl z-20 overflow-hidden"
                                >
                                  <button 
                                    onClick={() => {
                                      openEditModal(item);
                                      setOpenMenuName(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-amber hover:bg-amber/10 transition-colors border-b border-soft-cream/5"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                    Edit Bahan
                                  </button>
                                  <button 
                                    onClick={() => {
                                      deleteItem(item.name);
                                      setOpenMenuName(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-soft-red hover:bg-soft-red/10 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Hapus Bahan
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          </div>
          {filteredInventory.length === 0 && (
            <div className="p-12 text-center text-soft-cream/20">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium text-lg">Tidak ada data bahan baku</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {notification && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100]">
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="bg-amber text-charcoal px-8 py-4 rounded-2xl font-bold shadow-2xl flex items-center gap-3 border border-charcoal/10"
            >
              <CheckCircle2 className="w-6 h-6" />
              {notification}
            </motion.div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-charcoal/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-soft-cream rounded-3xl p-8 max-w-md w-full shadow-2xl border border-soft-cream/20"
            >
              <h3 className="text-charcoal text-2xl font-bold mb-6">
                {editingItemName ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}
              </h3>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="text-charcoal/40 text-xs font-bold uppercase tracking-widest mb-1 block">Nama Bahan</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Tomato Sauce"
                    className="w-full bg-charcoal/5 border border-charcoal/10 rounded-xl px-4 py-3 text-charcoal focus:outline-none focus:border-amber transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-charcoal/40 text-xs font-bold uppercase tracking-widest mb-1 block">Satuan (Unit)</label>
                    <select
                      value={itemUnit}
                      onChange={(e) => {
                        setItemUnit(e.target.value);
                        if (e.target.value === 'custom') {
                          setIsCustomUnit(true);
                        } else {
                          setIsCustomUnit(false);
                          setCustomUnit('');
                        }
                      }}
                      className="w-full bg-charcoal/5 border border-charcoal/10 rounded-xl px-4 py-3 text-charcoal focus:outline-none focus:border-amber transition-colors appearance-none cursor-pointer"
                    >
                      <option value="pcs">pcs</option>
                      <option value="ml">ml</option>
                      <option value="gr">gr</option>
                      <option value="kg">kg</option>
                      <option value="liter">liter</option>
                      <option value="porsi text-charcoal">porsi</option>
                      <option value="box">box</option>
                      <option value="custom">Lainnya...</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-charcoal/40 text-xs font-bold uppercase tracking-widest mb-1 block">Sisa Stok</label>
                    <input 
                      type="number" 
                      value={itemStock}
                      onChange={(e) => setItemStock(e.target.value)}
                      className="w-full bg-charcoal/5 border border-charcoal/10 rounded-xl px-4 py-3 text-charcoal focus:outline-none focus:border-amber transition-colors"
                    />
                  </div>
                </div>

                {isCustomUnit && (
                  <div>
                    <label className="text-charcoal/40 text-xs font-bold uppercase tracking-widest mb-1 block">Tulis Satuan Baru</label>
                    <input 
                      type="text" 
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      placeholder="Contoh: botol, pack, cup"
                      className="w-full bg-charcoal/5 border border-charcoal/10 rounded-xl px-4 py-3 text-charcoal focus:outline-none focus:border-amber transition-colors"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={closeModal}
                  className="flex-1 py-3 bg-charcoal/10 text-charcoal font-bold rounded-xl hover:bg-charcoal/20 transition-colors"
                >
                  Batal
                </button>
                <button 
                  disabled={!itemName}
                  onClick={saveItem}
                  className="flex-1 py-3 bg-amber text-charcoal font-bold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-none transition-all"
                >
                  {editingItemName ? 'Update Data' : 'Simpan Data'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirm(false)}
              className="absolute inset-0 bg-charcoal/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-soft-cream rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-soft-cream/20 text-center"
            >
              <div className="w-16 h-16 bg-soft-red/10 border border-soft-red/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-soft-red">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-charcoal text-2xl font-bold mb-3">
                Konfirmasi Reset
              </h3>
              <p className="text-charcoal/60 text-sm mb-8 leading-relaxed">
                Apakah Anda yakin ingin menyetel semua sisa stok bahan baku dan jumlah bahan yang terpakai menjadi <strong>nol (0)</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-3 bg-charcoal/10 text-charcoal text-xs font-bold rounded-xl hover:bg-charcoal/20 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleResetInventory}
                  className="flex-1 py-3 bg-soft-red text-white text-xs font-bold rounded-xl hover:bg-soft-red/90 hover:shadow-lg transition-all"
                >
                  Ya, Reset Semua
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
