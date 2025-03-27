/*
  Warnings:

  - You are about to drop the column `xendit_customer_id` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `invoice_url` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `xendit_invoice_id` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `payment_request_id` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `xendit_payment_id` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `xendit_refund_id` on the `refunds` table. All the data in the column will be lost.
  - You are about to drop the `payment_requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payouts` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[midtrans_order_id]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[payment_id]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[refund_id]` on the table `refunds` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `refund_id` to the `refunds` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "payment_requests" DROP CONSTRAINT "payment_requests_shippingAddressId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_payment_request_id_fkey";

-- DropIndex
DROP INDEX "customers_xendit_customer_id_key";

-- DropIndex
DROP INDEX "idx_customer_xendit_id";

-- DropIndex
DROP INDEX "idx_invoice_xendit_id";

-- DropIndex
DROP INDEX "invoices_xendit_invoice_id_key";

-- DropIndex
DROP INDEX "payments_payment_request_id_key";

-- DropIndex
DROP INDEX "idx_refund_xendit_id";

-- DropIndex
DROP INDEX "refunds_xendit_refund_id_key";

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "xendit_customer_id";

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "invoice_url",
DROP COLUMN "xendit_invoice_id",
ADD COLUMN     "midtrans_order_id" TEXT,
ADD COLUMN     "payment_id" INTEGER,
ADD COLUMN     "payment_method" TEXT,
ADD COLUMN     "payment_status" TEXT,
ADD COLUMN     "payment_url" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING',
ALTER COLUMN "currency" SET DEFAULT 'IDR';

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "payment_request_id",
DROP COLUMN "xendit_payment_id",
ADD COLUMN     "midtrans_payment_id" TEXT;

-- AlterTable
ALTER TABLE "refunds" DROP COLUMN "xendit_refund_id",
ADD COLUMN     "refund_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "payment_requests";

-- DropTable
DROP TABLE "payouts";

-- CreateTable
CREATE TABLE "payment_webhooks" (
    "id" SERIAL NOT NULL,
    "order_id" TEXT NOT NULL,
    "transaction_time" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "payment_type" TEXT NOT NULL,
    "gross_amount" DOUBLE PRECISION NOT NULL,
    "signature_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_webhook_order_id" ON "payment_webhooks"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_midtrans_order_id_key" ON "invoices"("midtrans_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_payment_id_key" ON "invoices"("payment_id");

-- CreateIndex
CREATE INDEX "idx_invoice_midtrans_id" ON "invoices"("midtrans_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_refund_id_key" ON "refunds"("refund_id");

-- CreateIndex
CREATE INDEX "idx_refund_id" ON "refunds"("refund_id");
