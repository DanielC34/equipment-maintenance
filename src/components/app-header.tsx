import Link from 'next/link'
import type { Session } from 'next-auth'
import { PERMISSIONS, roleHasPermission } from '@/lib/permissions'
import { SignOutButton } from '@/components/sign-out-button'

export function AppHeader({ session }: { session: Session }) {
  const { user } = session
  const canManageUsers = roleHasPermission(user.role, PERMISSIONS.usersManage)

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm font-bold tracking-tight text-indigo-600"
          >
            EMMS
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className="text-gray-700 hover:text-indigo-600"
            >
              Dashboard
            </Link>
            {canManageUsers && (
              <Link href="/admin" className="text-gray-700 hover:text-indigo-600">
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {user.role.replace(/_/g, ' ')}
            </p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}