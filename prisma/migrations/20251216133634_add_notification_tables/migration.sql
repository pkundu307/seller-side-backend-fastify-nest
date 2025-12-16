-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER', 'SYSTEM', 'PROMOTION', 'ALERT');

-- CreateTable
CREATE TABLE "SellerNotification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "type" "NotificationType" NOT NULL DEFAULT 'ORDER',
    "metadata" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerNotification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "type" "NotificationType" NOT NULL DEFAULT 'ORDER',
    "metadata" JSONB,
    "customerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerNotification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SellerNotification" ADD CONSTRAINT "SellerNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNotification" ADD CONSTRAINT "CustomerNotification_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "CustomerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
