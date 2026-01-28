'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, User, CheckCircle } from 'lucide-react'

const setupSchema = z.object({
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], {
    required_error: 'Please select a gender',
  }),
  birthDate: z.string().min(1, 'Birth date is required'),
  height: z.number().positive('Height must be positive'),
  weight: z.number().positive('Weight must be positive'),
})

type SetupFormData = z.infer<typeof setupSchema>

interface AthleteProfileSetupFormProps {
  userName?: string
  onSuccess?: () => void
}

export function AthleteProfileSetupForm({ userName, onSuccess }: AthleteProfileSetupFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
  })

  const onSubmit = async (data: SetupFormData) => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/athlete-mode/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        setIsSuccess(true)
        toast({
          title: 'Athlete Profile Created',
          description: 'You can now switch to athlete mode to view your dashboard.',
        })

        if (onSuccess) {
          onSuccess()
        } else {
          // Wait a moment to show success state, then redirect
          setTimeout(() => {
            router.refresh()
          }, 1500)
        }
      } else {
        throw new Error(result.error || 'Failed to create athlete profile')
      }
    } catch (error) {
      console.error('Failed to setup athlete profile:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create athlete profile',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Athlete Profile Created!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You can now switch to athlete mode from the user menu.
              </p>
            </div>
            <Button onClick={() => router.push('/coach/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Set Up Athlete Profile</CardTitle>
            <CardDescription>
              Create your personal athlete profile for self-coaching
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {userName && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Creating profile for</p>
              <p className="font-medium">{userName}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Gender</label>
            <Select
              onValueChange={(value) => setValue('gender', value as 'MALE' | 'FEMALE' | 'OTHER')}
              disabled={isLoading}
            >
              <SelectTrigger className={errors.gender ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender && (
              <p className="text-sm text-red-500">{errors.gender.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="birthDate" className="text-sm font-medium">
              Birth Date
            </label>
            <input
              id="birthDate"
              type="date"
              className={`flex h-10 w-full rounded-md border ${
                errors.birthDate ? 'border-red-500' : 'border-input'
              } bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
              {...register('birthDate')}
              disabled={isLoading}
            />
            {errors.birthDate && (
              <p className="text-sm text-red-500">{errors.birthDate.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="height" className="text-sm font-medium">
                Height (cm)
              </label>
              <input
                id="height"
                type="number"
                step="0.1"
                className={`flex h-10 w-full rounded-md border ${
                  errors.height ? 'border-red-500' : 'border-input'
                } bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                placeholder="175"
                {...register('height', { valueAsNumber: true })}
                disabled={isLoading}
              />
              {errors.height && (
                <p className="text-sm text-red-500">{errors.height.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="weight" className="text-sm font-medium">
                Weight (kg)
              </label>
              <input
                id="weight"
                type="number"
                step="0.1"
                className={`flex h-10 w-full rounded-md border ${
                  errors.weight ? 'border-red-500' : 'border-input'
                } bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                placeholder="70"
                {...register('weight', { valueAsNumber: true })}
                disabled={isLoading}
              />
              {errors.weight && (
                <p className="text-sm text-red-500">{errors.weight.message}</p>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Profile...
                </>
              ) : (
                'Create Athlete Profile'
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            This creates a personal athlete profile linked to your coach account.
            You can switch between coach and athlete mode at any time.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
