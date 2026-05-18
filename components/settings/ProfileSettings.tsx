'use client'

import { useState } from 'react'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from '@/i18n/client'
import { Loader2 } from 'lucide-react'

interface ProfileSettingsProps {
  userName: string
  userEmail: string
}

export function ProfileSettings({ userName, userEmail }: ProfileSettingsProps) {
  const t = useTranslations('components.settings.profile')
  const { toast } = useToast()
  const [name, setName] = useState(userName)
  const [isLoading, setIsLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const handleNameChange = (value: string) => {
    setName(value)
    setIsDirty(value !== userName)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: t('toasts.validation.title'),
        description: t('toasts.validation.description'),
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to update name')
      }

      toast({
        title: t('toasts.success.title'),
        description: t('toasts.success.description'),
      })

      setIsDirty(false)
    } catch {
      toast({
        title: t('toasts.error.title'),
        description: t('toasts.error.description'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <GlassCard>
      <GlassCardContent className="p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {t('title')}
        </h3>

        <div className="space-y-2">
          <label htmlFor="profileName" className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {t('fields.name')}
          </label>
          <input
            id="profileName"
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="flex h-10 w-full rounded-md border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="profileEmail" className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {t('fields.email')}
          </label>
          <input
            id="profileEmail"
            type="email"
            value={userEmail}
            readOnly
            className="flex h-10 w-full rounded-md border border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/[0.02] px-3 py-2 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
          />
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            {t('emailReadOnlyHint')}
          </p>
        </div>

        {isDirty && (
          <Button
            onClick={handleSave}
            disabled={isLoading}
            size="sm"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('savingButton')}
              </>
            ) : (
              t('saveButton')
            )}
          </Button>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
