import { useState } from 'react';
import { Database, Search, Plus, Trash2, Edit3, Image as ImageIcon, CreditCard, Tag, LayoutGrid, List, X, CheckCircle2, MoreVertical, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MenuItem, Category, PaymentMethod, IngredientRequirement, StockItem } from '../types';
import { MENU_ITEMS } from '../constants';
import { cn, formatRupiah } from '../lib/utils';

interface MasterDataViewProps {
  onToggleSidebar?: () => void;
  categories: { name: string; isActive: boolean }[];
  payments: { name: string; isActive: boolean }[];
  menuItems: MenuItem[];
  inventory: StockItem[];
  onToggleCategory: (name: string) => void;
  onTogglePayment: (name: string) => void;
  onAddMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  onUpdateMenuItem: (id: string, item: Partial<MenuItem>) => void;
  onDeleteMenuItem: (id: string) => void;
  onAddCategory: (name: string, isActive?: boolean) => void;
  onDeleteCategory: (name: string) => void;
  onAddPayment: (name: string, isActive?: boolean) => void;
  onDeletePayment: (name: string) => void;
}

export default function MasterDataView({ 
  onToggleSidebar, 
  categories, 
  payments, 
  menuItems,
  inventory,
  onToggleCategory, 
  onTogglePayment,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
  onAddCategory,
  onDeleteCategory,
  onAddPayment,
  onDeletePayment
}: MasterDataViewProps) {
  const [activeTab, setActiveTab] = useState<'menu' | 'categories' | 'payments'>('menu');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Menu Modal State
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [menuFormData, setMenuFormData] = useState({
    name: '',
    price: '',
    category: 'Burgers' as Category,
    image: '',
    isActive: true,
    ingredients: [] as IngredientRequirement[]
  });

  // Simple Item Modal State (for Categories/Payments)
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemValue, setItemValue] = useState('');
  const [itemActive, setItemActive] = useState(true);
  const [notification, setNotification] = useState<{ message: string; isError?: boolean } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openSubMenuId, setOpenSubMenuId] = useState<string | null>(null);

  const triggerNotification = (msg: string, isError: boolean = false) => {
    setNotification({ message: msg, isError });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredMenu = menuItems.filter(item => 
    (item.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const deleteMenuItem = (id: string) => {
    onDeleteMenuItem(id);
    triggerNotification('Item menu berhasil dihapus');
  };

  const openMenuModal = (item?: MenuItem) => {
    if (item) {
      setEditingMenuId(item.id);
      setMenuFormData({
        name: item.name,
        price: item.price.toString(),
        category: item.category,
        image: item.image,
        isActive: item.isActive !== false,
        ingredients: item.ingredients || []
      });
    } else {
      setEditingMenuId(null);
      setMenuFormData({
        name: '',
        price: '',
        category: categories[0]?.name || 'Burgers',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=400&h=300&auto=format&fit=crop',
        isActive: true,
        ingredients: []
      });
    }
    setShowMenuModal(true);
  };

  const closeMenuModal = () => {
    setShowMenuModal(false);
    setEditingMenuId(null);
  };

  const handleSaveMenu = () => {
    const trimmedName = menuFormData.name.trim();
    if (!trimmedName) {
      triggerNotification('Nama menu tidak boleh kosong', true);
      return;
    }

    // Check if duplicate name exists (case-insensitive)
    const isDuplicate = menuItems.some(item => 
      item.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
      item.id !== editingMenuId
    );

    if (isDuplicate) {
      triggerNotification('Nama menu tidak boleh sama, silakan gunakan nama lain', true);
      return;
    }

    const rawImage = menuFormData.image ? menuFormData.image.trim() : '';
    
    // Helper to convert Google Drive sharing link to direct view link
    const convertDriveUrl = (url: string): string => {
      const trimmed = url.trim();
      const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileDMatch && fileDMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${fileDMatch[1]}`;
      }
      const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
      }
      return trimmed;
    };

    const finalImage = rawImage ? convertDriveUrl(rawImage) : 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=400&h=300&auto=format&fit=crop';

    const itemData: Omit<MenuItem, 'id'> = {
      name: trimmedName,
      price: parseInt(menuFormData.price) || 0,
      category: menuFormData.category,
      image: finalImage,
      isActive: menuFormData.isActive,
      ingredients: menuFormData.ingredients
    };

    if (editingMenuId) {
      onUpdateMenuItem(editingMenuId, itemData);
      triggerNotification('Item menu berhasil diperbarui');
    } else {
      onAddMenuItem(itemData);
      triggerNotification('Item menu baru berhasil ditambahkan');
    }
    closeMenuModal();
  };

  // Simple Item Methods
  const openItemModal = (value?: string, index?: number) => {
    setItemValue(value || '');
    if (index !== undefined) {
      const item = activeTab === 'categories' ? categories[index] : payments[index];
      setItemActive(item.isActive !== false);
    } else {
      setItemActive(true);
    }
    setEditingItemIndex(index !== undefined ? index : null);
    setShowItemModal(true);
  };

  const handleSaveSimpleItem = () => {
    const trimmedValue = itemValue.trim();
    if (!trimmedValue) return;

    if (activeTab === 'categories') {
      const isDuplicate = categories.some((c, index) => 
        c.name.trim().toLowerCase() === trimmedValue.toLowerCase() &&
        index !== editingItemIndex
      );
      if (isDuplicate) {
        triggerNotification('Nama kategori sudah ada', true);
        return;
      }

      if (editingItemIndex !== null) {
        // If name changed, delete old one
        const oldName = categories[editingItemIndex].name;
        if (oldName.trim().toLowerCase() !== trimmedValue.toLowerCase()) {
          onDeleteCategory(oldName);
        }
      }
      onAddCategory(trimmedValue, itemActive);
      triggerNotification('Kategori disimpan');
    } else {
      const isDuplicate = payments.some((p, index) => 
        p.name.trim().toLowerCase() === trimmedValue.toLowerCase() &&
        index !== editingItemIndex
      );
      if (isDuplicate) {
        triggerNotification('Metode pembayaran sudah ada', true);
        return;
      }

      if (editingItemIndex !== null) {
        const oldName = payments[editingItemIndex].name;
        if (oldName.trim().toLowerCase() !== trimmedValue.toLowerCase()) {
          onDeletePayment(oldName);
        }
      }
      onAddPayment(trimmedValue, itemActive);
      triggerNotification('Metode pembayaran disimpan');
    }
    setShowItemModal(false);
  };

  const deleteSimpleItem = (index: number) => {
    if (activeTab === 'categories') {
      onDeleteCategory(categories[index].name);
      triggerNotification('Kategori dihapus');
    } else {
      onDeletePayment(payments[index].name);
      triggerNotification('Metode pembayaran dihapus');
    }
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
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Master Data</h1>
              <p className="text-[10px] sm:text-xs text-soft-cream/40 mt-0.5">Konfigurasi menu, kategori, dan metode pembayaran</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-1 bg-soft-cream/5 p-1 rounded-xl border border-soft-cream/10 w-fit max-w-full">
            {[
              { id: 'menu', label: 'Menu', icon: Database },
              { id: 'categories', label: 'Kategori', icon: Tag },
              { id: 'payments', label: 'Pembayaran', icon: CreditCard },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setOpenMenuId(null);
                  setOpenSubMenuId(null);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  activeTab === tab.id 
                    ? "bg-amber text-charcoal shadow-md" 
                    : "text-soft-cream/40 hover:text-soft-cream hover:bg-soft-cream/5"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar">
        {activeTab === 'menu' && (
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 w-full">
                <div className="relative flex-1 min-w-[130px] md:min-w-64 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-soft-cream/40" />
                  <input 
                    type="text" 
                    placeholder="Cari menu..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-soft-cream/5 border border-soft-cream/10 rounded-xl py-2 pl-9 pr-3 text-xs md:text-sm focus:outline-none focus:border-amber/50 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-0.5 bg-soft-cream/5 p-1 rounded-xl border border-soft-cream/10 shrink-0">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "p-1.5 rounded-lg transition-all",
                      viewMode === 'grid' ? "bg-amber text-charcoal shadow-sm" : "text-soft-cream/40 hover:text-soft-cream"
                    )}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "p-1.5 rounded-lg transition-all",
                      viewMode === 'list' ? "bg-amber text-charcoal shadow-sm" : "text-soft-cream/40 hover:text-soft-cream"
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button 
                onClick={() => openMenuModal()}
                className="px-4 py-2 bg-amber text-charcoal rounded-xl font-bold text-xs md:text-sm hover:scale-105 transition-transform flex items-center justify-center gap-1.5 shrink-0 w-full sm:w-auto mt-1 sm:mt-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Menu</span>
              </button>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredMenu.map((item, idx) => (
                    <motion.div
                      key={`master-grid-item-${item.id || idx}-${idx}`}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={cn(
                        "bg-soft-cream/5 border border-soft-cream/10 rounded-2xl overflow-hidden group hover:border-amber/30 transition-colors relative",
                        item.isActive === false && "opacity-60 grayscale-[0.5]"
                      )}
                    >
                      <div className="relative h-40 overflow-hidden">
                        <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute top-3 left-3 flex gap-2">
                          <div className="bg-charcoal/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-amber border border-amber/20 uppercase tracking-wider">
                            {item.category}
                          </div>
                          {item.isActive === false && (
                            <div className="bg-soft-red/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white border border-soft-red/20 uppercase tracking-wider">
                              Non-aktif
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => {
                            const itemToToggle = menuItems.find(i => i.id === item.id);
                            if (itemToToggle) {
                              const currentActive = itemToToggle.isActive !== false;
                              onUpdateMenuItem(item.id, { isActive: !currentActive });
                              triggerNotification(`Item menu ${!currentActive ? 'ditampilkan' : 'disembunyikan'}`);
                            }
                          }}
                          className={cn(
                            "absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all z-10",
                            item.isActive !== false 
                              ? "bg-amber text-charcoal shadow-lg hover:scale-110" 
                              : "bg-charcoal/60 text-soft-cream/40"
                          )}
                          title={item.isActive !== false ? "Sembunyikan dari POS" : "Tampilkan di POS"}
                        >
                          {item.isActive !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="p-5 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <h4 className="font-bold truncate">{item.name}</h4>
                          <p className="text-amber font-bold mt-1">{formatRupiah(item.price)}</p>
                        </div>
                        <div className="relative">
                          <button 
                            onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                            className={cn(
                              "p-2 rounded-xl transition-all",
                              openMenuId === item.id ? "bg-amber text-charcoal shadow-lg" : "hover:bg-soft-cream/10 text-soft-cream/40"
                            )}
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>

                          <AnimatePresence>
                            {openMenuId === item.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                  className="absolute right-0 bottom-full mb-2 w-40 bg-charcoal border border-soft-cream/10 rounded-2xl shadow-2xl z-20 overflow-hidden"
                                >
                                  <button 
                                    onClick={() => {
                                      openMenuModal(item);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-amber hover:bg-amber/10 transition-colors border-b border-soft-cream/5"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                    Edit Menu
                                  </button>
                                  <button 
                                    onClick={() => {
                                      deleteMenuItem(item.id);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-soft-red hover:bg-soft-red/10 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Hapus Menu
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-soft-cream/5 border border-soft-cream/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-soft-cream/5 text-soft-cream/40 text-xs uppercase tracking-widest">
                      <th className="px-6 py-4 font-bold">Menu</th>
                      <th className="px-6 py-4 font-bold">Kategori</th>
                      <th className="px-6 py-4 font-bold">Harga</th>
                      <th className="px-6 py-4 font-bold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soft-cream/5">
                    {filteredMenu.map((item, idx) => (
                      <tr key={`master-row-item-${item.id || idx}-${idx}`} className={cn(
                        "hover:bg-soft-cream/5 transition-colors group",
                        item.isActive === false && "opacity-50"
                      )}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img src={item.image} className="w-10 h-10 rounded-lg object-cover" />
                              {item.isActive === false && <div className="absolute inset-0 bg-charcoal/60 rounded-lg flex items-center justify-center"><EyeOff className="w-4 h-4 text-white/40" /></div>}
                            </div>
                            <span className={cn("font-bold", item.isActive === false && "line-through text-soft-cream/40")}>{item.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold px-2 py-1 bg-soft-cream/10 rounded-lg">{item.category}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-amber">
                          {formatRupiah(item.price)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                const itemToToggle = menuItems.find(i => i.id === item.id);
                                if (itemToToggle) {
                                  const currentActive = itemToToggle.isActive !== false;
                                  onUpdateMenuItem(item.id, { isActive: !currentActive });
                                  triggerNotification(`Item menu ${!currentActive ? 'ditampilkan' : 'disembunyikan'}`);
                                }
                              }}
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
                            <div className="relative">
                            <button 
                              onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                              className={cn(
                                "p-2 rounded-xl transition-all",
                                openMenuId === item.id ? "bg-amber text-charcoal shadow-lg" : "hover:bg-soft-cream/10 text-soft-cream/40"
                              )}
                            >
                              <MoreVertical className="w-5 h-5 text-center mx-auto" />
                            </button>

                            <AnimatePresence>
                              {openMenuId === item.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.9, x: 10 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, x: 10 }}
                                    className="absolute right-0 top-0 w-40 bg-charcoal border border-soft-cream/10 rounded-2xl shadow-2xl z-20 overflow-hidden"
                                  >
                                    <button 
                                      onClick={() => {
                                        openMenuModal(item);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-amber hover:bg-amber/10 transition-colors border-b border-soft-cream/5"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                      Edit Menu
                                    </button>
                                    <button 
                                      onClick={() => {
                                        deleteMenuItem(item.id);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-soft-red hover:bg-soft-red/10 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Hapus Menu
                                    </button>
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {(activeTab === 'categories' || activeTab === 'payments') && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Kelola {activeTab === 'categories' ? 'Kategori' : 'Metode Pembayaran'}</h3>
              <button 
                onClick={() => openItemModal()}
                className="flex items-center gap-2 px-4 py-2 bg-amber text-charcoal rounded-xl font-bold text-sm"
              >
                <Plus className="w-4 h-4" />
                Tambah
              </button>
            </div>
            
            <div className="bg-soft-cream/5 border border-soft-cream/10 rounded-2xl divide-y divide-soft-cream/5">
              {(activeTab === 'categories' ? categories : payments).map((item, i) => (
                <div key={`${activeTab}-${i}`} className={cn(
                  "p-5 flex items-center justify-between hover:bg-soft-cream/5 transition-colors",
                  item.isActive === false && "opacity-50 grayscale-[0.5]"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-xl bg-charcoal border transition-colors",
                      item.isActive !== false ? "border-amber/30 text-amber" : "border-soft-cream/10 text-soft-cream/20"
                    )}>
                      {activeTab === 'categories' ? <Tag className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col">
                      <span className={cn("font-bold", item.isActive === false && "line-through text-soft-cream/40")}>{item.name}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-soft-cream/20">
                        {item.isActive !== false ? 'Bisa Digunakan' : 'Tersembunyi'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const currentActive = item.isActive !== false;
                        if (activeTab === 'categories') {
                          onToggleCategory(item.name);
                          triggerNotification(`Kategori ${!currentActive ? 'ditampilkan' : 'disembunyikan'}`);
                        } else {
                          onTogglePayment(item.name);
                          triggerNotification(`Metode pembayaran ${!currentActive ? 'ditampilkan' : 'disembunyikan'}`);
                        }
                      }}
                      className={cn(
                        "p-2.5 rounded-xl transition-all border",
                        item.isActive !== false 
                          ? "bg-amber/10 border-amber/20 text-amber hover:bg-amber/20" 
                          : "bg-soft-cream/5 border-soft-cream/10 text-soft-cream/40 hover:bg-soft-cream/10"
                      )}
                      title={item.isActive !== false ? "Sembunyikan" : "Tampilkan"}
                    >
                      {item.isActive !== false ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                    <div className="relative">
                      <button 
                        onClick={() => setOpenSubMenuId(openSubMenuId === item.name ? null : item.name)}
                        className={cn(
                          "p-2.5 rounded-xl transition-all",
                          openSubMenuId === item.name ? "bg-amber text-charcoal shadow-lg" : "hover:bg-soft-cream/10 text-soft-cream/40"
                        )}
                      >
                        < MoreVertical className="w-5 h-5" />
                      </button>

                      <AnimatePresence>
                        {openSubMenuId === item.name && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenSubMenuId(null)} />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9, x: 10 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.9, x: 10 }}
                              className="absolute right-0 top-0 w-40 bg-charcoal border border-soft-cream/10 rounded-2xl shadow-2xl z-20 overflow-hidden"
                            >
                              <button 
                                onClick={() => {
                                  openItemModal(item.name, i);
                                  setOpenSubMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-amber hover:bg-amber/10 transition-colors border-b border-soft-cream/5"
                              >
                                <Edit3 className="w-4 h-4" />
                                Edit
                              </button>
                              <button 
                                onClick={() => {
                                  deleteSimpleItem(i);
                                  setOpenSubMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-soft-red hover:bg-soft-red/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Hapus
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {notification && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100]">
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={cn(
                "px-8 py-4 rounded-2xl font-bold shadow-2xl flex items-center gap-3 border border-charcoal/10",
                notification.isError 
                  ? "bg-red-500 text-white" 
                  : "bg-amber text-charcoal"
              )}
            >
              {notification.isError ? (
                <AlertCircle className="w-6 h-6 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
              {notification.message}
            </motion.div>
          </div>
        )}

        {showMenuModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenuModal}
              className="absolute inset-0 bg-charcoal/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-soft-cream rounded-3xl p-6 max-w-md w-full shadow-2xl border border-soft-cream/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-charcoal text-xl font-bold ">
                  {editingMenuId ? 'Edit Menu Item' : 'Tambah Menu Baru'}
                </h3>
                <button onClick={closeMenuModal} className="p-2 hover:bg-charcoal/5 rounded-full text-charcoal/40">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-charcoal/40 text-[10px] font-bold uppercase tracking-widest mb-1 block">Nama Menu</label>
                  <input 
                    type="text" 
                    value={menuFormData.name}
                    onChange={(e) => setMenuFormData({...menuFormData, name: e.target.value})}
                    placeholder="e.g. Cheese Burger"
                    className="w-full bg-charcoal/5 border border-charcoal/10 rounded-lg px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-amber transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-charcoal/40 text-[10px] font-bold uppercase tracking-widest mb-1 block">Harga</label>
                    <input 
                      type="number" 
                      value={menuFormData.price}
                      onChange={(e) => setMenuFormData({...menuFormData, price: e.target.value})}
                      placeholder="45000"
                      className="w-full bg-charcoal/5 border border-charcoal/10 rounded-lg px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-amber transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-charcoal/40 text-[10px] font-bold uppercase tracking-widest mb-1 block">Kategori</label>
                    <select 
                      value={menuFormData.category}
                      onChange={(e) => setMenuFormData({...menuFormData, category: e.target.value as Category})}
                      className="w-full bg-charcoal/5 border border-charcoal/10 rounded-lg px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-amber transition-colors appearance-none"
                    >
                      {categories.map((cat, idx) => (
                        <option key={`cat-opt-${cat.name}-${idx}`} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-charcoal/40 text-[10px] font-bold uppercase tracking-widest mb-1 block">Foto Menu</label>
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
                              const SIZE = 500; // Force 1:1 square ratio for grid consistency
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
                                setMenuFormData({ ...menuFormData, image: compressedDataUrl });
                              } else {
                                setMenuFormData({ ...menuFormData, image: reader.result as string });
                              }
                            };
                            img.src = reader.result as string;
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      title="Upload File Gambar"
                    />
                    <div className="w-full bg-charcoal/5 border border-charcoal/10 border-dashed rounded-lg px-3 py-3 text-sm text-charcoal flex flex-col items-center justify-center gap-2 hover:bg-charcoal/10 transition-colors relative overflow-hidden group h-32">
                      {menuFormData.image && menuFormData.image.startsWith('data:image') ? (
                        <>
                          <img src={menuFormData.image} alt="Preview" className="absolute inset-0 w-full h-full object-contain bg-black/5 opacity-80 group-hover:opacity-40 transition-opacity" />
                          <div className="relative z-10 flex items-center gap-1.5 bg-white/90 px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm hidden group-hover:flex">
                            <Edit3 className="w-4 h-4 text-charcoal/60" />
                            <span className="text-charcoal/80 font-bold text-xs">Ganti Foto</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-charcoal/40" />
                          <span className="text-charcoal/60 font-semibold text-xs">Ketuk untuk pilih foto</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-charcoal/5 px-3 py-2 rounded-lg border border-charcoal/10">
                  <input 
                    type="checkbox" 
                    id="isActiveMenu"
                    checked={menuFormData.isActive !== false}
                    onChange={(e) => setMenuFormData({...menuFormData, isActive: e.target.checked})}
                    className="w-3.5 h-3.5 rounded text-amber focus:ring-amber bg-charcoal/5 border-charcoal/10 accent-amber"
                  />
                  <label htmlFor="isActiveMenu" className="text-charcoal text-xs font-semibold select-none cursor-pointer">
                    Aktif (Tampilkan di POS)
                  </label>
                </div>

                <div className="pt-3 border-t border-charcoal/10">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-charcoal/40 text-[10px] font-bold uppercase tracking-widest block">Bahan Baku</label>
                    <button 
                      onClick={() => setMenuFormData({
                        ...menuFormData, 
                        ingredients: [...menuFormData.ingredients, { stockItemId: inventory[0]?.name || '', quantity: 1 }]
                      })}
                      className="text-[9px] font-black text-amber hover:underline uppercase tracking-widest"
                    >
                      + Tambah
                    </button>
                  </div>
                  
                  <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                    {menuFormData.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex gap-1.5 items-center">
                        <select 
                          value={ing.stockItemId}
                          onChange={(e) => {
                            const newIngs = [...menuFormData.ingredients];
                            newIngs[idx].stockItemId = e.target.value;
                            setMenuFormData({...menuFormData, ingredients: newIngs});
                          }}
                          className="flex-1 bg-charcoal/5 border border-charcoal/10 rounded-lg px-2 py-1.5 text-xs text-charcoal focus:outline-none focus:border-amber transition-colors"
                        >
                          {inventory.map((inv, invIdx) => (
                            <option key={`ing-opt-${inv.name}-${invIdx}`} value={inv.name}>{inv.name}</option>
                          ))}
                        </select>
                        <input 
                          type="number"
                          value={ing.quantity}
                          onChange={(e) => {
                            const newIngs = [...menuFormData.ingredients];
                            newIngs[idx].quantity = parseFloat(e.target.value) || 0;
                            setMenuFormData({...menuFormData, ingredients: newIngs});
                          }}
                          className="w-16 bg-charcoal/5 border border-charcoal/10 rounded-lg px-2 py-1.5 text-xs text-charcoal focus:outline-none focus:border-amber transition-colors"
                          placeholder="Qty"
                        />
                        <button 
                          onClick={() => {
                            const newIngs = menuFormData.ingredients.filter((_, i) => i !== idx);
                            setMenuFormData({...menuFormData, ingredients: newIngs});
                          }}
                          className="p-1.5 text-soft-red hover:bg-soft-red/10 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {menuFormData.ingredients.length === 0 && (
                      <p className="text-center py-2 text-[10px] text-charcoal/30 border-2 border-dashed border-charcoal/5 rounded-lg">
                        Belum ada bahan baku
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={closeMenuModal}
                  className="flex-1 py-2.5 bg-charcoal/10 text-charcoal text-sm font-bold rounded-xl hover:bg-charcoal/20 transition-colors"
                >
                  Batal
                </button>
                <button 
                  disabled={!menuFormData.name || !menuFormData.price}
                  onClick={handleSaveMenu}
                  className="flex-1 py-2.5 bg-amber text-charcoal text-sm font-bold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-none transition-all"
                >
                  {editingMenuId ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showItemModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowItemModal(false)}
              className="absolute inset-0 bg-charcoal/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-soft-cream rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-soft-cream/20"
            >
              <h3 className="text-charcoal text-xl font-bold mb-6">
                {editingItemIndex !== null ? 'Edit Data' : `Tambah ${activeTab === 'categories' ? 'Kategori' : 'Metode'}`}
              </h3>
              
              <div className="mb-6">
                <label className="text-charcoal/40 text-xs font-bold uppercase tracking-widest mb-1 block">Nama</label>
                <input 
                  autoFocus
                  type="text" 
                  value={itemValue}
                  onChange={(e) => setItemValue(e.target.value)}
                  className="w-full bg-charcoal/5 border border-charcoal/10 rounded-xl px-4 py-3 text-charcoal focus:outline-none focus:border-amber transition-colors mb-4"
                />
              </div>

              <div className="flex items-center gap-3 bg-charcoal/5 px-4 py-3 rounded-xl border border-charcoal/10 mb-8">
                <input 
                  type="checkbox" 
                  id="isActiveSimple"
                  checked={itemActive !== false}
                  onChange={(e) => setItemActive(e.target.checked)}
                  className="w-4 h-4 rounded text-amber focus:ring-amber bg-charcoal/5 border-charcoal/10 accent-amber"
                />
                <label htmlFor="isActiveSimple" className="text-charcoal text-sm font-semibold select-none cursor-pointer">
                  Aktif (Bisa Digunakan)
                </label>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowItemModal(false)}
                  className="flex-1 py-3 bg-charcoal/10 text-charcoal font-bold rounded-xl hover:bg-charcoal/20 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSaveSimpleItem}
                  className="flex-1 py-3 bg-amber text-charcoal font-bold rounded-xl hover:shadow-lg transition-all"
                >
                  Simpan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

