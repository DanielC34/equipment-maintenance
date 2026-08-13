-- AlterTable
ALTER TABLE "MaintenanceRecord" ADD COLUMN     "taskId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRecord_taskId_key" ON "MaintenanceRecord"("taskId");

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MaintenanceTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
