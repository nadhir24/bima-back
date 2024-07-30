/*
  Warnings:

  - You are about to drop the column `uspro_job_title` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `uspro_marital_status` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `uspro_national_id` on the `user_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_profiles" DROP COLUMN "uspro_job_title",
DROP COLUMN "uspro_marital_status",
DROP COLUMN "uspro_national_id";
