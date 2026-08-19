-- CreateIndex
CREATE INDEX "Equipment_name_idx" ON "Equipment"("name");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_technicianId_completedDate_idx" ON "MaintenanceRecord"("technicianId", "completedDate");

-- CreateIndex
CREATE INDEX "MaintenanceTask_status_scheduledDate_idx" ON "MaintenanceTask"("status", "scheduledDate");