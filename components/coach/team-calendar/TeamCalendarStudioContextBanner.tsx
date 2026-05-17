'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { CalendarDays, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

function formatTeamEventDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

export function TeamCalendarStudioContextBanner() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const fromTeamCalendar = searchParams.get('fromTeamCalendar') === 'true'
  const teamId = searchParams.get('teamId')
  const eventTitle = searchParams.get('eventTitle')
  const eventDate = formatTeamEventDate(searchParams.get('date'))

  if (!fromTeamCalendar || !teamId) return null

  const businessSlug = pathname?.match(/^\/([^/]+)\/coach\//)?.[1]
  const calendarHref = businessSlug && businessSlug !== 'coach'
    ? `/${businessSlug}/coach/teams/${teamId}/calendar`
    : `/coach/teams/${teamId}/calendar`

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-3 text-blue-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-4 w-4 text-blue-700" />
          <div>
            <div className="text-sm font-semibold">Bygger innehåll från lagkalendern</div>
            <div className="text-xs text-blue-900/75">
              {[eventTitle, eventDate].filter(Boolean).join(' · ') || 'Spara passet och koppla det tillbaka i kalenderhändelsen.'}
            </div>
          </div>
        </div>
        <Button asChild type="button" variant="outline" size="sm" className="border-blue-300 bg-white/70 text-blue-900 hover:bg-white">
          <Link href={calendarHref}>
            Till lagkalendern
            <ExternalLink className="ml-1.5 h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
