import { useState } from "react";
import { mockSales, mockProducts, getItemTotal, getProfit } from "@/lib/mock-data";
import { ArrowLeft, Calendar, TrendingUp, Package, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Period = 'today' | 'week' | 'month';

const ReportsPage = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('today');
  const now = new Date();
  const filteredSales = mockSales.filter(s => { if (s.status === 'refunded') return false; const d = new Date(s.date); if (period === 'today') return d.toDateString() === now.toDateString(); if (period === 'week') { const w = new Date(now); w.setDate(w.getDate() - 7); return d >= w; } const m = new Date(now); m.setMonth(m.getMonth() - 1); return d >= m; });
  const totalRevenue = filteredSales.reduce((s, sale) => s + sale.total, 0);
  const totalProfit = filteredSales.reduce((s, sale) => s + sale.items.reduce((is, item) => is + getProfit(item), 0), 0);
  const totalSales = filteredSales.length;
  const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0;
  const productSales: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};
  filteredSales.forEach(sale => { sale.items.forEach(item => { const id = item.product.id; if (!productSales[id]) productSales[id] = { name: item.product.name, qty: 0, revenue: 0, profit: 0 }; productSales[id].qty += item.quantity; productSales[id].revenue += getItemTotal(item); productSales[id].profit += getProfit(item); }); });
  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const lowStock = mockProducts.filter(p => p.stock <= p.lowStockThreshold).sort((a, b) => a.stock / a.lowStockThreshold - b.stock / b.lowStockThreshold);
  const expiringProducts = mockProducts.filter(p => { if (!p.expiryDate) return false; const exp = new Date(p.expiryDate); const daysLeft = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24); return daysLeft <= 30 && daysLeft > 0; });
  const periodLabels: Record<Period, string> = { today: 'Danas', week: 'Ova nedelja', month: 'Ovaj mesec' };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><button onClick={() => navigate(-1)} className="p-1.5 text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button><h1 className="text-xl font-bold text-foreground flex-1">Izveštaji</h1></div>
      <div className="flex gap-2">{(['today', 'week', 'month'] as Period[]).map(p => (<button key={p} onClick={() => setPeriod(p)} className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${period === p ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{periodLabels[p]}</button>))}</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Prihod</p><p className="text-lg font-bold text-foreground">{totalRevenue.toLocaleString('sr-RS')}</p><p className="text-[10px] text-muted-foreground">RSD</p></div>
        <div className="bg-card border border-border rounded-xl p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Profit</p><p className="text-lg font-bold text-success">{totalProfit.toLocaleString('sr-RS')}</p><p className="text-[10px] text-muted-foreground">RSD</p></div>
        <div className="bg-card border border-border rounded-xl p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Br. prodaja</p><p className="text-lg font-bold text-foreground">{totalSales}</p></div>
        <div className="bg-card border border-border rounded-xl p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Prosek račun</p><p className="text-lg font-bold text-foreground">{avgSale.toLocaleString('sr-RS', { maximumFractionDigits: 0 })}</p><p className="text-[10px] text-muted-foreground">RSD</p></div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Najprodavaniji artikli</h2>
        {topProducts.length > 0 ? (<div className="space-y-2">{topProducts.map((p, i) => (<div key={i} className="flex items-center justify-between"><div className="flex items-center gap-2 min-w-0"><span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span><div className="min-w-0"><p className="text-sm text-foreground truncate">{p.name}</p><p className="text-[10px] text-muted-foreground">{p.qty} prodato</p></div></div><div className="text-right shrink-0"><p className="text-sm font-medium text-foreground">{p.revenue.toLocaleString('sr-RS')} RSD</p><p className="text-[10px] text-success">+{p.profit.toLocaleString('sr-RS')} profit</p></div></div>))}</div>) : (<p className="text-sm text-muted-foreground text-center py-4">Nema prodaja u ovom periodu</p>)}
      </div>
      {lowStock.length > 0 && (<div className="bg-card border border-warning/20 rounded-xl p-4 space-y-2"><h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Package className="h-4 w-4 text-warning" /> Niske zalihe ({lowStock.length})</h2>{lowStock.slice(0, 5).map(p => (<div key={p.id} className="flex items-center justify-between text-xs"><span className="text-foreground">{p.name}</span><span className="text-destructive font-bold">{p.stock} / {p.lowStockThreshold}</span></div>))}</div>)}
      {expiringProducts.length > 0 && (<div className="bg-card border border-warning/20 rounded-xl p-4 space-y-2"><h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Calendar className="h-4 w-4 text-warning" /> Uskoro ističe rok ({expiringProducts.length})</h2>{expiringProducts.map(p => { const daysLeft = Math.ceil((new Date(p.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)); return (<div key={p.id} className="flex items-center justify-between text-xs"><span className="text-foreground">{p.name}</span><span className="text-warning font-bold">{daysLeft} dana</span></div>); })}</div>)}
    </div>
  );
};

export default ReportsPage;