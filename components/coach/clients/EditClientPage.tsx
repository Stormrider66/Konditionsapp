'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClientSchema, type ClientFormData } from '@/lib/validations/schemas'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
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
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import type { Client, Team } from '@/types'
import { useLocale } from '@/i18n/client'

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  fetchError: string
  networkError: string
  updateError: string
  updatedTitle: string
  updatedDescription: (name: string) => string
  errorTitle: string
  networkErrorTitle: string
  alertPrefix: string
  cardTitle: string
  name: string
  namePlaceholder: string
  email: string
  phone: string
  gender: string
  genderPlaceholder: string
  male: string
  female: string
  birthDate: string
  height: string
  heightPlaceholder: string
  weight: string
  weightPlaceholder: string
  team: string
  loadingTeams: string
  teamPlaceholder: string
  noTeam: string
  notes: string
  notesPlaceholder: string
  cancel: string
  saving: string
  save: string
}> = {
  en: {
    fetchError: 'Failed to fetch client',
    networkError: 'Network error',
    updateError: 'Could not update client.',
    updatedTitle: 'Client updated!',
    updatedDescription: (name) => `${name} has been updated.`,
    errorTitle: 'Error',
    networkErrorTitle: 'Network error',
    alertPrefix: 'Error',
    cardTitle: 'Client information',
    name: 'Name *',
    namePlaceholder: 'First and last name',
    email: 'Email',
    phone: 'Phone',
    gender: 'Gender *',
    genderPlaceholder: 'Select gender',
    male: 'Male',
    female: 'Female',
    birthDate: 'Birth date *',
    height: 'Height (cm) *',
    heightPlaceholder: 'e.g. 175',
    weight: 'Weight (kg) *',
    weightPlaceholder: 'e.g. 70',
    team: 'Team/Club',
    loadingTeams: 'Loading teams...',
    teamPlaceholder: 'Select team (optional)',
    noTeam: 'No team',
    notes: 'Notes',
    notesPlaceholder: 'Optional notes about the client...',
    cancel: 'Cancel',
    saving: 'Saving...',
    save: 'Save changes',
  },
  sv: {
    fetchError: 'Kunde inte hämta klient',
    networkError: 'Nätverksfel',
    updateError: 'Kunde inte uppdatera klienten.',
    updatedTitle: 'Klient uppdaterad!',
    updatedDescription: (name) => `${name} har uppdaterats.`,
    errorTitle: 'Fel',
    networkErrorTitle: 'Nätverksfel',
    alertPrefix: 'Fel',
    cardTitle: 'Klientinformation',
    name: 'Namn *',
    namePlaceholder: 'För- och efternamn',
    email: 'E-post',
    phone: 'Telefon',
    gender: 'Kön *',
    genderPlaceholder: 'Välj kön',
    male: 'Man',
    female: 'Kvinna',
    birthDate: 'Födelsedatum *',
    height: 'Längd (cm) *',
    heightPlaceholder: 't.ex. 175',
    weight: 'Vikt (kg) *',
    weightPlaceholder: 't.ex. 70',
    team: 'Lag/Klubb',
    loadingTeams: 'Laddar lag...',
    teamPlaceholder: 'Välj lag (valfritt)',
    noTeam: 'Inget lag',
    notes: 'Anteckningar',
    notesPlaceholder: 'Valfria anteckningar om klienten...',
    cancel: 'Avbryt',
    saving: 'Sparar...',
    save: 'Spara ändringar',
  },
}

export default function EditClientPage() {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const formSchema = useMemo(() => createClientSchema(locale), [locale])
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const businessSlug = params.businessSlug as string | undefined
  const basePath = businessSlug ? `/${businessSlug}/coach` : ''
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(formSchema),
  })

  const gender = watch('gender')
  const selectedTeamId = watch('teamId')

  const fetchClient = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${id}`, {
        headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
      })
      const result = await response.json()

      if (result.success) {
        const client: Client = result.data
        // Populate form with client data
        reset({
          name: client.name,
          email: client.email || '',
          phone: client.phone || '',
          gender: client.gender,
          birthDate: new Date(client.birthDate).toISOString().split('T')[0],
          height: client.height,
          weight: client.weight,
          notes: client.notes || '',
          teamId: client.teamId || '',
        })
      } else {
        setError(result.error || copy.fetchError)
      }
    } catch (err) {
      console.error(err)
      setError(copy.networkError)
    } finally {
      setLoading(false)
    }
  }, [businessSlug, copy.fetchError, copy.networkError, id, reset])

  const fetchTeams = useCallback(async () => {
    try {
      const response = await fetch('/api/teams', {
        headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
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
    const supabase = createSupabaseClient()
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    void fetchClient()
    void fetchTeams()
  }, [fetchClient, fetchTeams])

  const onSubmit = async (data: ClientFormData) => {
    try {
      setIsSubmitting(true)
      setError(null)

      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: copy.updatedTitle,
          description: copy.updatedDescription(data.name),
        })
        router.push(`${basePath}/clients/${id}`)
      } else {
        setError(result.error || copy.updateError)
        toast({
          title: copy.errorTitle,
          description: result.error || copy.updateError,
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error(err)
      setError(copy.networkError)
      toast({
        title: copy.networkErrorTitle,
        description: copy.networkError,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-6 lg:py-12">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{copy.alertPrefix}: {error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{copy.cardTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">{copy.name}</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder={copy.namePlaceholder}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{copy.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="exempel@email.com"
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{copy.phone}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    placeholder="070-123 45 67"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">{copy.gender}</Label>
                  <Select
                    value={gender}
                    onValueChange={(value) => setValue('gender', value as 'MALE' | 'FEMALE')}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder={copy.genderPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">{copy.male}</SelectItem>
                      <SelectItem value="FEMALE">{copy.female}</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-sm text-red-500">{errors.gender.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate">{copy.birthDate}</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    {...register('birthDate')}
                    className={errors.birthDate ? 'border-red-500' : ''}
                  />
                  {errors.birthDate && (
                    <p className="text-sm text-red-500">{errors.birthDate.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">{copy.height}</Label>
                  <Input
                    id="height"
                    type="number"
                    {...register('height', { valueAsNumber: true })}
                    placeholder={copy.heightPlaceholder}
                    className={errors.height ? 'border-red-500' : ''}
                  />
                  {errors.height && (
                    <p className="text-sm text-red-500">{errors.height.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">{copy.weight}</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    {...register('weight', { valueAsNumber: true })}
                    placeholder={copy.weightPlaceholder}
                    className={errors.weight ? 'border-red-500' : ''}
                  />
                  {errors.weight && (
                    <p className="text-sm text-red-500">{errors.weight.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamId">{copy.team}</Label>
                <Select
                  value={selectedTeamId || 'none'}
                  onValueChange={(value) => setValue('teamId', value === 'none' ? undefined : value)}
                >
                  <SelectTrigger id="teamId" disabled={teamsLoading}>
                    <SelectValue placeholder={teamsLoading ? copy.loadingTeams : copy.teamPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{copy.noTeam}</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{copy.notes}</Label>
                <textarea
                  id="notes"
                  {...register('notes')}
                  rows={4}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={copy.notesPlaceholder}
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <Link href={`${basePath}/clients/${id}`}>
                  <Button type="button" variant="outline">
                    {copy.cancel}
                  </Button>
                </Link>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {copy.saving}
                    </>
                  ) : (
                    copy.save
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
