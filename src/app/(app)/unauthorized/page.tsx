import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'

export default function UnauthorizedPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Unauthorized"
        description="You do not have permission to access this area."
        actions={
          <Link href="/dashboard">
            <Button variant="outline">Back to dashboard</Button>
          </Link>
        }
      />
    </div>
  )
}