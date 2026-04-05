import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProtocolBuilder } from '@/components/coach/test-protocols/ProtocolBuilder'
import { ProtocolList } from '@/components/coach/test-protocols/ProtocolList'
import { ClipboardList } from 'lucide-react'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function TestProtocolsPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 dark:text-white">
          <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6" />
          Testprotokoll
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Skapa och hantera egna testbatterier
        </p>
      </div>

      <Tabs defaultValue="protocols" className="space-y-4">
        <TabsList>
          <TabsTrigger value="protocols">Mina protokoll</TabsTrigger>
          <TabsTrigger value="create">Skapa protokoll</TabsTrigger>
        </TabsList>

        <TabsContent value="protocols">
          <ProtocolList />
        </TabsContent>

        <TabsContent value="create">
          <ProtocolBuilder />
        </TabsContent>
      </Tabs>
    </div>
  )
}
