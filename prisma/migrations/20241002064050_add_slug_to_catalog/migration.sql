/*
  Warnings:

  - You are about to drop the column `uspro_birt_date` on the `user_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_profiles" DROP COLUMN "uspro_birt_date",
ADD COLUMN     "uspro_birth_date" TEXT;

-- RenameIndex
ALTER INDEX "pkey_users_user_role_id" RENAME TO "pkey_roles";
