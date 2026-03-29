import { ScanBarcode, Search, X, ShoppingCart, Package, ClipboardList, PlusCircle, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { mockProducts, Product } from "@/lib/mock-data";
import ProductCard from "@/components/ProductCard";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";

const unitLabels: Record<string, string> = { piece: 'kom', kg: 'kg', meter: 'm', liter: 'L', box: 'kutija' };

const ScanPage = () => {
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [quickSaleProduct, setQuickSaleProduct] = useState<Product | null>(null);
  const [quickSaleQty, setQuickSaleQty] = useState("1");
  const [showQuickSale, setShowQuickSale] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockQty, setStockQty] = useState("1");
  const [showQuickStock, setShowQuickStock] = useState(false);

  const searchCode = scannedResult || manualCode;
  const foundProduct = searchCode.length > 2 ? mockProducts.find(p => p.barcode.includes(searchCode) || p.sku.toLowerCase().includes(searchCode.toLowerCase()) || p.name.toLowerCase().includes(searchCode.toLowerCase())) : null;

  const stopScanner = useCallback(async () => { if (scannerRef.current) { try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch (e) {} scannerRef.current = null; } setScanning(false); }, []);
  const startScanner = useCallback(async () => { setScannedResult(null); setManualCode(""); setShowQuickSale(false); setScanning(true); await new Promise(r => setTimeout(r, 300)); if (!document.getElementById("scanner-region")) return; try { const scanner = new Html5Qrcode("scanner-region"); scannerRef.current = scanner; await scanner.start({ facingMode: "environment" }, { fps: 15, qrbox: { width: 250, height: 150 }, aspectRatio: 1.333 }, (decodedText) => { setScannedResult(decodedText); toast.success("Barkod skeniran!", { description: decodedText }); scanner.stop().then(() => { scanner.clear(); scannerRef.current = null; setScanning(false); }).catch(() => {}); }, () => {} ); } catch (err: any) { toast.error("Greška pri pokretanju kamere", { description: err?.message }); setScanning(false); } }, []);
  useEffect(() => { return () => { scannerRef.current?.stop().catch(() => {}); }; }, []);

  const handleQuickSale = (product: Product) => { setQuickSaleProduct(product); setQuickSaleQty("1"); setShowQuickSale(true); };
  const confirmQuickSale = () => { if (!quickSaleProduct) return; const qty = parseFloat(quickSaleQty.replace(',', '.')); if (isNaN(qty) || qty <= 0) { toast.error("Unesite validnu količinu"); return; } if (qty > quickSaleProduct.stock) { toast.error("Nema dovoljno na stanju"); return; } const total = quickSaleProduct.sellingPrice * qty; toast.success("Prodaja evidentirana!", { description: `${quickSaleProduct.name} × ${qty} = ${total.toLocaleString('sr-RS')} RSD` }); setShowQuickSale(false); setQuickSaleProduct(null); setScannedResult(null); setManualCode(""); };
  const handleQuickStock = (product: Product) => { setStockProduct(product); setStockQty("1"); setShowQuickStock(true); setShowQuickSale(false); };
  const confirmQuickStock = () => { if (!stockProduct) return; const qty = parseFloat(stockQty.replace(',', '.')); if (isNaN(qty) || qty <= 0) { toast.error("Unesite validnu količinu"); return; } toast.success("Stanje ažurirano!", { description: `${stockProduct.name} +${qty}` }); setShowQuickStock(false); setStockProduct(null); setScannedResult(null); setManualCode(""); };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">Skeniraj</h1>
      <div className="relative bg-accent rounded-2xl overflow-hidden">
        {scanning ? (
          <div className="relative"><div id="scanner-region" className="w-full" style={{ minHeight: 280 }} /><button onClick={stopScanner} className="absolute top-3 right-3 z-10 p-2 bg-background/80 backdrop-blur rounded-xl text-foreground hover:bg-background transition-colors"><X className="h-5 w-5" /></button><motion.div className="absolute left-6 right-6 h-0.5 bg-primary shadow-lg shadow-primary/50 z-10 pointer-events-none" animate={{ top: ["20%", "75%", "20%"] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} /></div>
        ) : scannedResult ? (
          <div className="p-6 flex flex-col items-center gap-2"><ScanBarcode className="h-10 w-10 text-primary" /><p className="text-sm font-mono font-bold text-foreground">{scannedResult}</p><p className="text-xs text-muted-foreground">{foundProduct ? "Proizvod pronađen!" : "Proizvod nije u bazi"}</p></div>
        ) : (
          <div className="aspect-[4/3] flex flex-col items-center justify-center"><motion.div className="absolute inset-8 border-2 border-primary/30 rounded-xl" animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 2, repeat: Infinity }} /><ScanBarcode className="h-12 w-12 text-accent-foreground/30 mb-3" /><p className="text-sm text-accent-foreground/50 font-medium">Pritisnite dugme za skeniranje</p></div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={scanning ? stopScanner : startScanner} className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm hover:opacity-90 transition-opacity"><ScanBarcode className="h-5 w-5" />{scanning ? "Zaustavi" : scannedResult ? "Skeniraj ponovo" : "Skeniraj barkod"}</button>
        {scannedResult && <button onClick={() => { setScannedResult(null); setManualCode(""); setShowQuickSale(false); }} className="p-3.5 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors"><X className="h-5 w-5" /></button>}
      </div>

      <AnimatePresence>
        {foundProduct && scannedResult && !showQuickSale && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleQuickSale(foundProduct)} className="flex items-center justify-center gap-2 bg-success/10 text-success border border-success/20 rounded-xl py-3 text-sm font-medium"><Zap className="h-4 w-4" /> Brza prodaja</button>
              <button onClick={() => navigate(`/pos?add=${foundProduct.id}`)} className="flex items-center justify-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-xl py-3 text-sm font-medium"><ShoppingCart className="h-4 w-4" /> U korpu</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleQuickStock(foundProduct)} className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground rounded-xl py-3 text-sm font-medium"><Package className="h-4 w-4" /> Dodaj na stanje</button>
              <button onClick={() => navigate(`/products/edit/${foundProduct.id}`)} className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground rounded-xl py-3 text-sm font-medium"><ClipboardList className="h-4 w-4" /> Detalji</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!foundProduct && scannedResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <button onClick={() => navigate(`/products/new?barcode=${encodeURIComponent(scannedResult)}`)} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 text-sm font-semibold"><PlusCircle className="h-5 w-5" /> Dodaj novi proizvod</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQuickSale && quickSaleProduct && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-card border border-success/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Zap className="h-4 w-4 text-success" /> Brza prodaja</h3><button onClick={() => setShowQuickSale(false)} className="p-1 text-muted-foreground"><X className="h-4 w-4" /></button></div>
            <div className="flex items-center justify-between bg-secondary/50 rounded-lg p-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-foreground truncate">{quickSaleProduct.name}</p><p className="text-xs text-muted-foreground">{quickSaleProduct.sellingPrice.toLocaleString('sr-RS')} RSD/{unitLabels[quickSaleProduct.unit]} · Na stanju: {quickSaleProduct.stock}</p></div></div>
            <div className="flex items-center gap-3"><label className="text-sm text-muted-foreground shrink-0">Količina:</label><Input type="text" inputMode="decimal" value={quickSaleQty} onChange={e => setQuickSaleQty(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') confirmQuickSale(); }} className="h-10 text-center font-mono font-bold text-lg" autoFocus /><span className="text-sm text-muted-foreground shrink-0">{unitLabels[quickSaleProduct.unit]}</span></div>
            {(() => { const qty = parseFloat(quickSaleQty.replace(',', '.')); const total = !isNaN(qty) && qty > 0 ? quickSaleProduct.sellingPrice * qty : 0; return (<div className="flex items-center justify-between pt-2 border-t border-border"><span className="text-sm text-muted-foreground">Ukupno:</span><span className="text-lg font-bold text-foreground">{total.toLocaleString('sr-RS')} RSD</span></div>); })()}
            <button onClick={confirmQuickSale} className="w-full py-3 bg-success text-success-foreground rounded-xl text-sm font-semibold flex items-center justify-center gap-2"><ShoppingCart className="h-4 w-4" /> Potvrdi prodaju</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQuickStock && stockProduct && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Dodaj na stanje</h3><button onClick={() => setShowQuickStock(false)} className="p-1 text-muted-foreground"><X className="h-4 w-4" /></button></div>
            <div className="bg-secondary/50 rounded-lg p-3"><p className="text-sm font-medium text-foreground truncate">{stockProduct.name}</p><p className="text-xs text-muted-foreground">Trenutno na stanju: {stockProduct.stock} {unitLabels[stockProduct.unit]}</p></div>
            <div className="flex items-center gap-3"><label className="text-sm text-muted-foreground shrink-0">Količina:</label><Input type="text" inputMode="decimal" value={stockQty} onChange={e => setStockQty(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') confirmQuickStock(); }} className="h-10 text-center font-mono font-bold text-lg" autoFocus /><span className="text-sm text-muted-foreground shrink-0">{unitLabels[stockProduct.unit]}</span></div>
            <button onClick={confirmQuickStock} className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold flex items-center justify-center gap-2"><Package className="h-4 w-4" /> Potvrdi</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ili unesi ručno</p>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Barkod, SKU ili naziv..." value={manualCode} onChange={(e) => { setManualCode(e.target.value); setScannedResult(null); setShowQuickSale(false); }} className="pl-10 h-12 bg-card border-border font-mono text-lg" /></div>
        {foundProduct && !scannedResult && (
          <div className="space-y-2">
            <ProductCard product={foundProduct} />
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => handleQuickSale(foundProduct)} className="flex items-center justify-center gap-1.5 bg-success/10 text-success border border-success/20 rounded-xl py-2.5 text-xs font-medium"><Zap className="h-3.5 w-3.5" /> Prodaj</button>
              <button onClick={() => handleQuickStock(foundProduct)} className="flex items-center justify-center gap-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl py-2.5 text-xs font-medium"><Package className="h-3.5 w-3.5" /> Na stanje</button>
              <button onClick={() => navigate(`/pos?add=${foundProduct.id}`)} className="flex items-center justify-center gap-1.5 bg-secondary text-secondary-foreground rounded-xl py-2.5 text-xs font-medium"><ShoppingCart className="h-3.5 w-3.5" /> Korpa</button>
            </div>
          </div>
        )}
        {!foundProduct && manualCode.length > 2 && (
          <div className="text-center space-y-2 py-4"><p className="text-sm text-muted-foreground">Proizvod nije pronađen</p><button onClick={() => navigate(`/products/new?barcode=${encodeURIComponent(manualCode)}`)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"><PlusCircle className="h-4 w-4" /> Dodaj novi proizvod</button></div>
        )}
      </div>
      {foundProduct && scannedResult && (<div><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Skenirani proizvod</p><ProductCard product={foundProduct} /></div>)}
    </div>
  );
};

export default ScanPage;