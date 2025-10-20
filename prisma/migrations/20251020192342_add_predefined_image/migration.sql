/*
  Warnings:

  - You are about to drop the `PredefinedImageforCustomization` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."PredefinedImageforCustomization";

-- CreateTable
CREATE TABLE "public"."PredefinedImageForCustomization" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredefinedImageForCustomization_pkey" PRIMARY KEY ("id")
);
