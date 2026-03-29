import { useState } from "react";
import { Package, AlertTriangle, TrendingUp, DollarSign, ShoppingCart } from "lucide-react";
import StatCard from "@/components/StatCard";
import NotificationBell from "@/components/NotificationBell";
import { mockProducts, mockSales, getProfit } from "@/lib/mock-data";
import { useNavigate } from "react-router-dom";

type Period = 'today' | 'week' | 'month';
const periodLabels: Record<Period, string> = { today: 'Danas', week: 'Ova nedelja', month: 'Ovaj mesec' };

const unitLabels: Record<string, string> = {
  piece: 'kom', kg: 'kg', meter: 'm', liter: 'L', box: 'kutija',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('today');
  const now = new Date();

  const completedSales = mockSales.filter(s => {
    if (s.status !== 'completed') return false;
    const d = new Date(s.date);
    if (period === 'today') return d.toDateString() === now.toDateString();
    if (period === 'week') { const w = new Date(now); w.setDate(w.getDate() - 7); return d >= w; }
    const m = new Date(now); m.setMonth(m.getMonth() - 1); return d >= m;
  });

  const lowStockItems = mockProducts.filter(p => p.stock <= p.lowStockThreshold);
  const totalRevenue = completedSales.reduce((sum, s) => sum + s.total, 0);
  const totalProfit = completedSales.reduce((sum, s) => sum + s.items.reduce((iSum, item) => iSum + getProfit(item), 0), 0);
  const totalItems = mockProducts.reduce((sum, p) => sum + p.stock, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gvožđara</h1>
          <p className="text-sm text-muted-foreground">Pregled stanja</p>
        </div>
        <NotificationBell />
      </div>

      <div className="flex gap-2">
        {(['today', 'week', 'month'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${period === p ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            {periodLabels[p]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Artikala" value={mockProducts.length} icon={Package}
          trend={`${totalItems.toLocaleString('sr-RS')} na stanju`}
          onClick={() => navigate('/products')} />

        <StatCard title={`${periodLabels[period]} pazar`} value={`${totalRevenue.toLocaleString('sr-RS')}`} icon={DollarSign} variant="success"
          trend={`${completedSales.length} prodaja`}
          onClick={() => navigate('/history')} />

        <StatCard title="Zarada" value={`${totalProfit.toLocaleString('sr-RS')}`} icon={TrendingUp} variant="success"
          trend="Vidi izveštaje →"
          onClick={() => navigate('/reports')} />

        <StatCard title="Nova prodaja" value="" icon={ShoppingCart} variant="default"
          trend="Otvori kasu →"
          onClick={() => navigate('/pos')} />
      </div>

      {completedSales.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">📊 {periodLabels[period]}</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className="text-muted-foreground">Gotovina</p>
              <p className="font-bold text-foreground">
                {completedSales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0).toLocaleString('sr-RS')} RSD
              </p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className="text-muted-foreground">Kartica</p>
              <p className="font-bold text-foreground">
                {completedSales.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + s.total, 0).toLocaleString('sr-RS')} RSD
              </p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className="text-muted-foreground">Prodatih artikala</p>
              <p className="font-bold text-foreground">
                {completedSales.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0)}
              </p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className="text-muted-foreground">Prosek račun</p>
              <p className="font-bold text-foreground">
                {Math.round(totalRevenue / completedSales.length).toLocaleString('sr-RS')} RSD
              </p>
            </div>
          </div>
        </div>
      )}

      {completedSales.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Prodato</h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {completedSales.slice(0, 5).map((sale, i) => (
              <button key={sale.id} onClick={() => navigate('/history')}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/50 transition-colors ${i < Math.min(completedSales.length, 5) - 1 ? 'border-b border-border' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">
                    {sale.items.map(item => `${item.product.name} ×${item.quantity} ${unitLabels[item.product.unit] || 'kom'}`).join(', ')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(sale.date).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
                    {sale.customerName && ` · ${sale.customerName}`}
                  </p>
                </div>
                <span className="text-sm font-mono font-medium text-foreground shrink-0 ml-2">
                  {sale.total.toLocaleString('sr-RS')}
                </span>
              </button>
            ))}
          </div>
          {completedSales.length > 5 && (
            <button onClick={() => navigate('/history')} className="text-xs text-primary font-medium">
              Vidi sve ({completedSales.length}) →
            </button>
          )}
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Niske zalihe ({lowStockItems.length})
          </h2>
          <div className="bg-card border border-destructive/20 rounded-lg overflow-hidden">
            {lowStockItems.slice(0, 4).map((p, i) => (
              <button key={p.id} onClick={() => navigate(`/products/edit/${p.id}`)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/50 transition-colors ${i < Math.min(lowStockItems.length, 4) - 1 ? 'border-b border-border' : ''}`}>
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.category}{p.subcategory ? ` · ${p.subcategory}` : ''}</p>
                </div>
                <span className="text-xs font-bold text-destructive shrink-0 ml-2">
                  {p.stock} {unitLabels[p.unit]} (min {p.lowStockThreshold})
                </span>
              </button>
            ))}
          </div>
          {lowStockItems.length > 4 && (
            <button onClick={() => navigate('/products?filter=low-stock')} className="text-xs text-primary font-medium">
              Vidi sve ({lowStockItems.length}) →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;