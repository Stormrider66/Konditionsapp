import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RehabProgramForm } from '@/components/physio/RehabProgramForm'
import { RolePageFrame } from '@/components/layouts/role-shell/RolePage'
import { getTranslations } from '@/i18n/server'

interface PageProps {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{ clientId?: string; injuryId?: string }>
}

export default async function NewRehabProgramPage({ params, searchParams }: PageProps) {
  const { businessSlug } = await params
  const { clientId, injuryId } = await searchParams
  const common = await getTranslations('common')
  const basePath = `/${businessSlug}/physio`

  return (
    <RolePageFrame contentClassName="max-w-4xl">
      <Button asChild variant="ghost" className="mb-6 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50">
        <Link href={`${basePath}/rehab-programs`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {common('back')}
        </Link>
      </Button>
      <RehabProgramForm basePath={basePath} initialClientId={clientId} initialInjuryId={injuryId} />
    </RolePageFrame>
  )
}
