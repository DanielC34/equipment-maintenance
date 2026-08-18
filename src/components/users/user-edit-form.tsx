'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Role } from '@prisma/client';
import { USER_ROLES, userUpdateSchema, type UserUpdateValues } from '@/lib/validations';
import { ROLE_LABELS } from '@/lib/roles';
import { updateUser, type UserActionResult } from '@/server/actions/users';
import { Button } from '@/components/ui/button';

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';
const labelClass = 'block text-sm font-medium text-gray-700';

export function UserEditForm({
  userId,
  currentRole,
  currentActive,
  isSelf,
}: {
  userId: string;
  currentRole: Role;
  currentActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserUpdateValues>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: { role: currentRole, active: currentActive },
  });

  const submitting = isSubmitting || isPending;

  function onSubmit(values: UserUpdateValues) {
    setActionError(null);
    startTransition(async () => {
      const result: UserActionResult = await updateUser(userId, values);
      if (!result.ok) {
        setActionError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {isSelf ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This is your own account. You cannot deactivate it or remove your own
          administrator role.
        </div>
      ) : null}

      <div>
        <label htmlFor="role" className={labelClass}>
          Role
        </label>
        <select id="role" className={inputClass} {...register('role')}>
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Controls what this user can access, based on the role permission
          matrix.
        </p>
        {errors.role && (
          <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="active"
          className="flex items-center gap-2 text-sm font-medium text-gray-700"
        >
          <input
            id="active"
            type="checkbox"
            className="size-4 rounded border-gray-300 accent-indigo-600"
            {...register('active')}
          />
          Account is active
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Inactive users cannot sign in and are hidden from operational
          assignment lists.
        </p>
        {errors.active && (
          <p className="mt-1 text-sm text-red-600">{errors.active.message}</p>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}