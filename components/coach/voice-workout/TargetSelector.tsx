'use client'

/**
 * Target Selector
 *
 * Athlete/Team picker:
 * - Dropdown with search
 * - Shows teams and athletes
 * - Displays warnings per athlete (injuries, ACWR)
 */

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, User, Search, Check, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TargetSelectorProps {
  onSelect: (type: 'ATHLETE' | 'TEAM', id: string, name: string) => void
  selectedType?: 'ATHLETE' | 'TEAM'
  selectedId?: string
}

interface Athlete {
  id: string
  name: string
  email?: string
}

interface Team {
  id: string
  name: string
  memberCount: number
}

export function TargetSelector({
  onSelect,
  selectedType,
  selectedId,
}: TargetSelectorProps) {
  const [search, setSearch] = useState('')
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'athletes' | 'teams'>(
    selectedType === 'TEAM' ? 'teams' : 'athletes'
  )

  // Fetch athletes and teams
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch athletes
        const clientsRes = await fetch('/api/clients?limit=100')
        if (clientsRes.ok) {
          const data = await clientsRes.json()
          setAthletes(
            data.clients?.map((c: { id: string; name: string; email?: string }) => ({
              id: c.id,
              name: c.name,
              email: c.email,
            })) || []
          )
        }

        // Fetch teams
        const teamsRes = await fetch('/api/teams')
        if (teamsRes.ok) {
          const data = await teamsRes.json()
          setTeams(
            data.teams?.map(
              (t: { id: string; name: string; _count?: { members?: number } }) => ({
                id: t.id,
                name: t.name,
                memberCount: t._count?.members || 0,
              })
            ) || []
          )
        }
      } catch (err) {
        console.error('Failed to fetch targets:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter by search
  const filteredAthletes = athletes.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Sök atlet eller lag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'athletes' | 'teams')}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="athletes" className="gap-2">
            <User className="h-4 w-4" />
            Atleter ({filteredAthletes.length})
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-2">
            <Users className="h-4 w-4" />
            Lag ({filteredTeams.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="athletes" className="mt-2">
          <ScrollArea className="h-48 rounded-md border">
            {filteredAthletes.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Inga atleter hittades
              </div>
            ) : (
              <div className="p-1">
                {filteredAthletes.map((athlete) => (
                  <button
                    key={athlete.id}
                    onClick={() => onSelect('ATHLETE', athlete.id, athlete.name)}
                    className={cn(
                      'w-full flex items-center justify-between p-2 rounded-md text-left transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      selectedType === 'ATHLETE' &&
                        selectedId === athlete.id &&
                        'bg-accent'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                        {athlete.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{athlete.name}</p>
                        {athlete.email && (
                          <p className="text-xs text-muted-foreground">
                            {athlete.email}
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedType === 'ATHLETE' && selectedId === athlete.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="teams" className="mt-2">
          <ScrollArea className="h-48 rounded-md border">
            {filteredTeams.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Inga lag hittades
              </div>
            ) : (
              <div className="p-1">
                {filteredTeams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => onSelect('TEAM', team.id, team.name)}
                    className={cn(
                      'w-full flex items-center justify-between p-2 rounded-md text-left transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      selectedType === 'TEAM' && selectedId === team.id && 'bg-accent'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{team.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {team.memberCount} medlemmar
                        </p>
                      </div>
                    </div>
                    {selectedType === 'TEAM' && selectedId === team.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
