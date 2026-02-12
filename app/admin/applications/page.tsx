import { requireAdmin } from '@/lib/auth-utils'
import { ApplicationReviewPanel } from '@/components/admin/ApplicationReviewPanel'

export default async function AdminApplicationsPage() {
  await requireAdmin()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Business Applications</h1>
      <ApplicationReviewPanel />
    </div>
  )
}
