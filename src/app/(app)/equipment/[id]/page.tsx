import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Archive,
  Pencil,
  History,
  FileClock,
  TriangleAlert,
} from 'lucide-react';
import { PERMISSIONS, requirePermission, hasPermission } from '@/server/rbac';
import { getEquipmentById } from '@/server/equipment';
import { getEquipmentMaintenanceHistory } from '@/server/maintenance';
import { getEquipmentDowntimeHistory } from '@/server/downtime';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { EquipmentArchiveButton } from '@/components/equipment/equipment-archive-button';
import { DetailHeader } from '@/components/detail-header';
import { MetadataGrid } from '@/components/ui/metadata-grid';
import { SummaryLinkTile } from '@/components/equipment/summary-link-tile';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const equipment = await getEquipmentById(id);
  return {
    title: equipment ? `${equipment.name} | EMMS` : 'Equipment | EMMS',
  };
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission(PERMISSIONS.equipmentView);
  const { id } = await params;
  const equipment = await getEquipmentById(id);

  if (!equipment) {
    notFound();
  }

  const canEdit = hasPermission(session, PERMISSIONS.equipmentEdit);
  const canDelete = hasPermission(session, PERMISSIONS.equipmentDelete);
  const canViewHistory = hasPermission(session, PERMISSIONS.maintenanceView);
  const isArchived = Boolean(equipment.deletedAt);

  const history = canViewHistory
    ? await getEquipmentMaintenanceHistory(equipment.id, 1)
    : null;

  const downtimeHistory = await getEquipmentDowntimeHistory(equipment.id, 1);
  const downtimeCount = downtimeHistory.total;

  return (
    <div className="space-y-6">
      <DetailHeader
        title={equipment.name}
        identity={
          <span className="text-sm text-gray-600">
            {equipment.assetNumber} · {equipment.factory.name}
            {isArchived && <span className="ml-2 text-xs text-gray-500">Archived</span>}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {canViewHistory ? (
              <Link href={`/equipment/${equipment.id}/history`}>
                <Button variant="outline">
                  <History aria-hidden />
                  Maintenance history
                </Button>
              </Link>
            ) : null}
            {canEdit && !isArchived ? (
              <Link href={`/equipment/${equipment.id}/edit`}>
                <Button variant="outline">
                  <Pencil aria-hidden />
                  Edit
                </Button>
              </Link>
            ) : null}
            {canDelete && !isArchived ? (
              <EquipmentArchiveButton
                equipmentId={equipment.id}
                equipmentName={equipment.name}
              />
            ) : null}
          </div>
        }
        status={<StatusBadge status={equipment.status} />}
      />

      {isArchived ? (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--io-border)] bg-[var(--io-bg)] px-4 py-3 text-sm text-gray-600">
          <Archive aria-hidden className="size-4 text-gray-500" />
          This equipment has been archived. Its maintenance and downtime history
          remain available below, but it is no longer listed in the active
          registry and cannot be scheduled for new work.
        </div>
      ) : null}

      <MetadataGrid
        fields={[
          { label: 'Asset Number', children: equipment.assetNumber },
          { label: 'Status', children: <StatusBadge status={equipment.status} /> },
          { label: 'Criticality', children: equipment.criticality ?? 'Not rated' },
          {
            label: 'Factory',
            children: (
              <>
                {equipment.factory.name}
                <span className="text-gray-500"> · {equipment.factory.location}</span>
              </>
            ),
          },
          { label: 'Location', children: equipment.location },
          { label: 'Added', children: formatDate(equipment.createdAt) },
          { label: 'Last updated', children: formatDate(equipment.updatedAt) },
          { label: 'Description', children: equipment.description ?? '—', className: 'sm:col-span-2 lg:col-span-3' },
        ]}
        columns={3}
        fullWidthLast
      />

      <div className="grid gap-4 md:grid-cols-2">
        {canViewHistory ? (
          <SummaryLinkTile
            icon={<FileClock aria-hidden className="size-3.5" />}
            count={history?.total ?? 0}
            title="Maintenance history"
            description={
              history && history.total > 0
                ? `${history.total} completed maintenance ${history.total === 1 ? 'record' : 'records'} for this asset — what was done, by whom, when, and which parts were used.`
                : 'No completed maintenance recorded yet. Completed work on this asset will appear here.'
            }
            href={`/equipment/${equipment.id}/history`}
            variant="indigo"
          />
        ) : null}
        <SummaryLinkTile
          icon={<TriangleAlert aria-hidden className="size-3.5" />}
          count={downtimeCount}
          title="Downtime events"
          description={
            downtimeCount > 0
              ? `${downtimeCount} downtime ${downtimeCount === 1 ? 'event' : 'events'} recorded for this asset — when it stopped, why, and for how long.`
              : 'No downtime events recorded yet. Events showing what stopped this asset and why will appear here.'
          }
          href={`/equipment/${equipment.id}/downtime`}
          variant="amber"
        />
      </div>
    </div>
  );
}
