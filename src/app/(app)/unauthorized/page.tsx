import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Unauthorized</h1>
      <p className="text-sm text-gray-700">
        You do not have permission to access this area.
      </p>
      <Link
        href="/dashboard"
        className="text-sm text-indigo-600 hover:underline"
      >
        Back to dashboard
      </Link>
    </div>
  )
}