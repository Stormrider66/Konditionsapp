import { requireAdmin } from '@/lib/auth-utils'
import { getTranslations } from '@/i18n/server'
import { ApplicationReviewPanel } from '@/components/admin/ApplicationReviewPanel'

export default async function AdminApplicationsPage() {
  await requireAdmin()
  const t = await getTranslations('admin')

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t('businessApplications')}</h1>
      <ApplicationReviewPanel />
    </div>
  )
}
