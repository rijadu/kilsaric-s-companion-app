import { useState } from "react";
import { Bell, AlertTriangle, Calendar, X } from "lucide-react";
import { mockProducts } from "@/lib/mock-data";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  type: 'low-stock' | 'expiring';
  title: string;
  description: string;
  action?: string;
}

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const notifications: Notification[] = [];

  const lowStock = mockProducts.filter(p => p.stock <= p.lowStockThreshold);
  if (lowStock.length > 0) {
    notifications.push({
      id: 'low-stock',
      type: 'low-stock',
      title: `${lowStock.length} proizvod${lowStock.length > 1 ? 'a' : ''} sa niskim zalihama`,
      description: lowStock.slice(0, 3).map(p => `${p.name} (${p.stock})`).join(', '),
      action: '/products?filter=low-stock',
    });
  }

  const now = new Date();
  const expiring = mockProducts.filter(p => {
    if (!p.expiryDate) return false;
    const daysLeft = (new Date(p.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysLeft <= 30 && daysLeft > 0;
  });
  if (expiring.length > 0) {
    notifications.push({
      id: 'expiring',
      type: 'expiring',
      title: `${expiring.length} proizvod${expiring.length > 1 ? 'a' : ''} uskoro ističe`,
      description: expiring.map(p => {
        const days = Math.ceil((new Date(p.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return `${p.name} (${days}d)`;
      }).join(', '),
    });
  }

  const count = notifications.length;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Obaveštenja</p>
              <button onClick={() => setOpen(false)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Nema obaveštenja</div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => { if (n.action) { navigate(n.action); setOpen(false); } }}
                    className="w-full text-left px-3 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      {n.type === 'low-stock' ? (
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      ) : (
                        <Calendar className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{n.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;