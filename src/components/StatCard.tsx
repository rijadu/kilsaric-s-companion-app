import { cn } from "@/lib/utils";
import { LucideIcon, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: 'default' | 'warning' | 'success';
  onClick?: () => void;
  expandable?: boolean;
  children?: React.ReactNode;
}

const StatCard = ({ title, value, icon: Icon, trend, variant = 'default', onClick, expandable, children }: StatCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const isInteractive = expandable || onClick;

  const handleClick = () => {
    if (expandable) setExpanded(!expanded);
    else if (onClick) onClick();
  };

  return (
    <div className={cn(
      "rounded-xl bg-card border border-border shadow-sm transition-colors",
      variant === 'warning' && "border-warning/30 bg-warning/5",
      variant === 'success' && "border-success/30 bg-success/5",
      isInteractive && "cursor-pointer hover:border-primary/40 active:scale-[0.98] transition-all",
    )}>
      <div className="p-4" onClick={handleClick}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
          </div>
          <div className="flex items-center gap-1">
            <div className={cn(
              "p-2 rounded-lg",
              variant === 'default' && "bg-primary/10 text-primary",
              variant === 'warning' && "bg-warning/10 text-warning",
              variant === 'success' && "bg-success/10 text-success",
            )}>
              <Icon className="h-5 w-5" />
            </div>
            {expandable && (
              expanded
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
      {expandable && expanded && children && (
        <div className="px-4 pb-4 pt-0 border-t border-border/50">
          {children}
        </div>
      )}
    </div>
  );
};

export default StatCard;