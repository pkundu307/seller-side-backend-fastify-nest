-- CreateEnum
CREATE TYPE "AuthSource" AS ENUM ('self', 'google');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('basic', 'pro', 'user');

-- CreateTable
CREATE TABLE "CustomerUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "picture" TEXT,
    "name" TEXT NOT NULL,
    "password" TEXT,
    "authSource" "AuthSource" NOT NULL DEFAULT 'self',
    "type" "CustomerType" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "image" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gstNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "images" TEXT[],
    "isPublished" BOOLEAN DEFAULT false,
    "isFeatured" BOOLEAN DEFAULT false,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "businessId" TEXT NOT NULL,
    "cess" VARCHAR(128),
    "closingStock" DECIMAL(65,30),
    "conversionRate" DECIMAL(65,30),
    "discountAmount" DECIMAL(65,30),
    "discountPercent" DECIMAL(65,30),
    "hsnCode" VARCHAR(128),
    "isBatchingEnabled" BOOLEAN,
    "isMinStockAlertEnabled" BOOLEAN,
    "isMrpEnabled" BOOLEAN,
    "isSecondUnitEnabled" BOOLEAN,
    "isSerializationEnabled" BOOLEAN,
    "isWholesaleEnabled" BOOLEAN,
    "itemBatchingId" TEXT,
    "itemCategory" TEXT NOT NULL,
    "itemCode" VARCHAR(128),
    "itemDescription" TEXT,
    "itemImage" TEXT,
    "itemSerialisationId" TEXT,
    "itemType" VARCHAR(128),
    "itemUnitId" TEXT,
    "minStockCount" DECIMAL(65,30),
    "mrp" DECIMAL(65,30),
    "openingStock" DECIMAL(65,30),
    "openingStockDate" TIMESTAMP(3),
    "purchasePrice" DECIMAL(65,30),
    "purchasePriceType" VARCHAR(64),
    "sacCode" VARCHAR(128),
    "secondUnit" VARCHAR(128),
    "sellingPrice" DECIMAL(65,30),
    "sellingPriceType" VARCHAR(64),
    "serialNoLabel" TEXT,
    "tax" VARCHAR(128),
    "unit" VARCHAR(128),
    "wholesalePrice" DECIMAL(65,30),
    "wholesalePriceType" VARCHAR(64),
    "wholesaleQuantity" INTEGER,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variant" (
    "id" TEXT NOT NULL,
    "size" TEXT,
    "color" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "Variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" INTEGER,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "saleId" TEXT,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "saleType" VARCHAR(128) NOT NULL,
    "invoicePrefix" VARCHAR(128) NOT NULL,
    "invoiceNo" INTEGER NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "isDueDateEnabled" BOOLEAN NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentTerm" INTEGER NOT NULL,
    "partyType" VARCHAR(128) NOT NULL,
    "partyName" VARCHAR(256) NOT NULL,
    "businessName" VARCHAR(256) NOT NULL,
    "billingAddress" TEXT NOT NULL,
    "shippingAddress" TEXT NOT NULL,
    "placeOfSupply" VARCHAR(128) NOT NULL,
    "phoneNo" VARCHAR(36) NOT NULL,
    "taxId" VARCHAR(128) NOT NULL,
    "panNo" VARCHAR(128) NOT NULL,
    "isDiscountAfterTaxEnabled" BOOLEAN NOT NULL,
    "discountPercent" DECIMAL(65,30) NOT NULL,
    "discountAmount" DECIMAL(65,30) NOT NULL,
    "totalTaxableAmount" DECIMAL(65,30) NOT NULL,
    "totalTaxAmount" DECIMAL(65,30) NOT NULL,
    "isAutoRoundoffEnabled" BOOLEAN NOT NULL,
    "roundoffType" VARCHAR(64) NOT NULL,
    "roundoffAmount" DECIMAL(65,30) NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "isSettled" BOOLEAN NOT NULL,
    "balanceAmount" DECIMAL(65,30) NOT NULL,
    "termCondition" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isScanItemEnabled" BOOLEAN NOT NULL,
    "isConverted" BOOLEAN NOT NULL,
    "party" TEXT NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "saleItemId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" VARCHAR(512) NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "hsnCode" VARCHAR(128) NOT NULL,
    "sacCode" VARCHAR(128) NOT NULL,
    "batchNo" VARCHAR(128) NOT NULL,
    "manufactureDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "priceType" VARCHAR(64) NOT NULL,
    "unit" VARCHAR(128) NOT NULL,
    "discountPercent" DECIMAL(65,30) NOT NULL,
    "discountAmount" DECIMAL(65,30) NOT NULL,
    "taxableAmount" DECIMAL(65,30) NOT NULL,
    "tax" VARCHAR(128) NOT NULL,
    "taxAmount" DECIMAL(65,30) NOT NULL,
    "cess" VARCHAR(128) NOT NULL,
    "cessAmount" DECIMAL(65,30) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "isMrpEnabled" BOOLEAN NOT NULL,
    "isWholesaleEnabled" BOOLEAN NOT NULL,
    "isSerialisationEnabled" BOOLEAN NOT NULL,
    "isBatchingEnabled" BOOLEAN NOT NULL,
    "sellingPrice" DECIMAL(65,30) NOT NULL,
    "sellingPriceType" VARCHAR(64) NOT NULL,
    "purchasePrice" DECIMAL(65,30) NOT NULL,
    "purchasePriceType" VARCHAR(64) NOT NULL,
    "mrp" DECIMAL(65,30) NOT NULL,
    "wholesalePrice" DECIMAL(65,30) NOT NULL,
    "wholesalePriceType" VARCHAR(64) NOT NULL,
    "wholesaleQuantity" DECIMAL(65,30) NOT NULL,
    "itemCode" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "saleId" TEXT NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("saleItemId")
);

