/*
  Warnings:

  - A unique constraint covering the columns `[external_id]` on the table `payment_requests` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "external_id" TEXT;

-- AlterTable
ALTER TABLE "payment_requests" ADD COLUMN     "external_id" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentMethodCategory" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payment_requests_external_id_key" ON "payment_requests"("external_id");
