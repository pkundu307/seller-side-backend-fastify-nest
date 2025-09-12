-- DropIndex
DROP INDEX "public"."CartItem_customerUserId_productId_variantId_key";

-- AlterTable
ALTER TABLE "public"."CartItem" ADD COLUMN     "customizationDetails" JSONB,
ADD COLUMN     "customizationImage" TEXT;

-- AlterTable
ALTER TABLE "public"."OrderItem" ADD COLUMN     "customizationDetails" JSONB;

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "customizationConfig" JSONB,
ADD COLUMN     "model3dUrl" TEXT;
