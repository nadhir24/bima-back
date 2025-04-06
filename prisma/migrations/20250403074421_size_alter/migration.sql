/*
  Warnings:

  - You are about to drop the column `qty` on the `catalogs` table. All the data in the column will be lost.
  - You are about to drop the `Size` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Size" DROP CONSTRAINT "Size_catalogId_fkey";

-- DropForeignKey
ALTER TABLE "carts" DROP CONSTRAINT "carts_size_id_fkey";

-- AlterTable
ALTER TABLE "catalogs" DROP COLUMN "qty";

-- DropTable
DROP TABLE "Size";

-- CreateTable
CREATE TABLE "sizes" (
    "id" SERIAL NOT NULL,
    "size" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "catalogId" INTEGER NOT NULL,

    CONSTRAINT "sizes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sizes" ADD CONSTRAINT "sizes_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "catalogs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
