/*
  Warnings:

  - A unique constraint covering the columns `[invoice_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[payment_request_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "invoice_id" INTEGER,
ADD COLUMN     "payment_method" TEXT,
ADD COLUMN     "payment_request_id" INTEGER,
ADD COLUMN     "xendit_payment_id" TEXT;

-- CreateTable
CREATE TABLE "invoices" (
    "id" SERIAL NOT NULL,
    "xendit_invoice_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "invoice_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_requests" (
    "id" SERIAL NOT NULL,
    "xendit_payment_request_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "payment_request_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" SERIAL NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "xendit_refund_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "xendit_customer_id" TEXT NOT NULL,
    "email" TEXT,
    "phone_number" TEXT,
    "given_names" TEXT,
    "surname" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" SERIAL NOT NULL,
    "xendit_payout_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "bank_code" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_xendit_invoice_id_key" ON "invoices"("xendit_invoice_id");

-- CreateIndex
CREATE INDEX "idx_invoice_xendit_id" ON "invoices"("xendit_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_requests_xendit_payment_request_id_key" ON "payment_requests"("xendit_payment_request_id");

-- CreateIndex
CREATE INDEX "idx_payment_request_xendit_id" ON "payment_requests"("xendit_payment_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_xendit_refund_id_key" ON "refunds"("xendit_refund_id");

-- CreateIndex
CREATE INDEX "idx_refund_xendit_id" ON "refunds"("xendit_refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_xendit_customer_id_key" ON "customers"("xendit_customer_id");

-- CreateIndex
CREATE INDEX "idx_customer_xendit_id" ON "customers"("xendit_customer_id");

-- CreateIndex
CREATE INDEX "idx_customer_user_id" ON "customers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_xendit_payout_id_key" ON "payouts"("xendit_payout_id");

-- CreateIndex
CREATE INDEX "idx_payout_xendit_id" ON "payouts"("xendit_payout_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_invoice_id_key" ON "payments"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_request_id_key" ON "payments"("payment_request_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_request_id_fkey" FOREIGN KEY ("payment_request_id") REFERENCES "payment_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
