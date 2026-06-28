import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeamWhere } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DrillCreator } from '@/components/coach/drills/DrillCreator'
import { DrillList } from '@/components/coach/drills/DrillList'
import { DrillEditorPage } from '@/components/coach/drills/DrillEditorPage'
import { DrillTemplatePage } from '@/components/coach/drills/DrillTemplatePage'
import { PracticePlanner } from '@/components/coach/drills/PracticePlanner'
import { ClubDrillLibrary } from '@/components/coach/drills/ClubDrillLibrary'
import { ClipboardList } from 'lucide-react'
import { getTranslations } from '@/i18n/server'
import { RolePageFrame, RolePageHeader, roleTabsListClass } from '@/components/layouts/role-shell/RolePage'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function DrillsPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.drills')

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  const teamWhere = await getAccessibleTeamWhere(user.id, businessSlug)
  const teams = await prisma.team.findMany({
    where: teamWhere,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <RolePageFrame maxWidth="wide">
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

      <Tabs defaultValue="create" className="space-y-5">
        <TabsList className={roleTabsListClass('h-auto flex-wrap justify-start gap-1')}>
          <TabsTrigger value="create" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">{t('tabs.create')}</TabsTrigger>
          <TabsTrigger value="draw" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">{t('tabs.draw')}</TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">{t('tabs.templates')}</TabsTrigger>
          <TabsTrigger value="plan" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">{t('tabs.plan')}</TabsTrigger>
          <TabsTrigger value="club" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">{t('tabs.club')}</TabsTrigger>
          <TabsTrigger value="library" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">{t('tabs.library')}</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <DrillCreator teams={teams} businessSlug={businessSlug} />
        </TabsContent>

        <TabsContent value="draw">
          <DrillEditorPage teams={teams} />
        </TabsContent>

        <TabsContent value="templates">
          <DrillTemplatePage teams={teams} />
        </TabsContent>

        <TabsContent value="plan">
          <PracticePlanner teams={teams} />
        </TabsContent>

        <TabsContent value="club">
          <ClubDrillLibrary teams={teams} />
        </TabsContent>

        <TabsContent value="library">
          <DrillList />
        </TabsContent>
      </Tabs>
    </RolePageFrame>
  )
}
