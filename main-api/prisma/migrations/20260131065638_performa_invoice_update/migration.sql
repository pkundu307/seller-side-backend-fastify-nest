/*
  Warnings:

  - A unique constraint covering the columns `[businessId,proformaNo]` on the table `Quotation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "QuotationStatus" ADD VALUE 'PROFORMA_GENERATED';

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "proformaDate" TIMESTAMP(3),
ADD COLUMN     "proformaNo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_businessId_proformaNo_key" ON "Quotation"("businessId", "proformaNo");
