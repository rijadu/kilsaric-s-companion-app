import { useState } from "react";
import { mockCustomers, mockSales, Customer, getItemTotal, getProfit } from "@/lib/mock-data";
import { Users, Plus, Search, Phone, Mail, MapPin, Tag, Edit2, Trash2, X, ChevronRight, TrendingUp, Receipt } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const emptyCustomer: Omit<Customer, 'id' | 'createdAt'> = { name: '', phone: '', email: '', address: '', note: '' };

const CustomersPage = () => {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Customer, 'id' | 'createdAt'>>(emptyCustomer);
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = search.length >= 1 ? customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase())) : customers;
  const openNew = () => { setForm(emptyCustomer); setDiscountValue(""); setDiscountType('percent'); setEditingId(null); setShowForm(true); };
  const openEdit = (c: Customer) => { setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', note: c.note || '', defaultDiscount: c.defaultDiscount }); setDiscountValue(c.defaultDiscount?.value?.toString() || ""); setDiscountType(c.defaultDiscount?.type || 'percent'); setEditingId(c.id); setShowForm(true); };
  const handleSave = () => { if (!form.name.trim()) { toast.error("Unesite ime kupca"); return; } const dv = parseFloat(discountValue.replace(',', '.')); const discount = !isNaN(dv) && dv > 0 ? { type: discountType, value: dv } : undefined; if (editingId) { setCustomers(prev => prev.map(c => c.id === editingId ? { ...c, ...form, defaultDiscount: discount } : c)); toast.success("Kupac ažuriran"); } else { setCustomers(prev => [{ id: `c${Date.now()}`, ...form, defaultDiscount: discount, createdAt: new Date().toISOString() }, ...prev]); toast.success("Kupac dodat"); } setShowForm(false); setEditingId(null); };
  const handleDelete = (id: string) => { setCustomers(prev => prev.filter(c => c.id !== id)); setSelectedId(null); toast.success("Kupac obrisan"); };
  const selected = selectedId ? customers.find(c => c.id === selectedId) : null;
  const getCustomerStats = (customerId: string) => { const customerSales = mockSales.filter(s => s.customerId === customerId && s.status === 'completed'); return { salesCount: customerSales.length, totalSpent: customerSales.reduce((sum, s) => sum + s.total, 0), totalProfit: customerSales.reduce((sum, s) => sum + s.items.reduce((is, item) => is + getProfit(item), 0), 0) }; };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold text-foreground">Kupci</h1><button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" /> Novi</button></div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Pretraži po imenu, telefonu..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-11 bg-card border-border" /></div>
      {showForm && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-foreground">{editingId ? 'Izmeni kupca' : 'Novi kupac'}</h2><button onClick={() => setShowForm(false)} className="text-muted-foreground"><X className="h-4 w-4" /></button></div>
          <Input placeholder="Ime i prezime / Firma *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-background" />
          <Input placeholder="Telefon" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="bg-background" />
          <Input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-background" />
          <Input placeholder="Adresa" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="bg-background" />
          <Input placeholder="Napomena" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="bg-background" />
          <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Podrazumevani popust</label><div className="flex items-center gap-2"><button onClick={() => setDiscountType(discountType === 'percent' ? 'fixed' : 'percent')} className="px-3 py-2 text-xs font-mono bg-secondary rounded-lg border border-border">{discountType === 'percent' ? '%' : 'RSD'}</button><Input type="text" inputMode="decimal" placeholder="0" value={discountValue} onChange={e => setDiscountValue(e.target.value)} className="w-24 bg-background" /><span className="text-xs text-muted-foreground">na sve proizvode</span></div></div>
          <button onClick={handleSave} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium">{editingId ? 'Sačuvaj izmene' : 'Dodaj kupca'}</button>
        </div>
      )}
      {selected && !showForm && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-base font-semibold text-foreground">{selected.name}</h2><button onClick={() => setSelectedId(null)} className="text-muted-foreground"><X className="h-4 w-4" /></button></div>
          {selected.phone && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {selected.phone}</div>}
          {selected.email && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5" /> {selected.email}</div>}
          {selected.address && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {selected.address}</div>}
          {selected.defaultDiscount && <div className="flex items-center gap-2 text-sm text-warning"><Tag className="h-3.5 w-3.5" />Popust: {selected.defaultDiscount.type === 'percent' ? `${selected.defaultDiscount.value}%` : `${selected.defaultDiscount.value.toLocaleString('sr-RS')} RSD`}</div>}
          {selected.note && <p className="text-xs text-muted-foreground italic">{selected.note}</p>}
          {(() => { const stats = getCustomerStats(selected.id); const customerSales = mockSales.filter(s => s.customerId === selected.id); return (<div className="space-y-3">{stats.salesCount > 0 ? (<div className="bg-secondary/50 rounded-lg p-3 space-y-1.5"><p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Statistika</p><div className="grid grid-cols-3 gap-2 text-center"><div><p className="text-sm font-bold text-foreground">{stats.salesCount}</p><p className="text-[10px] text-muted-foreground">Kupovina</p></div><div><p className="text-sm font-bold text-foreground">{stats.totalSpent.toLocaleString('sr-RS')}</p><p className="text-[10px] text-muted-foreground">Potrošeno</p></div><div><p className="text-sm font-bold text-success">{stats.totalProfit.toLocaleString('sr-RS')}</p><p className="text-[10px] text-muted-foreground">Profit</p></div></div></div>) : <p className="text-xs text-muted-foreground text-center py-1">Nema kupovina</p>}{customerSales.length > 0 && (<div className="space-y-1.5"><p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Receipt className="h-3 w-3" /> Istorija kupovina</p><div className="space-y-1.5 max-h-48 overflow-y-auto">{customerSales.map(sale => (<div key={sale.id} className={`bg-background rounded-lg p-2.5 border ${sale.status === 'refunded' ? 'border-destructive/30 opacity-60' : 'border-border'}`}><div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground">{new Date(sale.date).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: '2-digit' })}{sale.status === 'refunded' && <span className="ml-1 text-destructive font-medium">STORNO</span>}</span><span className="text-xs font-bold text-foreground">{sale.total.toLocaleString('sr-RS')} RSD</span></div><p className="text-[10px] text-muted-foreground truncate mt-0.5">{sale.items.map(i => `${i.product.name} ×${i.quantity}`).join(', ')}</p></div>))}</div></div>)}</div>); })()}
          <div className="flex gap-2"><button onClick={() => openEdit(selected)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium"><Edit2 className="h-3.5 w-3.5" /> Izmeni</button><button onClick={() => handleDelete(selected.id)} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-destructive/10 text-destructive rounded-lg text-xs font-medium"><Trash2 className="h-3.5 w-3.5" /> Obriši</button></div>
        </div>
      )}
      <div className="space-y-1.5">
        {filtered.map(c => (<button key={c.id} onClick={() => setSelectedId(c.id === selectedId ? null : c.id)} className={`w-full flex items-center justify-between bg-card border rounded-lg p-3 text-left transition-colors ${c.id === selectedId ? 'border-primary/40' : 'border-border hover:border-primary/20'}`}><div className="min-w-0 flex-1"><p className="text-sm font-medium text-foreground truncate">{c.name}</p><p className="text-xs text-muted-foreground">{c.phone || 'Bez telefona'}{c.defaultDiscount && <span className="ml-2 text-warning">popust {c.defaultDiscount.type === 'percent' ? `${c.defaultDiscount.value}%` : `${c.defaultDiscount.value} RSD`}</span>}</p></div><ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" /></button>))}
        {filtered.length === 0 && <div className="flex flex-col items-center py-8 text-muted-foreground"><Users className="h-8 w-8 mb-2 opacity-30" /><p className="text-sm">{search ? 'Nema rezultata' : 'Nema kupaca'}</p></div>}
      </div>
    </div>
  );
};

export default CustomersPage;