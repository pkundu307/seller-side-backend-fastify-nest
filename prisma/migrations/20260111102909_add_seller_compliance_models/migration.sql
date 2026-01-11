/*
  Warnings:

  - A unique constraint covering the columns `[panNumber]` on the table `Business` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SellerKycStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SellerKycDocumentType" AS ENUM ('PAN', 'GST_CERTIFICATE', 'BANK_PROOF', 'ADDRESS_PROOF');

-- CreateEnum
CREATE TYPE "SellerKycDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "businessType" TEXT NOT NULL DEFAULT 'PROPRIETORSHIP',
ADD COLUMN     "isPayoutEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kycRejectedAt" TIMESTAMP(3),
ADD COLUMN     "kycRemarks" TEXT,
ADD COLUMN     "kycStatus" "SellerKycStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "kycSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "kycVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "kyc_documents" JSONB,
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "panNumber" TEXT,
ADD COLUMN     "sellerAgreementAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sellerAgreementAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "sellerAgreementVersion" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "identityVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastKycReviewAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SellerKycDocument" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "SellerKycDocumentType" NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "status" "SellerKycDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "SellerKycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerSettlement" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "grossAmount" DECIMAL(65,30) NOT NULL,
    "commission" DECIMAL(65,30) NOT NULL,
    "tcsAmount" DECIMAL(65,30) NOT NULL,
    "netPayable" DECIMAL(65,30) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "payoutDate" TIMESTAMP(3),
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerAgreementLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,

    CONSTRAINT "SellerAgreementLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SellerKycDocument_businessId_idx" ON "SellerKycDocument"("businessId");

-- CreateIndex
CREATE INDEX "SellerSettlement_businessId_idx" ON "SellerSettlement"("businessId");

-- CreateIndex
CREATE INDEX "SellerSettlement_orderId_idx" ON "SellerSettlement"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerSettlement_businessId_orderId_key" ON "SellerSettlement"("businessId", "orderId");

-- CreateIndex
CREATE INDEX "SellerAgreementLog_businessId_idx" ON "SellerAgreementLog"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Business_panNumber_key" ON "Business"("panNumber");

-- AddForeignKey
ALTER TABLE "SellerKycDocument" ADD CONSTRAINT "SellerKycDocument_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerSettlement" ADD CONSTRAINT "SellerSettlement_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerSettlement" ADD CONSTRAINT "SellerSettlement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerAgreementLog" ADD CONSTRAINT "SellerAgreementLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
