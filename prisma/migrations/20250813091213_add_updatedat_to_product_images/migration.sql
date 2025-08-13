/*
  Warnings:

  - Added the required column `updatedAt` to the `product_images` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "catalogs" ALTER COLUMN "isEnabled" SET DEFAULT true;

-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
