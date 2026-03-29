import { useState } from "react";
import { mockStockChanges, StockChange, StockChangeType } from "@/lib/mock-data";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Pencil, RotateCcw, ClipboardCheck, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";

const typeConfig: Record<StockChangeType, { label: string; icon: typeof ArrowDownLeft; color: string }> = {
  sale: { label: 'Prodaja', icon: ArrowDownLeft, color: 'text-destructive' },
  receipt: { label: 'Prijem', icon: ArrowUpRight, color: 'text-success' },
  correction: { label: 'Korekcija', icon: Pencil, color: 'text-warning' },
  refund: { label: 'Povrat', icon: RotateCcw, color: 'text-primary' },
  inventory: { label: 'Inventura', icon: ClipboardCheck, color: 'text-muted-foreground' },
};

const StockHistoryPage = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<StockChangeType | 'all'>('all');
  const filtered = filter === 'all' ? mockStockChanges : mockStockChanges.filter(sc => sc.type === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><button onClick={() => navigate(-1)} className="p-1.5 text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button><h1 className="text-xl font-bold text-foreground flex-1">Istorija zaliha</h1></div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1"><Filter className="h-4 w-4 text-muted-foreground shrink-0" />{(['all', 'sale', 'receipt', 'correction', 'refund', 'inventory'] as const).map(t => (<button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${filter === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>{t === 'all' ? 'Sve' : typeConfig[t].label}</button>))}</div>
      <div className="space-y-2">{filtered.map(change => { const config = typeConfig[change.type]; const Icon = config.icon; return (<div key={change.id} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3"><div className={`mt-0.5 p-1.5 rounded-lg bg-secondary ${config.color}`}><Icon className="h-4 w-4" /></div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{change.productName}</p><p className="text-xs text-muted-foreground">{config.label} · {new Date(change.date).toLocaleString('sr-RS', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>{change.note && <p className="text-xs text-muted-foreground italic mt-0.5">{change.note}</p>}</div><div className="text-right shrink-0"><p className={`text-sm font-bold ${change.quantity > 0 ? 'text-success' : 'text-destructive'}`}>{change.quantity > 0 ? '+' : ''}{change.quantity}</p><p className="text-[10px] text-muted-foreground">{change.previousStock} → {change.newStock}</p></div></div>); })}{filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nema promena za prikaz</p>}</div>
    </div>
  );
};

export default StockHistoryPage;