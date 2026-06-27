// app/(business)/[businessSlug]/coach/programs/import/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { RolePageFrame, RolePageHeader } from '@/components/layouts/role-shell/RolePage'
import { ArrowLeft } from 'lucide-react'
import { ImportProgramClient } from '@/components/programs/import/ImportProgramClient'
import { getTranslations } from '@/i18n/server'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function ImportProgramPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.programImport')

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  const basePath = `/${businessSlug}/coach`
  const coachIds = await getCoachScopedIds(user.id, membership.businessId, membership.role)

  const clients = await prisma.client.findMany({
    where: {
      userId: { in: coachIds },
      businessId: membership.businessId,
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <RolePageFrame contentClassName="max-w-5xl">
      <RolePageHeader
        eyebrow="Coach"
        title={t('title')}
        description={t('description')}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`${basePath}/programs`}>
              <ArrowLeft className="h-4 w-4" />
              {t('backToPrograms')}
            </Link>
          </Button>
        }
      />

      <ImportProgramClient clients={clients} basePath={basePath} />
    </RolePageFrame>
  )
}
