import { useState } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import { Calendar, TrendingUp, Users, ShoppingBag, AlertCircle, CheckCircle2, MoreVertical } from 'lucide-react';
import { cn, formatRupiah } from '../lib/utils';
import { Transaction, MenuItem, StockItem, UserRole } from '../types';

interface DashboardViewProps {
  onToggleSidebar?: () => void;
  transactions: Transaction[];
  menuItems: MenuItem[];
  inventory: StockItem[];
  role?: UserRole;
}

export default function DashboardView({ onToggleSidebar, transactions, menuItems, inventory, role }: DashboardViewProps) {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleString('sv-SE').split(' ')[0]);
  const COLORS = ['#FF9F1C', '#4CC9F0', '#4361EE', '#3A0CA3'];

  // Dynamic Calculations based on transactions and period
  const filteredTransactions = transactions.filter(tr => {
    if (tr.status === 'VOID') return false;
    if (!tr.timestamp) return false;

    if (period === 'daily') {
      return tr.timestamp.startsWith(selectedDate);
    } 
    
    if (period === 'weekly') {
      // 7 days ending with selectedDate
      const selDate = new Date(selectedDate);
      if (isNaN(selDate.getTime())) return true;
      const tDate = new Date(tr.timestamp);
      if (isNaN(tDate.getTime())) return false;
      
      const diffTime = selDate.getTime() - tDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays < 7;
    }

    if (period === 'monthly') {
      // Same month and year as selectedDate
      const selDate = new Date(selectedDate);
      if (isNaN(selDate.getTime())) return true;
      const tDate = new Date(tr.timestamp);
      if (isNaN(tDate.getTime())) return false;
      
      return tDate.getFullYear() === selDate.getFullYear() && tDate.getMonth() === selDate.getMonth();
    }

    return true;
  });

  const totalRevenue = filteredTransactions.reduce((acc, tr) => acc + tr.total, 0);
  const totalOrders = filteredTransactions.length;
  const uniqueCustomers = new Set(filteredTransactions.map(tr => tr.id)).size; // Simplified customer counting

  // Omzet per Metode Pembayaran
  const paymentMethods = ['Tunai', 'QRIS', 'Debit', 'Ojol'];
  const paymentStats = paymentMethods.map(method => {
    const amount = filteredTransactions
      .filter(tr => tr.paymentMethod === method)
      .reduce((acc, tr) => acc + tr.total, 0);
    return {
      name: method,
      amount,
      value: amount // for Pie chart
    };
  });

  const stats = [
    { 
      label: period === 'daily' ? 'Penjualan Hari Ini' : period === 'weekly' ? 'Penjualan Mingguan (7 Hari)' : 'Penjualan Bulanan (Bulan Ini)', 
      value: formatRupiah(totalRevenue), 
      icon: TrendingUp, 
      delta: '+12%', 
      color: 'text-amber' 
    },
    { label: 'Pesanan', value: totalOrders.toString(), icon: ShoppingBag, delta: '+5%', color: 'text-blue-400' },
    { label: 'Transaksi', value: uniqueCustomers.toString(), icon: Users, delta: '+8%', color: 'text-green-400' },
  ];

  // Sold Items Calculation based on filteredTransactions (selected period/day)
  const itemSalesMap: Record<string, { id: string, name: string, quantity: number, revenue: number, category: string }> = {};
  
  filteredTransactions.forEach(tr => {
    tr.items.forEach(item => {
      const id = item.id || item.name;
      if (!itemSalesMap[id]) {
        const menuItem = menuItems.find(m => m.id === item.id);
        itemSalesMap[id] = { 
          id,
          name: item.name, 
          quantity: 0, 
          revenue: 0,
          category: menuItem?.category || 'Menu'
        };
      }
      itemSalesMap[id].quantity += item.quantity;
      itemSalesMap[id].revenue += item.price * item.quantity;
    });
  });

  const soldItems = Object.values(itemSalesMap)
    .sort((a, b) => b.quantity - a.quantity);

  // Generate aggregate trend lines for the Bar and Line Chart
  const getTrendData = () => {
    const baseDate = new Date(selectedDate);
    const validDate = isNaN(baseDate.getTime()) ? new Date() : baseDate;
    const year = validDate.getFullYear();
    const month = validDate.getMonth();
    const dateStr = validDate.toISOString().split('T')[0];

    if (chartPeriod === 'daily') {
      const hours = [
        { label: 'Sebelum 08:00', min: 0, max: 8 },
        { label: '08:00 - 10:00', min: 8, max: 10 },
        { label: '10:00 - 12:00', min: 10, max: 12 },
        { label: '12:00 - 14:00', min: 12, max: 14 },
        { label: '14:00 - 16:00', min: 14, max: 16 },
        { label: '16:00 - 18:00', min: 16, max: 18 },
        { label: '18:00 - 20:00', min: 18, max: 20 },
        { label: 'Malam (20:00+)', min: 20, max: 24 }
      ];

      const dataPoints = hours.map(h => {
        const matchingTrs = transactions.filter(tr => {
          if (tr.status === 'VOID') return false;
          if (!tr.timestamp || !tr.timestamp.startsWith(dateStr)) return false;
          const tDate = new Date(tr.timestamp);
          const hr = !isNaN(tDate.getTime()) ? tDate.getHours() : 0;
          return hr >= h.min && hr < h.max;
        });

        const revenue = matchingTrs.reduce((acc, tr) => acc + tr.total, 0);
        return {
          label: h.label,
          Pendapatan: revenue,
        };
      });

      return dataPoints.map((dp, idx, arr) => {
        const prev1 = arr[idx - 1]?.Pendapatan ?? dp.Pendapatan;
        const prev2 = arr[idx - 2]?.Pendapatan ?? prev1;
        const trend = Math.round((dp.Pendapatan + prev1 + prev2) / 3);
        return {
          ...dp,
          Trend: trend,
        };
      });
    }

    if (chartPeriod === 'weekly') {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(validDate);
        d.setDate(validDate.getDate() - i);
        days.push(d);
      }

      const dataPoints = days.map(d => {
        const dStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
        
        const matchingTrs = transactions.filter(tr => {
          if (tr.status === 'VOID') return false;
          return tr.timestamp && tr.timestamp.startsWith(dStr);
        });

        const revenue = matchingTrs.reduce((acc, tr) => acc + tr.total, 0);
        return {
          label: dayLabel,
          Pendapatan: revenue,
        };
      });

      return dataPoints.map((dp, idx, arr) => {
        const prev1 = arr[idx - 1]?.Pendapatan ?? dp.Pendapatan;
        const prev2 = arr[idx - 2]?.Pendapatan ?? prev1;
        const trend = Math.round((dp.Pendapatan + prev1 + prev2) / 3);
        return {
          ...dp,
          Trend: trend,
        };
      });
    }

    if (chartPeriod === 'monthly') {
      const totalDays = new Date(year, month + 1, 0).getDate();
      const groupSize = Math.ceil(totalDays / 6);
      const intervals = [];
      for (let i = 0; i < 6; i++) {
        const start = i * groupSize + 1;
        const end = Math.min((i + 1) * groupSize, totalDays);
        intervals.push({ label: `Hari ${start}-${end}`, start, end });
      }

      const dataPoints = intervals.map(inter => {
        const matchingTrs = transactions.filter(tr => {
          if (tr.status === 'VOID') return false;
          if (!tr.timestamp) return false;
          const tDate = new Date(tr.timestamp);
          if (tDate.getFullYear() !== year || tDate.getMonth() !== month) return false;
          const dateNum = tDate.getDate();
          return dateNum >= inter.start && dateNum <= inter.end;
        });

        const revenue = matchingTrs.reduce((acc, tr) => acc + tr.total, 0);
        return {
          label: inter.label,
          Pendapatan: revenue,
        };
      });

      return dataPoints.map((dp, idx, arr) => {
        const prev1 = arr[idx - 1]?.Pendapatan ?? dp.Pendapatan;
        const prev2 = arr[idx - 2]?.Pendapatan ?? prev1;
        const trend = Math.round((dp.Pendapatan + prev1 + prev2) / 3);
        return {
          ...dp,
          Trend: trend,
        };
      });
    }

    // Yearly/Tahunan
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
      'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    
    const dataPoints = months.map((monthName, idx) => {
      const matchingTrs = transactions.filter(tr => {
        if (tr.status === 'VOID') return false;
        if (!tr.timestamp) return false;
        const tDate = new Date(tr.timestamp);
        return !isNaN(tDate.getTime()) && tDate.getFullYear() === year && tDate.getMonth() === idx;
      });
      
      const revenue = matchingTrs.reduce((acc, tr) => acc + tr.total, 0);
      return {
        label: monthName,
        Pendapatan: revenue,
      };
    });

    return dataPoints.map((dp, idx, arr) => {
      const prev1 = arr[idx - 1]?.Pendapatan ?? dp.Pendapatan;
      const prev2 = arr[idx - 2]?.Pendapatan ?? prev1;
      const trend = Math.round((dp.Pendapatan + prev1 + prev2) / 3);
      return {
        ...dp,
        Trend: trend,
      };
    });
  };

  const trendData = getTrendData();

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 bg-charcoal">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 md:mb-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onToggleSidebar}
            className="p-2 md:p-2.5 bg-amber text-charcoal rounded-xl shadow-lg shadow-amber/20 hover:scale-105 active:scale-95 transition-all shrink-0"
          >
            <MoreVertical className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Analitik Penjualan</h1>
            <p className="text-[10px] sm:text-xs text-soft-cream/40 mt-0.5">Laporan performa toko real-time</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-soft-cream/5 p-1 rounded-xl border border-soft-cream/10 w-fit max-w-full">
          <button 
            onClick={() => { setPeriod('daily'); setChartPeriod('daily'); }}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold text-xs transition-all",
              period === 'daily' ? "bg-amber text-charcoal shadow-lg" : "text-soft-cream/60 hover:text-soft-cream hover:bg-soft-cream/5"
            )}
          >
            Harian
          </button>
          <button 
            onClick={() => { setPeriod('weekly'); setChartPeriod('weekly'); }}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold text-xs transition-all",
              period === 'weekly' ? "bg-amber text-charcoal shadow-lg" : "text-soft-cream/60 hover:text-soft-cream hover:bg-soft-cream/5"
            )}
          >
            Mingguan
          </button>
          <button 
            onClick={() => { setPeriod('monthly'); setChartPeriod('monthly'); }}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold text-xs transition-all",
              period === 'monthly' ? "bg-amber text-charcoal shadow-lg" : "text-soft-cream/60 hover:text-soft-cream hover:bg-soft-cream/5"
            )}
          >
            Bulanan
          </button>
          
          <div className="h-4 w-px bg-soft-cream/10 mx-0.5" />
          
          <div className="relative group flex items-center pr-1 min-w-[110px]">
            <Calendar className="w-3.5 h-3.5 text-soft-cream/40 group-hover:text-amber transition-colors ml-1.5 pointer-events-none" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setPeriod('daily');
                setChartPeriod('daily');
              }}
              className="bg-transparent border-none text-[11px] font-bold text-soft-cream/60 focus:ring-0 py-1 pl-1.5 w-28 cursor-pointer hover:text-soft-cream"
            />
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {stats.map((stat, i) => (
          <div key={`stat-${i}`} className="bg-soft-cream/5 border border-soft-cream/10 rounded-2xl p-4 sm:p-5 md:p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] md:text-xs font-medium text-soft-cream/40 uppercase tracking-wider truncate">{stat.label}</p>
                <h3 className="text-lg sm:text-xl md:text-2xl font-black mt-1 truncate">{stat.value}</h3>
                <span className="text-[10px] font-bold text-green-400 mt-2 inline-block px-2 py-0.5 bg-green-400/10 rounded-full">{stat.delta} dari kemarin</span>
              </div>
              <div className={cn("p-2.5 md:p-3 rounded-xl bg-charcoal border border-soft-cream/10 shrink-0", stat.color)}>
                <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Summary Row - NEW prominent section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {paymentStats.map((payment, i) => (
          <div key={`pay-stat-${i}`} className="bg-soft-cream/5 border border-soft-cream/10 rounded-2xl p-3.5 md:p-4 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-[9px] font-black uppercase tracking-widest text-soft-cream/40 truncate">{payment.name}</span>
            </div>
            <div>
              <p className="text-sm sm:text-base md:text-lg font-black truncate">{formatRupiah(payment.amount)}</p>
              <div className="w-full h-1 bg-soft-cream/5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full rounded-full animate-pulse" 
                  style={{ 
                    backgroundColor: COLORS[i % COLORS.length], 
                    width: `${totalRevenue > 0 ? (payment.amount / totalRevenue) * 100 : 0}%` 
                  }} 
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sales Trend Composed Chart - NEW full-width section */}
      {role !== 'CASHIER' && (
        <div className="bg-soft-cream/5 border border-soft-cream/10 rounded-2xl p-4 md:p-6 mb-6 md:mb-8">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-5 pb-4 border-b border-soft-cream/5">
            <div>
              <h3 className="text-base md:text-lg lg:text-xl font-bold tracking-tight">Tren Performa & Omzet Penjualan</h3>
              <p className="text-[10px] sm:text-xs text-soft-cream/40 mt-1">Pergerakan total omzet beserta garis tren pergerakan rata-rata penjualan</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Local Trend Timeframes Picker */}
              <div className="flex items-center gap-0.5 bg-soft-cream/5 p-1 rounded-xl border border-soft-cream/10">
                {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setChartPeriod(p)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg font-bold uppercase tracking-tight transition-all text-[9px] md:text-[10px]",
                      chartPeriod === p
                        ? "bg-amber text-charcoal shadow-md"
                        : "text-soft-cream/50 hover:text-soft-cream hover:bg-soft-cream/5"
                    )}
                  >
                    {p === 'daily' ? 'Hari' : p === 'weekly' ? 'Minggu' : p === 'monthly' ? 'Bulan' : 'Tahun'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 text-[10px] font-bold">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-amber rounded-sm block" />
                  <span className="text-soft-cream/60">Pendapatan</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-cyan-400 rounded-full block" />
                  <span className="text-soft-cream/60">Garis Tren</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="h-[240px] sm:h-[280px] md:h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(248, 249, 250, 0.05)" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  stroke="rgba(248, 249, 250, 0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dy={8}
                />
                <YAxis 
                  stroke="rgba(248, 249, 250, 0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
                    return `${val}`;
                  }}
                  dx={-5}
                />
                <RechartsTooltip 
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-charcoal border border-soft-cream/10 p-3.5 rounded-xl shadow-xl">
                          <p className="text-[10px] font-black text-soft-cream/40 mb-1.5 uppercase tracking-wider">{label}</p>
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-amber">
                              Pendapatan: <span className="text-soft-cream">{formatRupiah(payload[0].value)}</span>
                            </p>
                            {payload[1] !== undefined && (
                              <p className="text-xs font-bold text-cyan-400">
                                Tren: <span className="text-soft-cream">{formatRupiah(payload[1].value)}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }} 
                />
                <Bar 
                  dataKey="Pendapatan" 
                  fill="#FF9F1C" 
                  radius={[4, 4, 0, 0]} 
                  barSize={chartPeriod === 'daily' ? 12 : chartPeriod === 'weekly' ? 18 : chartPeriod === 'monthly' ? 24 : 12} 
                />
                <Line 
                  type="monotone" 
                  dataKey="Trend" 
                  stroke="#4CC9F0" 
                  strokeWidth={2} 
                  dot={{ fill: '#415a77', stroke: '#4CC9F0', r: 3, strokeWidth: 1 }} 
                  activeDot={{ r: 5 }} 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        {/* Sales by Payment Chart */}
        <div className="bg-soft-cream/5 border border-soft-cream/10 rounded-2xl p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold mb-4 md:mb-6">Omzet per Metode Pembayaran</h3>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="h-[200px] w-full max-w-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentStats.filter(s => s.value > 0)}
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {paymentStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1E2022', borderColor: 'rgba(248, 249, 250, 0.1)', color: '#F8F9FA', fontSize: '11px' }}
                    itemStyle={{ color: '#F8F9FA' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3.5 flex-1 w-full">
              {paymentStats.map((item, i) => (
                <div key={`payment-${i}`} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs font-bold text-soft-cream/60">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-black">{formatRupiah(item.amount)}</span>
                    <span className="text-[9px] text-soft-cream/40">{totalRevenue > 0 ? Math.round((item.amount / totalRevenue) * 100) : 0}% dari omzet</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* All Sold Items in Selected Period */}
        <div className="bg-soft-cream/5 border border-soft-cream/10 rounded-2xl p-4 md:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div>
              <h3 className="text-base md:text-lg font-bold">Semua Menu Terjual</h3>
              <p className="text-[10px] md:text-xs text-soft-cream/40 mt-0.5">
                {period === 'daily' ? 'Penjualan tanggal ' + selectedDate : period === 'weekly' ? 'Penjualan 7 hari terakhir' : 'Penjualan bulan ini'}
              </p>
            </div>
            <span className="text-[10px] font-black text-amber bg-amber/10 px-2 py-0.5 rounded-lg uppercase tracking-wide">
              {soldItems.length} produk
            </span>
          </div>
          
          <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            {soldItems.length > 0 ? (
              soldItems.map((item, i) => {
                const contributionPct = totalRevenue > 0 ? Math.round((item.revenue / totalRevenue) * 100) : 0;
                return (
                  <div key={`sold-item-${item.id}-${i}`} className="flex items-center justify-between group border-b border-soft-cream/5 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-charcoal flex items-center justify-center font-bold text-amber border border-soft-cream/10 shrink-0 text-xs">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold group-hover:text-amber transition-colors text-xs truncate max-w-[140px] sm:max-w-xs">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-soft-cream/40 px-1 py-0.5 bg-soft-cream/5 rounded truncate max-w-[70px]">{item.category}</span>
                          <span className="text-[11px] text-soft-cream/70 font-black shrink-0">{item.quantity} porsi</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-xs text-soft-cream">{formatRupiah(item.revenue)}</p>
                      <p className="text-[9px] font-bold text-green-400">{contributionPct}% kontribusi</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-soft-cream/20">
                <p className="text-xs font-bold">Belum ada data penjualan pada periode ini</p>
                <p className="text-[10px] text-soft-cream/10 mt-1">Gunakan saringan di atas untuk mengubah rentang waktu</p>
              </div>
            )}
          </div>
        </div>

        {/* Inventory Stock Tracking */}
        <div className="col-span-1 xl:col-span-2 bg-soft-cream/5 border border-soft-cream/10 rounded-2xl overflow-hidden">
          <div className="p-4 md:p-6 border-b border-soft-cream/10 flex items-center justify-between">
            <h3 className="text-base md:text-lg font-bold">Pelacakan Bahan Baku (Real-time)</h3>
            <span className="text-[9px] font-black uppercase text-amber border border-amber/30 px-2 py-0.5 rounded-md">Live Status</span>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[500px]">
              <thead>
                <tr className="bg-soft-cream/5 text-soft-cream/40 text-[10px] uppercase tracking-widest border-b border-soft-cream/5">
                  <th className="px-5 py-3.5 font-bold">Nama Bahan</th>
                  <th className="px-5 py-3.5 font-bold">Terpakai (Hari Ini)</th>
                  <th className="px-5 py-3.5 font-bold">Sisa Stok</th>
                  <th className="px-5 py-3.5 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-cream/5 text-xs">
                {inventory.map((item, i) => (
                  <tr key={`stock-${i}`} className={cn("hover:bg-soft-cream/5 transition-colors", item.isActive === false && "opacity-40 grayscale-[1]")}>
                    <td className="px-5 py-3.5 font-bold text-soft-cream">{item.name}</td>
                    <td className="px-5 py-3.5 text-soft-red font-black">-{item.used} {item.unit || 'pcs'}</td>
                    <td className="px-5 py-3.5 font-black">{item.remaining} {item.unit || 'pcs'}</td>
                    <td className="px-5 py-3.5">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                        item.status === 'KRITIS' 
                          ? "bg-soft-red/10 text-soft-red border border-soft-red/20" 
                          : "bg-green-400/10 text-green-400 border border-green-400/20"
                      )}>
                        {item.status === 'KRITIS' ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        {item.status}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
