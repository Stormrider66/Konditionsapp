// app/(business)/[businessSlug]/coach/clients/new/page.tsx
'use client'

import { useCallback, useState, useEffect, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClientSchema, type ClientFormData } from '@/lib/validations/schemas'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RolePageFrame, RolePageHeader, RolePanel } from '@/components/layouts/role-shell/RolePage'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'

interface TeamOption {
  id: string
  name: string
}

const labelClassName = 'text-zinc-700 dark:text-zinc-200'
const fieldClassName =
  'border-zinc-200 bg-white text-zinc-950 shadow-sm placeholder:text-zinc-400 focus-visible:ring-blue-500/30 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-50 dark:placeholder:text-zinc-600'
const helperTextClassName = 'text-xs leading-5 text-zinc-500 dark:text-zinc-400'
const errorTextClassName = 'text-sm text-red-600 dark:text-red-400'

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
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const formSchema = useMemo(() => createClientSchema(locale), [locale])

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
    control,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gender: 'MALE',
      teamId: prefilledTeamId,
      athleteTier: 'FREE',
    },
  })

  const gender = useWatch({ control, name: 'gender' })
  const selectedTeamId = useWatch({ control, name: 'teamId' })
  const athleteTier = useWatch({ control, name: 'athleteTier' }) ?? 'FREE'

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
    <RolePageFrame contentClassName="max-w-4xl">
      <RolePageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
        actions={
          <Button
            variant="outline"
            className="border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-200 dark:hover:bg-white/5"
            asChild
          >
            <Link href={basePath}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('actions.cancel')}
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <RolePanel className="p-5 sm:p-6">
          <div className="mb-5 border-b border-zinc-200 pb-4 dark:border-white/10">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              {t('sections.profileTitle')}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {t('sections.profileDescription')}
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name" className={labelClassName}>
                  {t('fields.name')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder={t('placeholders.name')}
                  className={fieldClassName}
                />
                {errors.name && (
                  <p className={errorTextClassName}>{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className={labelClassName}>{t('fields.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="namn@example.com"
                  className={fieldClassName}
                />
                {errors.email && (
                  <p className={errorTextClassName}>{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className={labelClassName}>{t('fields.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register('phone')}
                  placeholder="070-123 45 67"
                  className={fieldClassName}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gender" className={labelClassName}>
                  {t('fields.gender')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={gender}
                  onValueChange={(value) => setValue('gender', value as 'MALE' | 'FEMALE')}
                >
                  <SelectTrigger id="gender" className={fieldClassName}>
                    <SelectValue placeholder={t('placeholders.gender')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">{t('gender.male')}</SelectItem>
                    <SelectItem value="FEMALE">{t('gender.female')}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && (
                  <p className={errorTextClassName}>{errors.gender.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate" className={labelClassName}>
                  {t('fields.birthDate')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="birthDate"
                  type="date"
                  {...register('birthDate')}
                  className={fieldClassName}
                />
                {errors.birthDate && (
                  <p className={errorTextClassName}>{errors.birthDate.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="height" className={labelClassName}>
                  {t('fields.height')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  {...register('height', { valueAsNumber: true })}
                  placeholder="180"
                  className={fieldClassName}
                />
                {errors.height && (
                  <p className={errorTextClassName}>{errors.height.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight" className={labelClassName}>
                  {t('fields.weight')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  {...register('weight', { valueAsNumber: true })}
                  placeholder="75"
                  className={fieldClassName}
                />
                {errors.weight && (
                  <p className={errorTextClassName}>{errors.weight.message}</p>
                )}
              </div>
            </div>
          </div>
        </RolePanel>

        <RolePanel className="p-5 sm:p-6">
          <div className="mb-5 border-b border-zinc-200 pb-4 dark:border-white/10">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              {t('sections.teamTitle')}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {t('sections.teamDescription')}
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="teamId" className={labelClassName}>{t('fields.team')}</Label>
              <Select
                value={selectedTeamId ?? 'none'}
                onValueChange={(value) => setValue('teamId', value === 'none' ? undefined : value)}
              >
                <SelectTrigger id="teamId" disabled={teamsLoading} className={fieldClassName}>
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

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jerseyNumber" className={labelClassName}>{t('fields.jerseyNumber')}</Label>
                <Input
                  id="jerseyNumber"
                  type="number"
                  min={0}
                  max={999}
                  {...register('jerseyNumber', { valueAsNumber: true })}
                  placeholder={t('placeholders.jerseyNumber')}
                  className={fieldClassName}
                />
                {errors.jerseyNumber && (
                  <p className={errorTextClassName}>{errors.jerseyNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="position" className={labelClassName}>{t('fields.position')}</Label>
                <Input
                  id="position"
                  type="text"
                  {...register('position')}
                  placeholder={t('placeholders.position')}
                  className={fieldClassName}
                />
                {errors.position && (
                  <p className={errorTextClassName}>{errors.position.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="athleteTier" className={labelClassName}>
                {t('fields.athleteTier')}
              </Label>
              <Select
                value={athleteTier}
                onValueChange={(value) =>
                  setValue('athleteTier', value as 'FREE' | 'STANDARD' | 'PRO' | 'ELITE')
                }
              >
                <SelectTrigger id="athleteTier" className={fieldClassName}>
                  <SelectValue placeholder={t('placeholders.athleteTier')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">{t('tiers.free')}</SelectItem>
                  <SelectItem value="STANDARD">{t('tiers.standard')}</SelectItem>
                  <SelectItem value="PRO">{t('tiers.pro')}</SelectItem>
                  <SelectItem value="ELITE">{t('tiers.elite')}</SelectItem>
                </SelectContent>
              </Select>
              <p className={helperTextClassName}>
                {t('athleteTierHelper')}
              </p>
            </div>
          </div>
        </RolePanel>

        <RolePanel className="p-5 sm:p-6">
          <div className="mb-5 border-b border-zinc-200 pb-4 dark:border-white/10">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              {t('sections.notesTitle')}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {t('sections.notesDescription')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className={labelClassName}>{t('fields.notes')}</Label>
            <textarea
              id="notes"
              {...register('notes')}
              rows={4}
              className={`flex min-h-[110px] w-full rounded-md border px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${fieldClassName}`}
              placeholder={t('placeholders.notes')}
            />
          </div>
        </RolePanel>

        <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 pt-5 dark:border-white/10 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-200 dark:hover:bg-white/5"
            asChild
          >
            <Link href={basePath}>
              {t('actions.cancel')}
            </Link>
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white hover:bg-blue-700">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? t('actions.saving') : t('actions.createClient')}
          </Button>
        </div>
      </form>

      <RolePanel className="mt-5 border-blue-100 bg-blue-50/80 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
        <div className="space-y-2 text-sm leading-6 text-blue-900 dark:text-blue-200">
          <p>
            <strong>{t('info.requiredPrefix')}</strong> {t('info.requiredText')} <span className="text-red-500">*</span> {t('info.requiredSuffix')}
          </p>
          <p>
            <strong>{t('info.autoAccountPrefix')}</strong> {t('info.autoAccountText')}
          </p>
        </div>
      </RolePanel>
    </RolePageFrame>
  )
}
