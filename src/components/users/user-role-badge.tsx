import type { Role } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/lib/roles';

export function UserRoleBadge({ role }: { role: Role }) {
  return <Badge variant="neutral">{ROLE_LABELS[role]}</Badge>;
}
