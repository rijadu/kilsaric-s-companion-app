export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  subcategory?: string;
  brand: string;
  description: string;
  costPrice: number;
  sellingPrice: number;
  bulkPrice?: number;
  bulkMinQty?: number;
  unit: 'piece' | 'kg' | 'meter' | 'liter' | 'box';
  packSize?: number;
  stock: number;
  lowStockThreshold: number;
  status: 'active' | 'inactive';
  image?: string;
  variants?: Variant[];
  expiryDate?: string;
  warrantyMonths?: number;
}

export type StockChangeType = 'sale' | 'receipt' | 'correction' | 'refund' | 'inventory';

export interface StockChange {
  id: string;
  productId: string;
  productName: string;
  type: StockChangeType;
  quantity: number;
  previousStock: number;
  newStock: number;
  note?: string;
  date: string;
}

export interface GoodsReceipt {
  id: string;
  supplier: string;
  items: { productId: string; productName: string; quantity: number; costPrice: number }[];
  totalCost: number;
  date: string;
  note?: string;
}

export interface InventoryCount {
  id: string;
  date: string;
  status: 'in_progress' | 'completed';
  items: { productId: string; productName: string; systemStock: number; actualStock: number; difference: number }[];
}

export const getMarginPercent = (product: Product): number => {
  if (product.costPrice <= 0) return 0;
  return ((product.sellingPrice - product.costPrice) / product.costPrice) * 100;
};

export const getProfit = (item: CartItem): number => {
  const revenue = getItemTotal(item);
  const cost = item.product.costPrice * item.quantity;
  return revenue - cost;
};

export interface Variant {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  stock: number;
  priceOverride?: number;
}

export interface CartItem {
  product: Product;
  variant?: Variant;
  quantity: number;
  discount?: {
    type: 'percent' | 'fixed';
    value: number;
  };
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  defaultDiscount?: {
    type: 'percent' | 'fixed';
    value: number;
  };
  note?: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount?: {
    type: 'percent' | 'fixed';
    value: number;
  };
  total: number;
  paymentMethod: 'cash' | 'card';
  customerId?: string;
  customerName?: string;
  date: string;
  status: 'completed' | 'refunded';
  refundDate?: string;
  refundReason?: string;
}

export const getItemTotal = (item: CartItem): number => {
  const base = item.product.sellingPrice * item.quantity;
  if (!item.discount) return base;
  if (item.discount.type === 'percent') return base * (1 - item.discount.value / 100);
  return Math.max(0, base - item.discount.value);
};

export const categories = [
  'Alat', 'Vijci i šarafi', 'Elektrika', 'Vodovod', 'Boje i lakovi',
  'Građevinski materijal', 'Ručni alat', 'Elektro alat'
];

export const subcategories: Record<string, string[]> = {
  'Vijci i šarafi': ['Vijci za drvo', 'Vijci za metal', 'Šarafi', 'Tiple', 'Matice'],
  'Boje i lakovi': ['Uljane boje', 'Nitro boje', 'Vodene boje', 'Lakovi', 'Silikoni'],
  'Elektrika': ['Kablovi', 'Prekidači', 'Utičnice', 'Osigurači'],
  'Vodovod': ['Cevi', 'Ventili', 'Fitinzi', 'Slavine'],
  'Ručni alat': ['Čekići', 'Klešta', 'Odvijači', 'Ključevi'],
  'Elektro alat': ['Bušilice', 'Brusilice', 'Testeri', 'Šrafilice'],
  'Građevinski materijal': ['Cement', 'Lepak', 'Malter', 'Gips'],
  'Alat': ['Ručni alat', 'Merni alat', 'Zaštitna oprema'],
};

export const brands = ['Bosch', 'Makita', 'DeWalt', 'Stanley', 'Würth', 'Fischer', 'Knauf', 'Henkel'];

