'use client'

/**
 * Direct Athlete Signup Page
 *
 * Allows athletes to create accounts without a coach.
 * Supports optional invitation codes for referrals.
 */

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, User, Mail, Lock, Calendar, Users } from 'lucide-react'

const signupSchema = z.object({
  name: z.string().min(2, 'Namnet måste vara minst 2 tecken'),
  email: z.string().email('Ogiltig e-postadress'),
  password: z.string().min(8, 'Lösenordet måste vara minst 8 tecken'),
  confirmPassword: z.string(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  inviteCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Lösenorden matchar inte',
  path: ['confirmPassword'],
})

type SignupFormData = z.infer<typeof signupSchema>

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Get invite code from URL if present
  const inviteCodeFromUrl = searchParams.get('invite') || ''

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          gender: data.gender,
          inviteCode: data.inviteCode || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast({
          title: 'Registrering misslyckades',
          description: result.error || 'Kunde inte skapa konto',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Välkommen!',
        description: 'Ditt konto har skapats. Du kommer nu att guidas genom onboarding.',
      })

      // Redirect to onboarding
      router.push(result.redirectUrl || '/athlete/onboarding')
      router.refresh()
    } catch (error) {
      toast({
        title: 'Ett fel uppstod',
        description: 'Kunde inte skapa konto. Försök igen senare.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          Namn
        </label>
        <input
          id="name"
          type="text"
          className={`flex h-10 w-full rounded-md border ${
            errors.name ? 'border-red-500' : 'border-input'
          } bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          placeholder="Ditt namn"
          {...register('name')}
          disabled={isLoading}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          E-post
        </label>
        <input
          id="email"
          type="email"
          className={`flex h-10 w-full rounded-md border ${
            errors.email ? 'border-red-500' : 'border-input'
          } bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          placeholder="din@email.com"
          {...register('email')}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      {/* Gender */}
      <div className="space-y-2">
        <label htmlFor="gender" className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Kön (valfritt)
        </label>
        <select
          id="gender"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...register('gender')}
          disabled={isLoading}
        >
          <option value="">Välj...</option>
          <option value="MALE">Man</option>
          <option value="FEMALE">Kvinna</option>
        </select>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          Lösenord
        </label>
        <input
          id="password"
          type="password"
          className={`flex h-10 w-full rounded-md border ${
            errors.password ? 'border-red-500' : 'border-input'
          } bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          placeholder="Minst 8 tecken"
          {...register('password')}
          disabled={isLoading}
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          Bekräfta lösenord
        </label>
        <input
          id="confirmPassword"
          type="password"
          className={`flex h-10 w-full rounded-md border ${
            errors.confirmPassword ? 'border-red-500' : 'border-input'
          } bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          placeholder="Upprepa lösenord"
          {...register('confirmPassword')}
          disabled={isLoading}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
        )}
      </div>

      {/* Invite Code */}
      <div className="space-y-2">
        <label htmlFor="inviteCode" className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Inbjudningskod (valfritt)
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
            Skapar konto...
          </>
        ) : (
          'Skapa konto'
        )}
      </Button>
    </form>
  )
}

function SignupFormFallback() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
    </div>
  )
}

export default function AthleteSignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Skapa atletkonto
          </CardTitle>
          <CardDescription>
            Kom igång med din träning idag
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<SignupFormFallback />}>
            <SignupForm />
          </Suspense>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            Har du redan ett konto?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Logga in
            </Link>
          </div>
          <div className="text-xs text-center text-muted-foreground">
            Är du tränare?{' '}
            <Link href="/register" className="text-blue-600 hover:underline">
              Skapa ett tränarkonto
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
