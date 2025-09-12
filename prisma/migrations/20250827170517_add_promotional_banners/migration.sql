-- CreateTable
CREATE TABLE "public"."PromotionalBanner" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "discountText" TEXT,
    "bannerImageUrl" TEXT NOT NULL,
    "brandLogoUrl" TEXT,
    "targetUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionalBanner_pkey" PRIMARY KEY ("id")
);
