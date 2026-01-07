-- AlterTable
ALTER TABLE "category" ADD COLUMN     "commissionRate" DECIMAL(65,30),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "gstRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaTitle" TEXT,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;
