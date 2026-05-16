'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { logAuthEventClient } from '@/lib/auth/log-auth-event-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

type LoginFormData = {
  email: string
  password: string
}

export default function LoginPage() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('invalidEmail')),
        password: z.string().min(6, t('passwordMinLength')),
      }),
    [t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    const hash = window.location.hash
    const search = window.location.search
    const hasRecoveryParams = hash.includes('type=recovery') || search.includes('type=recovery')

    if (hasRecoveryParams) {
      router.replace(`/reset-password${search}${hash}`)
      return
    }

    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/reset-password')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        // Log failed login attempt for security monitoring
        logAuthEventClient({
          eventType: 'LOGIN_FAILURE',
          email: data.email,
          failureReason: error.message,
        })

        toast({
          title: t('loginFailed'),
          description: error.message,
          variant: 'destructive',
        })
        return
      }

      // Log successful login
      logAuthEventClient({
        eventType: 'LOGIN_SUCCESS',
        userId: authData.user?.id,
        email: data.email,
      })

      toast({
        title: t('welcomeMessage'),
        description: t('loggedInDescription'),
      })

      router.push('/')
      router.refresh()
    } catch (_error) {
      logAuthEventClient({
        eventType: 'LOGIN_FAILURE',
        email: data.email,
        failureReason: 'client_exception',
      })

      toast({
        title: t('errorOccurred'),
        description: t('couldNotLoginLater'),
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
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Trainomics
          </CardTitle>
          <CardDescription className="text-center">
            {t('loginDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-600 hover:underline"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tCommon('loading')}
                </>
              ) : (
                t('loginButton')
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            {t('noAccount')}{' '}
            <Link href="/signup" className="text-blue-600 hover:underline">
              {t('signUpLink')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
