import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RestrictionForm } from '@/components/physio/RestrictionForm'

interface PageProps {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{ clientId?: string; injuryId?: string }>
}

export default async function NewRestrictionPage({ params, searchParams }: PageProps) {
  const { businessSlug } = await params
  const { clientId, injuryId } = await searchParams
  const basePath = `/${businessSlug}/physio`

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Button asChild variant="ghost" className="mb-6 text-slate-300 hover:text-white">
        <Link href={`${basePath}/restrictions`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka
        </Link>
      </Button>
      <RestrictionForm basePath={basePath} initialClientId={clientId} initialInjuryId={injuryId} />
    </div>
  )
}
