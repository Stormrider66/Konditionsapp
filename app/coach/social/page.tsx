import { requireCoach } from '@/lib/auth-utils'
import { SocialMediaManager } from '@/components/coach/social/SocialMediaManager'

export default async function SocialPage() {
  await requireCoach()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sociala medier</h1>
          <p className="text-muted-foreground text-sm">
            Skapa, hantera och publicera inlägg till dina sociala medier
          </p>
        </div>
        <SocialMediaManager basePath="" />
      </div>
    </div>
  )
}
