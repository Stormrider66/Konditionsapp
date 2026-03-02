'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Gift, CheckCircle2, User, Building2, Search, X, Dumbbell } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  createAthleteProfile: z.boolean(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  birthDate: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => {
  if (data.createAthleteProfile) {
    return data.gender && data.birthDate && data.height && data.weight
  }
  return true
}, {
  message: 'All athlete profile fields are required',
  path: ['gender'],
})

type RegisterFormData = z.infer<typeof registerSchema>

interface ReferralInfo {
  code: string
  referrerName: string
  benefit: string
}

function CoachSignupForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null)
  const [referralValidated, setReferralValidated] = useState(false)
  const [invitationInfo, setInvitationInfo] = useState<{ code: string; businessName: string } | null>(null)

  // Gym join state
  const [gymSearch, setGymSearch] = useState('')
  const [gymResults, setGymResults] = useState<Array<{ id: string; name: string; city: string | null; type: string }>>([])
  const [selectedGym, setSelectedGym] = useState<{ id: string; name: string } | null>(null)
  const [searchingGyms, setSearchingGyms] = useState(false)

  useEffect(() => {
    const refCode = searchParams.get('ref')
    if (refCode && !referralValidated) {
      validateReferralCode(refCode)
    }
  }, [searchParams, referralValidated])

  // Check for business invitation
  useEffect(() => {
    const invitationCode = searchParams.get('invitation')
    if (invitationCode) {
      fetch(`/api/business/invitations/validate?code=${encodeURIComponent(invitationCode)}`)
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setInvitationInfo({ code: invitationCode, businessName: data.businessName || 'ett team' })
          }
        })
        .catch(() => {
          // Invitation may still be valid, keep the code for acceptance
          setInvitationInfo({ code: invitationCode, businessName: 'ett team' })
        })
    }
  }, [searchParams])

  const validateReferralCode = async (code: string) => {
    try {
      const response = await fetch('/api/referrals/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await response.json()
      if (data.success && data.valid) {
        setReferralInfo({
          code: data.data.code,
          referrerName: data.data.referrerName,
          benefit: data.data.benefit,
        })
      }
      setReferralValidated(true)
    } catch {
      setReferralValidated(true)
    }
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { createAthleteProfile: false },
  })

  const createAthleteProfile = watch('createAthleteProfile')

  const searchGyms = async (query: string) => {
    setGymSearch(query)
    if (query.length < 2) {
      setGymResults([])
      return
    }
    setSearchingGyms(true)
    try {
      const response = await fetch(`/api/businesses/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      setGymResults(data.businesses || [])
    } catch {
      setGymResults([])
    } finally {
      setSearchingGyms(false)
    }
  }

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)

    try {
      const supabase = createClient()

      if (referralInfo) {
        try {
          await fetch('/api/referrals/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: referralInfo.code, email: data.email }),
          })
        } catch {
          // Non-blocking
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { name: data.name } },
      })

      if (authError) {
        toast({
          title: t('registrationFailed'),
          description: authError.message,
          variant: 'destructive',
        })
        return
      }

      if (authData.user) {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            createAthleteProfile: data.createAthleteProfile,
            ...(data.createAthleteProfile && {
              gender: data.gender,
              birthDate: data.birthDate,
              height: parseFloat(data.height || '0'),
              weight: parseFloat(data.weight || '0'),
            }),
          }),
        })

        if (!response.ok) {
          console.warn('Could not create user in database')
        }

        // Accept business invitation if present
        const invitationCode = searchParams.get('invitation')
        let acceptedBusiness: { slug: string } | null = null
        if (invitationCode) {
          try {
            const acceptRes = await fetch('/api/business/invitations/accept', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: invitationCode }),
            })
            const acceptData = await acceptRes.json()
            if (acceptData.success && acceptData.business?.slug) {
              acceptedBusiness = { slug: acceptData.business.slug }
            }
          } catch {
            // Non-blocking - user can accept later
          }
        }

        if (selectedGym && !acceptedBusiness) {
          try {
            await fetch(`/api/business/${selectedGym.id}/join-requests`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: `New coach registration: ${data.name}` }),
            })
          } catch {
            // Non-blocking
          }
        }

        if (referralInfo) {
          try {
            await fetch('/api/referrals/apply', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
            })
          } catch {
            // Non-blocking
          }
        }

        toast({
          title: t('welcomeMessage'),
          description: referralInfo ? t('accountCreatedWithReferral') : t('accountCreatedSuccess'),
        })

        // Redirect to business if invitation was accepted, otherwise home
        if (acceptedBusiness) {
          router.push(`/${acceptedBusiness.slug}/coach`)
        } else {
          router.push('/')
        }
        router.refresh()
      }
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
    <>
      {/* Business Invitation Banner */}
      {invitationInfo && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-t-lg -mt-6 -mx-6 mb-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <div className="flex-1">
              <p className="font-medium text-sm">
                Du har blivit inbjuden till {invitationInfo.businessName}
              </p>
              <p className="text-xs opacity-90">
                <CheckCircle2 className="h-3 w-3 inline mr-1" />
                Skapa ditt konto för att gå med i teamet
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Referral Banner */}
      {referralInfo && (
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-3 rounded-t-lg -mt-6 -mx-6 mb-6">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            <div className="flex-1">
              <p className="font-medium text-sm">
                {t('referredBy', { name: referralInfo.referrerName })}
              </p>
              <p className="text-xs opacity-90">
                <CheckCircle2 className="h-3 w-3 inline mr-1" />
                {referralInfo.benefit}
              </p>
            </div>
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
              {referralInfo.code}
            </Badge>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">{t('nameLabel')}</label>
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
          <label htmlFor="email" className="text-sm font-medium">{t('emailLabel')}</label>
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
          <label htmlFor="password" className="text-sm font-medium">{t('passwordLabel')}</label>
          <input
            id="password"
            type="password"
            className={`flex h-10 w-full rounded-md border ${errors.password ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            placeholder={t('passwordPlaceholder')}
            {...register('password')}
            disabled={isLoading}
          />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">{t('confirmPasswordLabel')}</label>
          <input
            id="confirmPassword"
            type="password"
            className={`flex h-10 w-full rounded-md border ${errors.confirmPassword ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            placeholder={t('passwordPlaceholder')}
            {...register('confirmPassword')}
            disabled={isLoading}
          />
          {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
        </div>

        {/* Athlete Profile Option */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="createAthleteProfile"
              checked={createAthleteProfile}
              onCheckedChange={(checked) => setValue('createAthleteProfile', checked === true)}
              disabled={isLoading}
            />
            <label htmlFor="createAthleteProfile" className="text-sm font-medium cursor-pointer flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('alsoUseAsAthlete') || 'I also want to use the app as an athlete'}
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('athleteProfileDescription') || 'Create a personal athlete profile for self-coaching and tracking your own training.'}
          </p>

          {createAthleteProfile && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm font-medium text-blue-800">
                {t('athleteProfileFields') || 'Athlete Profile Information'}
              </p>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('genderLabel') || 'Gender'}</label>
                <Select
                  onValueChange={(value) => setValue('gender', value as 'MALE' | 'FEMALE' | 'OTHER')}
                  disabled={isLoading}
                >
                  <SelectTrigger className={errors.gender ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('selectGender') || 'Select gender'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">{t('male') || 'Male'}</SelectItem>
                    <SelectItem value="FEMALE">{t('female') || 'Female'}</SelectItem>
                    <SelectItem value="OTHER">{t('other') || 'Other'}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-sm text-red-500">{errors.gender.message}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="birthDate" className="text-sm font-medium">
                  {t('birthDateLabel') || 'Birth Date'}
                </label>
                <input
                  id="birthDate"
                  type="date"
                  className={`flex h-10 w-full rounded-md border ${errors.birthDate ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm`}
                  {...register('birthDate')}
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="height" className="text-sm font-medium">{t('heightLabel') || 'Height (cm)'}</label>
                  <input
                    id="height"
                    type="number"
                    step="0.1"
                    className={`flex h-10 w-full rounded-md border ${errors.height ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm`}
                    placeholder="175"
                    {...register('height')}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="weight" className="text-sm font-medium">{t('weightLabel') || 'Weight (kg)'}</label>
                  <input
                    id="weight"
                    type="number"
                    step="0.1"
                    className={`flex h-10 w-full rounded-md border ${errors.weight ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm`}
                    placeholder="70"
                    {...register('weight')}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Join Existing Gym */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">
              {t('joinGym.title') || 'Join an existing gym or club (optional)'}
            </label>
          </div>

          {selectedGym ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">{selectedGym.name}</span>
              </div>
              <button type="button" onClick={() => setSelectedGym(null)} className="text-blue-600 hover:text-blue-800">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={t('joinGym.searchPlaceholder') || 'Search for gym or club...'}
                  value={gymSearch}
                  onChange={(e) => searchGyms(e.target.value)}
                />
              </div>
              {gymResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-40 overflow-auto">
                  {gymResults.map((gym) => (
                    <button
                      key={gym.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center justify-between"
                      onClick={() => {
                        setSelectedGym({ id: gym.id, name: gym.name })
                        setGymResults([])
                        setGymSearch('')
                      }}
                    >
                      <span>{gym.name}</span>
                      {gym.city && <span className="text-muted-foreground text-xs">{gym.city}</span>}
                    </button>
                  ))}
                </div>
              )}
              {searchingGyms && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg p-3 text-center">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  <span className="text-sm text-muted-foreground">{t('joinGym.searching') || 'Searching...'}</span>
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {t('joinGym.description') || 'A join request will be sent to the gym owner for approval.'}
          </p>
        </div>

        <Button type="submit" className="w-full gradient-primary" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('creatingAccount')}
            </>
          ) : (
            t('registerButton')
          )}
        </Button>
      </form>
    </>
  )
}

export default function CoachSignupPage() {
  const t = useTranslations('auth')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher showLabel={false} />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
            <Dumbbell className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Registrera dig som Coach
          </CardTitle>
          <CardDescription>
            {t('registerDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          }>
            <CoachSignupForm />
          </Suspense>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            {t('hasAccount')}{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              {t('signInLink')}
            </Link>
          </div>
          <div className="text-xs text-center text-muted-foreground">
            Är du atlet?{' '}
            <Link href="/signup/athlete" className="text-blue-600 hover:underline">
              Registrera dig som atlet
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
