import { requireAuth } from '@/server/rbac'

export default async function DashboardPage() {
  const session = await requireAuth()
  const { user } = session

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back, {user.name}. You are signed in with the{' '}
          {user.role.replace(/_/g, ' ').toLowerCase()} role.
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-700">
          Authentication and role-based access control are active. Equipment,
          maintenance, downtime, and reporting features will be added in
          upcoming milestones.
        </p>
      </div>
    </div>
  )
}