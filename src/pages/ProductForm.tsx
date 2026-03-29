import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { mockProducts, categories, subcategories, brands, Product, Variant } from "@/lib/mock-data";
import { toast } from "sonner";

const units = [
  { value: 'piece', label: 'Komad' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'meter', label: 'Metar' },
  { value: 'liter', label: 'Litar' },
  { value: 'box', label: 'Kutija' },
];

const ProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const barcodeFromUrl = searchParams.get('barcode') || '';

  const [form, setForm] = useState({
    name: '', sku: '', barcode: barcodeFromUrl, category: '', subcategory: '', brand: '', description: '',
    costPrice: '', sellingPrice: '', bulkPrice: '', bulkMinQty: '',
    unit: 'piece' as Product['unit'], packSize: '', stock: '', lowStockThreshold: '',
    status: 'active' as Product['status'], expiryDate: '', warrantyMonths: '',
  });

  const [variants, setVariants] = useState<Variant[]>([]);

  useEffect(() => {
    if (isEdit) {
      const product = mockProducts.find(p => p.id === id);
      if (product) {
        setForm({
          name: product.name, sku: product.sku, barcode: product.barcode, category: product.category,
          subcategory: product.subcategory || '', brand: product.brand, description: product.description,
          costPrice: String(product.costPrice), sellingPrice: String(product.sellingPrice),
          bulkPrice: product.bulkPrice ? String(product.bulkPrice) : '', bulkMinQty: product.bulkMinQty ? String(product.bulkMinQty) : '',
          unit: product.unit, packSize: product.packSize ? String(product.packSize) : '',
          stock: String(product.stock), lowStockThreshold: String(product.lowStockThreshold),
          status: product.status, expiryDate: product.expiryDate || '',
          warrantyMonths: product.warrantyMonths ? String(product.warrantyMonths) : '',
        });
        setVariants(product.variants || []);
      }
    }
  }, [id, isEdit]);

  const updateField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));
  const addVariant = () => setVariants(prev => [...prev, { id: `v-new-${Date.now()}`, name: '', sku: '', barcode: '', stock: 0, priceOverride: undefined }]);
  const updateVariant = (index: number, field: string, value: string | number) => setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  const removeVariant = (index: number) => setVariants(prev => prev.filter((_, i) => i !== index));

  const handleSave = () => {
    if (!form.name || !form.sku || !form.sellingPrice) { toast.error('Popunite obavezna polja (naziv, SKU, prodajna cena)'); return; }
    toast.success(isEdit ? 'Proizvod ažuriran!' : 'Proizvod dodat!');
    navigate('/products');
  };

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-secondary rounded-lg transition-colors"><ArrowLeft className="h-5 w-5 text-foreground" /></button>
        <h1 className="text-xl font-bold text-foreground">{isEdit ? 'Uredi proizvod' : 'Novi proizvod'}</h1>
      </div>

      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Osnovni podaci</h2>
        <div className="space-y-3">
          <div><Label htmlFor="name">Naziv proizvoda *</Label><Input id="name" value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="npr. Vijci za drvo 5x50mm" className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="sku">SKU *</Label><Input id="sku" value={form.sku} onChange={e => updateField('sku', e.target.value)} placeholder="VD-5050" className="mt-1 font-mono" /></div>
            <div><Label htmlFor="barcode">Barkod</Label><Input id="barcode" value={form.barcode} onChange={e => updateField('barcode', e.target.value)} placeholder="8600001..." className="mt-1 font-mono" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Kategorija</Label><Select value={form.category} onValueChange={v => { updateField('category', v); updateField('subcategory', ''); }}><SelectTrigger className="mt-1"><SelectValue placeholder="Izaberi" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Podkategorija</Label><Select value={form.subcategory} onValueChange={v => updateField('subcategory', v)} disabled={!form.category}><SelectTrigger className="mt-1"><SelectValue placeholder="Izaberi" /></SelectTrigger><SelectContent>{(subcategories[form.category] || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div><Label>Brend</Label><Select value={form.brand} onValueChange={v => updateField('brand', v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Izaberi" /></SelectTrigger><SelectContent>{brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></div>
          <div><Label htmlFor="description">Opis</Label><Textarea id="description" value={form.description} onChange={e => updateField('description', e.target.value)} placeholder="Kratak opis proizvoda..." className="mt-1" rows={2} /></div>
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Cene i jedinice</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="costPrice">Nabavna cena (RSD)</Label><Input id="costPrice" type="number" value={form.costPrice} onChange={e => updateField('costPrice', e.target.value)} placeholder="0" className="mt-1" /></div>
          <div><Label htmlFor="sellingPrice">Prodajna cena (RSD) *</Label><Input id="sellingPrice" type="number" value={form.sellingPrice} onChange={e => updateField('sellingPrice', e.target.value)} placeholder="0" className="mt-1" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="bulkPrice">Veleprodajna cena (RSD)</Label><Input id="bulkPrice" type="number" value={form.bulkPrice} onChange={e => updateField('bulkPrice', e.target.value)} placeholder="0" className="mt-1" /></div>
          <div><Label htmlFor="bulkMinQty">Min. količina za VP</Label><Input id="bulkMinQty" type="number" value={form.bulkMinQty} onChange={e => updateField('bulkMinQty', e.target.value)} placeholder="npr. 100" className="mt-1" /></div>
        </div>
        {form.costPrice && form.sellingPrice && (
          <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2">
            Marža: {((Number(form.sellingPrice) - Number(form.costPrice)) / Number(form.costPrice) * 100).toFixed(1)}% · Profit: {(Number(form.sellingPrice) - Number(form.costPrice)).toLocaleString('sr-RS')} RSD
            {form.bulkPrice && ` · VP marža: ${((Number(form.bulkPrice) - Number(form.costPrice)) / Number(form.costPrice) * 100).toFixed(1)}%`}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Jedinica mere</Label><Select value={form.unit} onValueChange={v => updateField('unit', v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{units.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label htmlFor="packSize">Pakovanje (kom)</Label><Input id="packSize" type="number" value={form.packSize} onChange={e => updateField('packSize', e.target.value)} placeholder="npr. 100" className="mt-1" /></div>
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Zalihe</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="stock">Trenutna zaliha</Label><Input id="stock" type="number" value={form.stock} onChange={e => updateField('stock', e.target.value)} placeholder="0" className="mt-1" /></div>
          <div><Label htmlFor="lowStock">Min. zaliha (alert)</Label><Input id="lowStock" type="number" value={form.lowStockThreshold} onChange={e => updateField('lowStockThreshold', e.target.value)} placeholder="0" className="mt-1" /></div>
        </div>
        <div className="flex items-center justify-between"><Label htmlFor="status">Aktivan proizvod</Label><Switch id="status" checked={form.status === 'active'} onCheckedChange={v => updateField('status', v ? 'active' : 'inactive')} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="expiryDate">Rok trajanja</Label><Input id="expiryDate" type="date" value={form.expiryDate} onChange={e => updateField('expiryDate', e.target.value)} className="mt-1" /></div>
          <div><Label htmlFor="warrantyMonths">Garancija (meseci)</Label><Input id="warrantyMonths" type="number" value={form.warrantyMonths} onChange={e => updateField('warrantyMonths', e.target.value)} placeholder="0" className="mt-1" /></div>
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Varijante</h2>
          <Button variant="outline" size="sm" onClick={addVariant} className="h-8"><Plus className="h-3.5 w-3.5 mr-1" /> Dodaj</Button>
        </div>
        {variants.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Nema varijanti.</p>}
        {variants.map((variant, i) => (
          <div key={variant.id} className="border border-border rounded-lg p-3 space-y-3 bg-secondary/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Varijanta {i + 1}</span>
              <button onClick={() => removeVariant(i)} className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Naziv</Label><Input value={variant.name} onChange={e => updateVariant(i, 'name', e.target.value)} placeholder="npr. Inox" className="mt-1 h-9 text-sm" /></div>
              <div><Label className="text-xs">SKU</Label><Input value={variant.sku} onChange={e => updateVariant(i, 'sku', e.target.value)} placeholder="VD-5050-I" className="mt-1 h-9 text-sm font-mono" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Zaliha</Label><Input type="number" value={variant.stock} onChange={e => updateVariant(i, 'stock', Number(e.target.value))} className="mt-1 h-9 text-sm" /></div>
              <div><Label className="text-xs">Cena (override)</Label><Input type="number" value={variant.priceOverride || ''} onChange={e => updateVariant(i, 'priceOverride', e.target.value ? Number(e.target.value) : '')} placeholder="—" className="mt-1 h-9 text-sm" /></div>
            </div>
          </div>
        ))}
      </section>

      <Button onClick={handleSave} className="w-full h-12 text-base font-semibold" size="lg"><Save className="h-5 w-5 mr-2" />{isEdit ? 'Sačuvaj izmene' : 'Dodaj proizvod'}</Button>
    </div>
  );
};

export default ProductForm;