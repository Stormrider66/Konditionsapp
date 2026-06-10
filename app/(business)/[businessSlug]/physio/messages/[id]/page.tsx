import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth-utils'
import { CareTeamThread } from '@/components/care-team/CareTeamThread'

interface PageProps {
  params: Promise<{ businessSlug: string; id: string }>
}

export default async function BusinessPhysioMessageThreadPage({ params }: PageProps) {
  const { businessSlug, id } = await params
  const basePath = `/${businessSlug}/physio`

  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link
        href={`${basePath}/messages`}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to messages
      </Link>
      <CareTeamThread threadId={id} currentUserId={user.id} />
    </div>
  )
}
