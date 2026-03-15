'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, User, Mail, Lock, Calendar, Users, Check, X, Building2, Search } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { ATHLETE_TIER_FEATURES } from '@/lib/ai/cost-data'

type Tier = 'FREE' | 'STANDARD' | 'PRO'

function normalizeTierParam(value: string | null): Tier {
  const normalized = value?.toUpperCase()

  switch (normalized) {
    case 'BASIC':
    case 'STANDARD':
      return 'STANDARD'
    case 'PRO':
      return 'PRO'
    case 'FREE':
    default:
      return 'FREE'
  }
}

const TIER_INFO: Record<Tier, { name: string; price: string; highlight?: boolean }> = {
  FREE: { name: 'Free', price: '0 kr' },
  STANDARD: { name: 'Standard', price: '199 kr/mån', highlight: false },
  PRO: { name: 'Pro', price: '399 kr/mån', highlight: true },
}

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  birthDate: z.string().min(1, 'Födelsedatum krävs'),
  inviteCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type SignupFormData = z.infer<typeof signupSchema>

function TierCard({
  tier,
  info,
  selected,
  onSelect,
}: {
  tier: Tier
  info: typeof TIER_INFO[Tier]
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-lg border-2 p-4 transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : 'border-gray-200 hover:border-gray-300'
      } ${info.highlight && !selected ? 'ring-1 ring-blue-200' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm">{info.name}</span>
        {info.highlight && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Populär</span>
        )}
      </div>
      <div className="text-lg font-bold mb-3">{info.price}</div>
      <ul className="space-y-1.5">
        {ATHLETE_TIER_FEATURES.map((feature) => {
          const value = feature[tier.toLowerCase() as 'free' | 'standard' | 'pro']
          const isIncluded = value === true || (typeof value === 'string' && value !== '')
          const isExcluded = value === false

          return (
            <li key={feature.name} className="flex items-center gap-2 text-xs">
              {isExcluded ? (
                <X className="h-3.5 w-3.5 text-gray-300 shrink-0" />
              ) : (
                <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
              )}
              <span className={isExcluded ? 'text-gray-400' : 'text-gray-700'}>
                {typeof value === 'string' ? `${feature.name}: ${value}` : feature.name}
              </span>
            </li>
          )
        })}
      </ul>
    </button>
  )
}

function AthleteSignupForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTier, setSelectedTier] = useState<Tier>(() => normalizeTierParam(searchParams.get('tier')))
  const [gymSearch, setGymSearch] = useState('')
  const [gymResults, setGymResults] = useState<Array<{ id: string; name: string; city: string | null; type: string; slug?: string }>>([])
  const [selectedGym, setSelectedGym] = useState<{ id: string; name: string; slug?: string } | null>(null)
  const [searchingGyms, setSearchingGyms] = useState(false)

  const inviteCodeFromUrl = searchParams.get('invite') || ''
  const isAICoached = searchParams.get('mode') === 'ai-coached'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      inviteCode: inviteCodeFromUrl,
    },
  })

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

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/signup-athlete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          gender: data.gender,
          birthDate: new Date(data.birthDate).toISOString(),
          inviteCode: data.inviteCode || undefined,
          aiCoached: isAICoached,
          tier: selectedTier,
          businessId: selectedGym?.id,
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
        title: t('welcomeMessage'),
        description: t('accountCreatedOnboarding'),
      })

      // For paid tiers, redirect may be to Stripe checkout (external URL)
      const redirectUrl = result.redirectUrl || '/athlete/onboarding'
      if (redirectUrl.startsWith('http')) {
        window.location.href = redirectUrl
      } else {
        router.push(redirectUrl)
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
    <div className="space-y-6">
      {/* Tier Selection */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Välj din plan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.entries(TIER_INFO) as [Tier, typeof TIER_INFO[Tier]][]).map(([tier, info]) => (
            <TierCard
              key={tier}
              tier={tier}
              info={info}
              selected={selectedTier === tier}
              onSelect={() => setSelectedTier(tier)}
            />
          ))}
        </div>
        {selectedTier !== 'FREE' && (
          <p className="text-xs text-muted-foreground mt-2">
            Du skapar ett konto och blir sedan omdirigerad till betalning.
          </p>
        )}
      </div>

      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <label className="text-sm font-medium">
            Välj gym eller business
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
                placeholder="Sök efter gym eller business..."
                value={gymSearch}
                onChange={(e) => searchGyms(e.target.value)}
                disabled={isLoading}
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
                      setSelectedGym({ id: gym.id, name: gym.name, slug: gym.slug })
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
                <span className="text-sm text-muted-foreground">Söker...</span>
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Om du väljer ett gym kopplas ditt konto till deras business direkt och du skickas till deras sida efter registrering.
        </p>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            {t('nameLabel')}
          </label>
          <input
            id="name"
            type="text"
            className={`flex h-10 w-full rounded-md border ${
              errors.name ? 'border-red-500' : 'border-input'
            } bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
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
            className={`flex h-10 w-full rounded-md border ${
              errors.email ? 'border-red-500' : 'border-input'
            } bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            placeholder={t('emailPlaceholder')}
            {...register('email')}
            disabled={isLoading}
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="gender" className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            {t('genderLabel')}
          </label>
          <select
            id="gender"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register('gender')}
            disabled={isLoading}
          >
            <option value="">{t('selectOption')}</option>
            <option value="MALE">{t('male')}</option>
            <option value="FEMALE">{t('female')}</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="birthDate" className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {t('birthDateLabel')}
          </label>
          <input
            id="birthDate"
            type="date"
            className={`flex h-10 w-full rounded-md border ${
              errors.birthDate ? 'border-red-500' : 'border-input'
            } bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            {...register('birthDate')}
            disabled={isLoading}
          />
          {errors.birthDate && <p className="text-sm text-red-500">{errors.birthDate.message}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            {t('passwordLabel')}
          </label>
          <input
            id="password"
            type="password"
            className={`flex h-10 w-full rounded-md border ${
              errors.password ? 'border-red-500' : 'border-input'
            } bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
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
            className={`flex h-10 w-full rounded-md border ${
              errors.confirmPassword ? 'border-red-500' : 'border-input'
            } bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            placeholder={t('repeatPassword')}
            {...register('confirmPassword')}
            disabled={isLoading}
          />
          {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="inviteCode" className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {t('inviteCodeLabel')}
          </label>
          <input
            id="inviteCode"
            type="text"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="ABC123"
            {...register('inviteCode')}
            disabled={isLoading}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('creatingAccount')}
            </>
          ) : selectedTier === 'FREE' ? (
            t('registerButton')
          ) : (
            `Registrera & betala (${TIER_INFO[selectedTier].price})`
          )}
        </Button>
      </form>
    </div>
  )
}

function SignupFormFallback() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export default function AthleteSignupPage() {
  const t = useTranslations('auth')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher showLabel={false} />
      </div>

      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {t('createAthleteAccount')}
          </CardTitle>
          <CardDescription>
            {t('getStartedWithTraining')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<SignupFormFallback />}>
            <AthleteSignupForm />
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
            {t('areYouCoach')}{' '}
            <Link href="/signup/coach" className="text-blue-600 hover:underline">
              {t('createCoachAccount')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
