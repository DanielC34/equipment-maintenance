import { redirect } from 'next/navigation'
import type { Session } from 'next-auth'
import type { Role } from '@prisma/client'
import { getCurrentSession } from '@/auth'
import { PERMISSIONS, hasPermission, type Permission } from '@/lib/permissions'

export async function requireAuth(): Promise<Session> {
  const session = await getCurrentSession()
  if (!session?.user) {
    redirect('/login')
  }
  return session
}

export async function requireRole(...roles: Role[]): Promise<Session> {
  const session = await requireAuth()
  if (!roles.includes(session.user.role)) {
    redirect('/unauthorized')
  }
  return session
}

export async function requirePermission(
  permission: Permission,
): Promise<Session> {
  const session = await requireAuth()
  if (!hasPermission(session, permission)) {
    redirect('/unauthorized')
  }
  return session
}

export { PERMISSIONS, hasPermission }
export type { Permission }