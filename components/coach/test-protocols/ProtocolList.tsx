'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useLocale } from 'next-intl'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'

type Locale = 'en' | 'sv'

const copy = (locale: Locale, en: string, sv: string) => locale === 'sv' ? sv : en

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
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
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
        toast.error(copy(locale, 'Could not fetch protocols', 'Kunde inte hämta protokoll'))
      } finally {
        setLoading(false)
      }
    }
    void fetchProtocols()
  }, [locale])

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-white/10 dark:bg-white/10" />
        ))}
      </div>
    )
  }

  if (protocols.length === 0) {
    return (
      <RolePanel className="px-6 py-12 text-center">
        <ClipboardList className="mx-auto mb-3 h-8 w-8 text-zinc-400 dark:text-zinc-600" />
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{copy(locale, 'No test protocols created yet', 'Inga testprotokoll skapade ännu')}</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{copy(locale, 'Create your first protocol under "Create protocol"', 'Skapa ditt första protokoll under "Skapa protokoll"')}</p>
      </RolePanel>
    )
  }

  return (
    <div className="space-y-2">
      {protocols.map((p) => (
        <RolePanel
          key={p.id}
          className={`p-4 transition-shadow ${onSelect ? 'cursor-pointer hover:shadow-md' : ''}`}
          onClick={() => onSelect?.(p)}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{p.name}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {p.metrics.length} {copy(locale, 'measurements', 'mätningar')} · {p._count.results} {copy(locale, 'results', 'resultat')}
                {p.sportType && ` · ${p.sportType}`}
                {' · '}{p.createdBy.name}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {p.isPublished && <Badge variant="outline" className="text-[10px]">{copy(locale, 'Shared', 'Delad')}</Badge>}
              {onSelect && <ChevronRight className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />}
            </div>
          </div>
          {p.description && <p className="mt-1 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">{p.description}</p>}
          <div className="mt-2 flex flex-wrap gap-1">
            {p.metrics.slice(0, 5).map((m) => (
              <Badge key={m.id} variant="secondary" className="text-[9px]">{m.name}</Badge>
            ))}
            {p.metrics.length > 5 && (
              <Badge variant="secondary" className="text-[9px]">+{p.metrics.length - 5}</Badge>
            )}
          </div>
        </RolePanel>
      ))}
    </div>
  )
}
