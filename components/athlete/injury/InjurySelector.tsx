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
import { AlertTriangle, Thermometer, MapPin } from 'lucide-react'
import {
  BODY_PARTS,
  ILLNESSES,
  getInjuriesForSportAndBodyPart,
  type BodyPart,
  type InjurySide,
  type InjurySelection,
  type IllnessType,
} from '@/lib/injury-detection/sport-injuries'

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
}: InjurySelectorProps) {
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

  return (
    <Card className={isRequired ? 'border-orange-300 bg-orange-50/50' : 'border-yellow-200 bg-yellow-50/30'}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {isRequired ? (
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          ) : (
            <MapPin className="h-5 w-5 text-yellow-600" />
          )}
          {isRequired
            ? 'Du har rapporterat smärta'
            : 'Du har rapporterat lite obehag'}
        </CardTitle>
        <CardDescription>
          {isRequired
            ? 'Hjälp oss förstå bättre så vi kan anpassa din träning'
            : 'Vill du specificera? (Valfritt, hjälper oss följa upp)'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Illness Checkbox */}
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-background/50">
          <Checkbox
            id="isIllness"
            checked={value.isIllness}
            onCheckedChange={handleIllnessChange}
            disabled={disabled}
          />
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-red-500" />
            <Label htmlFor="isIllness" className="text-sm font-medium cursor-pointer">
              Jag är sjuk (feber, magsjuka, förkylning)
            </Label>
          </div>
        </div>

        {/* Illness Type Selector (if illness selected) */}
        {value.isIllness && (
          <div className="space-y-2 pl-6">
            <Label className="text-sm">Typ av sjukdom</Label>
            <Select
              value={value.illnessType || ''}
              onValueChange={handleIllnessTypeChange}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj typ av sjukdom" />
              </SelectTrigger>
              <SelectContent>
                {ILLNESSES.map((illness) => (
                  <SelectItem key={illness.id} value={illness.id}>
                    {illness.labelSv}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Alert className="mt-2">
              <AlertDescription className="text-sm">
                Vid sjukdom rekommenderas fullständig vila. Ingen träning eller alternativträning.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Injury Selection (if not illness) */}
        {!value.isIllness && (
          <>
            {/* Body Part Selector */}
            <div className="space-y-2">
              <Label className="text-sm">
                Var gör det ont?
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <Select
                value={value.bodyPart || ''}
                onValueChange={handleBodyPartChange}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj kroppsdel" />
                </SelectTrigger>
                <SelectContent>
                  {BODY_PARTS.map((bodyPart) => (
                    <SelectItem key={bodyPart.id} value={bodyPart.id}>
                      {bodyPart.labelSv}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Injury Type Selector (appears after body part selection) */}
            {value.bodyPart && availableInjuries.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">
                  Typ av besvär
                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Select
                  value={value.injuryType || ''}
                  onValueChange={handleInjuryTypeChange}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj typ av besvär" />
                  </SelectTrigger>
                  <SelectContent>
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
              <div className="space-y-2">
                <Label className="text-sm">Vilken sida?</Label>
                <RadioGroup
                  value={value.side}
                  onValueChange={handleSideChange}
                  className="flex flex-wrap gap-4"
                  disabled={disabled}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="LEFT" id="side-left" />
                    <Label htmlFor="side-left" className="cursor-pointer">Vänster</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="RIGHT" id="side-right" />
                    <Label htmlFor="side-right" className="cursor-pointer">Höger</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="BOTH" id="side-both" />
                    <Label htmlFor="side-both" className="cursor-pointer">Båda</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="NA" id="side-na" />
                    <Label htmlFor="side-na" className="cursor-pointer">Ej aktuellt</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </>
        )}

        {/* Info message based on pain level */}
        {!value.isIllness && (
          <div className={`text-xs p-2 rounded ${isRequired ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {isRequired ? (
              <>
                <strong>Smärta 5+:</strong> Dina pass kommer att justeras automatiskt baserat på denna rapportering.
                Din coach notifieras.
              </>
            ) : (
              <>
                <strong>Smärta 3-4:</strong> Vi noterar detta och håller koll. Dina pass påverkas inte automatiskt,
                men din coach kan se informationen.
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
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
