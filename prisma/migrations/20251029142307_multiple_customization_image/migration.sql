/*
  Warnings:

  - You are about to drop the column `customizationImage` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `customizationImage` on the `OrderItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."CartItem" DROP COLUMN "customizationImage",
ADD COLUMN     "customizationImages" TEXT[];

-- AlterTable
ALTER TABLE "public"."OrderItem" DROP COLUMN "customizationImage",
ADD COLUMN     "customizationImages" TEXT[];
