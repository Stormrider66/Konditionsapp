'use client'

/**
 * TeamSelector Component
 *
 * Reusable dropdown for selecting teams with:
 * - Team name + member count
 * - Sport type badge
 * - Organization grouping
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Users } from 'lucide-react'
import { SportType } from '@/types'
import { getSportLabel } from '@/lib/sports/catalog'
import { getBusinessScopeHeaders } from '@/lib/business-scope-client'
import { useLocale } from '@/i18n/client'

interface Team {
  id: string
  name: string
  sportType?: SportType | null
  members?: { id: string }[]
  organization?: {
    id: string
    name: string
  } | null
}

interface TeamSelectorProps {
  value?: string
  onValueChange: (teamId: string) => void
  placeholder?: string
  disabled?: boolean
  showMemberCount?: boolean
  showSportBadge?: boolean
  className?: string
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  placeholder: string
  loading: string
  empty: string
  noOrganization: string
}> = {
  en: {
    placeholder: 'Select team...',
    loading: 'Loading teams...',
    empty: 'No teams found',
    noOrganization: 'No organization',
  },
  sv: {
    placeholder: 'Välj lag...',
    loading: 'Laddar lag...',
    empty: 'Inga lag hittades',
    noOrganization: 'Utan organisation',
  },
}

export function TeamSelector({
  value,
  onValueChange,
  placeholder,
  disabled = false,
  showMemberCount = true,
  showSportBadge = true,
  className,
}: TeamSelectorProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const businessHeaders = useMemo(() => getBusinessScopeHeaders(pathname), [pathname])

  const fetchTeams = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/teams', {
        headers: businessHeaders,
      })
      if (response.ok) {
        const data = await response.json()
        setTeams(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    } finally {
      setLoading(false)
    }
  }, [businessHeaders])

  useEffect(() => {
    void fetchTeams()
  }, [fetchTeams])

  // Group teams by organization
  const groupedTeams = teams.reduce(
    (acc, team) => {
      const orgName = team.organization?.name || copy.noOrganization
      if (!acc[orgName]) {
        acc[orgName] = []
      }
      acc[orgName].push(team)
      return acc
    },
    {} as Record<string, Team[]>
  )

  const hasOrganizations = Object.keys(groupedTeams).some(
    (key) => key !== copy.noOrganization
  )
  const selectedPlaceholder = placeholder ?? copy.placeholder

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
      <SelectTrigger className={className}>
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-muted-foreground">{copy.loading}</span>
          </div>
        ) : (
          <SelectValue placeholder={selectedPlaceholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        {teams.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground text-center">
            {copy.empty}
          </div>
        ) : hasOrganizations ? (
          // Render with organization groups
          Object.entries(groupedTeams).map(([orgName, orgTeams]) => (
            <div key={orgName}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {orgName}
              </div>
              {orgTeams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  <div className="flex items-center gap-2">
                    <span>{team.name}</span>
                    {showMemberCount && team.members && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {team.members.length}
                      </span>
                    )}
                    {showSportBadge && team.sportType && (
                      <Badge variant="outline" className="text-xs">
                        {getSportLabel(team.sportType, locale)}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </div>
          ))
        ) : (
          // Render flat list
          teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              <div className="flex items-center gap-2">
                <span>{team.name}</span>
                {showMemberCount && team.members && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {team.members.length}
                  </span>
                )}
                {showSportBadge && team.sportType && (
                  <Badge variant="outline" className="text-xs">
                    {getSportLabel(team.sportType, locale)}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
