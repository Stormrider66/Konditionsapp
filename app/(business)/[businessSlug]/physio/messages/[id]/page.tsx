import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth-utils'
import { CareTeamThread } from '@/components/care-team/CareTeamThread'
import { RolePageFrame } from '@/components/layouts/role-shell/RolePage'

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
    <RolePageFrame contentClassName="max-w-4xl">
      <Link
        href={`${basePath}/messages`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to messages
      </Link>
      <CareTeamThread threadId={id} currentUserId={user.id} />
    </RolePageFrame>
  )
}
