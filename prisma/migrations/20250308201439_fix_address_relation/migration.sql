-- AlterTable
ALTER TABLE "payment_requests" ADD COLUMN     "shippingAddressId" INTEGER;

-- AddForeignKey
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
