import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Products ──────────────────────────────────────────────────────────────
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'VD-5050' },
      update: {},
      create: {
        id: 'prod-1',
        name: 'Vijci za drvo 5x50mm',
        sku: 'VD-5050',
        barcode: '8600001000011',
        category: 'Vijci i šarafi',
        subcategory: 'Vijci za drvo',
        brand: 'Würth',
        description: 'Vijci za drvo, ravna glava',
        costPrice: 2.5,
        sellingPrice: 4.0,
        bulkPrice: 3.2,
        bulkMinQty: 100,
        unit: 'piece',
        packSize: 100,
        stock: 2500,
        lowStockThreshold: 500,
        status: 'active',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'BB-GSB13' },
      update: {},
      create: {
        id: 'prod-2',
        name: 'Bosch udarna bušilica GSB 13 RE',
        sku: 'BB-GSB13',
        barcode: '3165140379267',
        category: 'Elektro alat',
        subcategory: 'Bušilice',
        brand: 'Bosch',
        description: '600W udarna bušilica',
        costPrice: 7500,
        sellingPrice: 12990,
        unit: 'piece',
        stock: 8,
        lowStockThreshold: 3,
        status: 'active',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'KBL-PPY325' },
      update: {},
      create: {
        id: 'prod-3',
        name: 'Kabl PP-Y 3x2.5mm²',
        sku: 'KBL-PPY325',
        barcode: '8600002000022',
        category: 'Elektrika',
        subcategory: 'Kablovi',
        brand: 'Elka',
        description: 'Instalacioni kabl, trofazni',
        costPrice: 120,
        sellingPrice: 195,
        bulkPrice: 170,
        bulkMinQty: 50,
        unit: 'meter',
        stock: 450,
        lowStockThreshold: 100,
        status: 'active',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'CEM-425' },
      update: {},
      create: {
        id: 'prod-4',
        name: 'Cement Portland CEM I 42.5',
        sku: 'CEM-425',
        barcode: '8600003000033',
        category: 'Građevinski materijal',
        subcategory: 'Cement',
        brand: 'Lafarge',
        description: 'Vreća 25kg',
        costPrice: 550,
        sellingPrice: 850,
        bulkPrice: 780,
        bulkMinQty: 10,
        unit: 'piece',
        packSize: 1,
        stock: 45,
        lowStockThreshold: 20,
        status: 'active',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'CK-500F' },
      update: {},
      create: {
        id: 'prod-5',
        name: 'Čekić 500g drška fiberglas',
        sku: 'CK-500F',
        barcode: '8600004000044',
        category: 'Ručni alat',
        subcategory: 'Čekići',
        brand: 'Stanley',
        description: 'Bravarski čekić',
        costPrice: 1200,
        sellingPrice: 1990,
        unit: 'piece',
        stock: 15,
        lowStockThreshold: 5,
        status: 'active',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'SK-B280' },
      update: {},
      create: {
        id: 'prod-6',
        name: 'Silikonski kit beli 280ml',
        sku: 'SK-B280',
        barcode: '8600005000055',
        category: 'Boje i lakovi',
        subcategory: 'Silikoni',
        brand: 'Henkel',
        description: 'Sanitarni silikon',
        costPrice: 350,
        sellingPrice: 590,
        bulkPrice: 520,
        bulkMinQty: 5,
        unit: 'piece',
        stock: 3,
        lowStockThreshold: 10,
        status: 'active',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'PPR-20' },
      update: {},
      create: {
        id: 'prod-7',
        name: 'PPR cev 20mm',
        sku: 'PPR-20',
        barcode: '8600006000066',
        category: 'Vodovod',
        subcategory: 'Cevi',
        brand: 'Wavin',
        description: 'PPR cev za toplu i hladnu vodu, 4m',
        costPrice: 280,
        sellingPrice: 450,
        unit: 'meter',
        stock: 120,
        lowStockThreshold: 40,
        status: 'active',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'TF-SX840' },
      update: {},
      create: {
        id: 'prod-8',
        name: 'Tiple Fischer SX 8x40',
        sku: 'TF-SX840',
        barcode: '8600007000077',
        category: 'Vijci i šarafi',
        subcategory: 'Tiple',
        brand: 'Fischer',
        description: 'Univerzalne tiple',
        costPrice: 8,
        sellingPrice: 15,
        bulkPrice: 12,
        bulkMinQty: 100,
        unit: 'piece',
        packSize: 50,
        stock: 180,
        lowStockThreshold: 200,
        status: 'active',
      },
    }),
  ]);
  console.log(`  ✓ ${products.length} products`);

  await prisma.inventoryLot.createMany({
    skipDuplicates: true,
    data: products.map((product) => ({
      id: `lot-${product.id}`,
      productId: product.id,
      sourceType: 'initial',
      unitCost: product.costPrice,
      receivedQty: product.stock,
      remainingQty: product.stock,
      receivedAt: new Date('2026-03-01T08:00:00'),
    })),
  });
  console.log(`  ✓ ${products.length} inventory lots`);

  // ── Customers ─────────────────────────────────────────────────────────────
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { id: 'cust-1' },
      update: {},
      create: {
        id: 'cust-1',
        name: 'Marko Petrović',
        phone: '065/123-4567',
        email: 'marko@example.com',
        address: 'Knez Mihailova 10, Beograd',
        discountType: 'percent',
        discountValue: 5,
        note: 'Redovan kupac, majstor',
        createdAt: new Date('2025-01-15T10:00:00'),
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-2' },
      update: {},
      create: {
        id: 'cust-2',
        name: 'Građevinska firma "Zidanje"',
        phone: '011/555-6789',
        address: 'Industrijska zona bb, Novi Sad',
        discountType: 'percent',
        discountValue: 10,
        note: 'Veleprodajni kupac',
        createdAt: new Date('2025-03-01T08:00:00'),
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-3' },
      update: {},
      create: {
        id: 'cust-3',
        name: 'Ana Jovanović',
        phone: '064/987-6543',
        createdAt: new Date('2026-02-10T14:00:00'),
      },
    }),
  ]);
  console.log(`  ✓ ${customers.length} customers`);

  // ── Suppliers ─────────────────────────────────────────────────────────────
  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { id: 'sup-1' },
      update: {},
      create: {
        id: 'sup-1',
        name: 'Elka d.o.o.',
        phone: '011/222-3333',
        email: 'info@elka.rs',
        address: 'Industrijska 5, Beograd',
        note: 'Glavni dobavljač kablova',
        productNames: ['Kabl PP-Y 3x2.5mm²'],
        createdAt: new Date('2024-06-01T10:00:00'),
      },
    }),
    prisma.supplier.upsert({
      where: { id: 'sup-2' },
      update: {},
      create: {
        id: 'sup-2',
        name: 'Würth Srbija',
        phone: '011/444-5555',
        email: 'narudzbine@wurth.rs',
        address: 'Autoput 22, Novi Beograd',
        note: 'Vijci, tiple, alat',
        productNames: ['Vijci za drvo 5x50mm', 'Tiple Fischer SX 8x40'],
        createdAt: new Date('2024-03-15T08:00:00'),
      },
    }),
    prisma.supplier.upsert({
      where: { id: 'sup-3' },
      update: {},
      create: {
        id: 'sup-3',
        name: 'Bosch distributer',
        phone: '021/555-6666',
        note: 'Elektro alat',
        productNames: ['Bosch udarna bušilica GSB 13 RE'],
        createdAt: new Date('2025-01-10T09:00:00'),
      },
    }),
  ]);
  console.log(`  ✓ ${suppliers.length} suppliers`);

  // ── Goods Receipts ────────────────────────────────────────────────────────
  const gr1 = await prisma.goodsReceipt.upsert({
    where: { id: 'gr-1' },
    update: {},
    create: {
      id: 'gr-1',
      supplierId: 'sup-1',
      supplierName: 'Elka d.o.o.',
      note: 'Redovna isporuka',
      totalCost: 24000,
      date: new Date('2026-03-26T14:00:00'),
      items: {
        create: [{ productId: 'prod-3', productName: 'Kabl PP-Y 3x2.5mm²', quantity: 200, costPrice: 120, sellingPrice: 195, unit: 'meter' }],
      },
    },
  });
  const gr2 = await prisma.goodsReceipt.upsert({
    where: { id: 'gr-2' },
    update: {},
    create: {
      id: 'gr-2',
      supplierId: 'sup-2',
      supplierName: 'Würth Srbija',
      totalCost: 6500,
      date: new Date('2026-03-24T10:00:00'),
      items: {
        create: [
          { productId: 'prod-1', productName: 'Vijci za drvo 5x50mm', quantity: 1000, costPrice: 2.5, sellingPrice: 4.0, unit: 'piece' },
          { productId: 'prod-8', productName: 'Tiple Fischer SX 8x40', quantity: 500, costPrice: 8, sellingPrice: 15, unit: 'piece' },
        ],
      },
    },
  });
  console.log(`  ✓ 2 goods receipts`);

  // ── Stock Changes ─────────────────────────────────────────────────────────
  await prisma.stockChange.createMany({
    skipDuplicates: true,
    data: [
      { id: 'sc-1', productId: 'prod-1', productName: 'Vijci za drvo 5x50mm', type: 'sale', quantity: -100, previousStock: 2600, newStock: 2500, date: new Date('2026-03-27T09:15:00') },
      { id: 'sc-2', productId: 'prod-5', productName: 'Čekić 500g drška fiberglas', type: 'sale', quantity: -1, previousStock: 16, newStock: 15, date: new Date('2026-03-27T09:15:00') },
      { id: 'sc-3', productId: 'prod-2', productName: 'Bosch udarna bušilica GSB 13 RE', type: 'sale', quantity: -1, previousStock: 9, newStock: 8, date: new Date('2026-03-27T10:30:00') },
      { id: 'sc-4', productId: 'prod-3', productName: 'Kabl PP-Y 3x2.5mm²', type: 'receipt', quantity: 200, previousStock: 250, newStock: 450, note: 'Prijem od Elka d.o.o.', date: new Date('2026-03-26T14:00:00') },
      { id: 'sc-5', productId: 'prod-6', productName: 'Silikonski kit beli 280ml', type: 'correction', quantity: -2, previousStock: 5, newStock: 3, note: 'Oštećena roba', date: new Date('2026-03-25T16:00:00') },
    ],
  });
  console.log(`  ✓ 5 stock changes`);

  // ── Inventory Count ───────────────────────────────────────────────────────
  await prisma.inventoryCount.upsert({
    where: { id: 'ic-1' },
    update: {},
    create: {
      id: 'ic-1',
      date: new Date('2026-03-20T08:00:00'),
      status: 'completed',
      items: {
        create: [
          { productId: 'prod-1', productName: 'Vijci za drvo 5x50mm', systemStock: 2700, actualStock: 2650, difference: -50 },
          { productId: 'prod-6', productName: 'Silikonski kit beli 280ml', systemStock: 7, actualStock: 5, difference: -2 },
          { productId: 'prod-4', productName: 'Cement Portland CEM I 42.5', systemStock: 45, actualStock: 45, difference: 0 },
        ],
      },
    },
  });
  console.log(`  ✓ 1 inventory count`);

  // ── Sales ─────────────────────────────────────────────────────────────────
  await prisma.sale.upsert({
    where: { id: 'sale-1' },
    update: {},
    create: {
      id: 'sale-1',
      subtotal: 2390,
      total: 2390,
      paymentMethod: 'cash',
      date: new Date('2026-03-27T09:15:00'),
      status: 'completed',
      items: {
        create: [
          { productId: 'prod-1', productName: 'Vijci za drvo 5x50mm', productSku: 'VD-5050', costPrice: 2.5, sellingPrice: 4.0, unit: 'piece', quantity: 100, lineTotal: 400 },
          { productId: 'prod-5', productName: 'Čekić 500g drška fiberglas', productSku: 'CK-500F', costPrice: 1200, sellingPrice: 1990, unit: 'piece', quantity: 1, lineTotal: 1990 },
        ],
      },
    },
  });
  await prisma.sale.upsert({
    where: { id: 'sale-2' },
    update: {},
    create: {
      id: 'sale-2',
      subtotal: 12990,
      total: 12990,
      paymentMethod: 'card',
      date: new Date('2026-03-27T10:30:00'),
      status: 'completed',
      items: {
        create: [
          { productId: 'prod-2', productName: 'Bosch udarna bušilica GSB 13 RE', productSku: 'BB-GSB13', costPrice: 7500, sellingPrice: 12990, unit: 'piece', quantity: 1, lineTotal: 12990 },
        ],
      },
    },
  });
  await prisma.sale.upsert({
    where: { id: 'sale-3' },
    update: {},
    create: {
      id: 'sale-3',
      subtotal: 4105,
      total: 4105,
      paymentMethod: 'cash',
      date: new Date('2026-03-27T11:45:00'),
      status: 'completed',
      items: {
        create: [
          { productId: 'prod-3', productName: 'Kabl PP-Y 3x2.5mm²', productSku: 'KBL-PPY325', costPrice: 120, sellingPrice: 195, unit: 'meter', quantity: 15, lineTotal: 2925 },
          { productId: 'prod-6', productName: 'Silikonski kit beli 280ml', productSku: 'SK-B280', costPrice: 350, sellingPrice: 590, unit: 'piece', quantity: 2, lineTotal: 1180 },
        ],
      },
    },
  });
  console.log(`  ✓ 3 sales`);

  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
