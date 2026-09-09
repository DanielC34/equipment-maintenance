'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  USER_ROLES,
  userCreateSchema,
  type UserCreateValues,
} from '@/lib/validations';
import { ROLE_LABELS } from '@/lib/roles';
import { createUser, type UserActionResult } from '@/server/actions/users';
import { Button } from '@/components/ui/button';
import { Input, inputBase } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="e.g. Jordan Smith"
          className="mt-1"
          {...register('name')}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-destructive-foreground">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="e.g. jordan.smith@emms.dev"
          className="mt-1"
          {...register('email')}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-destructive-foreground">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          className={cn(inputBase, 'mt-1')}
          {...register('role')}
        >
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        {errors.role && (
          <p className="mt-1 text-sm text-destructive-foreground">
            {errors.role.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="password">Initial password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="mt-1"
          {...register('password')}
        />
        <p className="mt-1 text-xs text-gray-500">
          The new user signs in with this password. It is stored only as a
          secure hash and cannot be recovered.
        </p>
        {errors.password && (
          <p className="mt-1 text-sm text-destructive-foreground">
            {errors.password.message}
          </p>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg border border-destructive-foreground/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
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
