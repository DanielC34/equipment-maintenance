-- CreateEnum
CREATE TYPE "DowntimeStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "DowntimeReason" AS ENUM ('MECHANICAL', 'ELECTRICAL', 'HYDRAULIC', 'PNEUMATIC', 'MATERIAL', 'OPERATOR_ERROR', 'QUALITY', 'CHANGEOVER');

-- CreateTable
CREATE TABLE "DowntimeEvent" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "status" "DowntimeStatus" NOT NULL DEFAULT 'OPEN',
    "reason" "DowntimeReason" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DowntimeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DowntimeEvent_equipmentId_startedAt_idx" ON "DowntimeEvent"("equipmentId", "startedAt");

-- CreateIndex
CREATE INDEX "DowntimeEvent_startedAt_idx" ON "DowntimeEvent"("startedAt");

-- AddForeignKey
ALTER TABLE "DowntimeEvent" ADD CONSTRAINT "DowntimeEvent_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DowntimeEvent" ADD CONSTRAINT "DowntimeEvent_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;