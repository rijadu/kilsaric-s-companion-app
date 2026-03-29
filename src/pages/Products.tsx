import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Plus, ClipboardList, PackagePlus, ChevronDown, ChevronUp, History, FileText, Users, AlertTriangle, Truck, Minus, X, Calculator } from "lucide-react";
import { mockProducts, categories, subcategories, Product, mockStockChanges } from "@/lib/mock-data";
import ProductCard from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

const managementItems = [
  { path: '/goods-receipt', icon: PackagePlus, label: 'Prijem robe', color: 'text-success' },
  { path: '/inventory-count', icon: ClipboardCheck, label: 'Inventura', color: 'text-primary' },
  { path: '/stock-history', icon: History, label: 'Istorija zaliha', color: 'text-warning' },
  { path: '/reports', icon: FileText, label: 'Izveštaji', color: 'text-muted-foreground' },
  { path: '/daily-close', icon: FileText, label: 'Z-Izveštaj', color: 'text-primary' },
  { path: '/margin-calculator', icon: Calculator, label: 'Kalkulator marže', color: 'text-success' },
  { path: '/customers', icon: Users, label: 'Kupci', color: 'text-primary' },
  { path: '/suppliers', icon: Truck, label: 'Dobavljači', color: 'text-muted-foreground' },
];

const ManagementMenu = ({ navigate }: { navigate: (path: string) => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2.5 hover:border-primary/30 transition-colors">
        <span className="text-sm font-medium text-foreground">Upravljanje</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {managementItems.map(a => (
            <button key={a.path} onClick={() => navigate(a.path)}
              className="flex items-center gap-2 bg-card border border-border rounded-lg p-2.5 hover:border-primary/30 transition-colors">
              <a.icon className={`h-4 w-4 ${a.color}`} />
              <span className="text-xs font-medium text-foreground">{a.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Products = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [lowStockFilter, setLowStockFilter] = useState(searchParams.get('filter') === 'low-stock');
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [correctionId, setCorrectionId] = useState<string | null>(null);
  const [correctionQty, setCorrectionQty] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");

  const handleCorrection = (productId: string, isPositive: boolean) => {
    const qty = parseInt(correctionQty);
    if (isNaN(qty) || qty <= 0) { toast.error("Unesite validnu količinu"); return; }
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const change = isPositive ? qty : -qty;
    const newStock = Math.max(0, product.stock + change);
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));
    mockStockChanges.unshift({
      id: `sc${Date.now()}`, productId, productName: product.name, type: 'correction',
      quantity: change, previousStock: product.stock, newStock,
      note: correctionNote || (isPositive ? 'Ručno dodavanje' : 'Ručno skidanje'),
      date: new Date().toISOString(),
    });
    toast.success(`Zaliha ažurirana: ${product.name} → ${newStock}`);
    setCorrectionId(null); setCorrectionQty(""); setCorrectionNote("");
  };

  useEffect(() => {
    if (searchParams.get('filter') === 'low-stock') {
      setLowStockFilter(true);
    }
  }, [searchParams]);

  const filtered = products.filter(p => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search);
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    const matchesSub = !selectedSub || p.subcategory === selectedSub;
    const matchesLowStock = !lowStockFilter || p.stock <= p.lowStockThreshold;
    return matchesSearch && matchesCategory && matchesSub && matchesLowStock;
  });

  const activeSubs = selectedCategory ? (subcategories[selectedCategory] || []) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Proizvodi</h1>
          {lowStockFilter && (
            <button onClick={() => { setLowStockFilter(false); setSearchParams({}); }}
              className="flex items-center gap-1 mt-1 text-xs text-warning bg-warning/10 px-2 py-1 rounded-full">
              <AlertTriangle className="h-3 w-3" /> Niske zalihe <span className="text-muted-foreground ml-1">✕</span>
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/stock')} className="p-2.5 bg-secondary text-secondary-foreground rounded-xl hover:opacity-90 transition-opacity">
            <ClipboardList className="h-5 w-5" />
          </button>
          <button onClick={() => navigate('/products/new')} className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <ManagementMenu navigate={navigate} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Pretraga po imenu, SKU, barkodu..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11 bg-card border-border" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button onClick={() => { setSelectedCategory(null); setSelectedSub(null); }}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>Sve</button>
        {categories.map(cat => (
          <button key={cat} onClick={() => { setSelectedCategory(cat === selectedCategory ? null : cat); setSelectedSub(null); }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>{cat}</button>
        ))}
      </div>

      {activeSubs.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setSelectedSub(null)}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${!selectedSub ? 'bg-accent text-accent-foreground' : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'}`}>Sve</button>
          {activeSubs.map(sub => (
            <button key={sub} onClick={() => setSelectedSub(sub === selectedSub ? null : sub)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${selectedSub === sub ? 'bg-accent text-accent-foreground' : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'}`}>{sub}</button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(product => (
          <div key={product.id} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="flex-1" onClick={() => navigate(`/products/edit/${product.id}`)}>
                <ProductCard product={product} onClick={() => {}} />
              </div>
              <button onClick={() => setCorrectionId(correctionId === product.id ? null : product.id)}
                className="shrink-0 p-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80">
                <Minus className="h-4 w-4" />
              </button>
            </div>
            {correctionId === product.id && (
              <div className="bg-card border border-primary/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Korekcija: {product.name}</span>
                  <button onClick={() => setCorrectionId(null)} className="text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                </div>
                <p className="text-[10px] text-muted-foreground">Trenutno na stanju: <span className="font-bold">{product.stock}</span></p>
                <Input type="number" inputMode="numeric" placeholder="Količina" value={correctionQty} onChange={e => setCorrectionQty(e.target.value)} className="h-9 bg-background text-sm" />
                <Input type="text" placeholder="Razlog (opciono)" value={correctionNote} onChange={e => setCorrectionNote(e.target.value)} className="h-9 bg-background text-sm" />
                <div className="flex gap-2">
                  <button onClick={() => handleCorrection(product.id, true)} className="flex-1 py-2 text-xs font-medium bg-success/20 text-success rounded-lg">+ Dodaj</button>
                  <button onClick={() => handleCorrection(product.id, false)} className="flex-1 py-2 text-xs font-medium bg-destructive/20 text-destructive rounded-lg">− Skini</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (<div className="text-center py-10 text-muted-foreground"><p className="text-sm">Nema rezultata</p></div>)}
      </div>
    </div>
  );
};

export default Products;