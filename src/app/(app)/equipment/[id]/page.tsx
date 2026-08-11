import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { PERMISSIONS, requirePermission, hasPermission } from '@/server/rbac';
import { getEquipmentById } from '@/server/equipment';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { SectionPlaceholder } from '@/components/section-placeholder';
import { EquipmentStatusBadge } from '@/components/equipment/equipment-status-badge';

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

  return (
    <div className="space-y-6">
      <PageHeader
        title={equipment.name}
        description={`${equipment.assetNumber} · ${equipment.factory.name}`}
        actions={
          canEdit ? (
            <Link href={`/equipment/${equipment.id}/edit`}>
              <Button variant="outline">
                <Pencil aria-hidden />
                Edit
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white">
        <dl className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Asset number
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {equipment.assetNumber}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Status
            </dt>
            <dd className="mt-1">
              <EquipmentStatusBadge status={equipment.status} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Factory
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {equipment.factory.name}
              <span className="text-gray-500">
                {' '}
                · {equipment.factory.location}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Criticality
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {equipment.criticality ?? 'Not rated'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Location
            </dt>
            <dd className="mt-1 text-sm text-gray-900">{equipment.location}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Added
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatDate(equipment.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Last updated
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatDate(equipment.updatedAt)}
            </dd>
          </div>
        </dl>
        {equipment.description ? (
          <div className="border-t border-gray-100 px-6 py-4">
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Description
            </dt>
            <dd className="mt-1 text-sm text-gray-700">
              {equipment.description}
            </dd>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionPlaceholder
          badge="Future milestone"
          title="Scheduled maintenance"
          description="Planned maintenance tasks for this asset will be scheduled and reviewed here in the maintenance module."
          planned={['Preventive work orders', 'Overdue and upcoming views']}
        />
        <SectionPlaceholder
          badge="Future milestone"
          title="Maintenance history"
          description="Completed work and the technicians who performed it will be recorded against this asset."
          planned={['Completed maintenance records', 'Parts used per record']}
        />
        <SectionPlaceholder
          badge="Future milestone"
          title="Downtime history"
          description="Downtime events and their causes will be linked to this asset for reliability analysis."
          planned={['Downtime events and reasons', 'Recovery time']}
        />
        <SectionPlaceholder
          badge="Future milestone"
          title="Equipment performance"
          description="Availability and reliability metrics for this asset will be summarised here."
          planned={['Availability and uptime', 'Reliability trends']}
        />
      </div>
    </div>
  );
}
