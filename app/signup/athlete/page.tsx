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
import { Loader2, User, Mail, Lock, Calendar, Users, Check, X } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { ATHLETE_TIER_FEATURES } from '@/lib/ai/cost-data'

type Tier = 'FREE' | 'STANDARD' | 'PRO'

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
  const [selectedTier, setSelectedTier] = useState<Tier>('FREE')

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
          inviteCode: data.inviteCode || undefined,
          aiCoached: isAICoached,
          tier: selectedTier,
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
