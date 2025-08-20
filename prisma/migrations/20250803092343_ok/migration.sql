/*
  Warnings:

  - You are about to drop the `VariantAttributeValue` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "VariantAttributeValue" DROP CONSTRAINT "VariantAttributeValue_attributeId_fkey";

-- DropForeignKey
ALTER TABLE "VariantAttributeValue" DROP CONSTRAINT "VariantAttributeValue_variantId_fkey";

-- DropIndex
DROP INDEX "category_slug_key";

-- DropTable
DROP TABLE "VariantAttributeValue";

-- CreateTable
CREATE TABLE "attribute_option" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "attributeId" INTEGER NOT NULL,

    CONSTRAINT "attribute_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_attribute_value" (
    "id" SERIAL NOT NULL,
    "variantId" TEXT NOT NULL,
    "attributeOptionId" INTEGER NOT NULL,
    "attributeId" INTEGER NOT NULL,

    CONSTRAINT "variant_attribute_value_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attribute_option_attributeId_value_key" ON "attribute_option"("attributeId", "value");

-- AddForeignKey
ALTER TABLE "attribute_option" ADD CONSTRAINT "attribute_option_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_value" ADD CONSTRAINT "variant_attribute_value_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_value" ADD CONSTRAINT "variant_attribute_value_attributeOptionId_fkey" FOREIGN KEY ("attributeOptionId") REFERENCES "attribute_option"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_value" ADD CONSTRAINT "variant_attribute_value_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
