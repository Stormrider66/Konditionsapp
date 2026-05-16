'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CheckCircle2, Stethoscope, User } from 'lucide-react'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useTranslations } from '@/i18n/client'

type RegisterFormData = {
  name: string
  email: string
  password: string
  confirmPassword: string
  createAthleteProfile: boolean
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  birthDate?: string
  height?: string
  weight?: string
}

const baseRegisterSchema = z.object({
  name: z.string(),
  email: z.string(),
  password: z.string(),
  confirmPassword: z.string(),
  createAthleteProfile: z.boolean(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  birthDate: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
})

function PhysioSignupForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [invitationInfo, setInvitationInfo] = useState<{ code: string; businessName: string } | null>(null)
  const registerSchema = useMemo(
    () =>
      baseRegisterSchema
        .extend({
          name: z.string().min(2, t('physioSignup.validation.nameMinLength')),
          email: z.string().email(t('invalidEmail')),
          password: z.string().min(6, t('passwordMinLength')),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t('gymSignup.validation.passwordsDoNotMatch'),
          path: ['confirmPassword'],
        })
        .refine((data) => {
          if (data.createAthleteProfile) {
            return data.gender && data.birthDate && data.height && data.weight
          }
          return true
        }, {
          message: t('physioSignup.validation.athleteProfileRequired'),
          path: ['gender'],
        }),
    [t]
  )

  useEffect(() => {
    const invitationCode = searchParams.get('invitation')
    if (!invitationCode) return

    fetch(`/api/business/invitations/validate?code=${encodeURIComponent(invitationCode)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setInvitationInfo({ code: invitationCode, businessName: data.businessName || t('physioSignup.defaultTeamName') })
        }
      })
      .catch(() => {
        setInvitationInfo({ code: invitationCode, businessName: t('physioSignup.defaultTeamName') })
      })
  }, [searchParams, t])

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

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { name: data.name } },
      })

      if (authError) {
        toast({ title: t('registrationFailed'), description: authError.message, variant: 'destructive' })
        return
      }

      if (!authData.user) {
        toast({ title: t('registrationFailed'), description: t('couldNotCreateAccount'), variant: 'destructive' })
        return
      }

      const response = await fetch('/api/auth/signup-physio', {
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
        const result = await response.json().catch(() => ({}))
        toast({
          title: t('registrationFailed'),
          description: result.error || t('couldNotCreateAccount'),
          variant: 'destructive',
        })
        return
      }

      // signup-physio always returns a business — either a practice invite
      // we accept below or a freshly provisioned personal one.
      const signupResult = await response.json().catch(() => null)
      const personalBusiness = signupResult?.data?.business as { slug: string } | undefined

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
          // Non-blocking
        }
      }

      toast({
        title: t('physioSignup.successTitle'),
        description: t('physioSignup.successDescription'),
      })

      // Every physio now has a business. Prefer the invited one, fall back
      // to the personal practice we just provisioned.
      const targetSlug = acceptedBusiness?.slug ?? personalBusiness?.slug
      if (targetSlug) {
        router.push(`/${targetSlug}/physio/dashboard`)
      } else {
        router.push('/')
      }
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center px-4 py-8">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher showLabel={false} />
      </div>

      <Card className="w-full max-w-xl shadow-xl">
        <CardHeader className="space-y-2">
          {invitationInfo && (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-3 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <div>
                  <p className="font-medium text-sm">{t('physioSignup.invitedTo', { businessName: invitationInfo.businessName })}</p>
                  <p className="text-xs opacity-90">{t('physioSignup.inviteDescription')}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <Stethoscope className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <CardTitle>{t('physioSignup.title')}</CardTitle>
              <CardDescription>{t('physioSignup.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">{t('nameLabel')}</label>
              <input id="name" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('name')} disabled={isLoading} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">{t('emailLabel')}</label>
              <input id="email" type="email" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('email')} disabled={isLoading} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">{t('passwordLabel')}</label>
                <input id="password" type="password" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('password')} disabled={isLoading} />
                {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">{t('confirmPasswordLabel')}</label>
                <input id="confirmPassword" type="password" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('confirmPassword')} disabled={isLoading} />
                {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="createAthleteProfile"
                  checked={createAthleteProfile}
                  onCheckedChange={(checked) => setValue('createAthleteProfile', checked === true)}
                  disabled={isLoading}
                />
                <label htmlFor="createAthleteProfile" className="text-sm font-medium leading-none">
                  {t('physioSignup.createOwnAthleteProfile')}
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('physioSignup.athleteProfileModeDescription')}
              </p>

              {createAthleteProfile && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">{t('genderLabel')}</label>
                    <Select onValueChange={(value) => setValue('gender', value as 'MALE' | 'FEMALE' | 'OTHER')} disabled={isLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectGender')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">{t('male')}</SelectItem>
                        <SelectItem value="FEMALE">{t('female')}</SelectItem>
                        <SelectItem value="OTHER">{t('other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="birthDate" className="text-sm font-medium">{t('birthDateLabel')}</label>
                    <input id="birthDate" type="date" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('birthDate')} disabled={isLoading} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="height" className="text-sm font-medium">{t('heightLabel')}</label>
                    <input id="height" type="number" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('height')} disabled={isLoading} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="weight" className="text-sm font-medium">{t('weightLabel')}</label>
                    <input id="weight" type="number" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('weight')} disabled={isLoading} />
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <User className="h-4 w-4 mr-2" />}
              {t('registerButton')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            {t('hasAccount')}{' '}
            <Link href="/login" className="text-emerald-600 hover:underline">{t('signInLink')}</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function PhysioSignupPage() {
  const tCommon = useTranslations('common')

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">{tCommon('loading')}</div>}>
      <PhysioSignupForm />
    </Suspense>
  )
}
