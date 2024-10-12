/*
  Warnings:

  - You are about to drop the `Catalog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Size" DROP CONSTRAINT "Size_catalogId_fkey";

-- DropForeignKey
ALTER TABLE "cart" DROP CONSTRAINT "cart_catalogId_fkey";

-- DropTable
DROP TABLE "Catalog";

-- CreateTable
CREATE TABLE "catalogs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "categorySlug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "isEnabled" BOOLEAN NOT NULL,
    "image" TEXT,
    "productSlug" TEXT NOT NULL,

    CONSTRAINT "catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalogs_slug_key" ON "catalogs"("slug");

-- AddForeignKey
ALTER TABLE "Size" ADD CONSTRAINT "Size_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "catalogs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart" ADD CONSTRAINT "cart_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "catalogs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
