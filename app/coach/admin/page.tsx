import { requireBusinessAdminRole } from '@/lib/auth-utils'
import { BusinessAdminClient } from './BusinessAdminClient'

export default async function BusinessAdminPage() {
  const admin = await requireBusinessAdminRole()

  return (
    <BusinessAdminClient
      businessId={admin.businessId}
      businessName={admin.business.name}
      businessRole={admin.businessRole}
    />
  )
}
