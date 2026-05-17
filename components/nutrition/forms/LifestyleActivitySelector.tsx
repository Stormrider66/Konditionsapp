'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Footprints, Loader2 } from 'lucide-react'
import { useTranslations } from '@/i18n/client'

type LifestyleActivity = 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'VERY_ACTIVE'

const OPTIONS: { value: LifestyleActivity; labelKey: string; descriptionKey: string }[] = [
  {
    value: 'SEDENTARY',
    labelKey: 'options.sedentary.label',
    descriptionKey: 'options.sedentary.description',
  },
  {
    value: 'LIGHTLY_ACTIVE',
    labelKey: 'options.lightlyActive.label',
    descriptionKey: 'options.lightlyActive.description',
  },
  {
    value: 'MODERATELY_ACTIVE',
    labelKey: 'options.moderatelyActive.label',
    descriptionKey: 'options.moderatelyActive.description',
  },
  {
    value: 'VERY_ACTIVE',
    labelKey: 'options.veryActive.label',
    descriptionKey: 'options.veryActive.description',
  },
]

interface LifestyleActivitySelectorProps {
  clientId: string
  initialValue?: LifestyleActivity
}

export function LifestyleActivitySelector({ clientId, initialValue = 'SEDENTARY' }: LifestyleActivitySelectorProps) {
  const t = useTranslations('components.lifestyleActivitySelector')
  const { toast } = useToast()
  const [value, setValue] = useState<LifestyleActivity>(initialValue)
  const [saving, setSaving] = useState(false)
  const dirty = value !== initialValue

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/sport-profile/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lifestyleActivity: value }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: t('toast.saved.title'), description: t('toast.saved.description') })
    } catch {
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.description'),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Footprints className="h-4 w-4 text-orange-500" />
          {t('title')}
        </CardTitle>
        <CardDescription>
          {t.rich('description', {
            em: (chunks) => <em>{chunks}</em>,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={value} onValueChange={(v) => setValue(v as LifestyleActivity)} className="space-y-2">
          {OPTIONS.map((opt) => (
            <Label
              key={opt.value}
              htmlFor={`lifestyle-${opt.value}`}
              className="flex items-start gap-3 rounded-md border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
            >
              <RadioGroupItem value={opt.value} id={`lifestyle-${opt.value}`} className="mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-medium text-sm">{t(opt.labelKey)}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t(opt.descriptionKey)}</div>
              </div>
            </Label>
          ))}
        </RadioGroup>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!dirty || saving} size="sm">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('actions.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
