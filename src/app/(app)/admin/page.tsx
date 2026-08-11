import { Role } from '@prisma/client'
import { requireRole } from '@/server/rbac'

export default async function AdminPage() {
  await requireRole(Role.ADMINISTRATOR)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="mt-1 text-sm text-gray-600">
          This area is restricted to Administrators.
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-700">
          User management and system configuration are enforced server-side
          here. These features will be implemented in future milestones.
        </p>
      </div>
    </div>
  )
}