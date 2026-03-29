import { useState } from "react";
import { mockProducts, mockInventoryCounts, InventoryCount } from "@/lib/mock-data";
import { ClipboardCheck, Plus, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const InventoryCountPage = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<InventoryCount[]>(mockInventoryCounts);
  const [activeCount, setActiveCount] = useState<InventoryCount | null>(null);
  const [actualStocks, setActualStocks] = useState<Record<string, number>>({});
  const startNewCount = () => { const newCount: InventoryCount = { id: `ic${Date.now()}`, date: new Date().toISOString(), status: 'in_progress', items: mockProducts.map(p => ({ productId: p.id, productName: p.name, systemStock: p.stock, actualStock: p.stock, difference: 0 })) }; setActiveCount(newCount); const stocks: Record<string, number> = {}; mockProducts.forEach(p => { stocks[p.id] = p.stock; }); setActualStocks(stocks); };
  const updateActualStock = (productId: string, value: number) => setActualStocks(prev => ({ ...prev, [productId]: value }));
  const finishCount = () => { if (!activeCount) return; const finishedCount: InventoryCount = { ...activeCount, status: 'completed', items: activeCount.items.map(item => { const actual = actualStocks[item.productId] ?? item.systemStock; return { ...item, actualStock: actual, difference: actual - item.systemStock }; }) }; setCounts([finishedCount, ...counts]); setActiveCount(null); setActualStocks({}); toast.success("Inventura završena"); };
  const getDiffColor = (diff: number) => { if (diff < 0) return 'text-destructive'; if (diff > 0) return 'text-success'; return 'text-muted-foreground'; };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><button onClick={() => navigate(-1)} className="p-1.5 text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button><h1 className="text-xl font-bold text-foreground flex-1">Inventura</h1>{!activeCount && <button onClick={startNewCount} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" />Nova inventura</button>}</div>
      {activeCount && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" />Popis u toku</h2><span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">U TOKU</span></div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">{activeCount.items.map(item => { const actual = actualStocks[item.productId] ?? item.systemStock; const diff = actual - item.systemStock; return (<div key={item.productId} className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2.5"><div className="flex-1 min-w-0"><p className="text-xs font-medium text-foreground truncate">{item.productName}</p><p className="text-[10px] text-muted-foreground">Sistemski: {item.systemStock}</p></div><input type="number" value={actual} min={0} onChange={e => updateActualStock(item.productId, Number(e.target.value))} className="w-20 h-8 px-2 text-sm bg-background border border-border rounded-lg text-foreground text-center font-mono" /><span className={`text-xs font-bold w-12 text-right ${getDiffColor(diff)}`}>{diff > 0 ? '+' : ''}{diff}</span></div>); })}</div>
          <button onClick={finishCount} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2"><CheckCircle2 className="h-4 w-4" />Završi inventuru</button>
        </div>
      )}
      <div className="space-y-2">{counts.map(count => { const discrepancies = count.items.filter(i => i.difference !== 0); return (<div key={count.id} className="bg-card border border-border rounded-xl p-4 space-y-2"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-foreground">Popis {new Date(count.date).toLocaleDateString('sr-RS')}</p><p className="text-xs text-muted-foreground">{count.items.length} artikala prebrojano</p></div>{discrepancies.length > 0 ? <span className="text-[10px] px-2 py-0.5 bg-warning/10 text-warning rounded-full font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {discrepancies.length} razlika</span> : <span className="text-[10px] px-2 py-0.5 bg-success/10 text-success rounded-full font-medium">Sve OK</span>}</div>{discrepancies.length > 0 && <div className="space-y-1">{discrepancies.map((item, i) => (<div key={i} className="flex items-center justify-between text-xs"><span className="text-foreground">{item.productName}</span><span className={getDiffColor(item.difference)}>{item.difference > 0 ? '+' : ''}{item.difference} (sistem: {item.systemStock}, stvarno: {item.actualStock})</span></div>))}</div>}</div>); })}</div>
    </div>
  );
};

export default InventoryCountPage;