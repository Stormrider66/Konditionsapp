// app/(business)/[businessSlug]/athlete/programs/import/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ImportProgramClient } from '@/components/programs/import/ImportProgramClient'
import { getTranslations } from '@/i18n/server'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function AthleteImportProgramPage({ params }: PageProps) {
  const { businessSlug } = await params
  const t = await getTranslations('athletePages.programImport')
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  const basePath = `/${businessSlug}`

  // Athletes only ever import for themselves. We still load the Client row
  // so the publish dialog gets a real display name for the target.
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true },
  })
  if (!client) notFound()

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <Link href={`${basePath}/athlete/programs`}>
        <Button
          variant="ghost"
          className="mb-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToPrograms')}
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">
          {t('title')}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {t('description')}
        </p>
      </div>

      <ImportProgramClient
        clients={[{ id: client.id, name: client.name }]}
        basePath={basePath}
        selfOnly
        programDetailPath={(base, programId) =>
          `${base}/athlete/programs/${programId}`
        }
      />
    </div>
  )
}
