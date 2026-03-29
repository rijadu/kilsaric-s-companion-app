import { CartItem, getItemTotal } from "@/lib/mock-data";
import { forwardRef } from "react";

const unitLabels: Record<string, string> = {
  piece: 'kom', kg: 'kg', meter: 'm', liter: 'L', box: 'kutija',
};

interface ReceiptProps {
  items: CartItem[];
  subtotal?: number;
  discount?: { type: 'percent' | 'fixed'; value: number };
  total: number;
  paymentMethod: 'cash' | 'card';
  receiptNumber: string;
  date: Date;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
}

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({
  items,
  subtotal,
  discount,
  total,
  paymentMethod,
  receiptNumber,
  date,
  shopName = "GVOŽĐARA",
  shopAddress = "Ulica Primer 1, Beograd",
  shopPhone = "011/123-4567",
}, ref) => {
  const formattedDate = date.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formattedTime = date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });

  return (
    <div ref={ref} className="receipt-print">
      <div className="text-center mb-2">
        <div className="text-lg font-bold">{shopName}</div>
        <div className="text-[10px]">{shopAddress}</div>
        <div className="text-[10px]">Tel: {shopPhone}</div>
      </div>

      <div className="border-t border-dashed border-black my-1" />

      <div className="flex justify-between text-[10px] mb-1">
        <span>Račun: {receiptNumber}</span>
        <span>{formattedDate} {formattedTime}</span>
      </div>

      <div className="border-t border-dashed border-black my-1" />

      <div className="flex justify-between text-[10px] font-bold mb-0.5">
        <span className="flex-1">Artikal</span>
        <span className="w-10 text-right">Kol.</span>
        <span className="w-14 text-right">Cena</span>
        <span className="w-16 text-right">Iznos</span>
      </div>

      <div className="border-t border-dashed border-black my-0.5" />

      {items.map((item, i) => {
        const itemTotal = getItemTotal(item);
        return (
          <div key={i} className="mb-0.5">
            <div className="text-[10px] font-medium truncate">{item.product.name}</div>
            <div className="flex justify-between text-[10px]">
              <span className="flex-1 text-gray-600">{item.product.sku}</span>
              <span className="w-10 text-right">{item.quantity}{unitLabels[item.product.unit]}</span>
              <span className="w-14 text-right">{item.product.sellingPrice.toLocaleString('sr-RS')}</span>
              <span className="w-16 text-right font-medium">{itemTotal.toLocaleString('sr-RS')}</span>
            </div>
            {item.discount && (
              <div className="text-[9px] text-gray-500 text-right">
                Popust: {item.discount.type === 'percent' ? `${item.discount.value}%` : `${item.discount.value} RSD`}
              </div>
            )}
          </div>
        );
      })}

      <div className="border-t border-dashed border-black my-1" />

      {discount && subtotal && (
        <>
          <div className="flex justify-between text-[10px]">
            <span>Međuzbir:</span>
            <span>{subtotal.toLocaleString('sr-RS')} RSD</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span>Popust ({discount.type === 'percent' ? `${discount.value}%` : `${discount.value} RSD`}):</span>
            <span>-{(subtotal - total).toLocaleString('sr-RS')} RSD</span>
          </div>
        </>
      )}

      <div className="flex justify-between text-xs font-bold">
        <span>UKUPNO:</span>
        <span>{Math.round(total).toLocaleString('sr-RS')} RSD</span>
      </div>

      <div className="flex justify-between text-[10px] mt-0.5">
        <span>Način plaćanja:</span>
        <span>{paymentMethod === 'cash' ? 'Gotovina' : 'Kartica'}</span>
      </div>

      <div className="border-t border-dashed border-black my-1" />

      <div className="text-center text-[10px] mt-1">
        <div>Hvala na kupovini!</div>
        <div className="text-gray-500 mt-0.5">www.gvozdara.rs</div>
      </div>
    </div>
  );
});

Receipt.displayName = "Receipt";
export default Receipt;