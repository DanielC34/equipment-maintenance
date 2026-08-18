'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { USER_ROLES, userCreateSchema, type UserCreateValues } from '@/lib/validations';
import { ROLE_LABELS } from '@/lib/roles';
import { createUser, type UserActionResult } from '@/server/actions/users';
import { Button } from '@/components/ui/button';

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';
const labelClass = 'block text-sm font-medium text-gray-700';

export function UserForm() {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserCreateValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'OPERATOR',
      password: '',
    },
  });

  const submitting = isSubmitting || isPending;

  function onSubmit(values: UserCreateValues) {
    setActionError(null);
    startTransition(async () => {
      const result: UserActionResult = await createUser(values);
      if (!result.ok) {
        setActionError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <label htmlFor="name" className={labelClass}>
          Name
        </label>
        <input
          id="name"
          type="text"
          placeholder="e.g. Jordan Smith"
          className={inputClass}
          {...register('name')}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          type="email"
          placeholder="e.g. jordan.smith@emms.dev"
          className={inputClass}
          {...register('email')}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

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
        {errors.role && (
          <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>
          Initial password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className={inputClass}
          {...register('password')}
        />
        <p className="mt-1 text-xs text-gray-500">
          The new user signs in with this password. It is stored only as a
          secure hash and cannot be recovered.
        </p>
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create user'}
        </Button>
      </div>
    </form>
  );
}