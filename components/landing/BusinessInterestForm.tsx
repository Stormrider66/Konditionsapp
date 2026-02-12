'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { useTranslations } from '@/i18n/client'
import { Loader2, CheckCircle2 } from 'lucide-react'

const formSchema = z.object({
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  organizationName: z.string().min(2),
  city: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  primarySport: z.string().optional(),
  estimatedMembers: z.string().optional(),
  estimatedCoaches: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface BusinessInterestFormProps {
  type: 'GYM' | 'CLUB'
}

export function BusinessInterestForm({ type }: BusinessInterestFormProps) {
  const t = useTranslations('landing')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/business-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          ...data,
          estimatedMembers: data.estimatedMembers ? parseInt(data.estimatedMembers) : undefined,
          estimatedCoaches: data.estimatedCoaches ? parseInt(data.estimatedCoaches) : undefined,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to submit')
      }

      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center py-12 px-6">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold mb-2">{t('interestForm.successTitle')}</h3>
        <p className="text-slate-600 dark:text-slate-400">{t('interestForm.successMessage')}</p>
      </div>
    )
  }

  const inputClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('interestForm.contactName')}</label>
          <input
            className={`${inputClass} ${errors.contactName ? 'border-red-500' : ''}`}
            placeholder={t('interestForm.contactNamePlaceholder')}
            {...register('contactName')}
          />
          {errors.contactName && <p className="text-xs text-red-500">{t('interestForm.required')}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('interestForm.contactEmail')}</label>
          <input
            type="email"
            className={`${inputClass} ${errors.contactEmail ? 'border-red-500' : ''}`}
            placeholder={t('interestForm.contactEmailPlaceholder')}
            {...register('contactEmail')}
          />
          {errors.contactEmail && <p className="text-xs text-red-500">{t('interestForm.invalidEmail')}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t('interestForm.organizationName')}</label>
        <input
          className={`${inputClass} ${errors.organizationName ? 'border-red-500' : ''}`}
          placeholder={type === 'GYM' ? t('interestForm.gymNamePlaceholder') : t('interestForm.clubNamePlaceholder')}
          {...register('organizationName')}
        />
        {errors.organizationName && <p className="text-xs text-red-500">{t('interestForm.required')}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('interestForm.contactPhone')}</label>
          <input
            className={inputClass}
            placeholder={t('interestForm.phonePlaceholder')}
            {...register('contactPhone')}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('interestForm.city')}</label>
          <input
            className={inputClass}
            placeholder={t('interestForm.cityPlaceholder')}
            {...register('city')}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t('interestForm.website')}</label>
        <input
          className={inputClass}
          placeholder="https://..."
          {...register('website')}
        />
      </div>

      {type === 'CLUB' && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('interestForm.primarySport')}</label>
          <input
            className={inputClass}
            placeholder={t('interestForm.sportPlaceholder')}
            {...register('primarySport')}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            {type === 'GYM' ? t('interestForm.estimatedMembers') : t('interestForm.estimatedPlayers')}
          </label>
          <input
            type="number"
            className={inputClass}
            placeholder="100"
            {...register('estimatedMembers')}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('interestForm.estimatedCoaches')}</label>
          <input
            type="number"
            className={inputClass}
            placeholder="5"
            {...register('estimatedCoaches')}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t('interestForm.description')}</label>
        <textarea
          className={`${inputClass} h-24 resize-none`}
          placeholder={t('interestForm.descriptionPlaceholder')}
          {...register('description')}
        />
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full h-12 text-base" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('interestForm.submitting')}
          </>
        ) : (
          t('interestForm.submit')
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        {t('interestForm.privacyNote')}
      </p>
    </form>
  )
}
