'use client'

/**
 * Injury Selector Component
 *
 * Conditional UI shown when athlete reports pain level >= 3.
 * Provides sport-specific injury selection with body part and injury type.
 *
 * Two-tier behavior:
 * - Pain 3-4: Optional selection, logged but no cascade
 * - Pain 5+: Required selection, triggers injury cascade
 */

import { useState, useEffect } from 'react'
import type { SportType } from '@prisma/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Thermometer, MapPin, Activity } from 'lucide-react'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'
import {
  BODY_PARTS,
  ILLNESSES,
  getInjuriesForSportAndBodyPart,
  type BodyPart,
  type InjurySide,
  type InjurySelection,
  type IllnessType,
} from '@/lib/injury-detection/sport-injuries'
import { cn } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

export interface InjurySelectorValue {
  bodyPart: BodyPart | null
  injuryType: string | null
  side: InjurySide
  isIllness: boolean
  illnessType: IllnessType | null
}

interface InjurySelectorProps {
  sport: SportType
  painLevel: number
  value: InjurySelectorValue
  onChange: (value: InjurySelectorValue) => void
  disabled?: boolean
  variant?: 'default' | 'glass'
}

// ============================================
// COMPONENT
// ============================================

export function InjurySelector({
  sport,
  painLevel,
  value,
  onChange,
  disabled = false,
  variant = 'default',
}: InjurySelectorProps) {
  const isGlass = variant === 'glass'
  const [availableInjuries, setAvailableInjuries] = useState<ReturnType<typeof getInjuriesForSportAndBodyPart>>([])

  // Update available injuries when body part changes
  useEffect(() => {
    if (value.bodyPart) {
      const injuries = getInjuriesForSportAndBodyPart(sport, value.bodyPart)
      setAvailableInjuries(injuries)
    } else {
      setAvailableInjuries([])
    }
  }, [sport, value.bodyPart])

  // Determine UI state based on pain level
  const isRequired = painLevel >= 5
  const isWarning = painLevel >= 3 && painLevel < 5

  // Handle body part change
  const handleBodyPartChange = (bodyPart: string) => {
    onChange({
      ...value,
      bodyPart: bodyPart as BodyPart,
      injuryType: null, // Reset injury when body part changes
    })
  }

  // Handle injury type change
  const handleInjuryTypeChange = (injuryType: string) => {
    onChange({
      ...value,
      injuryType,
    })
  }

  // Handle side change
  const handleSideChange = (side: string) => {
    onChange({
      ...value,
      side: side as InjurySide,
    })
  }

  // Handle illness checkbox
  const handleIllnessChange = (checked: boolean) => {
    onChange({
      ...value,
      isIllness: checked,
      illnessType: checked ? 'GENERAL_ILLNESS' : null,
      // Clear injury data if illness is selected
      bodyPart: checked ? null : value.bodyPart,
      injuryType: checked ? null : value.injuryType,
    })
  }

  // Handle illness type change
  const handleIllnessTypeChange = (illnessType: string) => {
    onChange({
      ...value,
      illnessType: illnessType as IllnessType,
    })
  }

  if (isGlass) {
    return (
      <GlassCard className={cn(
        "transition-all duration-500",
        isRequired ? 'border-orange-500/30 bg-orange-500/5' : 'border-yellow-500/20 bg-yellow-500/5'
      )}>
        <GlassCardHeader className="pb-3 text-left">
          <GlassCardTitle className="flex items-center gap-2 text-lg font-black tracking-tight">
            {isRequired ? (
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            ) : (
              <Activity className="h-5 w-5 text-yellow-500" />
            )}
            {isRequired
              ? 'Besvär rapporterat'
              : 'Lite känning?'}
          </GlassCardTitle>
          <GlassCardDescription className="font-medium text-slate-400">
            {isRequired
              ? 'Hjälp oss förstå så vi kan anpassa din träning'
              : 'Vill du specificera? (Valfritt)'}
          </GlassCardDescription>
        </GlassCardHeader>

        <GlassCardContent className="space-y-6">
          {/* Illness Checkbox */}
          <div className="flex items-center space-x-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
            <Checkbox
              id="isIllness"
              checked={value.isIllness}
              onCheckedChange={handleIllnessChange}
              disabled={disabled}
              className="border-white/20 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
            />
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-red-500" />
              <Label htmlFor="isIllness" className="text-sm font-bold uppercase tracking-widest text-slate-300 cursor-pointer">
                Jag är sjuk (feber, magsjuka, förkylning)
              </Label>
            </div>
          </div>

          {/* Illness Type Selector */}
          {value.isIllness && (
            <div className="space-y-3 pl-2 border-l-2 border-red-500/30 ml-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Typ av sjukdom</Label>
              <Select
                value={value.illnessType || ''}
                onValueChange={handleIllnessTypeChange}
                disabled={disabled}
              >
                <SelectTrigger className="bg-white/5 border-white/10 h-10">
                  <SelectValue placeholder="Välj typ av sjukdom" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {ILLNESSES.map((illness) => (
                    <SelectItem key={illness.id} value={illness.id}>
                      {illness.labelSv}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium">
                Vid sjukdom rekommenderas fullständig vila. Din träningsplan kommer att anpassas därefter.
              </div>
            </div>
          )}

          {/* Injury Selection */}
          {!value.isIllness && (
            <div className="space-y-5">
              {/* Body Part Selector */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center justify-between">
                  Var gör det ont?
                  {isRequired && <span className="text-orange-500">Obligatoriskt</span>}
                </Label>
                <Select
                  value={value.bodyPart || ''}
                  onValueChange={handleBodyPartChange}
                  disabled={disabled}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 h-12 text-white">
                    <SelectValue placeholder="Välj kroppsdel" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {BODY_PARTS.map((bodyPart) => (
                      <SelectItem key={bodyPart.id} value={bodyPart.id}>
                        {bodyPart.labelSv}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Injury Type Selector */}
              {value.bodyPart && availableInjuries.length > 0 && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Typ av besvär
                  </Label>
                  <Select
                    value={value.injuryType || ''}
                    onValueChange={handleInjuryTypeChange}
                    disabled={disabled}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 h-12 text-white">
                      <SelectValue placeholder="Välj typ av besvär" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      {availableInjuries.map((injury) => (
                        <SelectItem key={injury.id} value={injury.id}>
                          {injury.labelSv}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Side Selector */}
              {value.bodyPart && value.bodyPart !== 'OTHER' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vilken sida?</Label>
                  <RadioGroup
                    value={value.side}
                    onValueChange={handleSideChange}
                    className="flex flex-wrap gap-2"
                    disabled={disabled}
                  >
                    {[
                      { value: 'LEFT', label: 'Vänster' },
                      { value: 'RIGHT', label: 'Höger' },
                      { value: 'BOTH', label: 'Båda' },
                      { value: 'NA', label: 'Ej aktuellt' },
                    ].map((item) => (
                      <div key={item.value} className="flex-1 min-w-[100px]">
                        <Label
                          htmlFor={`side-${item.value.toLowerCase()}`}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer h-16",
                            value.side === item.value
                              ? "bg-blue-600 border-blue-400 text-white font-bold"
                              : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                          )}
                        >
                          <RadioGroupItem value={item.value} id={`side-${item.value.toLowerCase()}`} className="sr-only" />
                          <span className="text-xs uppercase tracking-widest">{item.label}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </div>
          )}

          {/* Info message */}
          {!value.isIllness && (
            <div className={cn(
              "p-4 rounded-2xl text-[11px] font-medium leading-relaxed",
              isRequired ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
            )}>
              {isRequired ? (
                <>
                  <span className="font-black uppercase tracking-widest block mb-1">Automatisk justering:</span>
                  Dina pass kommer att justeras automatiskt för att undvika överbelastning. Din coach har notifierats och kommer följa upp.
                </>
              ) : (
                <>
                  <span className="font-black uppercase tracking-widest block mb-1">Vi noterar känningen:</span>
                  Passen påverkas inte automatiskt vid den här nivån, men informationen loggas så du och din coach kan följa trender över tid.
                </>
              )}
            </div>
          )}
        </GlassCardContent>
      </GlassCard>
    )
  }
}

// ============================================
// DEFAULT VALUE FACTORY
// ============================================

export function createDefaultInjurySelectorValue(): InjurySelectorValue {
  return {
    bodyPart: null,
    injuryType: null,
    side: 'NA',
    isIllness: false,
    illnessType: null,
  }
}

// ============================================
// VALIDATION
// ============================================

export function validateInjurySelection(
  value: InjurySelectorValue,
  painLevel: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // For pain >= 5, require either illness or body part selection
  if (painLevel >= 5) {
    if (!value.isIllness && !value.bodyPart) {
      errors.push('Välj kroppsdel eller markera sjukdom')
    }

    if (value.isIllness && !value.illnessType) {
      errors.push('Välj typ av sjukdom')
    }

    if (!value.isIllness && value.bodyPart && !value.injuryType) {
      errors.push('Välj typ av besvär')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
