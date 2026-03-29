import { requireCoach } from '@/lib/auth-utils'
import { CompetitionManager } from '@/components/coach/competitions/CompetitionManager'

export default async function CompetitionsPage() {
  await requireCoach()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Utmaningar & Tävlingar</h1>
          <p className="text-muted-foreground text-sm">
            Skapa utmaningar och tävlingar för att engagera dina medlemmar
          </p>
        </div>
        <CompetitionManager basePath="" />
      </div>
    </div>
  )
}
