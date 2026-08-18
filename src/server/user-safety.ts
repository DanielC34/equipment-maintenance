import type { Role } from '@prisma/client';

export interface UserRoleState {
  id: string;
  role: Role;
  active: boolean;
}

export function userUpdateConflict(
  actorId: string,
  target: UserRoleState,
  next: UserRoleState,
  otherActiveAdmins: number
): string | null {
  const isSelf = target.id === actorId;

  if (isSelf) {
    if (!next.active) {
      return 'You cannot deactivate your own account.';
    }
    if (next.role !== 'ADMINISTRATOR') {
      return 'You cannot remove your own administrator role.';
    }
  }

  const removesLastAdmin =
    target.active &&
    target.role === 'ADMINISTRATOR' &&
    (next.role !== 'ADMINISTRATOR' || !next.active) &&
    otherActiveAdmins === 0;

  if (removesLastAdmin) {
    return 'The system must keep at least one active administrator.';
  }

  return null;
}