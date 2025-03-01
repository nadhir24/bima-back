/*
  Warnings:

  - The `uspro_birth_date` column on the `user_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `cart` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "cart" DROP CONSTRAINT "cart_catalogId_fkey";

-- DropForeignKey
ALTER TABLE "cart" DROP CONSTRAINT "cart_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "cart" DROP CONSTRAINT "cart_sizeId_fkey";

-- DropForeignKey
ALTER TABLE "cart" DROP CONSTRAINT "cart_userId_fkey";

-- DropForeignKey
ALTER TABLE "payment" DROP CONSTRAINT "payment_userId_fkey";

-- AlterTable
ALTER TABLE "user_profiles" DROP COLUMN "uspro_birth_date",
ADD COLUMN     "uspro_birth_date" TIMESTAMP(3);

-- DropTable
DROP TABLE "cart";

-- DropTable
DROP TABLE "payment";

-- CreateTable
CREATE TABLE "carts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "guest_id" TEXT,
    "catalog_id" INTEGER NOT NULL,
    "size_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_id" INTEGER,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_cart_user_id" ON "carts"("user_id");

-- CreateIndex
CREATE INDEX "idx_cart_guest_id" ON "carts"("guest_id");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "catalogs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "Size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
