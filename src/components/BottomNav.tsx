import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, ScanBarcode, ShoppingCart, History } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Početna" },
  { path: "/products", icon: Package, label: "Proizvodi" },
  { path: "/scan", icon: ScanBarcode, label: "Skeniraj" },
  { path: "/pos", icon: ShoppingCart, label: "Prodaja" },
  { path: "/history", icon: History, label: "Istorija" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-[var(--nav-height)]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isScanner = item.path === "/scan";

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                isScanner
                  ? "relative -mt-5"
                  : isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isScanner ? (
                <div className={cn(
                  "flex items-center justify-center w-14 h-14 rounded-2xl bg-primary shadow-lg",
                  isActive && "animate-pulse-orange"
                )}>
                  <item.icon className="h-7 w-7 text-primary-foreground" />
                </div>
              ) : (
                <item.icon className={cn("h-6 w-6", isActive && "text-primary")} />
              )}
              <span className={cn(
                "text-[10px] font-medium",
                isScanner ? "mt-1 text-primary" : isActive ? "text-primary" : ""
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;