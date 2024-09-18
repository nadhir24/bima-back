/*
  Warnings:

  - Added the required column `size` to the `catalog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "catalog" ADD COLUMN     "size" TEXT NOT NULL;
