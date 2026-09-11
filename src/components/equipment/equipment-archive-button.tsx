'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, TriangleAlert } from 'lucide-react';
import { deleteEquipment } from '@/server/actions/equipment';
import { Button } from '@/components/ui/button';

export function EquipmentArchiveButton({
  equipmentId,
  equipmentName,
}: {
  equipmentId: string;
  equipmentName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onArchive() {
    setError(null);
    startTransition(async () => {
      const result = await deleteEquipment(equipmentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/equipment');
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-destructive-foreground/30 bg-destructive/10 px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-destructive-foreground">
          <TriangleAlert aria-hidden className="size-3.5" />
          Archive “{equipmentName}”?
        </span>
        <Button
          size="sm"
          variant="destructive"
          onClick={onArchive}
          disabled={isPending}
        >
          {isPending ? 'Archiving...' : 'Confirm archive'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirming(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
        {error ? (
          <p className="text-xs text-destructive-foreground">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <Button variant="outline" onClick={() => setConfirming(true)}>
      <Archive aria-hidden />
      Archive
    </Button>
  );
}
