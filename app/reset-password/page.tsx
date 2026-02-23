'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react'

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Lösenordet måste vara minst 6 tecken'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Lösenorden matchar inte',
    path: ['confirmPassword'],
  })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    const supabase = createClient()

    // Listen for PASSWORD_RECOVERY event from Supabase magic link
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsReady(true)
        }
      }
    )

    // Also check if we already have a session (user clicked link and session is active)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsReady(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (error) {
        toast({
          title: 'Kunde inte uppdatera lösenord',
          description: error.message,
          variant: 'destructive',
        })
        return
      }

      setIsSuccess(true)
      toast({
        title: 'Lösenord uppdaterat!',
        description: 'Du kan nu logga in med ditt nya lösenord.',
      })

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch {
      toast({
        title: 'Ett fel uppstod',
        description: 'Kunde inte uppdatera lösenordet. Försök igen.',
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
            Trainomics
          </CardTitle>
          <CardDescription className="text-center">
            {isSuccess ? 'Lösenord uppdaterat!' : 'Ange ditt nya lösenord'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Ditt lösenord har uppdaterats. Du omdirigeras till inloggningssidan...
              </p>
            </div>
          ) : !isReady ? (
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Verifierar återställningslänk...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium leading-none"
                >
                  Nytt lösenord
                </label>
                <input
                  id="password"
                  type="password"
                  className={`flex h-10 w-full rounded-md border ${
                    errors.password ? 'border-red-500' : 'border-input'
                  } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                  placeholder="Minst 6 tecken"
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
                  Bekräfta lösenord
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className={`flex h-10 w-full rounded-md border ${
                    errors.confirmPassword ? 'border-red-500' : 'border-input'
                  } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                  placeholder="Ange lösenordet igen"
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
                    Uppdaterar...
                  </>
                ) : (
                  'Uppdatera lösenord'
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
            Tillbaka till inloggning
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
