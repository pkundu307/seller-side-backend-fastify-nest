/*
  Warnings:

  - The primary key for the `ItemBatching` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `item_batching_id` on the `ItemBatching` table. All the data in the column will be lost.
  - The primary key for the `ItemSerialisation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `item_serialisation_id` on the `ItemSerialisation` table. All the data in the column will be lost.
  - You are about to drop the column `slicenseDocumentUrl` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `openingStock` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `openingStockDate` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `sellingPriceType` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Variant` table. All the data in the column will be lost.
  - The required column `id` was added to the `ItemBatching` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `id` was added to the `ItemSerialisation` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Business" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ItemBatching" DROP CONSTRAINT "ItemBatching_pkey",
DROP COLUMN "item_batching_id",
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "variantId" TEXT,
ADD CONSTRAINT "ItemBatching_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ItemSerialisation" DROP CONSTRAINT "ItemSerialisation_pkey",
DROP COLUMN "item_serialisation_id",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "ItemSerialisation_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "slicenseDocumentUrl",
ADD COLUMN     "license_document_url" TEXT;

-- AlterTable
ALTER TABLE "StockActivity" ADD COLUMN     "variantId" TEXT;

-- AlterTable
ALTER TABLE "Variant" DROP COLUMN "openingStock",
DROP COLUMN "openingStockDate",
DROP COLUMN "sellingPriceType",
DROP COLUMN "unit";

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemBatching" ADD CONSTRAINT "ItemBatching_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemUnit" ADD CONSTRAINT "ItemUnit_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockActivity" ADD CONSTRAINT "StockActivity_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
