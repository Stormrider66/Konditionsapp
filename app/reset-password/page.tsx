'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from '@/i18n/client'
import { createClient } from '@/lib/supabase/client'
import { logAuthEventClient } from '@/lib/auth/log-auth-event-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isInvalidLink, setIsInvalidLink] = useState(false)
  const resetPasswordSchema = React.useMemo(
    () =>
      z
        .object({
          password: z.string().min(6, t('resetPassword.validation.passwordMinLength')),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t('resetPassword.validation.passwordsDoNotMatch'),
          path: ['confirmPassword'],
        }),
    [t],
  )
  type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    const supabase = createClient()
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const authError = searchParams.get('error')
    if (authError) {
      setIsInvalidLink(true)
      return
    }

    const markReadyIfAuthenticated = async () => {
      const [{ data: sessionData }, { data: userData }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.auth.getUser(),
      ])

      if (sessionData.session || userData.user) {
        setIsReady(true)
        setIsInvalidLink(false)
        return true
      }

      return false
    }

    void markReadyIfAuthenticated()

    // Listen for recovery or sign-in events. Invite/reset links handled through
    // /api/auth/callback often land here with a normal signed-in session rather
    // than a PASSWORD_RECOVERY client event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setIsReady(true)
          setIsInvalidLink(false)
        }
      }
    )

    timeoutId = setTimeout(async () => {
      const authenticated = await markReadyIfAuthenticated()
      if (!authenticated) {
        setIsInvalidLink(true)
      }
    }, 4000)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [searchParams])

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (error) {
        toast({
          title: t('resetPassword.messages.updateFailed'),
          description: error.message,
          variant: 'destructive',
        })
        return
      }

      const { data: userData } = await supabase.auth.getUser()
      logAuthEventClient({
        eventType: 'PASSWORD_RESET',
        userId: userData.user?.id,
        email: userData.user?.email,
        metadata: { source: 'reset_password_page' },
      })

      setIsSuccess(true)
      toast({
        title: t('resetPassword.messages.updated'),
        description: t('resetPassword.messages.updatedDescription'),
      })

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch {
      toast({
        title: t('errorOccurred'),
        description: t('resetPassword.messages.tryAgain'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {tCommon('appName')}
          </CardTitle>
          <CardDescription className="text-center">
            {isSuccess ? t('resetPassword.messages.updated') : t('resetPassword.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t('resetPassword.messages.redirecting')}
              </p>
            </div>
          ) : isInvalidLink ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('resetPassword.messages.invalidLink')}
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.push('/forgot-password')}
              >
                {t('resetPassword.requestNewLink')}
              </Button>
            </div>
          ) : !isReady ? (
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t('resetPassword.messages.verifyingLink')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium leading-none"
                >
                  {t('resetPassword.labels.newPassword')}
                </label>
                <input
                  id="password"
                  type="password"
                  className={`flex h-10 w-full rounded-md border ${
                    errors.password ? 'border-red-500' : 'border-input'
                  } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                  placeholder={t('resetPassword.placeholders.password')}
                  {...register('password')}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium leading-none"
                >
                  {t('resetPassword.labels.confirmPassword')}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className={`flex h-10 w-full rounded-md border ${
                    errors.confirmPassword ? 'border-red-500' : 'border-input'
                  } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                  placeholder={t('resetPassword.placeholders.confirmPassword')}
                  {...register('confirmPassword')}
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {errors.confirmPassword.message}
                  </p>
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
                    {t('resetPassword.messages.loading')}
                  </>
                ) : (
                  t('resetPassword.submit')
                )}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Link
            href="/login"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            {t('resetPassword.backToLogin')}
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
