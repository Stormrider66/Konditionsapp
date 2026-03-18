'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      toast.error('Kunde inte synka Garmin-data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg">Garmin-synkronisering</CardTitle>
          <GarminAttribution />
        </div>
        <Button onClick={handleSync} disabled={loading} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Synkar...' : 'Synka Garmin'}
        </Button>
      </CardHeader>
      <CardContent>
        {!results ? (
          <p className="text-sm text-muted-foreground">
            Synka Garmin-data for att berika sessionen med puls- och hastighetsdata.
            Matchar aktiviteter inom 30 min fran sessionens tidsram.
          </p>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <div key={r.clientId} className="flex items-center justify-between text-sm">
                <span>{r.clientName}</span>
                {r.matched ? (
                  <Badge variant="default" className="gap-1">
                    <Check className="h-3 w-3" />
                    Matchad
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <X className="h-3 w-3" />
                    {r.error || 'Ej matchad'}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
