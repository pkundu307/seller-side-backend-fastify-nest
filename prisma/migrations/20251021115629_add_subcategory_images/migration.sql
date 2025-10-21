/*
  Warnings:

  - You are about to drop the `PredefinedImageForCustomization` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."PredefinedImageForCustomization";

-- CreateTable
CREATE TABLE "public"."PredefinedCategory" (
    "id" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredefinedCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PredefinedSubCategory" (
    "id" TEXT NOT NULL,
    "subCategoryName" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredefinedSubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubCategoryImage" (
    "id" TEXT NOT NULL,
    "subCategoryId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubCategoryImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."PredefinedSubCategory" ADD CONSTRAINT "PredefinedSubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."PredefinedCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubCategoryImage" ADD CONSTRAINT "SubCategoryImage_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "public"."PredefinedSubCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
