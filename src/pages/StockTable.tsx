import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ArrowUpDown, AlertTriangle, Package, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { mockProducts, getMarginPercent } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const unitLabels: Record<string, string> = { piece: 'kom', kg: 'kg', meter: 'm', liter: 'L', box: 'kut' };
type SortKey = 'name' | 'stock' | 'sellingPrice' | 'category';

const StockTable = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [showLowOnly, setShowLowOnly] = useState(false);

  const toggleSort = (key: SortKey) => { if (sortBy === key) setSortAsc(!sortAsc); else { setSortBy(key); setSortAsc(true); } };

  const filtered = mockProducts
    .filter(p => {
      const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search);
      const matchesLow = !showLowOnly || p.stock <= p.lowStockThreshold;
      return matchesSearch && matchesLow;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortBy) { case 'name': cmp = a.name.localeCompare(b.name); break; case 'stock': cmp = a.stock - b.stock; break; case 'sellingPrice': cmp = a.sellingPrice - b.sellingPrice; break; case 'category': cmp = a.category.localeCompare(b.category); break; }
      return sortAsc ? cmp : -cmp;
    });

  const lowStockCount = mockProducts.filter(p => p.stock <= p.lowStockThreshold).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-secondary rounded-lg transition-colors"><ArrowLeft className="h-5 w-5 text-foreground" /></button>
        <div><h1 className="text-xl font-bold text-foreground">Stanje zaliha</h1><p className="text-xs text-muted-foreground">{mockProducts.length} proizvoda · {lowStockCount} nizak stok</p></div>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Pretraga..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 bg-card border-border" /></div>
        <button onClick={() => setShowLowOnly(!showLowOnly)} className={cn("shrink-0 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors", showLowOnly ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-card border-border text-muted-foreground hover:border-warning/40")}><AlertTriangle className="h-3.5 w-3.5" />Nizak</button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/50">
              <th className="text-left p-3"><button onClick={() => toggleSort('name')} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">Proizvod <ArrowUpDown className="h-3 w-3" /></button></th>
              <th className="text-right p-3"><button onClick={() => toggleSort('stock')} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors ml-auto">Zaliha <ArrowUpDown className="h-3 w-3" /></button></th>
              <th className="text-right p-3 hidden sm:table-cell"><button onClick={() => toggleSort('sellingPrice')} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors ml-auto">Cena <ArrowUpDown className="h-3 w-3" /></button></th>
              <th className="text-center p-3 w-12"></th>
            </tr></thead>
            <tbody>{filtered.map(product => {
              const isLow = product.stock <= product.lowStockThreshold;
              return (
                <tr key={product.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="p-3"><div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0"><Package className="h-4 w-4 text-muted-foreground" /></div><div className="min-w-0"><p className="font-medium text-foreground text-sm truncate max-w-[180px]">{product.name}</p><p className="text-[11px] text-muted-foreground font-mono">{product.sku} · {product.category}</p></div></div></td>
                  <td className="p-3 text-right"><span className={cn("inline-flex items-center gap-1 text-sm font-bold tabular-nums", isLow ? "text-destructive" : "text-foreground")}>{isLow && <AlertTriangle className="h-3 w-3" />}{product.stock.toLocaleString('sr-RS')}</span><p className="text-[10px] text-muted-foreground">{unitLabels[product.unit]} · min {product.lowStockThreshold}</p></td>
                  <td className="p-3 text-right hidden sm:table-cell"><p className="text-sm font-semibold text-foreground">{product.sellingPrice.toLocaleString('sr-RS')} RSD</p>{product.bulkPrice && <p className="text-[10px] text-accent-foreground">vel: {product.bulkPrice.toLocaleString('sr-RS')} RSD</p>}<p className="text-[10px] text-muted-foreground">nab: {product.costPrice.toLocaleString('sr-RS')} · <span className="text-success">{getMarginPercent(product).toFixed(0)}%</span></p></td>
                  <td className="p-3 text-center"><button onClick={() => navigate(`/products/edit/${product.id}`)} className="p-1.5 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-lg transition-colors"><Edit className="h-4 w-4" /></button></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-10 text-muted-foreground"><p className="text-sm">Nema rezultata</p></div>}
      </div>
    </div>
  );
};

export default StockTable;