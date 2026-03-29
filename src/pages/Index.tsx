import { Route, Routes } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import ProductForm from "@/pages/ProductForm";
import StockTable from "@/pages/StockTable";
import ScanPage from "@/pages/ScanPage";
import POS from "@/pages/POS";
import SalesHistory from "@/pages/SalesHistory";
import GoodsReceiptPage from "@/pages/GoodsReceiptPage";
import InventoryCountPage from "@/pages/InventoryCountPage";
import StockHistoryPage from "@/pages/StockHistoryPage";
import ReportsPage from "@/pages/ReportsPage";
import CustomersPage from "@/pages/CustomersPage";
import SuppliersPage from "@/pages/SuppliersPage";
import DailyClosePage from "@/pages/DailyClosePage";
import MarginCalculatorPage from "@/pages/MarginCalculatorPage";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="px-4 pt-4 pb-[calc(var(--nav-height)+1rem)] max-w-lg mx-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/edit/:id" element={<ProductForm />} />
          <Route path="/stock" element={<StockTable />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/history" element={<SalesHistory />} />
          <Route path="/goods-receipt" element={<GoodsReceiptPage />} />
          <Route path="/inventory-count" element={<InventoryCountPage />} />
          <Route path="/stock-history" element={<StockHistoryPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/daily-close" element={<DailyClosePage />} />
          <Route path="/margin-calculator" element={<MarginCalculatorPage />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
};

export default Index;