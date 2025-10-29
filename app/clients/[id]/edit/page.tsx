'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
import { ArrowLeft, Loader2 } from 'lucide-react'
import { MobileNav } from '@/components/navigation/MobileNav'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import type { Client, Team } from '@/types'

export default function EditClientPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
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
    resolver: zodResolver(clientSchema),
  })

  const gender = watch('gender')
  const selectedTeamId = watch('teamId')

  useEffect(() => {
    const supabase = createSupabaseClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    fetchClient()
    fetchTeams()
  }, [id])

  const fetchClient = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${id}`)
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
        setError(result.error || 'Failed to fetch client')
      }
    } catch (err) {
      console.error(err)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

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

  const onSubmit = async (data: ClientFormData) => {
    try {
      setIsSubmitting(true)
      setError(null)

      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Klient uppdaterad!',
          description: `${data.name} har uppdaterats.`,
        })
        router.push(`/clients/${id}`)
      } else {
        setError(result.error || 'Failed to update client')
        toast({
          title: 'Fel',
          description: result.error || 'Kunde inte uppdatera klienten.',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav user={user} />

      {/* Mobile Header */}
      <div className="lg:hidden gradient-primary text-white shadow-lg py-4 px-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Redigera Klient</h1>
            <p className="text-white/90 text-sm mt-1">Uppdatera klientinformation</p>
          </div>
          <Link href={`/clients/${id}`}>
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block gradient-primary text-white shadow-lg py-6 px-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Redigera Klient</h1>
            <p className="text-white/90 mt-1">Uppdatera klientinformation</p>
          </div>
          <Link href={`/clients/${id}`}>
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka
            </Button>
          </Link>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6 lg:py-12">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>Fel: {error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Klientinformation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Namn */}
              <div className="space-y-2">
                <Label htmlFor="name">Namn *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="För- och efternamn"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              {/* E-post och Telefon */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-post</Label>
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
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    placeholder="070-123 45 67"
                  />
                </div>
              </div>

              {/* Kön och Födelsedatum */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Kön *</Label>
                  <Select
                    value={gender}
                    onValueChange={(value) => setValue('gender', value as 'MALE' | 'FEMALE')}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Välj kön" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Man</SelectItem>
                      <SelectItem value="FEMALE">Kvinna</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-sm text-red-500">{errors.gender.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate">Födelsedatum *</Label>
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

              {/* Längd och Vikt */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Längd (cm) *</Label>
                  <Input
                    id="height"
                    type="number"
                    {...register('height', { valueAsNumber: true })}
                    placeholder="t.ex. 175"
                    className={errors.height ? 'border-red-500' : ''}
                  />
                  {errors.height && (
                    <p className="text-sm text-red-500">{errors.height.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Vikt (kg) *</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    {...register('weight', { valueAsNumber: true })}
                    placeholder="t.ex. 70"
                    className={errors.weight ? 'border-red-500' : ''}
                  />
                  {errors.weight && (
                    <p className="text-sm text-red-500">{errors.weight.message}</p>
                  )}
                </div>
              </div>

              {/* Lag/Klubb */}
              <div className="space-y-2">
                <Label htmlFor="teamId">Lag/Klubb</Label>
                <Select
                  value={selectedTeamId || 'none'}
                  onValueChange={(value) => setValue('teamId', value === 'none' ? undefined : value)}
                >
                  <SelectTrigger id="teamId" disabled={teamsLoading}>
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
                <Label htmlFor="notes">Anteckningar</Label>
                <textarea
                  id="notes"
                  {...register('notes')}
                  rows={4}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Valfria anteckningar om klienten..."
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <Link href={`/clients/${id}`}>
                  <Button type="button" variant="outline">
                    Avbryt
                  </Button>
                </Link>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sparar...
                    </>
                  ) : (
                    'Spara ändringar'
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
