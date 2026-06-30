import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { GarminAttribution } from '@/components/ui/GarminAttribution'
import { useLocale } from 'next-intl'

type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

interface GarminSyncResult {
  clientId: string
  clientName: string
  matched: boolean
  activityId?: string
  error?: string
}

interface GarminSyncPanelProps {
  sessionId: string
}

export function GarminSyncPanel({ sessionId }: GarminSyncPanelProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GarminSyncResult[] | null>(null)

  const handleSync = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/coach/interval-sessions/${sessionId}/garmin-sync`,
        { method: 'POST' }
      )

      if (!res.ok) throw new Error()

      const data = await res.json()
      setResults(data.results)
      toast.success(copy(locale, `Garmin sync complete: ${data.summary.matched}/${data.summary.total} matched`, `Garmin-synk klar: ${data.summary.matched}/${data.summary.total} matchade`))
    } catch {
      toast.error(copy(locale, 'Could not sync Garmin Connect data', 'Kunde inte synka Garmin Connect-data'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <RolePanel>
      <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{copy(locale, 'Garmin Connect sync', 'Garmin Connect-synkronisering')}</h3>
          <GarminAttribution />
        </div>
        <Button onClick={handleSync} disabled={loading} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? copy(locale, 'Syncing...', 'Synkar...') : copy(locale, 'Sync Garmin Connect', 'Synka Garmin Connect')}
        </Button>
      </div>
      <div className="p-4">
        {!results ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {copy(
              locale,
              "Sync Garmin Connect data to enrich the session with heart-rate and speed data. Matches activities within 30 minutes of the session's time window.",
              'Synka Garmin Connect-data för att berika sessionen med puls- och hastighetsdata. Matchar aktiviteter inom 30 min från sessionens tidsram.'
            )}
          </p>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <div key={r.clientId} className="flex items-center justify-between text-sm">
                <span className="text-slate-800 dark:text-slate-200 font-medium">{r.clientName}</span>
                {r.matched ? (
                  <Badge variant="default" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Check className="h-3 w-3" />
                    {copy(locale, 'Matched', 'Matchad')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-350">
                    <X className="h-3 w-3 text-red-500" />
                    {r.error || copy(locale, 'Not matched', 'Ej matchad')}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </RolePanel>
  )
}
