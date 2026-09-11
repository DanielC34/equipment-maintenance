import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Inbox } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { maintenanceHistoryFilterSchema } from '@/lib/validations';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import { getEquipmentMaintenanceHistory } from '@/server/maintenance';
import { getEquipmentById } from '@/server/equipment';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PriorityIndicator } from '@/components/ui/priority-indicator';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const equipment = await getEquipmentById(id);
  return {
    title: equipment
      ? `${equipment.name} history | EMMS`
      : 'Equipment history | EMMS',
  };
}

function formatCompletedDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default async function EquipmentHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.maintenanceView);

  const { id } = await params;
  const equipment = await getEquipmentById(id);
  if (!equipment) {
    notFound();
  }

  const raw = await searchParams;
  const filter = maintenanceHistoryFilterSchema.parse(raw);
  const { page, q } = filter;

  const { items, total, pageSize, totalPages } =
    await getEquipmentMaintenanceHistory(id, page, q);

  const hasFilters = Boolean(q);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  function pageHref(target: number): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (target > 1) params.set('page', String(target));
    const query = params.toString();
    return query
      ? `/equipment/${id}/history?${query}`
      : `/equipment/${id}/history`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${equipment.name} — history`}
        description={`${equipment.assetNumber} · ${total} ${total === 1 ? 'completed maintenance record' : 'completed maintenance records'}`}
        actions={
          <Link href={`/equipment/${equipment.id}`}>
            <Button variant="outline">
              <ArrowLeft aria-hidden />
              Back to equipment
            </Button>
          </Link>
        }
      />

      <form
        method="GET"
        className="flex flex-col gap-3 rounded-xl border border-[var(--io-border)] bg-white p-4 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <Label htmlFor="q">Search this history</Label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Task, description, or notes"
            className="mt-1"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {hasFilters ? (
          <Link href={`/equipment/${equipment.id}/history`}>
            <Button variant="ghost">Clear</Button>
          </Link>
        ) : null}
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={hasFilters ? 'No maintenance records match your search' : 'No maintenance history exists for this equipment yet'}
          description={
            hasFilters
              ? 'Try a different search term or clear the search.'
              : 'Completed maintenance work on this asset will appear here with the task, technician, and parts used.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--io-border)] bg-white">
          <Table>
            <TableHeader>
                <TableRow className="hover:bg-transparent">
                <TableHead className="io-table-header">Completed</TableHead>
                <TableHead className="io-table-header">Task</TableHead>
                <TableHead className="io-table-header">Technician</TableHead>
                <TableHead className="io-table-header">Work performed</TableHead>
                <TableHead className="io-table-header">Priority</TableHead>
                <TableHead className="io-table-header">Parts</TableHead>
                <TableHead className="io-table-header text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="whitespace-nowrap text-gray-700">
                    {formatCompletedDate(record.completedDate)}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {record.task ? (
                      <Link
                        href={`/maintenance/${record.task.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        {record.task.title}
                      </Link>
                    ) : (
                      <span className="text-gray-500">Standalone record</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {record.technician.name}
                  </TableCell>
                  <TableCell className="max-w-xs text-gray-700">
                    <p className="line-clamp-1">{record.description}</p>
                  </TableCell>
                  <TableCell>
                    {record.task ? (
                      <PriorityIndicator priority={record.task.priority} />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {record._count.partsUsed}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/maintenance/history/${record.id}`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
              start={start}
              end={end}
              total={total}
              page={page}
              totalPages={totalPages}
              pageHref={pageHref}
            />
        </div>
      )}
    </div>
  );
}
