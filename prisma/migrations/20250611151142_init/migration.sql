-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "businessId" UUID NOT NULL,
    "godownWarehouseId" UUID NOT NULL,
    "itemType" VARCHAR(128) NOT NULL,
    "itemName" VARCHAR(512) NOT NULL,
    "itemCategory" VARCHAR(128) NOT NULL,
    "itemCode" VARCHAR(128) NOT NULL,
    "itemDescription" TEXT,
    "isMrpEnabled" BOOLEAN NOT NULL,
    "isWholesaleEnabled" BOOLEAN NOT NULL,
    "isSerializationEnabled" BOOLEAN NOT NULL,
    "isBatchingEnabled" BOOLEAN NOT NULL,
    "sellingPrice" DECIMAL(65,30) NOT NULL,
    "sellingPriceType" VARCHAR(64) NOT NULL,
    "purchasePrice" DECIMAL(65,30) NOT NULL,
    "purchasePriceType" VARCHAR(64) NOT NULL,
    "mrp" DECIMAL(65,30) NOT NULL,
    "wholesalePrice" DECIMAL(65,30) NOT NULL,
    "wholesalePriceType" VARCHAR(64) NOT NULL,
    "wholesaleQuantity" INTEGER NOT NULL,
    "discountPercent" DECIMAL(65,30) NOT NULL,
    "discountAmount" DECIMAL(65,30) NOT NULL,
    "hsnCode" VARCHAR(128) NOT NULL,
    "sacCode" VARCHAR(128) NOT NULL,
    "tax" VARCHAR(128) NOT NULL,
    "cess" VARCHAR(128) NOT NULL,
    "unit" VARCHAR(128) NOT NULL,
    "isSecondUnitEnabled" BOOLEAN NOT NULL,
    "secondUnit" VARCHAR(128) NOT NULL,
    "conversionRate" DECIMAL(65,30) NOT NULL,
    "openingStock" DECIMAL(65,30) NOT NULL,
    "openingStockDate" TIMESTAMP(3) NOT NULL,
    "closingStock" DECIMAL(65,30) NOT NULL,
    "isMinStockAlertEnabled" BOOLEAN NOT NULL,
    "minStockCount" DECIMAL(65,30) NOT NULL,
    "itemImage" TEXT,
    "serialNoLabel" VARCHAR(128),
    "itemSerialisationId" TEXT,
    "itemBatchingId" TEXT,
    "customFieldId" TEXT,
    "isOnlineStoreEnabled" BOOLEAN NOT NULL,
    "isOndcStoreEnabled" BOOLEAN NOT NULL,
    "isEnabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemBatching" (
    "item_batching_id" TEXT NOT NULL,
    "batchNo" VARCHAR(128) NOT NULL,
    "manufactureDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "sellingPrice" DECIMAL(65,30) NOT NULL,
    "sellingPriceType" VARCHAR(64) NOT NULL,
    "purchasePrice" DECIMAL(65,30) NOT NULL,
    "purchasePriceType" VARCHAR(64) NOT NULL,
    "mrp" DECIMAL(65,30) NOT NULL,
    "unit" VARCHAR(128) NOT NULL,
    "isSecondUnitEnabled" BOOLEAN NOT NULL,
    "secondUnit" VARCHAR(128) NOT NULL,
    "conversionRate" DECIMAL(65,30) NOT NULL,
    "openingStock" DECIMAL(65,30) NOT NULL,
    "openingStockDate" TIMESTAMP(3) NOT NULL,
    "closingStock" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemBatching_pkey" PRIMARY KEY ("item_batching_id")
);

-- CreateTable
CREATE TABLE "ItemSerialisation" (
    "item_serialisation_id" TEXT NOT NULL,
    "serialNo" VARCHAR(128) NOT NULL,
    "serialNoDate" TIMESTAMP(3) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemSerialisation_pkey" PRIMARY KEY ("item_serialisation_id")
);

-- CreateTable
CREATE TABLE "ItemUnit" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "unitName" VARCHAR(128) NOT NULL,
    "isEnabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockActivity" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "activityType" VARCHAR(128) NOT NULL,
    "invoicePrefix" VARCHAR(128) NOT NULL,
    "invoiceNo" INTEGER NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "closingStock" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockActivity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_itemBatchingId_fkey" FOREIGN KEY ("itemBatchingId") REFERENCES "ItemBatching"("item_batching_id") ON DELETE SET NULL ON UPDATE CASCADE;
