/*
  Warnings:

  - The `size` column on the `catalog` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "catalog" DROP COLUMN "size",
ADD COLUMN     "size" TEXT[];
