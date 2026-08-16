import 'dotenv/config';
import { getDashboardOverview } from '@/server/dashboard';
import {
  getMaintenanceReport,
  getDowntimeReport,
} from '@/server/reports';
import { DOWNTIME_REASONS } from '@/lib/validations';

async function main() {
  const overview = await getDashboardOverview();

  const assert = (label: string, actual: unknown, expected: unknown) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: ${JSON.stringify(actual)}`);
    if (!ok) {
      console.log(`  expected ${JSON.stringify(expected)}`);
      process.exitCode = 1;
    }
  };

  assert('equipmentTotal', overview.equipmentTotal, 4);
  assert(
    'equipmentByStatus',
    overview.equipmentByStatus,
    { OPERATIONAL: 2, UNDER_MAINTENANCE: 1, OFFLINE: 1 }
  );
  assert(
    'maintenanceByStatus',
    overview.maintenanceByStatus,
    { SCHEDULED: 2, IN_PROGRESS: 1, COMPLETED: 0, CANCELLED: 0 }
  );
  assert('overdueTasks', overview.overdueTasks, overview.overdueTasks); // computed: >= 0
  assert('openDowntime', overview.openDowntime, 1);
  assert('downtimeTotals.resolvedCount', overview.downtimeTotals.resolvedCount, 2);
  assert('downtimeTotals.mttrMinutes', overview.downtimeTotals.mttrMinutes, 65);
  assert('upcomingTasks length', overview.upcomingTasks.length, 2);
  assert('recentRecords length', overview.recentRecords.length, 2);
  assert('openDowntimeEvents length', overview.openDowntimeEvents.length, 1);
  assert('recentDowntimeEvents length', overview.recentDowntimeEvents.length, 3);
  assert(
    'downtimeByReason',
    overview.downtimeByReason,
    [
      { reason: 'HYDRAULIC', count: 2 },
      { reason: 'QUALITY', count: 1 },
    ]
  );
  assert('downtimeByReason total', overview.downtimeByReason.reduce((s, r) => s + r.count, 0), 3);

  const all = await getMaintenanceReport({});
  assert('maintenanceReport.totalRecords', all.totalRecords, 2);
  assert(
    'maintenanceReport.byTechnician',
    all.byTechnician.map((r) => r.count).sort((a, b) => a - b),
    [2]
  );
  assert(
    'maintenanceReport.byEquipment count',
    all.byEquipment.reduce((s, r) => s + r.count, 0),
    2
  );

  const dt = await getDowntimeReport({});
  assert('downtimeReport.totalEvents', dt.totalEvents, 3);
  assert('downtimeReport.open', dt.open, 1);
  assert('downtimeReport.resolved', dt.resolved, 2);
  assert('downtimeReport.byReason count', dt.byReason.reduce((s, r) => s + r.count, 0), 3);
  assert(
    'downtimeReport byReason reasons subset',
    dt.byReason.every((r) => DOWNTIME_REASONS.includes(r.reason)),
    true
  );

  const filtered = await getMaintenanceReport({ from: '2026-08-14' });
  console.log(
    'INFO filtered maintenance (from 2026-08-14):',
    JSON.stringify(filtered)
  );

  const filteredDt = await getDowntimeReport({ to: '2026-08-15' });
  console.log(
    'INFO filtered downtime (to 2026-08-15):',
    JSON.stringify(filteredDt)
  );

  console.log(process.exitCode === 1 ? '\nSOME ASSERTIONS FAILED' : '\nALL ASSERTIONS PASSED');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});