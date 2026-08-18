-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'USER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;
