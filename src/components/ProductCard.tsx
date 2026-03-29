import { cn } from "@/lib/utils";
import { Product, getMarginPercent } from "@/lib/mock-data";
import { Package, AlertTriangle } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

const unitLabels: Record<string, string> = {
  piece: 'kom',
  kg: 'kg',
  meter: 'm',
  liter: 'L',
  box: 'kutija',
};

const ProductCard = ({ product, onClick }: ProductCardProps) => {
  const isLowStock = product.stock <= product.lowStockThreshold;
  const margin = getMarginPercent(product);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-xl p-3 hover:border-primary/40 transition-all active:scale-[0.98] shadow-sm"
    >
      <div className="flex gap-3">
        <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{product.name}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {product.sku}
            {product.subcategory && <span className="ml-1 text-muted-foreground/70">· {product.subcategory}</span>}
          </p>
          <div className="flex items-center justify-between mt-1.5">
            <div>
              <span className="text-sm font-bold text-primary">
                {product.sellingPrice.toLocaleString('sr-RS')} RSD
              </span>
              {product.bulkPrice && (
                <span className="text-[10px] text-muted-foreground ml-1">
                  / {product.bulkPrice.toLocaleString('sr-RS')} vel.
                </span>
              )}
              <span className="text-[10px] text-success ml-1.5 font-medium">
                {margin.toFixed(0)}%
              </span>
            </div>
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              isLowStock
                ? "bg-destructive/10 text-destructive"
                : "bg-success/10 text-success"
            )}>
              {isLowStock && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
              {product.stock} {unitLabels[product.unit]}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

export default ProductCard;