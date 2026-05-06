CREATE TYPE "InventoryLotSource" AS ENUM ('initial', 'receipt', 'correction', 'inventory');

CREATE TABLE "InventoryLot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "receiptItemId" TEXT,
    "sourceType" "InventoryLotSource" NOT NULL DEFAULT 'receipt',
    "unitCost" DOUBLE PRECISION NOT NULL,
    "receivedQty" INTEGER NOT NULL,
    "remainingQty" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryLot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SaleItemLotAllocation" (
    "id" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "inventoryLotId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SaleItemLotAllocation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_receiptItemId_fkey" FOREIGN KEY ("receiptItemId") REFERENCES "GoodsReceiptItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaleItemLotAllocation" ADD CONSTRAINT "SaleItemLotAllocation_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaleItemLotAllocation" ADD CONSTRAINT "SaleItemLotAllocation_inventoryLotId_fkey" FOREIGN KEY ("inventoryLotId") REFERENCES "InventoryLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "InventoryLot_productId_receivedAt_idx" ON "InventoryLot"("productId", "receivedAt");
CREATE INDEX "InventoryLot_productId_remainingQty_idx" ON "InventoryLot"("productId", "remainingQty");
CREATE INDEX "SaleItemLotAllocation_saleItemId_idx" ON "SaleItemLotAllocation"("saleItemId");
CREATE INDEX "SaleItemLotAllocation_inventoryLotId_idx" ON "SaleItemLotAllocation"("inventoryLotId");
