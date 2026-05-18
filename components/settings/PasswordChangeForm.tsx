'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { useTranslations } from '@/i18n/client'

interface PasswordChangeFormProps {
  userEmail: string
}

export function PasswordChangeForm({ userEmail }: PasswordChangeFormProps) {
  const t = useTranslations('components.settings.password')
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const passwordChangeSchema = z
    .object({
      currentPassword: z.string().min(1, t('validation.currentPasswordRequired')),
      newPassword: z.string().min(6, t('validation.newPasswordMinLength')),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('validation.passwordsDoNotMatch'),
      path: ['confirmPassword'],
    })

  type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
  })

  const onSubmit = async (data: PasswordChangeFormData) => {
    setIsLoading(true)

    try {
      const supabase = createClient()

      // Verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: data.currentPassword,
      })

      if (signInError) {
        toast({
          title: t('toasts.invalidCurrentPassword.title'),
          description: t('toasts.invalidCurrentPassword.description'),
          variant: 'destructive',
        })
        return
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      })

      if (updateError) {
        toast({
          title: t('toasts.updateFailed.title'),
          description: updateError.message,
          variant: 'destructive',
        })
        return
      }

      toast({
        title: t('toasts.updated.title'),
        description: t('toasts.updated.description'),
      })

      reset()
    } catch {
      toast({
        title: t('toasts.catchError.title'),
        description: t('toasts.catchError.description'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const inputClasses = (hasError: boolean) =>
    `flex h-10 w-full rounded-md border ${
      hasError ? 'border-red-500' : 'border-slate-200 dark:border-white/10'
    } bg-white/50 dark:bg-white/5 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`

  return (
    <GlassCard>
      <GlassCardContent className="p-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          {t('title')}
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="currentPassword" className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {t('fields.currentPassword')}
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                className={inputClasses(!!errors.currentPassword)}
                {...register('currentPassword')}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-red-500">{errors.currentPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {t('fields.newPassword')}
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                className={inputClasses(!!errors.newPassword)}
                placeholder={t('placeholders.newPassword')}
                {...register('newPassword')}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-red-500">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {t('fields.confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={inputClasses(!!errors.confirmPassword)}
              placeholder={t('placeholders.confirmPassword')}
              {...register('confirmPassword')}
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            size="sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('updatingButton')}
              </>
            ) : (
              t('submitButton')
            )}
          </Button>
        </form>
      </GlassCardContent>
    </GlassCard>
  )
}
