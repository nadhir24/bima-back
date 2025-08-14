-- AlterTable
ALTER TABLE "product_images" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "sizes_catalogId_idx" ON "sizes"("catalogId");
