'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClipboardList, Users, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

interface Protocol {
  id: string
  name: string
  description: string | null
  sportType: string | null
  metrics: { id: string; name: string; unit: string; type: string; category: string }[]
  isPublished: boolean
  createdBy: { name: string }
  _count: { results: number }
  createdAt: string
}

interface ProtocolListProps {
  onSelect?: (protocol: Protocol) => void
}

export function ProtocolList({ onSelect }: ProtocolListProps) {
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProtocols = async () => {
      try {
        const res = await fetch('/api/coach/test-protocols')
        if (res.ok) {
          const data = await res.json()
          setProtocols(data.protocols || [])
        }
      } catch {
        toast.error('Kunde inte hämta protokoll')
      } finally {
        setLoading(false)
      }
    }
    fetchProtocols()
  }, [])

  if (loading) {
    return <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
  }

  if (protocols.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p>Inga testprotokoll skapade ännu</p>
        <p className="text-xs mt-1">Skapa ditt första protokoll under "Skapa protokoll"</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {protocols.map((p) => (
        <Card
          key={p.id}
          className={`${onSelect ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow`}
          onClick={() => onSelect?.(p)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">{p.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {p.metrics.length} mätningar · {p._count.results} resultat
                  {p.sportType && ` · ${p.sportType}`}
                  {' · '}{p.createdBy.name}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {p.isPublished && <Badge variant="outline" className="text-[10px]">Delad</Badge>}
                {onSelect && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
            {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.description}</p>}
            <div className="flex flex-wrap gap-1 mt-2">
              {p.metrics.slice(0, 5).map((m) => (
                <Badge key={m.id} variant="secondary" className="text-[9px]">{m.name}</Badge>
              ))}
              {p.metrics.length > 5 && (
                <Badge variant="secondary" className="text-[9px]">+{p.metrics.length - 5}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
