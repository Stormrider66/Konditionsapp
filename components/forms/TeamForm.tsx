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
import { useTranslations } from '@/i18n/client'
import type { Team } from '@/types'

interface Organization {
  id: string
  name: string
}

interface TeamFormProps {
  team?: Team
  businessSlug?: string
  onSuccess?: (team: Team) => void
  onCancel?: () => void
}

export function TeamForm({ team, businessSlug, onSuccess, onCancel }: TeamFormProps) {
  const t = useTranslations('components.teamForm')
  const tSports = useTranslations('sports')
  const sportTypeOptions = [
    { value: 'TEAM_FOOTBALL', label: tSports('football') },
    { value: 'TEAM_ICE_HOCKEY', label: tSports('iceHockey') },
    { value: 'TEAM_HANDBALL', label: tSports('handball') },
    { value: 'TEAM_FLOORBALL', label: tSports('floorball') },
    { value: 'TEAM_BASKETBALL', label: tSports('basketball') },
    { value: 'TEAM_VOLLEYBALL', label: tSports('volleyball') },
    { value: 'TENNIS', label: tSports('tennis') },
    { value: 'PADEL', label: tSports('padel') },
  ]
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
        const response = await fetch('/api/organizations', {
          headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
        })
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
    void fetchOrganizations()
  }, [businessSlug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        title: t('toasts.error.title'),
        description: t('validation.nameRequired'),
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
          ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
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
        throw new Error(result.error || t('errors.unknown'))
      }

      toast({
        title: t('toasts.success.title'),
        description: team ? t('toasts.success.updated') : t('toasts.success.created'),
      })

      if (onSuccess) {
        onSuccess(result.data)
      }
    } catch (error) {
      toast({
        title: t('toasts.error.title'),
        description: error instanceof Error ? error.message : t('errors.unknown'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{team ? t('title.edit') : t('title.create')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('fields.name.label')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('fields.name.placeholder')}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('fields.description.label')}</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('fields.description.placeholder')}
              rows={3}
              disabled={isLoading}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization">{t('fields.organization.label')}</Label>
            <Select
              value={organizationId}
              onValueChange={setOrganizationId}
              disabled={isLoading || loadingOrgs}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('fields.organization.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('fields.organization.noSelection')}</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sportType">{t('fields.sport.label')}</Label>
            <Select
              value={sportType}
              onValueChange={setSportType}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('fields.sport.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('fields.sport.noSelection')}</SelectItem>
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
              {isLoading
                ? t('actions.saving')
                : team
                  ? t('actions.update')
                  : t('actions.create')}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                {t('actions.cancel')}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
