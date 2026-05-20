import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { GarminAttribution } from '@/components/ui/GarminAttribution'

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
      toast.success(`Garmin-synk klar: ${data.summary.matched}/${data.summary.total} matchade`)
    } catch {
      toast.error('Kunde inte synka Garmin Connect-data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <GlassCard glow="blue" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
      <GlassCardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <GlassCardTitle className="text-lg text-slate-900 dark:text-white font-semibold">Garmin Connect-synkronisering</GlassCardTitle>
          <GarminAttribution />
        </div>
        <Button onClick={handleSync} disabled={loading} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Synkar...' : 'Synka Garmin Connect'}
        </Button>
      </GlassCardHeader>
      <GlassCardContent>
        {!results ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Synka Garmin Connect-data för att berika sessionen med puls- och hastighetsdata.
            Matchar aktiviteter inom 30 min från sessionens tidsram.
          </p>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <div key={r.clientId} className="flex items-center justify-between text-sm">
                <span className="text-slate-800 dark:text-slate-200 font-medium">{r.clientName}</span>
                {r.matched ? (
                  <Badge variant="default" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Check className="h-3 w-3" />
                    Matchad
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-350">
                    <X className="h-3 w-3 text-rose-500" />
                    {r.error || 'Ej matchad'}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
