// app/(business)/[businessSlug]/coach/programs/import/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ImportProgramClient } from '@/components/programs/import/ImportProgramClient'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function ImportProgramPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  const basePath = `/${businessSlug}/coach`

  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <Link href={`${basePath}/programs`}>
        <Button
          variant="ghost"
          className="mb-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till program
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">
          Importera träningsprogram
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Släpp en Excel-fil, PDF eller klistra in text — AI:n tolkar programmet
          och lägger det i redigeraren innan du publicerar det till en atlet.
        </p>
      </div>

      <ImportProgramClient clients={clients} basePath={basePath} />
    </div>
  )
}
