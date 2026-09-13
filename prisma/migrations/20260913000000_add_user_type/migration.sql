-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('PARENT', 'CHILD');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "userType" "UserType" NOT NULL DEFAULT 'PARENT';
