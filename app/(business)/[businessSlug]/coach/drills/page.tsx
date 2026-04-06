import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DrillCreator } from '@/components/coach/drills/DrillCreator'
import { DrillList } from '@/components/coach/drills/DrillList'
import { DrillEditorPage } from '@/components/coach/drills/DrillEditorPage'
import { DrillTemplatePage } from '@/components/coach/drills/DrillTemplatePage'
import { PracticePlanner } from '@/components/coach/drills/PracticePlanner'
import { ClubDrillLibrary } from '@/components/coach/drills/ClubDrillLibrary'
import { ClipboardList } from 'lucide-react'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function DrillsPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  const teams = await prisma.team.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 dark:text-white">
          <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6" />
          Taktiktavla
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Skapa och dela övningar med dina spelare
        </p>
      </div>

      <Tabs defaultValue="create" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-0.5">
          <TabsTrigger value="create">Skapa ny</TabsTrigger>
          <TabsTrigger value="draw">Rita</TabsTrigger>
          <TabsTrigger value="templates">Mallar</TabsTrigger>
          <TabsTrigger value="plan">Planera</TabsTrigger>
          <TabsTrigger value="club">Klubb</TabsTrigger>
          <TabsTrigger value="library">Sparade</TabsTrigger>
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
    </div>
  )
}
