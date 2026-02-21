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
import { Loader2, Building2, User, Mail, Lock, MapPin, Phone, Globe, Check } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

const gymSchema = z.object({
  businessName: z.string().min(2, 'Gym name is required'),
  name: z.string().min(2, 'Contact person name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  city: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type GymFormData = z.infer<typeof gymSchema>

const GYM_FEATURES = [
  'Hantera flera coacher',
  'Teamhantering och atletportal',
  'Anpassad branding',
  '14 dagars gratis provperiod',
]

export default function GymSignupPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GymFormData>({
    resolver: zodResolver(gymSchema),
  })

  const onSubmit = async (data: GymFormData) => {
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
          businessType: 'GYM',
          city: data.city || undefined,
          phone: data.phone || undefined,
          website: data.website || undefined,
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
        title: 'Gymkonto skapat!',
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher showLabel={false} />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
            <Building2 className="h-6 w-6 text-purple-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Registrera ditt gym</CardTitle>
          <CardDescription>
            Skapa ett gymkonto och kom igång direkt
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* What's included */}
          <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
            <p className="text-sm font-medium text-purple-800 mb-2">Vad ingår</p>
            <ul className="space-y-1.5">
              {GYM_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-purple-700">
                  <Check className="h-4 w-4 text-purple-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="businessName" className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Gymnamn
              </label>
              <input
                id="businessName"
                type="text"
                className={`flex h-10 w-full rounded-md border ${errors.businessName ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                placeholder="T.ex. Nordic Fitness"
                {...register('businessName')}
                disabled={isLoading}
              />
              {errors.businessName && <p className="text-sm text-red-500">{errors.businessName.message}</p>}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="city" className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Stad
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
                <label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Telefon
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="070-123 45 67"
                  {...register('phone')}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="website" className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Webbplats (valfritt)
              </label>
              <input
                id="website"
                type="url"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="https://www.example.com"
                {...register('website')}
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

            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Skapar gymkonto...
                </>
              ) : (
                'Skapa gymkonto'
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
