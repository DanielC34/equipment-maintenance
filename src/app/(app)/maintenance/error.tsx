'use client';

import { Button } from '@/components/ui/button';

export default function MaintenanceError({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-base font-medium text-gray-900">
        Something went wrong
      </p>
      <p className="max-w-md text-sm text-gray-600">
        The maintenance area could not be loaded. Please try again.
      </p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}