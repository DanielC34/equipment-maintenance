'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import {
  startMaintenanceTask,
} from '@/server/actions/maintenance';
import { Button } from '@/components/ui/button';

export function MaintenanceStartButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onStart() {
    setError(null);
    startTransition(async () => {
      const result = await startMaintenanceTask(taskId);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <Button onClick={onStart} disabled={isPending}>
        <Play aria-hidden />
        {isPending ? 'Starting...' : 'Start maintenance'}
      </Button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}