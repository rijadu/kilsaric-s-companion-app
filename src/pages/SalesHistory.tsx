import { useState } from "react";
import { mockSales, mockProducts, Sale, getItemTotal } from "@/lib/mock-data";
import { Receipt, Banknote, CreditCard, RotateCcw, X, AlertTriangle, Users } from "lucide-react";
import { toast } from "sonner";

const SalesHistory = () => {
  const [sales, setSales] = useState<Sale[]>(mockSales);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");

  const handleRefund = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (sale) { sale.items.forEach(item => { const product = mockProducts.find(p => p.id === item.product.id); if (product) product.stock += item.quantity; }); }
    setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: 'refunded', refundDate: new Date().toISOString(), refundReason: refundReason || 'Bez razloga' } : s));
    setRefundingId(null); setRefundReason("");
    toast.success("Prodaja stornirana — zalihe vraćene");
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">Istorija prodaje</h1>
      <div className="space-y-2">
        {sales.map(sale => (
          <div key={sale.id} className={`bg-card border rounded-xl p-4 space-y-2 ${sale.status === 'refunded' ? 'border-destructive/30 opacity-70' : 'border-border'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Receipt className="h-4 w-4 text-muted-foreground" /><span className="text-xs font-mono text-muted-foreground">#{sale.id}</span>{sale.status === 'refunded' && <span className="text-[10px] px-1.5 py-0.5 bg-destructive/10 text-destructive rounded font-medium">STORNO</span>}</div>
              <div className="flex items-center gap-1.5">{sale.paymentMethod === 'cash' ? <Banknote className="h-4 w-4 text-success" /> : <CreditCard className="h-4 w-4 text-primary" />}<span className="text-xs text-muted-foreground">{sale.paymentMethod === 'cash' ? 'Gotovina' : 'Kartica'}</span></div>
            </div>
            {sale.customerName && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" /> {sale.customerName}</div>}
            <div className="space-y-1">{sale.items.map((item, i) => (<div key={i} className="flex items-center justify-between text-sm"><span className="text-foreground">{item.product.name} × {item.quantity}{item.discount && <span className="text-warning text-xs ml-1">(-{item.discount.type === 'percent' ? `${item.discount.value}%` : `${item.discount.value} RSD`})</span>}</span><span className="text-muted-foreground font-mono">{getItemTotal(item).toLocaleString('sr-RS')} RSD</span></div>))}</div>
            {sale.discount && <div className="text-xs text-warning flex items-center gap-1">Popust na račun: {sale.discount.type === 'percent' ? `${sale.discount.value}%` : `${sale.discount.value.toLocaleString('sr-RS')} RSD`}</div>}
            <div className="flex items-center justify-between pt-2 border-t border-border"><span className="text-xs text-muted-foreground">{new Date(sale.date).toLocaleString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><span className="text-sm font-bold text-foreground">{sale.total.toLocaleString('sr-RS')} RSD</span></div>
            {sale.status === 'refunded' && sale.refundDate && <div className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Stornirano: {new Date(sale.refundDate).toLocaleString('sr-RS', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}{sale.refundReason && ` — ${sale.refundReason}`}</div>}
            {sale.status === 'completed' && (
              refundingId === sale.id ? (
                <div className="flex items-center gap-2 pt-1"><input type="text" value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Razlog storna (opciono)" className="flex-1 h-8 px-2 text-xs bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground" /><button onClick={() => handleRefund(sale.id)} className="px-3 py-1.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-lg">Potvrdi</button><button onClick={() => { setRefundingId(null); setRefundReason(""); }} className="p-1.5 text-muted-foreground"><X className="h-4 w-4" /></button></div>
              ) : (
                <button onClick={() => setRefundingId(sale.id)} className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-destructive border border-dashed border-border rounded-lg transition-colors"><RotateCcw className="h-3 w-3" />Storniraj</button>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalesHistory;