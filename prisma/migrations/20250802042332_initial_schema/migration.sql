-- CreateEnum
CREATE TYPE "AuthSource" AS ENUM ('self', 'google');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('basic', 'pro', 'user');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('online', 'cash_on_delivery');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "OrderInitiateStatus" AS ENUM ('pending', 'completed');

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
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "valueByPercentage" DECIMAL(65,30),
    "valueByAmount" DECIMAL(65,30),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "customerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "customerUserId" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "selectedAddress" JSONB NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "shippingFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "trackingNumber" TEXT,
    "estimatedDeliveryDate" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priceAtTimeOfOrder" DECIMAL(65,30) NOT NULL,
    "note" TEXT,
    "customizationImage" TEXT,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "customerUserId" TEXT NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isCustomizable" BOOLEAN NOT NULL DEFAULT false,
    "images" TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessId" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variant" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "stock" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "weightInGrams" INTEGER,
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hsnCode" TEXT,
    "sacCode" TEXT,
    "mrp" DECIMAL(65,30),
    "purchasePrice" DECIMAL(65,30),
    "purchasePriceType" VARCHAR(64),
    "sellingPriceType" VARCHAR(64),
    "tax" VARCHAR(128),
    "unit" VARCHAR(128),
    "minStockCount" DECIMAL(65,30),
    "isMinStockAlertEnabled" BOOLEAN,
    "openingStock" DECIMAL(65,30),
    "openingStockDate" TIMESTAMP(3),
    "productId" TEXT NOT NULL,

    CONSTRAINT "Variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attribute" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantAttributeValue" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "attributeId" INTEGER NOT NULL,

    CONSTRAINT "VariantAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderInitiate" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" "OrderInitiateStatus" NOT NULL DEFAULT 'pending',
    "customerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderInitiate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessId" TEXT NOT NULL,
    "customerUserId" TEXT NOT NULL,

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

-- CreateIndex
CREATE UNIQUE INDEX "CustomerUser_email_key" ON "CustomerUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Business_gstNumber_key" ON "Business"("gstNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_customerUserId_productId_variantId_key" ON "CartItem"("customerUserId", "productId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Variant_sku_key" ON "Variant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_name_categoryId_key" ON "Attribute"("name", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "VariantAttributeValue_variantId_attributeId_key" ON "VariantAttributeValue"("variantId", "attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_saleId_key" ON "CustomField"("saleId");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "CustomerUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "CustomerUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "CustomerUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Attribute" ADD CONSTRAINT "Attribute_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantAttributeValue" ADD CONSTRAINT "VariantAttributeValue_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantAttributeValue" ADD CONSTRAINT "VariantAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderInitiate" ADD CONSTRAINT "OrderInitiate_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "CustomerUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "CustomerUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