-- CreateTable
CREATE TABLE "SaleAdditionalCharge" (
    "saleAdditionalChargeId" TEXT NOT NULL,
    "name" VARCHAR(256) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "tax" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "saleId" TEXT NOT NULL,

    CONSTRAINT "SaleAdditionalCharge_pkey" PRIMARY KEY ("saleAdditionalChargeId")
);

-- CreateTable
CREATE TABLE "SalePaymentMode" (
    "salePaymentModeId" TEXT NOT NULL,
    "bankCashChequeId" TEXT NOT NULL,
    "accountName" VARCHAR(256) NOT NULL,
    "paymentMode" VARCHAR(128) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "ifsc" VARCHAR(20) NOT NULL,
    "acNo" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "saleId" TEXT NOT NULL,

    CONSTRAINT "SalePaymentMode_pkey" PRIMARY KEY ("salePaymentModeId")
);

-- CreateTable
CREATE TABLE "SaleTax" (
    "saleTaxId" TEXT NOT NULL,
    "taxRate" DECIMAL(65,30) NOT NULL,
    "taxableAmount" DECIMAL(65,30) NOT NULL,
    "cgst" DECIMAL(65,30) NOT NULL,
    "sgst" DECIMAL(65,30) NOT NULL,
    "igst" DECIMAL(65,30) NOT NULL,
    "cess" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hsnCode" VARCHAR(128) NOT NULL,
    "sacCode" VARCHAR(128) NOT NULL,
    "saleId" TEXT NOT NULL,

    CONSTRAINT "SaleTax_pkey" PRIMARY KEY ("saleTaxId")
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

-- CreateTable
CREATE TABLE "category" (
    "id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "parentid" INTEGER,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerUser_email_key" ON "CustomerUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Business_gstNumber_key" ON "Business"("gstNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_saleId_key" ON "CustomField"("saleId");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_itemBatchingId_fkey" FOREIGN KEY ("itemBatchingId") REFERENCES "ItemBatching"("item_batching_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_itemSerialisationId_fkey" FOREIGN KEY ("itemSerialisationId") REFERENCES "ItemSerialisation"("item_serialisation_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_itemUnitId_fkey" FOREIGN KEY ("itemUnitId") REFERENCES "ItemUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleAdditionalCharge" ADD CONSTRAINT "SaleAdditionalCharge_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePaymentMode" ADD CONSTRAINT "SalePaymentMode_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleTax" ADD CONSTRAINT "SaleTax_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "fk_parent" FOREIGN KEY ("parentid") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