export const mockProducts: Product[] = [
  {
    id: '1', name: 'Vijci za drvo 5x50mm', sku: 'VD-5050', barcode: '8600001000011',
    category: 'Vijci i šarafi', subcategory: 'Vijci za drvo', brand: 'Würth', description: 'Vijci za drvo, ravna glava',
    costPrice: 2.5, sellingPrice: 4.0, bulkPrice: 3.2, bulkMinQty: 100, unit: 'piece', packSize: 100,
    stock: 2500, lowStockThreshold: 500, status: 'active',
    variants: [
      { id: 'v1', name: 'Inox', sku: 'VD-5050-I', stock: 800 },
      { id: 'v2', name: 'Pocinkovani', sku: 'VD-5050-P', stock: 1700 },
    ]
  },
  {
    id: '2', name: 'Bosch udarna bušilica GSB 13 RE', sku: 'BB-GSB13', barcode: '3165140379267',
    category: 'Elektro alat', subcategory: 'Bušilice', brand: 'Bosch', description: '600W udarna bušilica',
    costPrice: 7500, sellingPrice: 12990, unit: 'piece',
    stock: 8, lowStockThreshold: 3, status: 'active',
  },
  {
    id: '3', name: 'Kabl PP-Y 3x2.5mm²', sku: 'KBL-PPY325', barcode: '8600002000022',
    category: 'Elektrika', subcategory: 'Kablovi', brand: 'Elka', description: 'Instalacioni kabl, trofazni',
    costPrice: 120, sellingPrice: 195, bulkPrice: 170, bulkMinQty: 50, unit: 'meter',
    stock: 450, lowStockThreshold: 100, status: 'active',
  },
  {
    id: '4', name: 'Cement Portland CEM I 42.5', sku: 'CEM-425', barcode: '8600003000033',
    category: 'Građevinski materijal', subcategory: 'Cement', brand: 'Lafarge', description: 'Vreća 25kg',
    costPrice: 550, sellingPrice: 850, bulkPrice: 780, bulkMinQty: 10, unit: 'piece', packSize: 1,
    stock: 45, lowStockThreshold: 20, status: 'active',
  },
  {
    id: '5', name: 'Čekić 500g drška fiberglas', sku: 'CK-500F', barcode: '8600004000044',
    category: 'Ručni alat', subcategory: 'Čekići', brand: 'Stanley', description: 'Bravarski čekić',
    costPrice: 1200, sellingPrice: 1990, unit: 'piece',
    stock: 15, lowStockThreshold: 5, status: 'active',
  },
  {
    id: '6', name: 'Silikonski kit beli 280ml', sku: 'SK-B280', barcode: '8600005000055',
    category: 'Boje i lakovi', subcategory: 'Silikoni', brand: 'Henkel', description: 'Sanitarni silikon',
    costPrice: 350, sellingPrice: 590, bulkPrice: 520, bulkMinQty: 5, unit: 'piece',
    stock: 3, lowStockThreshold: 10, status: 'active',
  },
  {
    id: '7', name: 'PPR cev 20mm', sku: 'PPR-20', barcode: '8600006000066',
    category: 'Vodovod', subcategory: 'Cevi', brand: 'Wavin', description: 'PPR cev za toplu i hladnu vodu, 4m',
    costPrice: 280, sellingPrice: 450, unit: 'meter',
    stock: 120, lowStockThreshold: 40, status: 'active',
  },
  {
    id: '8', name: 'Tiple Fischer SX 8x40', sku: 'TF-SX840', barcode: '8600007000077',
    category: 'Vijci i šarafi', subcategory: 'Tiple', brand: 'Fischer', description: 'Univerzalne tiple',
    costPrice: 8, sellingPrice: 15, bulkPrice: 12, bulkMinQty: 100, unit: 'piece', packSize: 50,
    stock: 180, lowStockThreshold: 200, status: 'active',
  },
];

export const mockStockChanges: StockChange[] = [
  { id: 'sc1', productId: '1', productName: 'Vijci za drvo 5x50mm', type: 'sale', quantity: -100, previousStock: 2600, newStock: 2500, date: '2026-03-27T09:15:00' },
  { id: 'sc2', productId: '5', productName: 'Čekić 500g drška fiberglas', type: 'sale', quantity: -1, previousStock: 16, newStock: 15, date: '2026-03-27T09:15:00' },
  { id: 'sc3', productId: '2', productName: 'Bosch udarna bušilica GSB 13 RE', type: 'sale', quantity: -1, previousStock: 9, newStock: 8, date: '2026-03-27T10:30:00' },
  { id: 'sc4', productId: '3', productName: 'Kabl PP-Y 3x2.5mm²', type: 'receipt', quantity: 200, previousStock: 250, newStock: 450, note: 'Prijem od Elka d.o.o.', date: '2026-03-26T14:00:00' },
  { id: 'sc5', productId: '6', productName: 'Silikonski kit beli 280ml', type: 'correction', quantity: -2, previousStock: 5, newStock: 3, note: 'Oštećena roba', date: '2026-03-25T16:00:00' },
];

