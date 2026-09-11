import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-base font-medium text-gray-900">
        Page not found
      </p>
      <p className="max-w-md text-sm text-gray-600">
        The page you are looking for does not exist.
      </p>
      <Link href="/">
        <Button variant="outline">Go home</Button>
      </Link>
    </div>
  );
}