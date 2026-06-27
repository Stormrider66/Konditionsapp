import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProtocolBuilder } from '@/components/coach/test-protocols/ProtocolBuilder'
import { ProtocolList } from '@/components/coach/test-protocols/ProtocolList'
import { ClipboardList } from 'lucide-react'
import { getTranslations } from '@/i18n/server'
import { RolePageFrame, RolePageHeader } from '@/components/layouts/role-shell/RolePage'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function TestProtocolsPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.testProtocols')

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  return (
    <RolePageFrame>
      <RolePageHeader
        eyebrow={t('eyebrow')}
        title={(
          <span className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
              <ClipboardList className="h-5 w-5" />
            </span>
            {t('title')}
          </span>
        )}
        description={t('description')}
      />

      <Tabs defaultValue="protocols" className="space-y-5">
        <TabsList className="h-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-zinc-950/60">
          <TabsTrigger value="protocols" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">{t('tabs.protocols')}</TabsTrigger>
          <TabsTrigger value="create" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">{t('tabs.create')}</TabsTrigger>
        </TabsList>

        <TabsContent value="protocols">
          <ProtocolList />
        </TabsContent>

        <TabsContent value="create">
          <ProtocolBuilder />
        </TabsContent>
      </Tabs>
    </RolePageFrame>
  )
}
