import { useState } from 'react';
import { Search, Calendar, MoreVertical, Trash2, Edit3, X, Check, History, Plus, CheckCircle2, CreditCard, Eye, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { Transaction, PaymentMethod } from '../types';
import { MOCK_TRANSACTIONS, MENU_ITEMS } from '../constants';
import { cn, formatRupiah } from '../lib/utils';

interface HistoryViewProps {
  onToggleSidebar?: () => void;
  transactions: Transaction[];
  onUpdateTransactions: (transactions: Transaction[]) => void;
  onDeleteTransaction: (id: string) => void;
  role?: string;
}

const MONTH_NAMES = [
  { id: '01', name: 'Januari' },
  { id: '02', name: 'Februari' },
  { id: '03', name: 'Maret' },
  { id: '04', name: 'April' },
  { id: '05', name: 'Mei' },
  { id: '06', name: 'Juni' },
  { id: '07', name: 'Juli' },
  { id: '08', name: 'Agustus' },
  { id: '09', name: 'September' },
  { id: '10', name: 'Oktober' },
  { id: '11', name: 'November' },
  { id: '12', name: 'Desember' }
];

export default function HistoryView({ 
  onToggleSidebar, 
  transactions, 
  onUpdateTransactions,
  onDeleteTransaction,
  role
}: HistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<PaymentMethod | 'All'>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [tempPaymentMethod, setTempPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);

  // New Date, Month, Year Filter state
  const [filterMonth, setFilterMonth] = useState<string>('All');
  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterDate, setFilterDate] = useState<string>('');

  const uniqueYears = Array.from(new Set(transactions.map(tr => {
    try {
      return tr.timestamp ? tr.timestamp.split('-')[0] : new Date().getFullYear().toString();
    } catch (e) {
      return new Date().getFullYear().toString();
    }
  }))).filter(Boolean).sort((a, b) => b.localeCompare(a));

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredTransactions = transactions.filter(tr => {
    const orderNum = tr.orderNumber || '';
    const matchesSearch = orderNum.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPayment = selectedPaymentFilter === 'All' ? true : tr.paymentMethod === selectedPaymentFilter;
    
    // Check if matching custom date filters
    let matchesDateFilters = true;
    if (filterDate) {
      const trDateOnly = (tr.timestamp || '').split('T')[0];
      matchesDateFilters = trDateOnly === filterDate;
    } else {
      if (tr.timestamp) {
        const parts = tr.timestamp.split('T')[0].split('-'); // ["2026", "05", "20"]
        const trYear = parts[0];
        const trMonth = parts[1];
        
        if (filterMonth !== 'All') {
          matchesDateFilters = matchesDateFilters && (trMonth === filterMonth);
        }
        if (filterYear !== 'All') {
          matchesDateFilters = matchesDateFilters && (trYear === filterYear);
        }
      }
    }

    return matchesSearch && matchesPayment && matchesDateFilters;
  });

  const deleteTransaction = (id: string) => {
    onDeleteTransaction(id);
    triggerNotification('Transaksi berhasil dihapus');
  };

  const updateStatus = (id: string, status: 'COMPLETED' | 'VOID') => {
    const newTrs = transactions.map(tr => 
      tr.id === id ? { ...tr, status: status as any } : tr
    );
    onUpdateTransactions(newTrs);
    triggerNotification(`Status transaksi diupdate ke ${status}`);
  };

  const addTransaction = () => {
    const newTr: Transaction = {
      id: `tr-${Date.now()}`,
      orderNumber: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toLocaleString('sv-SE').replace(' ', 'T'),
      items: [{ ...MENU_ITEMS[0], quantity: 1 }],
      total: MENU_ITEMS[0].price,
      paymentMethod: 'Tunai',
      status: 'COMPLETED'
    };
    onUpdateTransactions([newTr, ...transactions]);
    setShowAddModal(false);
    triggerNotification('Transaksi berhasil ditambahkan');
  };

  const exportToExcel = () => {
    if (filteredTransactions.length === 0) {
      triggerNotification('Tidak ada transaksi yang dapat diekspor');
      return;
    }

    const excelData: any[] = filteredTransactions.map((tr) => {
      const itemsList = tr.items.map(item => `${item.name} (${item.quantity}x)`).join(', ');
      
      const formattedDate = new Date(tr.timestamp).toLocaleDateString('id-ID', {
        day: '2-digit', 
        month: 'short', 
        year: 'numeric'
      });
      const formattedTime = new Date(tr.timestamp).toLocaleTimeString('id-ID', {
        hour: '2-digit', 
        minute: '2-digit'
      });

      return {
        'ID Transaksi': tr.id,
        'Order ID': tr.orderNumber,
        'Tanggal': formattedDate,
        'Waktu': formattedTime,
        'Menu Terjual': itemsList,
        'Total Belanja (IDR)': tr.total,
        'Metode Pembayaran': tr.paymentMethod,
        'Status': tr.status === 'COMPLETED' ? 'COMPLETED' : 'VOID'
      };
    });

    const totalRevenue = filteredTransactions.reduce((acc, tr) => acc + (tr.status === 'COMPLETED' ? tr.total : 0), 0);
    const totalTransactions = filteredTransactions.length;
    const completedCount = filteredTransactions.filter(t => t.status === 'COMPLETED').length;
    const voidedCount = filteredTransactions.filter(t => t.status === 'VOID').length;

    excelData.push({
      'ID Transaksi': '',
      'Order ID': '',
      'Tanggal': '',
      'Waktu': '',
      'Menu Terjual': '',
      'Total Belanja (IDR)': undefined as any,
      'Metode Pembayaran': '',
      'Status': ''
    });

    excelData.push({
      'ID Transaksi': 'TOTAL TRANSAKSI',
      'Order ID': `${totalTransactions} Order (${completedCount} Sukses, ${voidedCount} Void)`,
      'Tanggal': '',
      'Waktu': '',
      'Menu Terjual': 'TOTAL OMSET BERSIH (SUKSES)',
      'Total Belanja (IDR)': totalRevenue,
      'Metode Pembayaran': '',
      'Status': ''
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    worksheet['!cols'] = [
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 45 },
      { wch: 22 },
      { wch: 18 },
      { wch: 12 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Penjualan');

    let filename = 'Laporan_Penjualan_Semua.xlsx';
    if (filterDate) {
      filename = `Laporan_Penjualan_${filterDate}.xlsx`;
    } else if (filterMonth !== 'All' || filterYear !== 'All') {
      const monthStr = filterMonth !== 'All' ? (MONTH_NAMES.find(m => m.id === filterMonth)?.name || '') : 'Semua';
      const yearStr = filterYear !== 'All' ? filterYear : 'Semua';
      filename = `Laporan_Penjualan_${monthStr}_${yearStr}.xlsx`;
    }

    XLSX.writeFile(workbook, filename);
    triggerNotification('Laporan Excel berhasil diunduh!');
  };

  const startEditing = (tr: Transaction) => {
    setEditingId(tr.id);
    setTempPaymentMethod(tr.paymentMethod);
  };

  const savePaymentMethod = () => {
    if (editingId && tempPaymentMethod) {
      onUpdateTransactions(transactions.map(tr => 
        tr.id === editingId ? { ...tr, paymentMethod: tempPaymentMethod } : tr
      ));
      setEditingId(null);
      setTempPaymentMethod(null);
      triggerNotification('Metode pembayaran berhasil diperbarui');
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setTempPaymentMethod(null);
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
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Riwayat Transaksi</h1>
              <p className="text-[10px] sm:text-xs text-soft-cream/40 mt-0.5">Kelola dan tinjau log penjualan</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <div className="relative flex-1 min-w-[130px] md:min-w-64 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-soft-cream/40" />
              <input 
                type="text" 
                placeholder="Cari Order ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-soft-cream/5 border border-soft-cream/10 rounded-xl py-2 pl-9 pr-3 text-xs md:text-sm focus:outline-none focus:border-amber/50 transition-colors"
              />
            </div>
            
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-3 py-2 bg-amber text-charcoal rounded-xl font-bold text-xs md:text-sm hover:scale-105 transition-transform flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah</span>
            </button>

            <button 
              onClick={exportToExcel}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs md:text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 shadow-lg shadow-emerald-600/20"
              title="Ekspor laporan transaksi berfilter ke Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
            
            <div className="flex items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0">
              <div className="relative group flex-1 sm:flex-initial">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-soft-cream/40 group-hover:text-amber transition-colors pointer-events-none" />
                <select 
                  value={selectedPaymentFilter}
                  onChange={(e) => setSelectedPaymentFilter(e.target.value as any)}
                  className="w-full sm:w-auto bg-soft-cream/5 border border-soft-cream/10 rounded-xl py-2 pl-8 pr-7 text-xs focus:outline-none focus:border-amber/50 text-soft-cream/60 hover:text-soft-cream appearance-none cursor-pointer"
                >
                  <option value="All">Semua Bayar</option>
                  <option value="Tunai">Tunai</option>
                  <option value="QRIS">QRIS</option>
                  <option value="Debit">Debit</option>
                  <option value="Ojol">Ojol</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-soft-cream/20">
                  <Plus className="w-3 h-3 rotate-45" />
                </div>
              </div>

              <div className="relative group flex-1 sm:flex-initial">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-soft-cream/40 group-hover:text-amber transition-colors pointer-events-none" />
                <input 
                  type="date" 
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    if (e.target.value) {
                      setFilterMonth('All');
                    }
                  }}
                  className="w-full bg-soft-cream/5 border border-soft-cream/10 rounded-xl py-2 pl-8 pr-3 text-xs focus:outline-none focus:border-amber/50 transition-colors text-soft-cream/60 hover:text-soft-cream"
                />
                {filterDate && (
                  <button 
                    onClick={() => setFilterDate('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 hover:bg-soft-red/20 text-soft-red rounded-lg transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar">
        <div className="bg-soft-cream/5 border border-soft-cream/10 rounded-2xl overflow-hidden shadow-sm">
          {/* Filter Panel di dalam Kotak Tabel */}
          <div className="p-4 sm:p-6 border-b border-soft-cream/10 bg-charcoal/30 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 md:w-5 md:h-5 text-amber" />
                <span className="text-xs md:text-sm font-bold text-soft-cream/80">Filter Tanggal, Bulan & Tahun Tabel</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Filter Tanggal */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] md:text-[10px] text-soft-cream/40 font-black uppercase tracking-wider">Pilih Tanggal</span>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => {
                      setFilterDate(e.target.value);
                      if (e.target.value) {
                        setFilterMonth('All');
                      }
                    }}
                    className="bg-charcoal border border-soft-cream/10 rounded-xl px-2.5 py-1.5 text-xs text-soft-cream font-bold outline-none focus:border-amber/50 transition-colors"
                  />
                </div>

                {/* Filter Bulan */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] md:text-[10px] text-soft-cream/40 font-black uppercase tracking-wider">Pilih Bulan</span>
                  <select
                    value={filterMonth}
                    onChange={(e) => {
                      setFilterMonth(e.target.value);
                      setFilterDate('');
                    }}
                    className="bg-charcoal border border-soft-cream/10 rounded-xl px-2.5 py-1.5 text-xs text-soft-cream font-bold outline-none focus:border-amber/50 transition-colors cursor-pointer"
                  >
                    <option value="All">Semua Bulan</option>
                    {MONTH_NAMES.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Tahun */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] md:text-[10px] text-soft-cream/40 font-black uppercase tracking-wider">Pilih Tahun</span>
                  <select
                    value={filterYear}
                    onChange={(e) => {
                      setFilterYear(e.target.value);
                      setFilterDate('');
                    }}
                    className="bg-charcoal border border-soft-cream/10 rounded-xl px-2.5 py-1.5 text-xs text-soft-cream font-bold outline-none focus:border-amber/50 transition-colors cursor-pointer"
                  >
                    <option value="All">Semua Tahun</option>
                    {uniqueYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {(filterDate || filterMonth !== 'All' || filterYear !== 'All') && (
                  <button
                    onClick={() => {
                      setFilterDate('');
                      setFilterMonth('All');
                      setFilterYear('All');
                    }}
                    className="mt-4 sm:mt-5 px-3 py-1.5 bg-soft-red/10 border border-soft-red/20 text-soft-red hover:bg-soft-red/20 rounded-xl text-xs font-bold transition-all"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>

            {/* Quick Month Filter (1 Click Selector) */}
            <div className="pt-2 border-t border-soft-cream/5">
              <span className="block text-[10px] text-soft-cream/40 font-black uppercase tracking-wider mb-2">Akses Cepat Per Bulan (Sekali Klik)</span>
              <div className="flex flex-wrap gap-1.5 p-1 bg-charcoal/20 rounded-xl border border-soft-cream/5">
                <button
                  type="button"
                  onClick={() => {
                    setFilterMonth('All');
                    setFilterDate('');
                    if (filterYear === 'All' && uniqueYears.length > 0) {
                      setFilterYear(uniqueYears[0]);
                    }
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200",
                    filterMonth === 'All' && !filterDate
                      ? "bg-amber text-charcoal shadow shadow-amber/10 scale-105"
                      : "text-soft-cream/50 hover:text-soft-cream hover:bg-soft-cream/5"
                  )}
                >
                  Semua Bulan
                </button>
                {MONTH_NAMES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setFilterMonth(m.id);
                      setFilterDate('');
                      if (filterYear === 'All' && uniqueYears.length > 0) {
                        setFilterYear(uniqueYears[0]);
                      }
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200",
                      filterMonth === m.id && !filterDate
                        ? "bg-amber text-charcoal shadow shadow-amber/10 scale-105"
                        : "text-soft-cream/50 hover:text-soft-cream hover:bg-soft-cream/5"
                    )}
                  >
                    {m.name.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-soft-cream/5 text-soft-cream/40 text-xs uppercase tracking-widest border-b border-soft-cream/5">
                  <th className="px-5 py-3.5 font-bold">Waktu & Tanggal</th>
                  <th className="px-5 py-3.5 font-bold">Total</th>
                  <th className="px-5 py-3.5 font-bold">Pembayaran</th>
                  <th className="px-5 py-3.5 font-bold">Status</th>
                  <th className="px-5 py-3.5 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-cream/5 text-xs">
                <AnimatePresence mode="popLayout">
                  {filteredTransactions.map((tr, idx) => (
                    <motion.tr 
                      key={`history-tr-${tr.id || idx}-${idx}`}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "hover:bg-soft-cream/5 transition-colors group",
                        tr.status === 'VOID' && "opacity-50 grayscale"
                      )}
                    >
                      <td className="px-5 py-3.5 font-bold">
                        <div className="text-soft-cream">{new Date(tr.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <div className="text-soft-cream/40">{new Date(tr.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-5 py-3.5 font-black">
                        {formatRupiah(tr.total)}
                      </td>
                      <td className="px-5 py-3.5">
                        {editingId === tr.id ? (
                          <div className="flex items-center gap-2">
                            <select 
                              value={tempPaymentMethod || tr.paymentMethod}
                            onChange={(e) => setTempPaymentMethod(e.target.value as PaymentMethod)}
                            className="bg-charcoal border border-soft-cream/20 rounded-lg px-2 py-1 text-xs text-soft-cream focus:outline-none"
                          >
                            {['Tunai', 'QRIS', 'Debit', 'Ojol'].map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          <button onClick={savePaymentMethod} className="p-1 bg-green-500/20 text-green-500 rounded hover:bg-green-500/30">
                            <Check className="w-3 h-3" />
                          </button>
                          <button onClick={cancelEditing} className="p-1 bg-soft-red/20 text-soft-red rounded hover:bg-soft-red/30">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-1 bg-soft-cream/10 rounded-lg">
                          {tr.paymentMethod}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        tr.status === 'COMPLETED' ? "bg-green-400/10 text-green-400" : "bg-soft-red/10 text-soft-red"
                      )}>
                        {tr.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === tr.id ? (
                          <button 
                            onClick={savePaymentMethod} 
                            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-500 rounded-xl font-bold text-xs"
                          >
                            <Check className="w-4 h-4" />
                            Simpan
                          </button>
                        ) : (
                          <div className="relative">
                            <button 
                              onClick={() => setOpenMenuId(openMenuId === tr.id ? null : tr.id)}
                              className={cn(
                                "p-2 rounded-xl transition-all",
                                openMenuId === tr.id ? "bg-amber text-charcoal" : "hover:bg-soft-cream/10 text-soft-cream/40"
                              )}
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>

                            <AnimatePresence>
                              {openMenuId === tr.id && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setOpenMenuId(null)}
                                  />
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.9, x: 10 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, x: 10 }}
                                    className="absolute right-0 top-full mt-2 w-48 bg-charcoal border border-soft-cream/10 rounded-2xl shadow-2xl z-20 py-2"
                                  >
                                    <button 
                                      onClick={() => {
                                        setViewingTransaction(tr);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-soft-cream/60 hover:bg-soft-cream/10 transition-colors"
                                    >
                                      <Eye className="w-4 h-4" />
                                      View Order
                                    </button>
                                    <div className="mx-2 my-1 border-t border-soft-cream/5" />
                                    <button 
                                      onClick={() => {
                                        startEditing(tr);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-amber hover:bg-amber/10 transition-colors"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                      Edit Order
                                    </button>
                                    {tr.status === 'VOID' ? (
                                      <button 
                                        onClick={() => {
                                          updateStatus(tr.id, 'COMPLETED');
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-green-500 hover:bg-green-500/10 transition-colors"
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Set Completed
                                      </button>
                                    ) : (
                                      <button 
                                        onClick={() => {
                                          updateStatus(tr.id, 'VOID');
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-soft-red/60 hover:bg-soft-red/5 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        Void Order
                                      </button>
                                    )}
                                    {role === 'ADMIN' && (
                                      <>
                                        <div className="mx-2 my-1 border-t border-soft-cream/5" />
                                        <button 
                                          onClick={() => {
                                            deleteTransaction(tr.id);
                                            setOpenMenuId(null);
                                          }}
                                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-soft-red hover:bg-soft-red/10 transition-colors"
                                        >
                                          <X className="w-4 h-4" />
                                          Hapus Permanen
                                        </button>
                                      </>
                                    )}
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          </div>
          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center text-soft-cream/20">
              <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium text-lg">Tidak ada transaksi ditemukan</p>
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

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-charcoal/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-soft-cream rounded-3xl p-8 max-w-md w-full shadow-2xl border border-soft-cream/20"
            >
              <h3 className="text-charcoal text-2xl font-bold mb-4">Tambah Transaksi</h3>
              <p className="text-charcoal/60 mb-8">Ini akan membuat transaksi demonstrasi (ORD-RANDOM) dengan menu default.</p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-charcoal/10 text-charcoal font-bold rounded-xl hover:bg-charcoal/20 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={addTransaction}
                  className="flex-1 py-3 bg-amber text-charcoal font-bold rounded-xl hover:shadow-lg hover:shadow-amber/20 transition-all"
                >
                  Konfirmasi
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {viewingTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingTransaction(null)}
              className="absolute inset-0 bg-charcoal/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-charcoal border border-soft-cream/10 rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-soft-cream text-2xl font-bold">Detail Pesanan</h3>
                  <button 
                    onClick={() => setViewingTransaction(null)}
                    className="p-2 hover:bg-soft-cream/10 rounded-xl text-soft-cream/40 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-amber font-mono font-bold text-sm">{viewingTransaction.orderNumber}</span>
                  <div className="w-1 h-1 bg-soft-cream/20 rounded-full" />
                  <span className="text-soft-cream/40 text-xs font-medium">
                    {new Date(viewingTransaction.timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-4 mb-8 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {viewingTransaction.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-soft-cream/5 flex items-center justify-center text-[10px] font-bold text-amber border border-soft-cream/10">
                        {item.quantity}x
                      </div>
                      <div>
                        <p className="text-sm font-bold text-soft-cream">{item.name}</p>
                        <p className="text-[10px] text-soft-cream/40 uppercase font-bold tracking-wider">{formatRupiah(item.price)}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-soft-cream">
                      {formatRupiah(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Footer Summary */}
              <div className="pt-6 border-t border-soft-cream/10 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-soft-cream/40 font-medium tracking-wide border-b border-soft-cream/10 pb-1">Subtotal</span>
                  <span className="text-soft-cream font-bold">{formatRupiah(viewingTransaction.total)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-soft-cream/40 text-xs font-bold uppercase tracking-widest">Metode Bayar</span>
                  <span className="px-3 py-1 bg-amber/10 text-amber text-[10px] font-black rounded-lg border border-amber/20">
                    {viewingTransaction.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-soft-cream/60 font-bold uppercase text-[10px] tracking-[0.2em]">Status Transaksi</span>
                  <div className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-widest",
                    viewingTransaction.status === 'COMPLETED' ? "bg-green-400/10 text-green-400 border-green-400/20" : "bg-soft-red/10 text-soft-red border-soft-red/20"
                  )}>
                    {viewingTransaction.status}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setViewingTransaction(null)}
                className="w-full mt-8 py-3.5 bg-amber text-charcoal font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-amber/10 text-sm uppercase tracking-widest"
              >
                Tutup Detail
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
