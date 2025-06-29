-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

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

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_saleId_key" ON "CustomField"("saleId");

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
