-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "catalog_id" INTEGER,
ADD COLUMN     "size_id" INTEGER;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "catalogId" INTEGER,
ADD COLUMN     "sizeId" INTEGER;
