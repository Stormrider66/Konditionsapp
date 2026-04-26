'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Footprints, Loader2 } from 'lucide-react'

type LifestyleActivity = 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'VERY_ACTIVE'

const OPTIONS: { value: LifestyleActivity; label: string; description: string }[] = [
  {
    value: 'SEDENTARY',
    label: 'Stillasittande',
    description: 'Skrivbordsjobb, mest sittande (~3–5 000 steg/dag)',
  },
  {
    value: 'LIGHTLY_ACTIVE',
    label: 'Lätt aktiv',
    description: 'Mest sittande men promenader/stående pauser (~5–8 000 steg/dag)',
  },
  {
    value: 'MODERATELY_ACTIVE',
    label: 'Måttligt aktiv',
    description: 'På fötterna större delen av dagen (~8–12 000 steg/dag)',
  },
  {
    value: 'VERY_ACTIVE',
    label: 'Mycket aktiv',
    description: 'Fysiskt arbete – lager, vård, byggarbete (~12 000+ steg/dag)',
  },
]

interface LifestyleActivitySelectorProps {
  clientId: string
  initialValue?: LifestyleActivity
}

export function LifestyleActivitySelector({ clientId, initialValue = 'SEDENTARY' }: LifestyleActivitySelectorProps) {
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
      toast({ title: 'Sparad!', description: 'Din livsstil har uppdaterats.' })
    } catch {
      toast({
        title: 'Fel',
        description: 'Kunde inte spara livsstilsinställningen. Försök igen.',
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
          Livsstil & vardagsaktivitet
        </CardTitle>
        <CardDescription>
          Hur aktiv är din vardag <em>utanför</em> träningen? Påverkar ditt dagliga
          kaloribehov ovanpå basbehovet. Träningen läggs till separat.
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
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{opt.description}</div>
              </div>
            </Label>
          ))}
        </RadioGroup>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!dirty || saving} size="sm">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Spara
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
