/*
  Warnings:

  - You are about to drop the column `price` on the `catalog` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `catalog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "catalog" DROP COLUMN "price",
DROP COLUMN "size",
ALTER COLUMN "image" DROP NOT NULL;

-- CreateTable
CREATE TABLE "size" (
    "id" SERIAL NOT NULL,
    "size" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "catalogId" INTEGER NOT NULL,

    CONSTRAINT "size_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "size" ADD CONSTRAINT "size_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
