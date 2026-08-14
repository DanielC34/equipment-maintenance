-- CreateIndex
CREATE INDEX "MaintenanceRecord_completedDate_idx" ON "MaintenanceRecord"("completedDate");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_equipmentId_completedDate_idx" ON "MaintenanceRecord"("equipmentId", "completedDate");
