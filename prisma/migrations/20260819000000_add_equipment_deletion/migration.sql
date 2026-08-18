-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'DELETE';

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "deletedAt" TIMESTAMP(3);
