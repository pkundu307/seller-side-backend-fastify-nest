/*
  Warnings:

  - You are about to drop the column `parentid` on the `category` table. All the data in the column will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `category` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_parentId_fkey";

-- DropForeignKey
ALTER TABLE "category" DROP CONSTRAINT "fk_parent";

-- AlterTable
CREATE SEQUENCE category_id_seq;
ALTER TABLE "category" DROP COLUMN "parentid",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "parentId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" SET DEFAULT nextval('category_id_seq');
ALTER SEQUENCE category_id_seq OWNED BY "category"."id";

-- DropTable
DROP TABLE "Category";

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "fk_parent" FOREIGN KEY ("parentId") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
