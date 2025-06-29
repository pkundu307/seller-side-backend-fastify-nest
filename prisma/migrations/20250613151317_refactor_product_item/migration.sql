/*
  Warnings:

  - You are about to drop the `Item` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `cess` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `closingStock` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conversionRate` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discountAmount` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discountPercent` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hsnCode` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isBatchingEnabled` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isMinStockAlertEnabled` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isMrpEnabled` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isSecondUnitEnabled` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isSerializationEnabled` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isWholesaleEnabled` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemCategory` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemCode` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemType` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `minStockCount` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mrp` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `openingStock` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `openingStockDate` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purchasePrice` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purchasePriceType` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sacCode` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `secondUnit` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellingPrice` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellingPriceType` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tax` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wholesalePrice` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wholesalePriceType` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wholesaleQuantity` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_itemBatchingId_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "cess" VARCHAR(128) NOT NULL,
ADD COLUMN     "closingStock" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "conversionRate" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "discountAmount" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "discountPercent" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "hsnCode" VARCHAR(128) NOT NULL,
ADD COLUMN     "isBatchingEnabled" BOOLEAN NOT NULL,
ADD COLUMN     "isMinStockAlertEnabled" BOOLEAN NOT NULL,
ADD COLUMN     "isMrpEnabled" BOOLEAN NOT NULL,
ADD COLUMN     "isSecondUnitEnabled" BOOLEAN NOT NULL,
ADD COLUMN     "isSerializationEnabled" BOOLEAN NOT NULL,
ADD COLUMN     "isWholesaleEnabled" BOOLEAN NOT NULL,
ADD COLUMN     "itemBatchingId" TEXT,
ADD COLUMN     "itemCategory" VARCHAR(128) NOT NULL,
ADD COLUMN     "itemCode" VARCHAR(128) NOT NULL,
ADD COLUMN     "itemDescription" TEXT,
ADD COLUMN     "itemImage" TEXT,
ADD COLUMN     "itemSerialisationId" TEXT,
ADD COLUMN     "itemType" VARCHAR(128) NOT NULL,
ADD COLUMN     "itemUnitId" TEXT,
ADD COLUMN     "minStockCount" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "mrp" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "openingStock" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "openingStockDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "purchasePrice" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "purchasePriceType" VARCHAR(64) NOT NULL,
ADD COLUMN     "sacCode" VARCHAR(128) NOT NULL,
ADD COLUMN     "secondUnit" VARCHAR(128) NOT NULL,
ADD COLUMN     "sellingPrice" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "sellingPriceType" VARCHAR(64) NOT NULL,
ADD COLUMN     "serialNoLabel" TEXT,
ADD COLUMN     "tax" VARCHAR(128) NOT NULL,
ADD COLUMN     "unit" VARCHAR(128) NOT NULL,
ADD COLUMN     "wholesalePrice" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "wholesalePriceType" VARCHAR(64) NOT NULL,
ADD COLUMN     "wholesaleQuantity" INTEGER NOT NULL;

-- DropTable
DROP TABLE "Item";

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_itemBatchingId_fkey" FOREIGN KEY ("itemBatchingId") REFERENCES "ItemBatching"("item_batching_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_itemSerialisationId_fkey" FOREIGN KEY ("itemSerialisationId") REFERENCES "ItemSerialisation"("item_serialisation_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_itemUnitId_fkey" FOREIGN KEY ("itemUnitId") REFERENCES "ItemUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
