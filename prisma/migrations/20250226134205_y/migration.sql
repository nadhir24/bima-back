-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "user_id" INTEGER;

-- CreateIndex
CREATE INDEX "idx_invoice_user_id" ON "invoices"("user_id");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
