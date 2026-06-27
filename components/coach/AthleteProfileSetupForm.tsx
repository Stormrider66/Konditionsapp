'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, User, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

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

const labelClassName = 'text-sm font-medium text-zinc-700 dark:text-zinc-300'
const fieldClassName = 'h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus-visible:border-blue-500 dark:focus-visible:ring-blue-950/50'
const errorFieldClassName = 'border-red-300 focus-visible:border-red-400 focus-visible:ring-red-100 dark:border-red-900/60 dark:focus-visible:border-red-700 dark:focus-visible:ring-red-950/40'

export function AthleteProfileSetupForm({ userName, onSuccess }: AthleteProfileSetupFormProps) {
  const router = useRouter()
  const pathname = usePathname()
  const pathBusinessSlug = getBusinessSlugFromPathname(pathname)
  const currentPortal = pathname.includes('/physio/') ? 'physio' : 'coach'
  const basePath = pathBusinessSlug ? `/${pathBusinessSlug}` : ''
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
      <RolePanel className="mx-auto w-full max-w-xl p-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">Athlete profile created</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            You can now switch to athlete mode from the user menu.
          </p>
          <Button className="mt-5" onClick={() => router.push(`${basePath}/${currentPortal}/dashboard`)}>
            Back to Dashboard
          </Button>
        </div>
      </RolePanel>
    )
  }

  return (
    <RolePanel className="mx-auto w-full max-w-xl p-6">
      <div className="border-b border-zinc-200 pb-5 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Set up athlete profile</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Create your personal athlete profile for self-coaching
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
        {userName && (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/50">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">Creating profile for</p>
            <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-zinc-100">{userName}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className={labelClassName}>Gender</label>
          <Select
            onValueChange={(value) => setValue('gender', value as 'MALE' | 'FEMALE' | 'OTHER')}
            disabled={isLoading}
          >
            <SelectTrigger className={cn(fieldClassName, errors.gender && errorFieldClassName)}>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.gender.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="birthDate" className={labelClassName}>
            Birth Date
          </label>
          <input
            id="birthDate"
            type="date"
            className={cn(fieldClassName, errors.birthDate && errorFieldClassName)}
            {...register('birthDate')}
            disabled={isLoading}
          />
          {errors.birthDate && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.birthDate.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="height" className={labelClassName}>
              Height (cm)
            </label>
            <input
              id="height"
              type="number"
              step="0.1"
              className={cn(fieldClassName, errors.height && errorFieldClassName)}
              placeholder="175"
              {...register('height', { valueAsNumber: true })}
              disabled={isLoading}
            />
            {errors.height && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.height.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="weight" className={labelClassName}>
              Weight (kg)
            </label>
            <input
              id="weight"
              type="number"
              step="0.1"
              className={cn(fieldClassName, errors.weight && errorFieldClassName)}
              placeholder="70"
              {...register('weight', { valueAsNumber: true })}
              disabled={isLoading}
            />
            {errors.weight && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.weight.message}</p>
            )}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Profile...
            </>
          ) : (
            'Create Athlete Profile'
          )}
        </Button>

        <p className="text-center text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          This creates a personal athlete profile linked to your account. You can switch between role views at any time.
        </p>
      </form>
    </RolePanel>
  )
}
