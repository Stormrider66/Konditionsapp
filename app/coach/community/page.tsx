import { requireCoach } from '@/lib/auth-utils'
import { CommunityFeed } from '@/components/coach/community/CommunityFeed'

export default async function CommunityPage() {
  await requireCoach()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="container mx-auto py-6 px-4 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Community</h1>
          <p className="text-muted-foreground text-sm">
            Inlägg, nyheter och uppdateringar för dina medlemmar
          </p>
        </div>
        <CommunityFeed />
      </div>
    </div>
  )
}
