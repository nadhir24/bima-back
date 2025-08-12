-- CreateTable
CREATE TABLE "product_images" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "catalogId" INTEGER NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "catalogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
