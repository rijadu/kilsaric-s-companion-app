import { useState } from "react";
import { ArrowLeft, Printer, Banknote, CreditCard, Receipt, TrendingUp, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { mockSales, getProfit, getItemTotal } from "@/lib/mock-data";

const DailyClosePage = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const daySales = mockSales.filter(s => new Date(s.date).toISOString().slice(0, 10) === selectedDate);
  const completed = daySales.filter(s => s.status === 'completed');
  const refunded = daySales.filter(s => s.status === 'refunded');
  const cashTotal = completed.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0);
  const cardTotal = completed.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + s.total, 0);
  const totalRevenue = cashTotal + cardTotal;
  const totalProfit = completed.reduce((sum, s) => sum + s.items.reduce((is, item) => is + getProfit(item), 0), 0);
  const refundedTotal = refunded.reduce((sum, s) => sum + s.total, 0);
  const totalItems = completed.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0);
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  completed.forEach(sale => { sale.items.forEach(item => { const id = item.product.id; if (!productMap[id]) productMap[id] = { name: item.product.name, qty: 0, revenue: 0 }; productMap[id].qty += item.quantity; productMap[id].revenue += getItemTotal(item); }); });
  const productList = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><button onClick={() => navigate(-1)} className="p-1.5 text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button><h1 className="text-xl font-bold text-foreground flex-1">Z-Izveštaj</h1><button onClick={() => window.print()} className="p-2 text-primary"><Printer className="h-5 w-5" /></button></div>
      <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full h-10 px-3 text-sm bg-secondary border border-border rounded-lg text-foreground" />
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h2 className="text-sm font-semibold text-foreground text-center">Dnevni zaključak — {new Date(selectedDate).toLocaleDateString('sr-RS', { day: '2-digit', month: 'long', year: 'numeric' })}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3 text-center"><Banknote className="h-5 w-5 text-success mx-auto mb-1" /><p className="text-[10px] text-muted-foreground uppercase">Gotovina</p><p className="text-lg font-bold text-foreground">{cashTotal.toLocaleString('sr-RS')}</p><p className="text-[10px] text-muted-foreground">RSD</p></div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center"><CreditCard className="h-5 w-5 text-primary mx-auto mb-1" /><p className="text-[10px] text-muted-foreground uppercase">Kartica</p><p className="text-lg font-bold text-foreground">{cardTotal.toLocaleString('sr-RS')}</p><p className="text-[10px] text-muted-foreground">RSD</p></div>
        </div>
        <div className="border-t border-border pt-3 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground flex items-center gap-1.5"><Receipt className="h-4 w-4" /> Ukupan pazar</span><span className="font-bold text-foreground">{totalRevenue.toLocaleString('sr-RS')} RSD</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-4 w-4" /> Zarada</span><span className="font-bold text-success">{totalProfit.toLocaleString('sr-RS')} RSD</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground flex items-center gap-1.5"><Package className="h-4 w-4" /> Prodatih artikala</span><span className="font-bold text-foreground">{totalItems}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Broj računa</span><span className="font-bold text-foreground">{completed.length}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Prosek račun</span><span className="font-bold text-foreground">{completed.length > 0 ? Math.round(totalRevenue / completed.length).toLocaleString('sr-RS') : 0} RSD</span></div>
          {refunded.length > 0 && <div className="flex justify-between text-sm"><span className="text-destructive">Stornirano ({refunded.length})</span><span className="font-bold text-destructive">-{refundedTotal.toLocaleString('sr-RS')} RSD</span></div>}
        </div>
      </div>
      {productList.length > 0 && (<div className="bg-card border border-border rounded-xl p-4 space-y-2"><h2 className="text-sm font-semibold text-foreground">Prodati artikli</h2>{productList.map((p, i) => (<div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0"><div className="min-w-0 flex-1"><p className="text-foreground truncate">{p.name}</p><p className="text-muted-foreground">{p.qty} kom</p></div><span className="font-mono font-medium text-foreground shrink-0 ml-2">{p.revenue.toLocaleString('sr-RS')} RSD</span></div>))}</div>)}
      {completed.length === 0 && <div className="text-center py-12 text-muted-foreground"><Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="text-sm">Nema prodaja za ovaj dan</p></div>}
    </div>
  );
};

export default DailyClosePage;