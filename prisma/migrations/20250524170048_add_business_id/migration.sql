/*
  Warnings:

  - A unique constraint covering the columns `[businessId]` on the table `Business` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "businessId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Business_businessId_key" ON "Business"("businessId");
