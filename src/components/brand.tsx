import Link from 'next/link';
import { Gauge } from 'lucide-react';

export function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      className="inline-flex items-center gap-2 text-[var(--io-accent)] hover:opacity-90"
    >
      <Gauge aria-hidden className="size-6 shrink-0" />
      <span className="io-brand text-gray-900">InduOps</span>
    </Link>
  );
}