export const mockGoodsReceipts: GoodsReceipt[] = [
  {
    id: 'gr1', supplier: 'Elka d.o.o.', date: '2026-03-26T14:00:00', note: 'Redovna isporuka',
    items: [{ productId: '3', productName: 'Kabl PP-Y 3x2.5mm²', quantity: 200, costPrice: 120 }],
    totalCost: 24000,
  },
  {
    id: 'gr2', supplier: 'Würth Srbija', date: '2026-03-24T10:00:00',
    items: [
      { productId: '1', productName: 'Vijci za drvo 5x50mm', quantity: 1000, costPrice: 2.5 },
      { productId: '8', productName: 'Tiple Fischer SX 8x40', quantity: 500, costPrice: 8 },
    ],
    totalCost: 6500,
  },
];

export const mockInventoryCounts: InventoryCount[] = [
  {
    id: 'ic1', date: '2026-03-20T08:00:00', status: 'completed',
    items: [
      { productId: '1', productName: 'Vijci za drvo 5x50mm', systemStock: 2700, actualStock: 2650, difference: -50 },
      { productId: '6', productName: 'Silikonski kit beli 280ml', systemStock: 7, actualStock: 5, difference: -2 },
      { productId: '4', productName: 'Cement Portland CEM I 42.5', systemStock: 45, actualStock: 45, difference: 0 },
    ],
  },
];

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
  products?: string[];
  createdAt: string;
}

export const mockSuppliers: Supplier[] = [
  {
    id: 'sup1', name: 'Elka d.o.o.', phone: '011/222-3333', email: 'info@elka.rs',
    address: 'Industrijska 5, Beograd', note: 'Glavni dobavljač kablova',
    products: ['Kabl PP-Y 3x2.5mm²'],
    createdAt: '2024-06-01T10:00:00',
  },
  {
    id: 'sup2', name: 'Würth Srbija', phone: '011/444-5555', email: 'narudzbine@wurth.rs',
    address: 'Autoput 22, Novi Beograd', note: 'Vijci, tiple, alat',
    products: ['Vijci za drvo 5x50mm', 'Tiple Fischer SX 8x40'],
    createdAt: '2024-03-15T08:00:00',
  },
  {
    id: 'sup3', name: 'Bosch distributer', phone: '021/555-6666',
    note: 'Elektro alat',
    products: ['Bosch udarna bušilica GSB 13 RE'],
    createdAt: '2025-01-10T09:00:00',
  },
];

export const mockCustomers: Customer[] = [
  {
    id: 'c1', name: 'Marko Petrović', phone: '065/123-4567', email: 'marko@example.com',
    address: 'Knez Mihailova 10, Beograd',
    defaultDiscount: { type: 'percent', value: 5 },
    note: 'Redovan kupac, majstor',
    createdAt: '2025-01-15T10:00:00',
  },
  {
    id: 'c2', name: 'Građevinska firma "Zidanje"', phone: '011/555-6789',
    address: 'Industrijska zona bb, Novi Sad',
    defaultDiscount: { type: 'percent', value: 10 },
    note: 'Veleprodajni kupac',
    createdAt: '2025-03-01T08:00:00',
  },
  {
    id: 'c3', name: 'Ana Jovanović', phone: '064/987-6543',
    createdAt: '2026-02-10T14:00:00',
  },
];

export const mockSales: Sale[] = [
  {
    id: 's1',
    items: [
      { product: mockProducts[0], quantity: 100 },
      { product: mockProducts[4], quantity: 1 },
    ],
    subtotal: 2390,
    total: 2390,
    paymentMethod: 'cash',
    date: '2026-03-27T09:15:00',
    status: 'completed',
  },
  {
    id: 's2',
    items: [
      { product: mockProducts[1], quantity: 1 },
    ],
    subtotal: 12990,
    total: 12990,
    paymentMethod: 'card',
    date: '2026-03-27T10:30:00',
    status: 'completed',
  },
  {
    id: 's3',
    items: [
      { product: mockProducts[2], quantity: 15 },
      { product: mockProducts[5], quantity: 2 },
    ],
    subtotal: 4105,
    total: 4105,
    paymentMethod: 'cash',
    date: '2026-03-27T11:45:00',
    status: 'completed',
  },
];