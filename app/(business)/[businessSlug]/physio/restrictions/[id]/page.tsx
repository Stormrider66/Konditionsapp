import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RestrictionForm } from '@/components/physio/RestrictionForm'
import { RolePageFrame } from '@/components/layouts/role-shell/RolePage'
import { getTranslations } from '@/i18n/server'

interface PageProps {
  params: Promise<{ businessSlug: string; id: string }>
}

export default async function RestrictionDetailPage({ params }: PageProps) {
  const { businessSlug, id } = await params
  const common = await getTranslations('common')
  const basePath = `/${businessSlug}/physio`

  return (
    <RolePageFrame contentClassName="max-w-4xl">
      <Button asChild variant="ghost" className="mb-6 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50">
        <Link href={`${basePath}/restrictions`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {common('back')}
        </Link>
      </Button>
      <RestrictionForm basePath={basePath} restrictionId={id} />
    </RolePageFrame>
  )
}
