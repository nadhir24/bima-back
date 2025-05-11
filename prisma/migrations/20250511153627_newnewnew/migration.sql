/*
  Warnings:

  - The primary key for the `user_profiles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uspro_addr_id` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `uspro_birth_date` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `uspro_gender` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `uspro_id` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `uspro_user_id` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the `address` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `user_profiles` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_uspro_addr_id_fkey";

-- DropForeignKey
ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_uspro_user_id_fkey";

-- DropIndex
DROP INDEX "pkey_user_profiles";

-- DropIndex
DROP INDEX "user_profiles_uspro_user_id_key";

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "guest_id" TEXT,
ADD COLUMN     "midtrans_invoice_pdf_url" TEXT,
ADD COLUMN     "midtrans_invoice_url" TEXT,
ADD COLUMN     "shippingAddress" TEXT,
ADD COLUMN     "shippingCity" TEXT,
ADD COLUMN     "shippingCountryCode" TEXT DEFAULT 'IDN',
ADD COLUMN     "shippingEmail" TEXT,
ADD COLUMN     "shippingFirstName" TEXT,
ADD COLUMN     "shippingLastName" TEXT,
ADD COLUMN     "shippingPhone" TEXT,
ADD COLUMN     "shippingPostalCode" TEXT,
ADD COLUMN     "shippingProvince" TEXT;

-- AlterTable
ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_pkey",
DROP COLUMN "uspro_addr_id",
DROP COLUMN "uspro_birth_date",
DROP COLUMN "uspro_gender",
DROP COLUMN "uspro_id",
DROP COLUMN "uspro_user_id",
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ADD COLUMN     "userId" INTEGER,
ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "address";

-- CreateTable
CREATE TABLE "addresses" (
    "id" SERIAL NOT NULL,
    "label" TEXT,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "userProfileId" INTEGER,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_invoice_guest_id" ON "invoices"("guest_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex
CREATE INDEX "pkey_user_profiles" ON "user_profiles"("id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "sizes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
