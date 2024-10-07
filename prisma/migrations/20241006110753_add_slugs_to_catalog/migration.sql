/*
  Warnings:

  - Added the required column `categorySlug` to the `Catalog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productSlug` to the `Catalog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Catalog" ADD COLUMN     "categorySlug" TEXT NOT NULL,
ADD COLUMN     "productSlug" TEXT NOT NULL;
