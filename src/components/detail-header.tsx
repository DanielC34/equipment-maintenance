import type { ReactNode } from 'react';

export interface DetailHeaderProps {
  /** Breadcrumb or BackLink component for navigation */
  navigation?: ReactNode;
  /** Entity identity line (e.g., asset code + factory name) */
  identity?: ReactNode;
  /** Right-aligned action buttons */
  actions?: ReactNode;
  /** Entity name as H1 */
  title: string;
  /** Optional inline status badge */
  status?: ReactNode;
  /** Optional subline (e.g., record ID) */
  subline?: ReactNode;
}

export function DetailHeader({
  navigation,
  identity,
  actions,
  title,
  status,
  subline,
}: DetailHeaderProps) {
  return (
    <div className="space-y-4">
      {navigation ? (
        <div className="flex items-center justify-between">
          <div>{navigation}</div>
          {identity && <div className="text-sm text-gray-600">{identity}</div>}
        </div>
      ) : identity ? (
        <div className="flex items-center justify-between">
          <div>{identity}</div>
        </div>
      ) : null}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="io-h1 text-gray-900">{title}</h1>
          {status && <span className="shrink-0">{status}</span>}
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
      {subline ? (
        <p className="io-label text-gray-500">{subline}</p>
      ) : null}
    </div>
  );
}