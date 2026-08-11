import type { ReactNode } from 'react'
import { requireAuth } from '@/server/rbac'
import { AppHeader } from '@/components/app-header'

export default async function AppLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await requireAuth()
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AppHeader session={session} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  )
}