import { useState } from "react";
import { ArrowLeft, Calculator, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

type CalcMode = 'margin-to-price' | 'price-to-margin';

const MarginCalculatorPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<CalcMode>('margin-to-price');
  const [costPrice, setCostPrice] = useState("");
  const [marginPercent, setMarginPercent] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const cost = parseFloat(costPrice) || 0;
  const margin = parseFloat(marginPercent) || 0;
  const selling = parseFloat(sellingPrice) || 0;
  const calculatedSellingPrice = cost > 0 && margin > 0 ? cost * (1 + margin / 100) : 0;
  const calculatedMargin = cost > 0 && selling > cost ? ((selling - cost) / cost) * 100 : 0;
  const calculatedProfit = mode === 'margin-to-price' ? calculatedSellingPrice - cost : selling - cost;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><button onClick={() => navigate(-1)} className="p-1.5 text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button><h1 className="text-xl font-bold text-foreground flex-1">Kalkulator marže</h1><Calculator className="h-5 w-5 text-primary" /></div>
      <div className="flex gap-2"><button onClick={() => setMode('margin-to-price')} className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-colors ${mode === 'margin-to-price' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>Marža → Cena</button><button onClick={() => setMode('price-to-margin')} className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-colors ${mode === 'price-to-margin' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>Cena → Marža</button></div>
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div><label className="text-xs text-muted-foreground block mb-1">Nabavna cena (RSD)</label><input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="0" className="w-full h-12 px-3 text-lg font-mono bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground" /></div>
        {mode === 'margin-to-price' ? (<div><label className="text-xs text-muted-foreground block mb-1">Željena marža (%)</label><input type="number" value={marginPercent} onChange={e => setMarginPercent(e.target.value)} placeholder="0" className="w-full h-12 px-3 text-lg font-mono bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground" /></div>) : (<div><label className="text-xs text-muted-foreground block mb-1">Prodajna cena (RSD)</label><input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} placeholder="0" className="w-full h-12 px-3 text-lg font-mono bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground" /></div>)}
      </div>
      {cost > 0 && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><ArrowRight className="h-4 w-4 text-primary" /> Rezultat</h2>
          {mode === 'margin-to-price' ? (<><div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Prodajna cena</span><span className="text-2xl font-bold text-foreground">{calculatedSellingPrice.toLocaleString('sr-RS', { maximumFractionDigits: 2 })} RSD</span></div><div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Zarada po komadu</span><span className="text-lg font-bold text-success">+{calculatedProfit.toLocaleString('sr-RS', { maximumFractionDigits: 2 })} RSD</span></div></>) : (<><div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Marža</span><span className="text-2xl font-bold text-foreground">{calculatedMargin.toLocaleString('sr-RS', { maximumFractionDigits: 1 })}%</span></div><div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Zarada po komadu</span><span className="text-lg font-bold text-success">+{calculatedProfit.toLocaleString('sr-RS', { maximumFractionDigits: 2 })} RSD</span></div></>)}
          {mode === 'margin-to-price' && (<div className="pt-2 border-t border-border"><p className="text-[10px] text-muted-foreground mb-2">Brzi izbor marže</p><div className="flex gap-2 flex-wrap">{[10, 20, 30, 40, 50, 75, 100].map(m => (<button key={m} onClick={() => setMarginPercent(String(m))} className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${marginPercent === String(m) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>{m}%</button>))}</div></div>)}
        </div>
      )}
      {cost > 0 && mode === 'margin-to-price' && calculatedSellingPrice > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2"><h2 className="text-sm font-semibold text-foreground">Zarada po količini</h2><div className="grid grid-cols-3 gap-2 text-xs">{[10, 50, 100].map(qty => (<div key={qty} className="bg-secondary/50 rounded-lg p-2 text-center"><p className="text-muted-foreground">{qty} kom</p><p className="font-bold text-success">+{(calculatedProfit * qty).toLocaleString('sr-RS', { maximumFractionDigits: 0 })}</p></div>))}</div></div>
      )}
    </div>
  );
};

export default MarginCalculatorPage;