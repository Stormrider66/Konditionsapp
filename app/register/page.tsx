'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Gift, CheckCircle2 } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

interface ReferralInfo {
  code: string
  referrerName: string
  benefit: string
}

export default function RegisterPage() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null)
  const [referralValidated, setReferralValidated] = useState(false)

  // Check for referral code in URL
  useEffect(() => {
    const refCode = searchParams.get('ref')
    if (refCode && !referralValidated) {
      validateReferralCode(refCode)
    }
  }, [searchParams, referralValidated])

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
    } catch (error) {
      console.error('Failed to validate referral code:', error)
      setReferralValidated(true)
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)

    try {
      const supabase = createClient()

      // Apply referral code before creating user (to track the referral)
      if (referralInfo) {
        try {
          await fetch('/api/referrals/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: referralInfo.code,
              email: data.email,
            }),
          })
        } catch (error) {
          console.warn('Failed to apply referral code:', error)
        }
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
          },
        },
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
        // Create/update user in database (identity is derived from session server-side)
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: data.name,
          }),
        })

        if (!response.ok) {
          console.warn('Could not create user in database')
        }

        // Complete referral if applicable
        if (referralInfo) {
          try {
            await fetch('/api/referrals/apply', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
            })
          } catch (error) {
            console.warn('Failed to complete referral:', error)
          }
        }

        toast({
          title: t('welcomeMessage'),
          description: referralInfo
            ? t('accountCreatedWithReferral')
            : t('accountCreatedSuccess'),
        })

        router.push('/')
        router.refresh()
      }
    } catch (error) {
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      {/* Language switcher in top right */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher showLabel={false} />
      </div>

      <Card className="w-full max-w-md">
        {/* Referral Banner */}
        {referralInfo && (
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-3 rounded-t-lg">
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

        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Star by Thomson
          </CardTitle>
          <CardDescription className="text-center">
            {t('registerDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('nameLabel')}
              </label>
              <input
                id="name"
                type="text"
                className={`flex h-10 w-full rounded-md border ${
                  errors.name ? 'border-red-500' : 'border-input'
                } bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                placeholder={t('namePlaceholder')}
                {...register('name')}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('emailLabel')}
              </label>
              <input
                id="email"
                type="email"
                className={`flex h-10 w-full rounded-md border ${
                  errors.email ? 'border-red-500' : 'border-input'
                } bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                placeholder={t('emailPlaceholder')}
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('passwordLabel')}
              </label>
              <input
                id="password"
                type="password"
                className={`flex h-10 w-full rounded-md border ${
                  errors.password ? 'border-red-500' : 'border-input'
                } bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                placeholder={t('passwordPlaceholder')}
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('confirmPasswordLabel')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                className={`flex h-10 w-full rounded-md border ${
                  errors.confirmPassword ? 'border-red-500' : 'border-input'
                } bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                placeholder={t('passwordPlaceholder')}
                {...register('confirmPassword')}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary"
              disabled={isLoading}
            >
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
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            {t('hasAccount')}{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              {t('signInLink')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
