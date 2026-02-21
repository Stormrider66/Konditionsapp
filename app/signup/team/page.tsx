'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Users, User, Mail, Lock, MapPin, Trophy, Check } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

const SPORTS = [
  { value: 'RUNNING', label: 'Löpning' },
  { value: 'CYCLING', label: 'Cykling' },
  { value: 'SKIING', label: 'Längdskidåkning' },
  { value: 'SWIMMING', label: 'Simning' },
  { value: 'TRIATHLON', label: 'Triathlon' },
  { value: 'TEAM_FOOTBALL', label: 'Fotboll' },
  { value: 'TEAM_ICE_HOCKEY', label: 'Ishockey' },
  { value: 'TEAM_HANDBALL', label: 'Handboll' },
  { value: 'TEAM_FLOORBALL', label: 'Innebandy' },
  { value: 'TEAM_BASKETBALL', label: 'Basket' },
  { value: 'TEAM_VOLLEYBALL', label: 'Volleyboll' },
  { value: 'HYROX', label: 'HYROX' },
  { value: 'GENERAL_FITNESS', label: 'Allmän fitness' },
  { value: 'TENNIS', label: 'Tennis' },
  { value: 'PADEL', label: 'Padel' },
]

const teamSchema = z.object({
  businessName: z.string().min(2, 'Club name is required'),
  primarySport: z.string().min(1, 'Primary sport is required'),
  name: z.string().min(2, 'Contact person name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  city: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type TeamFormData = z.infer<typeof teamSchema>

const TEAM_FEATURES = [
  'Laghantering med atletportal',
  'Träningsprogram för hela laget',
  'Prestationsuppföljning',
  '14 dagars gratis provperiod',
]

export default function TeamSignupPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
  })

  const onSubmit = async (data: TeamFormData) => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/signup-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          businessName: data.businessName,
          businessType: 'CLUB',
          city: data.city || undefined,
          primarySport: data.primarySport,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast({
          title: t('registrationFailed'),
          description: result.error || t('couldNotCreateAccount'),
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Föreningskonto skapat!',
        description: 'Välkommen! Du har nu en 14-dagars provperiod.',
      })

      router.push(result.redirectUrl || '/')
      router.refresh()
    } catch {
      toast({
        title: t('errorOccurred'),
        description: t('couldNotCreateAccount'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center px-4 py-8">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher showLabel={false} />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-2">
            <Users className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Registrera din förening</CardTitle>
          <CardDescription>
            Skapa ett konto för ditt lag eller din förening
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* What's included */}
          <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-100">
            <p className="text-sm font-medium text-orange-800 mb-2">Vad ingår</p>
            <ul className="space-y-1.5">
              {TEAM_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-orange-700">
                  <Check className="h-4 w-4 text-orange-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="businessName" className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Föreningsnamn
              </label>
              <input
                id="businessName"
                type="text"
                className={`flex h-10 w-full rounded-md border ${errors.businessName ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                placeholder="T.ex. IFK Löparna"
                {...register('businessName')}
                disabled={isLoading}
              />
              {errors.businessName && <p className="text-sm text-red-500">{errors.businessName.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="primarySport" className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                Primär sport
              </label>
              <select
                id="primarySport"
                className={`flex h-10 w-full rounded-md border ${errors.primarySport ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                {...register('primarySport')}
                disabled={isLoading}
              >
                <option value="">Välj sport</option>
                {SPORTS.map((sport) => (
                  <option key={sport.value} value={sport.value}>{sport.label}</option>
                ))}
              </select>
              {errors.primarySport && <p className="text-sm text-red-500">{errors.primarySport.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Kontaktperson
              </label>
              <input
                id="name"
                type="text"
                className={`flex h-10 w-full rounded-md border ${errors.name ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                placeholder={t('namePlaceholder')}
                {...register('name')}
                disabled={isLoading}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {t('emailLabel')}
              </label>
              <input
                id="email"
                type="email"
                className={`flex h-10 w-full rounded-md border ${errors.email ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                placeholder={t('emailPlaceholder')}
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="city" className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Stad (valfritt)
              </label>
              <input
                id="city"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Stockholm"
                {...register('city')}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                {t('passwordLabel')}
              </label>
              <input
                id="password"
                type="password"
                className={`flex h-10 w-full rounded-md border ${errors.password ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                placeholder={t('minCharacters', { count: 8 })}
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                {t('confirmPasswordLabel')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                className={`flex h-10 w-full rounded-md border ${errors.confirmPassword ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                placeholder={t('repeatPassword')}
                {...register('confirmPassword')}
                disabled={isLoading}
              />
              {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Skapar föreningskonto...
                </>
              ) : (
                'Skapa föreningskonto'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            {t('hasAccount')}{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              {t('signInLink')}
            </Link>
          </div>
          <div className="text-xs text-center text-muted-foreground">
            <Link href="/signup" className="text-blue-600 hover:underline">
              Tillbaka till val av kontotyp
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
