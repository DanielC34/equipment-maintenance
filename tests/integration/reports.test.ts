import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '@/lib/prisma';
import {
  getDashboardOverview,
  getEquipmentStatusCounts,
  getEquipmentTotal,
  getMaintenanceStatusCounts,
  getOverdueTaskCount,
  getOpenDowntimeCount,
  getUpcomingTasks,
  getDowntimeTotals,
  getDowntimeByReason,
} from '@/server/dashboard';
import { getMaintenanceReport, getDowntimeReport } from '@/server/reports';
import {
  createFactory,
  createUser,
  createEquipment as createEquipmentRow,
  createTask,
  createRecord,
  createDowntime,
  wipeTables,
  dateAtDaysFromNow,
  daysFromNow,
} from './fixtures';

let factory: string;
let supervisor: string;
let technician: string;
let equipment1: string;
let equipment2: string;
let equipment3: string;
let equipment4: string;

beforeAll(async () => {
  await wipeTables();

  factory = await createFactory('Aggregate Factory');
  supervisor = await createUser('SUPERVISOR');
  technician = await createUser('TECHNICIAN');
  const operator = await createUser('OPERATOR');

  equipment1 = await createEquipmentRow(factory, {
    name: 'Aggregate E1',
    assetNumber: 'AGG-E1',
    status: 'OPERATIONAL',
  });
  equipment2 = await createEquipmentRow(factory, {
    name: 'Aggregate E2',
    assetNumber: 'AGG-E2',
    status: 'OPERATIONAL',
  });
  equipment3 = await createEquipmentRow(factory, {
    name: 'Aggregate E3',
    assetNumber: 'AGG-E3',
    status: 'UNDER_MAINTENANCE',
  });
  equipment4 = await createEquipmentRow(factory, {
    name: 'Aggregate E4',
    assetNumber: 'AGG-E4',
    status: 'OFFLINE',
  });

  // Tasks: 3 scheduled (2 future, 1 overdue), 1 in-progress overdue, 1 completed
  await createTask(equipment1, technician, {
    title: 'AGG future 1',
    scheduledDate: dateAtDaysFromNow(5),
  });
  await createTask(equipment1, technician, {
    title: 'AGG future 2',
    scheduledDate: dateAtDaysFromNow(3),
  });
  await createTask(equipment2, technician, {
    title: 'AGG overdue scheduled',
    scheduledDate: dateAtDaysFromNow(-2),
  });
  await createTask(equipment2, technician, {
    title: 'AGG overdue in progress',
    status: 'IN_PROGRESS',
    scheduledDate: dateAtDaysFromNow(-1),
  });
  await createTask(equipment3, technician, {
    title: 'AGG completed',
    status: 'COMPLETED',
    scheduledDate: dateAtDaysFromNow(1),
  });

  // Records completed outside the default "today" window
  await createRecord(
    equipment1,
    technician,
    { description: 'AGG rec 1', completedDate: dateAtDaysFromNow(-3) },
    [
      { name: 'Filter', quantity: 2 },
      { name: 'Gasket', quantity: 3 },
    ]
  );
  await createRecord(
    equipment2,
    technician,
    { description: 'AGG rec 2', completedDate: dateAtDaysFromNow(-7) },
    [{ name: 'Belt', quantity: 4 }]
  );
  await createRecord(
    equipment1,
    supervisor,
    { description: 'AGG rec 3', completedDate: dateAtDaysFromNow(-20) },
    [{ name: 'Oil', quantity: 1 }]
  );

  // Open + resolved downtime
  await createDowntime(equipment4, operator, {
    startedAt: new Date(Date.now() - 3600000),
    endedAt: null,
    status: 'OPEN',
    reason: 'MECHANICAL',
  });
  await createDowntime(equipment1, operator, {
    startedAt: new Date(Date.now() - 1800000),
    endedAt: null,
    status: 'OPEN',
    reason: 'QUALITY',
  });
  await createDowntime(equipment3, operator, {
    startedAt: dateAtDaysFromNow(-2),
    endedAt: new Date(dateAtDaysFromNow(-2).getTime() + 3600000),
    status: 'RESOLVED',
    reason: 'HYDRAULIC',
  });
  await createDowntime(equipment4, operator, {
    startedAt: dateAtDaysFromNow(-10),
    endedAt: new Date(dateAtDaysFromNow(-10).getTime() + 1800000),
    status: 'RESOLVED',
    reason: 'MECHANICAL',
  });
  await createDowntime(equipment2, operator, {
    startedAt: dateAtDaysFromNow(-3),
    endedAt: new Date(dateAtDaysFromNow(-3).getTime() + 5400000),
    status: 'RESOLVED',
    reason: 'HYDRAULIC',
  });
});

