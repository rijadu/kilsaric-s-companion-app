import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, X, Printer, Usb, Percent, Tag, ScanBarcode, Users, ChevronDown } from "lucide-react";
import { mockProducts, mockCustomers, Product, Customer, CartItem, getItemTotal } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import Receipt from "@/components/Receipt";
import { toast } from "sonner";
import { isSerialSupported, printReceiptSerial, type ReceiptData } from "@/lib/thermal-printer";
import { Html5Qrcode } from "html5-qrcode";

const unitLabels: Record<string, string> = { piece: 'kom', kg: 'kg', meter: 'm', liter: 'L', box: 'kutija' };

const POS = () => {
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [editingQty, setEditingQty] = useState<string | null>(null);
  const [qtyInput, setQtyInput] = useState("");
  const [editingDiscount, setEditingDiscount] = useState<string | null>(null);
  const [discountInput, setDiscountInput] = useState("");
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [cartDiscount, setCartDiscount] = useState<{ type: 'percent' | 'fixed'; value: number } | null>(null);
  const [showCartDiscount, setShowCartDiscount] = useState(false);
  const [cartDiscountInput, setCartDiscountInput] = useState("");
  const [cartDiscountType, setCartDiscountType] = useState<'percent' | 'fixed'>('percent');
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [lastSale, setLastSale] = useState<{ items: CartItem[]; subtotal: number; discount?: { type: 'percent' | 'fixed'; value: number }; total: number; method: 'cash' | 'card'; receiptNumber: string; date: Date; } | null>(null);

  const stopScanner = useCallback(async () => { if (scannerRef.current) { try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch (e) {} scannerRef.current = null; } setScanning(false); }, []);
  const addToCartByBarcode = useCallback((barcode: string) => { const product = mockProducts.find(p => p.barcode === barcode || p.sku === barcode); if (product) { setCart(prev => { const existing = prev.find(i => i.product.id === product.id); if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i); return [...prev, { product, quantity: 1 }]; }); toast.success(`${product.name} dodat`, { description: `${product.sellingPrice.toLocaleString('sr-RS')} RSD/${unitLabels[product.unit]}` }); } else { toast.error("Proizvod nije pronađen", { description: barcode }); } }, []);
  const startScanner = useCallback(async () => { setScanning(true); setSearch(""); await new Promise(r => setTimeout(r, 400)); if (!document.getElementById("pos-scanner")) return; try { const scanner = new Html5Qrcode("pos-scanner"); scannerRef.current = scanner; await scanner.start({ facingMode: "environment" }, { fps: 15, qrbox: { width: 250, height: 120 }, aspectRatio: 2 }, (decodedText) => { addToCartByBarcode(decodedText); }, () => {} ); } catch (err: any) { toast.error("Greška pri pokretanju kamere", { description: err?.message }); setScanning(false); } }, [addToCartByBarcode]);

  useEffect(() => { return () => { scannerRef.current?.stop().catch(() => {}); }; }, []);
  useEffect(() => { const addId = searchParams.get("add"); if (addId) { const product = mockProducts.find(p => p.id === addId); if (product) { setCart(prev => { const existing = prev.find(i => i.product.id === product.id); if (existing) return prev; return [...prev, { product, quantity: 1 }]; }); } setSearchParams({}, { replace: true }); } }, [searchParams, setSearchParams]);
  useEffect(() => { if (editingQty && qtyInputRef.current) qtyInputRef.current.focus(); }, [editingQty]);
  useEffect(() => { if (editingDiscount && discountInputRef.current) discountInputRef.current.focus(); }, [editingDiscount]);

  const searchResults = search.length >= 1 ? mockProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)).slice(0, 8) : [];
  const addToCart = (product: Product) => { setCart(prev => { const existing = prev.find(i => i.product.id === product.id); if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i); return [...prev, { product, quantity: 1 }]; }); setSearch(""); };
  const updateQuantity = (productId: string, delta: number) => { setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0)); };
  const setQuantity = (productId: string, qty: number) => { if (qty <= 0) setCart(prev => prev.filter(i => i.product.id !== productId)); else setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i)); };
  const setItemDiscount = (productId: string, type: 'percent' | 'fixed', value: number) => { if (value <= 0) setCart(prev => prev.map(i => i.product.id === productId ? { ...i, discount: undefined } : i)); else setCart(prev => prev.map(i => i.product.id === productId ? { ...i, discount: { type, value } } : i)); };
  const removeItem = (productId: string) => { setCart(prev => prev.filter(i => i.product.id !== productId)); };
  const subtotal = cart.reduce((sum, i) => sum + getItemTotal(i), 0);
  const total = cartDiscount ? cartDiscount.type === 'percent' ? subtotal * (1 - cartDiscount.value / 100) : Math.max(0, subtotal - cartDiscount.value) : subtotal;
  const generateReceiptNumber = () => { const now = new Date(); return `R-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`; };
  const handleCheckout = (method: 'cash' | 'card') => { stopScanner(); const sale = { items: [...cart], subtotal, discount: cartDiscount || undefined, total, method, receiptNumber: generateReceiptNumber(), date: new Date(), customerId: selectedCustomer?.id, customerName: selectedCustomer?.name }; setLastSale(sale); setCart([]); setCartDiscount(null); setSelectedCustomer(null); setShowCheckout(false); setShowCartDiscount(false); toast.success("Prodaja završena!", { description: `${total.toLocaleString('sr-RS')} RSD - ${method === 'cash' ? 'Gotovina' : 'Kartica'}${selectedCustomer ? ` · ${selectedCustomer.name}` : ''}`, action: { label: "Štampaj", onClick: () => setTimeout(() => window.print(), 100) } }); };
  const handleQtySubmit = (productId: string) => { const val = parseFloat(qtyInput.replace(',', '.')); if (!isNaN(val) && val > 0) setQuantity(productId, val); setEditingQty(null); setQtyInput(""); };
  const handleDiscountSubmit = (productId: string) => { const val = parseFloat(discountInput.replace(',', '.')); if (!isNaN(val) && val > 0) setItemDiscount(productId, discountType, val); else setItemDiscount(productId, discountType, 0); setEditingDiscount(null); setDiscountInput(""); };
  const handleCartDiscountSubmit = () => { const val = parseFloat(cartDiscountInput.replace(',', '.')); if (!isNaN(val) && val > 0) setCartDiscount({ type: cartDiscountType, value: val }); else setCartDiscount(null); setShowCartDiscount(false); setCartDiscountInput(""); };

  return (
    <div className="space-y-3 pb-32">
      <h1 className="text-xl font-bold text-foreground">Prodaja</h1>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Ime, SKU ili barkod..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && search.trim()) { addToCartByBarcode(search.trim()); setSearch(""); } }} className="pl-10 h-12 bg-card border-border" />
          {searchResults.length > 0 && (<div className="absolute top-full left-0 right-0 z-20 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">{searchResults.map(p => (<button key={p.id} onClick={() => addToCart(p)} className="w-full flex items-center justify-between p-3 hover:bg-secondary transition-colors text-left border-b border-border last:border-0"><div><p className="text-sm font-medium text-foreground">{p.name}</p><p className="text-xs text-muted-foreground font-mono">{p.sku}</p></div><div className="text-right"><p className="text-sm font-bold text-primary">{p.sellingPrice.toLocaleString('sr-RS')}</p>{p.bulkPrice && <p className="text-[10px] text-muted-foreground">VP {p.bulkPrice.toLocaleString('sr-RS')} ≥{p.bulkMinQty}</p>}<p className="text-[10px] text-muted-foreground">/{unitLabels[p.unit]}</p></div></button>))}</div>)}
        </div>
        <button onClick={scanning ? stopScanner : startScanner} className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${scanning ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}>{scanning ? <X className="h-5 w-5" /> : <ScanBarcode className="h-5 w-5" />}</button>
      </div>

      <AnimatePresence>{scanning && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden rounded-xl bg-accent"><div className="relative"><div id="pos-scanner" className="w-full" style={{ minHeight: 180 }} /><div className="absolute bottom-2 left-2 right-2 z-10"><p className="text-[10px] text-center text-primary-foreground bg-primary/80 backdrop-blur rounded-lg py-1 px-2 font-medium">Skeniraj artikle — automatski se dodaju u korpu</p></div></div></motion.div>)}</AnimatePresence>

      <div className="relative">
        {selectedCustomer ? (
          <div className="flex items-center justify-between bg-card border border-primary/30 rounded-lg px-3 py-2"><div className="flex items-center gap-2 min-w-0"><Users className="h-4 w-4 text-primary shrink-0" /><div className="min-w-0"><p className="text-sm font-medium text-foreground truncate">{selectedCustomer.name}</p>{selectedCustomer.defaultDiscount && <p className="text-[10px] text-warning">Popust: {selectedCustomer.defaultDiscount.type === 'percent' ? `${selectedCustomer.defaultDiscount.value}%` : `${selectedCustomer.defaultDiscount.value} RSD`}</p>}</div></div><button onClick={() => { setSelectedCustomer(null); setCartDiscount(null); }} className="text-muted-foreground p-1"><X className="h-4 w-4" /></button></div>
        ) : (
          <button onClick={() => setShowCustomerPicker(!showCustomerPicker)} className="w-full flex items-center gap-2 bg-card border border-dashed border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"><Users className="h-4 w-4" /><span className="text-xs">Izaberi kupca (opciono)</span><ChevronDown className="h-3 w-3 ml-auto" /></button>
        )}
        {showCustomerPicker && !selectedCustomer && (<div className="absolute top-full left-0 right-0 z-20 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto"><div className="p-2"><Input placeholder="Pretraži kupce..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className="h-8 text-xs bg-background" autoFocus /></div>{mockCustomers.filter(c => !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch)).map(c => (<button key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustomerPicker(false); setCustomerSearch(""); if (c.defaultDiscount) { setCartDiscount(c.defaultDiscount); toast.success(`Popust primenjen`, { description: c.name }); } }} className="w-full flex items-center justify-between p-2.5 hover:bg-secondary transition-colors text-left border-t border-border"><div><p className="text-sm font-medium text-foreground">{c.name}</p><p className="text-xs text-muted-foreground">{c.phone || 'Bez telefona'}</p></div>{c.defaultDiscount && <span className="text-[10px] text-warning font-medium">{c.defaultDiscount.type === 'percent' ? `${c.defaultDiscount.value}%` : `${c.defaultDiscount.value} RSD`}</span>}</button>))}</div>)}
      </div>

      {cart.length === 0 && !lastSale && (<div className="space-y-4"><div className="flex flex-col items-center justify-center py-6 text-muted-foreground"><ShoppingCart className="h-10 w-10 mb-2 opacity-30" /><p className="text-sm">Korpa je prazna</p><p className="text-xs mt-1">Pretražite, skenirajte ili izaberite artikal</p></div><div className="space-y-2"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Česti artikli</p><div className="grid grid-cols-2 gap-2">{mockProducts.slice(0, 6).map(p => (<button key={p.id} onClick={() => addToCart(p)} className="bg-card border border-border rounded-lg p-2.5 text-left hover:border-primary/30 transition-colors"><p className="text-xs font-medium text-foreground truncate">{p.name}</p><p className="text-[10px] text-muted-foreground mt-0.5">{p.sellingPrice.toLocaleString('sr-RS')} RSD/{unitLabels[p.unit]}</p></button>))}</div></div></div>)}

      {cart.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence>
            {cart.map(item => {
              const itemTotal = getItemTotal(item);
              const hasDiscount = !!item.discount;
              const isBulk = item.product.bulkPrice && item.product.bulkMinQty && item.quantity >= item.product.bulkMinQty;
              return (
                <motion.div key={item.product.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} className="bg-card border border-border rounded-xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{item.product.name}</p><p className="text-xs text-muted-foreground">{item.product.sellingPrice.toLocaleString('sr-RS')} RSD/{unitLabels[item.product.unit]}{isBulk && <span className="ml-1 text-success font-medium">→ VP {item.product.bulkPrice!.toLocaleString('sr-RS')}</span>}</p></div>
                    <div className="flex items-center gap-1"><button onClick={() => { setEditingDiscount(item.product.id); setDiscountInput(item.discount?.value?.toString() || ""); setDiscountType(item.discount?.type || 'percent'); }} className={`p-1 rounded transition-colors ${hasDiscount ? 'text-warning' : 'text-muted-foreground hover:text-warning'}`}><Percent className="h-4 w-4" /></button><button onClick={() => removeItem(item.product.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>
                  </div>
                  {editingDiscount === item.product.id && (<div className="flex items-center gap-2 mb-2 p-2 bg-secondary rounded-lg"><button onClick={() => setDiscountType(discountType === 'percent' ? 'fixed' : 'percent')} className="px-2 py-1 text-xs font-mono bg-card rounded border border-border">{discountType === 'percent' ? '%' : 'RSD'}</button><Input ref={discountInputRef} type="text" inputMode="decimal" value={discountInput} onChange={e => setDiscountInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleDiscountSubmit(item.product.id); if (e.key === 'Escape') { setEditingDiscount(null); setDiscountInput(""); } }} className="h-8 w-20 text-center text-sm bg-card" placeholder="0" /><button onClick={() => handleDiscountSubmit(item.product.id)} className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded">OK</button><button onClick={() => { setItemDiscount(item.product.id, 'percent', 0); setEditingDiscount(null); }} className="px-2 py-1 text-xs text-muted-foreground">Ukloni</button></div>)}
                  {hasDiscount && editingDiscount !== item.product.id && (<div className="text-xs text-warning mb-1 flex items-center gap-1"><Tag className="h-3 w-3" />Popust: {item.discount!.type === 'percent' ? `${item.discount!.value}%` : `${item.discount!.value.toLocaleString('sr-RS')} RSD`}</div>)}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.product.id, -1)} className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"><Minus className="h-4 w-4" /></button>
                      {editingQty === item.product.id ? (<Input ref={qtyInputRef} type="text" inputMode="decimal" value={qtyInput} onChange={e => setQtyInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleQtySubmit(item.product.id); if (e.key === 'Escape') { setEditingQty(null); setQtyInput(""); } }} onBlur={() => handleQtySubmit(item.product.id)} className="w-16 h-9 text-center font-mono font-bold text-sm bg-card" />) : (<button onClick={() => { setEditingQty(item.product.id); setQtyInput(item.quantity.toString()); }} className="w-16 h-9 text-center font-mono font-bold text-foreground bg-secondary/50 rounded-lg hover:bg-secondary transition-colors text-sm">{item.quantity} {unitLabels[item.product.unit]}</button>)}
                      <button onClick={() => updateQuantity(item.product.id, 1)} className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"><Plus className="h-4 w-4" /></button>
                    </div>
                    <span className="font-bold text-foreground">{hasDiscount && <span className="text-xs text-muted-foreground line-through mr-1">{(item.product.sellingPrice * item.quantity).toLocaleString('sr-RS')}</span>}{itemTotal.toLocaleString('sr-RS')} RSD</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {showCartDiscount ? (
            <div className="flex items-center gap-2 p-3 bg-card border border-warning/30 rounded-xl"><Tag className="h-4 w-4 text-warning shrink-0" /><button onClick={() => setCartDiscountType(cartDiscountType === 'percent' ? 'fixed' : 'percent')} className="px-2 py-1 text-xs font-mono bg-secondary rounded border border-border">{cartDiscountType === 'percent' ? '%' : 'RSD'}</button><Input type="text" inputMode="decimal" value={cartDiscountInput} onChange={e => setCartDiscountInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCartDiscountSubmit(); }} className="h-8 w-20 text-center text-sm bg-card" placeholder="0" autoFocus /><button onClick={handleCartDiscountSubmit} className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded">OK</button><button onClick={() => { setCartDiscount(null); setShowCartDiscount(false); setCartDiscountInput(""); }} className="px-2 py-1 text-xs text-muted-foreground">Ukloni</button></div>
          ) : (
            <button onClick={() => { setShowCartDiscount(true); setCartDiscountInput(cartDiscount?.value?.toString() || ""); setCartDiscountType(cartDiscount?.type || 'percent'); }} className={`w-full flex items-center justify-center gap-2 py-2 text-xs rounded-lg border transition-colors ${cartDiscount ? 'border-warning/30 text-warning bg-warning/5' : 'border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'}`}><Percent className="h-3 w-3" />{cartDiscount ? `Popust na račun: ${cartDiscount.type === 'percent' ? `${cartDiscount.value}%` : `${cartDiscount.value.toLocaleString('sr-RS')} RSD`}` : 'Dodaj popust na ceo račun'}</button>
          )}
        </div>
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-[var(--nav-height)] left-0 right-0 bg-card border-t border-border p-4 z-40">
          <div className="flex items-center justify-between mb-3"><span className="text-sm font-medium text-muted-foreground">Ukupno:</span><div className="text-right">{cartDiscount && <span className="text-sm text-muted-foreground line-through mr-2">{subtotal.toLocaleString('sr-RS')}</span>}<span className="text-2xl font-bold text-foreground">{Math.round(total).toLocaleString('sr-RS')} RSD</span></div></div>
          {!showCheckout ? (<button onClick={() => setShowCheckout(true)} className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"><ShoppingCart className="h-5 w-5" />Naplati ({cart.length} stavki)</button>) : (<div className="flex gap-2"><button onClick={() => handleCheckout('cash')} className="flex-1 py-3.5 bg-success text-success-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90"><Banknote className="h-5 w-5" /> Gotovina</button><button onClick={() => handleCheckout('card')} className="flex-1 py-3.5 bg-accent text-accent-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90"><CreditCard className="h-5 w-5" /> Kartica</button><button onClick={() => setShowCheckout(false)} className="p-3.5 bg-secondary text-secondary-foreground rounded-xl"><X className="h-5 w-5" /></button></div>)}
        </div>
      )}

      {lastSale && cart.length === 0 && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 bg-card border border-border text-foreground rounded-xl py-3 text-sm font-medium hover:bg-secondary transition-colors"><Printer className="h-4 w-4" /> Browser Print</button>
            {isSerialSupported() && (<button onClick={async () => { try { const receiptData: ReceiptData = { shopName: 'GVOZDARA', shopAddress: 'Ulica Primer 1, Beograd', shopPhone: '011/123-4567', receiptNumber: lastSale.receiptNumber, date: lastSale.date, items: lastSale.items.map(i => ({ name: i.product.name, sku: i.product.sku, quantity: i.quantity, unit: i.product.unit, price: i.product.sellingPrice, total: getItemTotal(i) })), total: lastSale.total, paymentMethod: lastSale.method }; await printReceiptSerial(receiptData); toast.success("Račun odštampan!"); } catch (err: any) { toast.error("Greška pri štampi", { description: err?.message }); } }} className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium hover:opacity-90 transition-opacity"><Usb className="h-4 w-4" /> Termički štampač</button>)}
            <button onClick={() => setLastSale(null)} className="p-3 bg-secondary text-secondary-foreground rounded-xl"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {lastSale && (<div className="hidden print:block"><Receipt items={lastSale.items} subtotal={lastSale.subtotal} discount={lastSale.discount} total={lastSale.total} paymentMethod={lastSale.method} receiptNumber={lastSale.receiptNumber} date={lastSale.date} /></div>)}
    </div>
  );
};

export default POS;