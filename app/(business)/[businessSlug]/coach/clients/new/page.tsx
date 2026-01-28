// app/(business)/[businessSlug]/coach/clients/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

export default function BusinessNewClientPage() {
  const router = useRouter()
  const params = useParams()
  const businessSlug = params.businessSlug as string
  const basePath = `/${businessSlug}/coach/clients`

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teams, setTeams] = useState<any[]>([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [athleteCredentials, setAthleteCredentials] = useState<{
    email: string
    temporaryPassword: string
  } | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      const result = await response.json()
      if (result.success) {
        setTeams(result.data || [])
      }
    } catch (err) {
      console.error('Error fetching teams:', err)
    } finally {
      setTeamsLoading(false)
    }
  }

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
    },
  })

  const gender = watch('gender')

  const onSubmit = async (data: ClientFormData) => {
    try {
      setIsSubmitting(true)
      setError(null)

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        if (result.athleteCredentials) {
          setAthleteCredentials(result.athleteCredentials)
          toast({
            title: 'Klient och atlet-konto skapat!',
            description: `${data.name} har lagts till. Atlet-lösenord är: ${result.athleteCredentials.temporaryPassword}`,
            duration: 10000,
          })
        } else {
          toast({
            title: 'Klient skapad!',
            description: `${data.name} har lagts till i klientregistret.`,
          })
        }

        if (result.athleteCredentials) {
          await new Promise((resolve) => setTimeout(resolve, 5000))
        }

        router.push(`${basePath}/${result.data.id}`)
      } else {
        setError(result.error || 'Failed to create client')
        toast({
          title: 'Fel',
          description: result.error || 'Kunde inte skapa klienten.',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error(err)
      setError('Network error')
      toast({
        title: 'Nätverksfel',
        description: 'Något gick fel. Försök igen.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 lg:py-12">
      {/* Athlete Credentials Alert */}
      {athleteCredentials && (
        <Card className="mb-6 bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-300 flex items-center gap-2">
              Atlet-konto skapat automatiskt!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-white dark:bg-slate-900 border-green-200 dark:border-green-800">
              <AlertDescription>
                <p className="mb-3 font-semibold dark:text-slate-200">Logga in med dessa uppgifter:</p>
                <div className="space-y-2 font-mono text-sm bg-gray-50 dark:bg-slate-800 p-3 rounded">
                  <div>
                    <span className="text-muted-foreground">E-post:</span>{' '}
                    <span className="font-bold dark:text-slate-200">{athleteCredentials.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lösenord:</span>{' '}
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {athleteCredentials.temporaryPassword}
                    </span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              Spara dessa uppgifter! De visas bara en gång.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="dark:bg-slate-900/50 dark:border-white/10">
        <CardHeader>
          <CardTitle className="dark:text-white">Ny Klient</CardTitle>
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
                Namn <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Förnamn Efternamn"
                className="dark:bg-slate-800 dark:border-white/10"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* E-post */}
            <div className="space-y-2">
              <Label htmlFor="email" className="dark:text-slate-200">E-post</Label>
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
              <Label htmlFor="phone" className="dark:text-slate-200">Telefon</Label>
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
                  Kön <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={gender}
                  onValueChange={(value) => setValue('gender', value as 'MALE' | 'FEMALE')}
                >
                  <SelectTrigger id="gender" className="dark:bg-slate-800 dark:border-white/10">
                    <SelectValue placeholder="Välj kön" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Man</SelectItem>
                    <SelectItem value="FEMALE">Kvinna</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && (
                  <p className="text-sm text-red-600">{errors.gender.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate" className="dark:text-slate-200">
                  Födelsedatum <span className="text-red-500">*</span>
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
                  Längd (cm) <span className="text-red-500">*</span>
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
                  Vikt (kg) <span className="text-red-500">*</span>
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
              <Label htmlFor="teamId" className="dark:text-slate-200">Lag/Klubb</Label>
              <Select
                onValueChange={(value) => setValue('teamId', value === 'none' ? undefined : value)}
              >
                <SelectTrigger id="teamId" disabled={teamsLoading} className="dark:bg-slate-800 dark:border-white/10">
                  <SelectValue placeholder={teamsLoading ? 'Laddar lag...' : 'Välj lag (valfritt)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Inget lag</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Anteckningar */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="dark:text-slate-200">Anteckningar</Label>
              <textarea
                id="notes"
                {...register('notes')}
                rows={4}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:border-white/10"
                placeholder="Valfria anteckningar om klienten..."
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-4 pt-4">
              <Link href={basePath}>
                <Button type="button" variant="outline">
                  Avbryt
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Sparar...' : 'Skapa Klient'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4 space-y-2">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Info:</strong> Alla fält markerade med <span className="text-red-500">*</span> är obligatoriska.
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Automatiskt atlet-konto:</strong> Om du anger en e-postadress skapas ett atlet-konto automatiskt med inloggningsuppgifter som visas efter att klienten skapats.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