afterAll(async () => {
  await wipeTables();
  await prisma.$disconnect();
});

describe('dashboard aggregates', () => {
  it('counts equipment by status and in total', async () => {
    expect(await getEquipmentTotal()).toBe(4);
    expect(await getEquipmentStatusCounts()).toEqual({
      OPERATIONAL: 2,
      UNDER_MAINTENANCE: 1,
      OFFLINE: 1,
    });
  });

  it('counts maintenance tasks by status', async () => {
    expect(await getMaintenanceStatusCounts()).toEqual({
      SCHEDULED: 3,
      IN_PROGRESS: 1,
      COMPLETED: 1,
      CANCELLED: 0,
    });
  });

  it('counts overdue tasks and open downtime', async () => {
    expect(await getOverdueTaskCount()).toBe(2);
    expect(await getOpenDowntimeCount()).toBe(2);
  });

  it('lists upcoming tasks ordered by scheduled date', async () => {
    const upcoming = await getUpcomingTasks();
    expect(upcoming.map((t) => t.title)).toEqual([
      'AGG future 2',
      'AGG future 1',
    ]);
    expect(upcoming.every((t) => t.status === 'SCHEDULED')).toBe(true);
  });

  it('computes downtime totals and MTTR from resolved events', async () => {
    expect(await getDowntimeTotals()).toEqual({
      resolvedCount: 3,
      totalMinutes: 180,
      mttrMinutes: 60,
    });
  });

  it('aggregates downtime by reason in descending count order', async () => {
    const byReason = await getDowntimeByReason();
    expect(byReason.map((r) => r.count).sort((a, b) => b - a)).toEqual([
      2, 2, 1,
    ]);
    const reasons = byReason.map((r) => r.reason);
    expect(reasons).toContain('HYDRAULIC');
    expect(reasons).toContain('MECHANICAL');
    expect(reasons).toContain('QUALITY');
  });

  it('builds a consistent dashboard overview', async () => {
    const overview = await getDashboardOverview();
    expect(overview.equipmentTotal).toBe(4);
    expect(overview.equipmentByStatus.OFFLINE).toBe(1);
    expect(overview.maintenanceByStatus.IN_PROGRESS).toBe(1);
    expect(overview.overdueTasks).toBe(2);
    expect(overview.openDowntime).toBe(2);
    expect(overview.openDowntimeEvents).toHaveLength(2);
    expect(overview.recentRecords.length).toBeGreaterThanOrEqual(3);
  });
});

describe('maintenance report', () => {
  it('reports totals, technicians, equipment, and parts', async () => {
    const report = await getMaintenanceReport({});
    expect(report.totalRecords).toBe(3);
    expect(report.totalParts).toBe(10);
    expect(report.byTechnician.map((t) => t.count)).toEqual([2, 1]);
    expect(report.byTechnician.every((t) => t.name.includes('user_'))).toBe(
      true
    );
    expect(report.byEquipment).toEqual([
      { name: 'Aggregate E1', count: 2 },
      { name: 'Aggregate E2', count: 1 },
    ]);
  });

  it('respects the from filter on completedDate', async () => {
    const report = await getMaintenanceReport({ from: daysFromNow(-5) });
    expect(report.totalRecords).toBe(1);
    expect(report.totalParts).toBe(5);
  });

  it('respects the to filter on completedDate', async () => {
    const report = await getMaintenanceReport({ to: daysFromNow(-8) });
    expect(report.totalRecords).toBe(1);
    expect(report.totalParts).toBe(1);
  });
});

describe('downtime report', () => {
  it('reports totals and reason breakdowns', async () => {
    const report = await getDowntimeReport({});
    expect(report.totalEvents).toBe(5);
    expect(report.open).toBe(2);
    expect(report.resolved).toBe(3);
    expect(report.totalMinutes).toBe(180);

    expect(report.byReason).toEqual([
      { reason: 'HYDRAULIC', count: 2, minutes: 150 },
      { reason: 'MECHANICAL', count: 2, minutes: 30 },
      { reason: 'QUALITY', count: 1, minutes: 0 },
    ]);
  });

  it('respects the from filter on startedAt', async () => {
    const report = await getDowntimeReport({ from: daysFromNow(-5) });
    expect(report.totalEvents).toBe(4);
    expect(report.open).toBe(2);
    expect(report.resolved).toBe(2);
    expect(report.totalMinutes).toBe(150);
  });

  it('respects the to filter on startedAt', async () => {
    const report = await getDowntimeReport({ to: daysFromNow(-8) });
    expect(report.totalEvents).toBe(1);
    expect(report.resolved).toBe(1);
    expect(report.totalMinutes).toBe(30);
  });
});