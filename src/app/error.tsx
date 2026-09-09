'use client';

import { Button } from '@/components/ui/button';

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-base font-medium text-gray-900">
        Something went wrong
      </p>
      <p className="max-w-md text-sm text-gray-600">
        The application could not be loaded. Please try again.
      </p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}