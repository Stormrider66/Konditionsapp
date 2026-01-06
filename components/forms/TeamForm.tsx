'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import type { Team } from '@/types'

interface Organization {
  id: string
  name: string
}

interface TeamFormProps {
  team?: Team
  onSuccess?: (team: Team) => void
  onCancel?: () => void
}

// Sport type options
const sportTypeOptions = [
  { value: 'TEAM_FOOTBALL', label: 'Fotboll' },
  { value: 'TEAM_ICE_HOCKEY', label: 'Ishockey' },
  { value: 'TEAM_HANDBALL', label: 'Handboll' },
  { value: 'TEAM_FLOORBALL', label: 'Innebandy' },
]

export function TeamForm({ team, onSuccess, onCancel }: TeamFormProps) {
  const [name, setName] = useState(team?.name || '')
  const [description, setDescription] = useState(team?.description || '')
  const [organizationId, setOrganizationId] = useState<string>(
    (team as Team & { organizationId?: string })?.organizationId || 'none'
  )
  const [sportType, setSportType] = useState<string>(
    (team as Team & { sportType?: string })?.sportType || 'none'
  )
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const response = await fetch('/api/organizations')
        const result = await response.json()
        if (result.success) {
          setOrganizations(result.data || [])
        }
      } catch (error) {
        console.error('Error fetching organizations:', error)
      } finally {
        setLoadingOrgs(false)
      }
    }
    fetchOrganizations()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        title: 'Fel',
        description: 'Laget måste ha ett namn',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const url = team ? `/api/teams/${team.id}` : '/api/teams'
      const method = team ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          organizationId: organizationId === 'none' ? undefined : organizationId,
          sportType: sportType === 'none' ? undefined : sportType,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Något gick fel')
      }

      toast({
        title: 'Framgång!',
        description: team ? 'Laget har uppdaterats' : 'Laget har skapats',
      })

      if (onSuccess) {
        onSuccess(result.data)
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Något gick fel',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{team ? 'Redigera lag' : 'Skapa nytt lag'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Lagnamn *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="T.ex. Träningsgrupp A"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivning</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Valfri beskrivning av laget"
              rows={3}
              disabled={isLoading}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization">Organisation</Label>
            <Select
              value={organizationId}
              onValueChange={setOrganizationId}
              disabled={isLoading || loadingOrgs}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj organisation (valfritt)..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ingen organisation</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sportType">Sport</Label>
            <Select
              value={sportType}
              onValueChange={setSportType}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj sport (valfritt)..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ingen sport vald</SelectItem>
                {sportTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Sparar...' : team ? 'Uppdatera lag' : 'Skapa lag'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Avbryt
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
