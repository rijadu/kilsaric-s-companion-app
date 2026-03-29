import { useState } from "react";
import { mockSuppliers, Supplier } from "@/lib/mock-data";
import { Truck, Plus, Search, Phone, Mail, MapPin, Edit2, Trash2, X, ChevronRight, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const emptySupplier: Omit<Supplier, 'id' | 'createdAt'> = { name: '', phone: '', email: '', address: '', note: '', products: [] };

const SuppliersPage = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Supplier, 'id' | 'createdAt'>>(emptySupplier);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = search.length >= 1 ? suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search)) : suppliers;
  const openNew = () => { setForm(emptySupplier); setEditingId(null); setShowForm(true); };
  const openEdit = (s: Supplier) => { setForm({ name: s.name, phone: s.phone || '', email: s.email || '', address: s.address || '', note: s.note || '', products: s.products || [] }); setEditingId(s.id); setShowForm(true); };
  const handleSave = () => { if (!form.name.trim()) { toast.error("Unesite ime dobavljača"); return; } if (editingId) { setSuppliers(prev => prev.map(s => s.id === editingId ? { ...s, ...form } : s)); toast.success("Dobavljač ažuriran"); } else { setSuppliers(prev => [{ id: `sup${Date.now()}`, ...form, createdAt: new Date().toISOString() }, ...prev]); toast.success("Dobavljač dodat"); } setShowForm(false); setEditingId(null); };
  const handleDelete = (id: string) => { setSuppliers(prev => prev.filter(s => s.id !== id)); setSelectedId(null); toast.success("Dobavljač obrisan"); };
  const selected = selectedId ? suppliers.find(s => s.id === selectedId) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold text-foreground">Dobavljači</h1><button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><Plus className="h-4 w-4" /> Novi</button></div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Pretraži po imenu, telefonu..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-11 bg-card border-border" /></div>
      {showForm && (<div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-foreground">{editingId ? 'Izmeni dobavljača' : 'Novi dobavljač'}</h2><button onClick={() => setShowForm(false)} className="text-muted-foreground"><X className="h-4 w-4" /></button></div><Input placeholder="Naziv firme / Ime *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-background" /><Input placeholder="Telefon" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="bg-background" /><Input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-background" /><Input placeholder="Adresa" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="bg-background" /><Input placeholder="Napomena" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="bg-background" /><button onClick={handleSave} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium">{editingId ? 'Sačuvaj izmene' : 'Dodaj dobavljača'}</button></div>)}
      {selected && !showForm && (<div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3"><div className="flex items-center justify-between"><h2 className="text-base font-semibold text-foreground">{selected.name}</h2><button onClick={() => setSelectedId(null)} className="text-muted-foreground"><X className="h-4 w-4" /></button></div>{selected.phone && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {selected.phone}</div>}{selected.email && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5" /> {selected.email}</div>}{selected.address && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {selected.address}</div>}{selected.products && selected.products.length > 0 && <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> Proizvodi ({selected.products.length})</p><div className="flex flex-wrap gap-1">{selected.products.map(pid => <span key={pid} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-foreground">{pid}</span>)}</div></div>}{selected.note && <p className="text-xs text-muted-foreground italic">{selected.note}</p>}<div className="flex gap-2"><button onClick={() => openEdit(selected)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium"><Edit2 className="h-3.5 w-3.5" /> Izmeni</button><button onClick={() => handleDelete(selected.id)} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-destructive/10 text-destructive rounded-lg text-xs font-medium"><Trash2 className="h-3.5 w-3.5" /> Obriši</button></div></div>)}
      <div className="space-y-1.5">{filtered.map(s => (<button key={s.id} onClick={() => setSelectedId(s.id === selectedId ? null : s.id)} className={`w-full flex items-center justify-between bg-card border rounded-lg p-3 text-left transition-colors ${s.id === selectedId ? 'border-primary/40' : 'border-border hover:border-primary/20'}`}><div className="min-w-0 flex-1"><p className="text-sm font-medium text-foreground truncate">{s.name}</p><p className="text-xs text-muted-foreground">{s.phone || 'Bez telefona'}</p></div><ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" /></button>))}{filtered.length === 0 && <div className="flex flex-col items-center py-8 text-muted-foreground"><Truck className="h-8 w-8 mb-2 opacity-30" /><p className="text-sm">{search ? 'Nema rezultata' : 'Nema dobavljača'}</p></div>}</div>
    </div>
  );
};

export default SuppliersPage;