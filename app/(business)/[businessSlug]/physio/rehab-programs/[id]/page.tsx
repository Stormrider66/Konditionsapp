import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RehabProgramForm } from '@/components/physio/RehabProgramForm'
import { getTranslations } from '@/i18n/server'

interface PageProps {
  params: Promise<{ businessSlug: string; id: string }>
}

export default async function RehabProgramDetailPage({ params }: PageProps) {
  const { businessSlug, id } = await params
  const common = await getTranslations('common')
  const basePath = `/${businessSlug}/physio`

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Button asChild variant="ghost" className="mb-6 text-slate-300 hover:text-white">
        <Link href={`${basePath}/rehab-programs`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {common('back')}
        </Link>
      </Button>
      <RehabProgramForm basePath={basePath} programId={id} />
    </div>
  )
}
