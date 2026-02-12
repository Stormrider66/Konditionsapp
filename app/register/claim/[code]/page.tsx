'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Building2, CheckCircle2 } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

const claimSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type ClaimFormData = z.infer<typeof claimSchema>

interface InvitationInfo {
  businessName: string
  businessType: string
  recipientEmail: string
}

export default function ClaimBusinessPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [validating, setValidating] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const code = params.code as string

  useEffect(() => {
    async function validateCode() {
      try {
        const response = await fetch(`/api/invitations/${code}`)
        if (!response.ok) {
          setError('Invalid or expired claim link')
          return
        }
        const data = await response.json()
        if (data.invitation?.type !== 'BUSINESS_CLAIM') {
          setError('Invalid claim link')
          return
        }
        setInvitation({
          businessName: data.invitation.business?.name || 'Business',
          businessType: data.invitation.business?.type || 'GYM',
          recipientEmail: data.invitation.recipientEmail || '',
        })
      } catch {
        setError('Failed to validate claim link')
      } finally {
        setValidating(false)
      }
    }
    validateCode()
  }, [code])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClaimFormData>({
    resolver: zodResolver(claimSchema),
  })

  const onSubmit = async (data: ClaimFormData) => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast({
          title: t('registrationFailed'),
          description: result.error || 'Failed to complete registration',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: t('welcomeMessage'),
        description: t('claimBusiness.success'),
      })

      router.push(`/${result.businessSlug}/coach`)
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

  if (validating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => router.push('/register')} variant="outline">
              {t('registerButton')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const inputClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher showLabel={false} />
      </div>

      <Card className="w-full max-w-md">
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-3 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <div className="flex-1">
              <p className="font-medium text-sm">{t('claimBusiness.claimingBusiness')}</p>
              <p className="text-xs opacity-90">
                <CheckCircle2 className="h-3 w-3 inline mr-1" />
                {invitation?.businessName}
              </p>
            </div>
          </div>
        </div>

        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('claimBusiness.title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('claimBusiness.description')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">{t('nameLabel')}</label>
              <input
                id="name"
                type="text"
                className={`${inputClass} ${errors.name ? 'border-red-500' : ''}`}
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
                className={`${inputClass} ${errors.email ? 'border-red-500' : ''}`}
                placeholder={t('emailPlaceholder')}
                defaultValue={invitation?.recipientEmail}
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
                className={`${inputClass} ${errors.password ? 'border-red-500' : ''}`}
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
                className={`${inputClass} ${errors.confirmPassword ? 'border-red-500' : ''}`}
                placeholder={t('passwordPlaceholder')}
                {...register('confirmPassword')}
                disabled={isLoading}
              />
              {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            <Button type="submit" className="w-full gradient-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('creatingAccount')}
                </>
              ) : (
                t('claimBusiness.claimButton')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
