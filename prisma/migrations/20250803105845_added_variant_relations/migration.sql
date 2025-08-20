/*
  Warnings:

  - You are about to alter the column `price` on the `Variant` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `mrp` on the `Variant` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `purchasePrice` on the `Variant` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - The `sellingPriceType` column on the `Variant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `unit` column on the `Variant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `minStockCount` on the `Variant` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `openingStock` on the `Variant` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - A unique constraint covering the columns `[slug]` on the table `attribute_option` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `category` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `attribute_option` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."Unit" AS ENUM ('PCS', 'GRAM', 'KG', 'LITER');

-- CreateEnum
CREATE TYPE "public"."VariantStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."PriceType" AS ENUM ('MRP', 'Discounted', 'Offer');

-- AlterTable
ALTER TABLE "public"."Attribute" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Variant" ADD COLUMN     "status" "public"."VariantStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "mrp" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "purchasePrice" SET DATA TYPE DECIMAL(10,2),
DROP COLUMN "sellingPriceType",
ADD COLUMN     "sellingPriceType" "public"."PriceType",
DROP COLUMN "unit",
ADD COLUMN     "unit" "public"."Unit",
ALTER COLUMN "minStockCount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "openingStock" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "public"."attribute_option" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Variant_productId_idx" ON "public"."Variant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "attribute_option_slug_key" ON "public"."attribute_option"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "public"."category"("slug");
