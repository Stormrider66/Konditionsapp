// app/(business)/[businessSlug]/coach/clients/new/page.tsx
'use client'

import { useCallback, useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { clientSchema, type ClientFormData } from '@/lib/validations/schemas'
import Link from 'next/link'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { useTranslations } from '@/i18n/client'

interface TeamOption {
  id: string
  name: string
}

export default function BusinessNewClientPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const businessSlug = params.businessSlug as string
  const basePath = `/${businessSlug}/coach/clients`
  const prefilledTeamId = searchParams.get('teamId') ?? undefined

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const { toast } = useToast()
  const t = useTranslations('coach.pages.clientNew')

  const fetchTeams = useCallback(async () => {
    try {
      const response = await fetch('/api/teams', {
        headers: { 'x-business-slug': businessSlug },
      })
      const result = await response.json()
      if (result.success) {
        setTeams(result.data || [])
      }
    } catch (err) {
      console.error('Error fetching teams:', err)
    } finally {
      setTeamsLoading(false)
    }
  }, [businessSlug])

  useEffect(() => {
    void fetchTeams()
  }, [fetchTeams])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      gender: 'MALE',
      teamId: prefilledTeamId,
      athleteTier: 'FREE',
    },
  })

  const gender = watch('gender')
  const selectedTeamId = watch('teamId')
  const athleteTier = watch('athleteTier') ?? 'FREE'

  const onSubmit = async (data: ClientFormData) => {
    try {
      setIsSubmitting(true)
      setError(null)

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-business-slug': businessSlug,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        // Credentials are emailed directly — API returns a boolean only.
        toast({
          title: result.athleteAccountCreated
            ? t('toasts.clientAndAccountCreated')
            : t('toasts.clientCreated'),
          description: result.athleteAccountCreated
            ? t('toasts.accountCreatedDescription', { name: data.name, email: data.email ?? '' })
            : t('toasts.clientCreatedDescription', { name: data.name }),
        })
        router.push(`${basePath}/${result.data.id}`)
      } else {
        setError(result.error || t('errors.createFailed'))
        toast({
          title: t('toasts.errorTitle'),
          description: result.error || t('errors.createFailed'),
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error(err)
      setError(t('errors.network'))
      toast({
        title: t('toasts.networkErrorTitle'),
        description: t('errors.retry'),
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 lg:py-12">
      <Card className="dark:bg-slate-900/50 dark:border-white/10">
        <CardHeader>
          <CardTitle className="dark:text-white">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Namn */}
            <div className="space-y-2">
              <Label htmlFor="name" className="dark:text-slate-200">
                {t('fields.name')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder={t('placeholders.name')}
                className="dark:bg-slate-800 dark:border-white/10"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* E-post */}
            <div className="space-y-2">
              <Label htmlFor="email" className="dark:text-slate-200">{t('fields.email')}</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="namn@example.com"
                className="dark:bg-slate-800 dark:border-white/10"
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Telefon */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="dark:text-slate-200">{t('fields.phone')}</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                placeholder="070-123 45 67"
                className="dark:bg-slate-800 dark:border-white/10"
              />
            </div>

            {/* Kön och Födelsedatum */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="gender" className="dark:text-slate-200">
                  {t('fields.gender')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={gender}
                  onValueChange={(value) => setValue('gender', value as 'MALE' | 'FEMALE')}
                >
                  <SelectTrigger id="gender" className="dark:bg-slate-800 dark:border-white/10">
                    <SelectValue placeholder={t('placeholders.gender')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">{t('gender.male')}</SelectItem>
                    <SelectItem value="FEMALE">{t('gender.female')}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && (
                  <p className="text-sm text-red-600">{errors.gender.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate" className="dark:text-slate-200">
                  {t('fields.birthDate')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="birthDate"
                  type="date"
                  {...register('birthDate')}
                  className="dark:bg-slate-800 dark:border-white/10"
                />
                {errors.birthDate && (
                  <p className="text-sm text-red-600">{errors.birthDate.message}</p>
                )}
              </div>
            </div>

            {/* Längd och Vikt */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="height" className="dark:text-slate-200">
                  {t('fields.height')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  {...register('height', { valueAsNumber: true })}
                  placeholder="180"
                  className="dark:bg-slate-800 dark:border-white/10"
                />
                {errors.height && (
                  <p className="text-sm text-red-600">{errors.height.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight" className="dark:text-slate-200">
                  {t('fields.weight')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  {...register('weight', { valueAsNumber: true })}
                  placeholder="75"
                  className="dark:bg-slate-800 dark:border-white/10"
                />
                {errors.weight && (
                  <p className="text-sm text-red-600">{errors.weight.message}</p>
                )}
              </div>
            </div>

            {/* Lag/Klubb */}
            <div className="space-y-2">
              <Label htmlFor="teamId" className="dark:text-slate-200">{t('fields.team')}</Label>
              <Select
                value={selectedTeamId ?? 'none'}
                onValueChange={(value) => setValue('teamId', value === 'none' ? undefined : value)}
              >
                <SelectTrigger id="teamId" disabled={teamsLoading} className="dark:bg-slate-800 dark:border-white/10">
                  <SelectValue placeholder={teamsLoading ? t('placeholders.loadingTeams') : t('placeholders.team')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('team.none')}</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tröjnummer & Position */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="jerseyNumber" className="dark:text-slate-200">{t('fields.jerseyNumber')}</Label>
                <Input
                  id="jerseyNumber"
                  type="number"
                  min={0}
                  max={999}
                  {...register('jerseyNumber', { valueAsNumber: true })}
                  placeholder={t('placeholders.jerseyNumber')}
                  className="dark:bg-slate-800 dark:border-white/10"
                />
                {errors.jerseyNumber && (
                  <p className="text-sm text-red-600">{errors.jerseyNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="position" className="dark:text-slate-200">{t('fields.position')}</Label>
                <Input
                  id="position"
                  type="text"
                  {...register('position')}
                  placeholder={t('placeholders.position')}
                  className="dark:bg-slate-800 dark:border-white/10"
                />
                {errors.position && (
                  <p className="text-sm text-red-600">{errors.position.message}</p>
                )}
              </div>
            </div>

            {/* Prenumerationsnivå (only relevant when an email is provided — drives auto-created athlete account) */}
            <div className="space-y-2">
              <Label htmlFor="athleteTier" className="dark:text-slate-200">
                {t('fields.athleteTier')}
              </Label>
              <Select
                value={athleteTier}
                onValueChange={(value) =>
                  setValue('athleteTier', value as 'FREE' | 'STANDARD' | 'PRO' | 'ELITE')
                }
              >
                <SelectTrigger id="athleteTier" className="dark:bg-slate-800 dark:border-white/10">
                  <SelectValue placeholder={t('placeholders.athleteTier')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">{t('tiers.free')}</SelectItem>
                  <SelectItem value="STANDARD">{t('tiers.standard')}</SelectItem>
                  <SelectItem value="PRO">{t('tiers.pro')}</SelectItem>
                  <SelectItem value="ELITE">{t('tiers.elite')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('athleteTierHelper')}
              </p>
            </div>

            {/* Anteckningar */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="dark:text-slate-200">{t('fields.notes')}</Label>
              <textarea
                id="notes"
                {...register('notes')}
                rows={4}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:border-white/10"
                placeholder={t('placeholders.notes')}
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-4 pt-4">
              <Link href={basePath}>
                <Button type="button" variant="outline">
                  {t('actions.cancel')}
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? t('actions.saving') : t('actions.createClient')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4 space-y-2">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>{t('info.requiredPrefix')}</strong> {t('info.requiredText')} <span className="text-red-500">*</span> {t('info.requiredSuffix')}
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>{t('info.autoAccountPrefix')}</strong> {t('info.autoAccountText')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
