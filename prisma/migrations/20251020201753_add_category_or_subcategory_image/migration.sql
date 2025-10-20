-- CreateTable
CREATE TABLE "public"."CategoryOrSubcategoryImage" (
    "id" TEXT NOT NULL,
    "categoryOrSubcategoryId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryOrSubcategoryImage_pkey" PRIMARY KEY ("id")
);
