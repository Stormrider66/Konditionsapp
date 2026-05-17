'use client'

/**
 * FormattedWorkoutInstructions Component
 *
 * Parses and beautifully displays workout instructions from the training engine.
 * Handles formats like:
 * - === SECTION HEADERS ===
 * - • Bullet points
 * - Exercise: sets×reps @ weight [Tempo: x-x-x-x]
 */

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Flame, Dumbbell, Timer, Target, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'

interface FormattedWorkoutInstructionsProps {
  instructions: string
  variant?: 'compact' | 'expanded' | 'card'
  maxItems?: number
  className?: string
}

interface ParsedSection {
  title: string
  icon: React.ElementType
  color: string
  bgColor: string
  items: string[]
}

const SECTION_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  UPPVÄRMNING: { icon: Flame, color: 'text-yellow-600', bgColor: 'bg-yellow-500/10' },
  WARMUP: { icon: Flame, color: 'text-yellow-600', bgColor: 'bg-yellow-500/10' },
  HUVUDPASS: { icon: Dumbbell, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  MAIN: { icon: Dumbbell, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  STYRKA: { icon: Dumbbell, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  CORE: { icon: Target, color: 'text-purple-600', bgColor: 'bg-purple-500/10' },
  NEDVARVNING: { icon: Timer, color: 'text-green-600', bgColor: 'bg-green-500/10' },
  COOLDOWN: { icon: Timer, color: 'text-green-600', bgColor: 'bg-green-500/10' },
  KONDITION: { icon: Zap, color: 'text-orange-600', bgColor: 'bg-orange-500/10' },
  CARDIO: { icon: Zap, color: 'text-orange-600', bgColor: 'bg-orange-500/10' },
}

const SECTION_TITLE_KEYS: Record<string, string> = {
  PASS: 'sections.workout',
  UPPVÄRMNING: 'sections.warmup',
  WARMUP: 'sections.warmup',
  HUVUDPASS: 'sections.main',
  MAIN: 'sections.main',
  STYRKA: 'sections.strength',
  CORE: 'sections.core',
  NEDVARVNING: 'sections.cooldown',
  COOLDOWN: 'sections.cooldown',
  KONDITION: 'sections.cardio',
  CARDIO: 'sections.cardio',
}

function parseWorkoutInstructions(instructions: string): ParsedSection[] {
  const sections: ParsedSection[] = []

  // Split by section headers (=== SECTION ===)
  const sectionRegex = /===\s*([^=]+)\s*===/g
  const parts = instructions.split(sectionRegex)

  // If no sections found, treat entire text as single section
  if (parts.length <= 1) {
    const items = instructions
      .split(/[•\n]/)
      .map(item => item.trim())
      .filter(item => item.length > 0 && !item.startsWith('==='))

    if (items.length > 0) {
      sections.push({
        title: 'PASS',
        icon: Dumbbell,
        color: 'text-blue-600',
        bgColor: 'bg-blue-500/10',
        items
      })
    }
    return sections
  }

  // Parse sections
  for (let i = 1; i < parts.length; i += 2) {
    const sectionTitle = parts[i]?.trim().toUpperCase() || ''
    const sectionContent = parts[i + 1] || ''

    // Parse items from section content
    const items = sectionContent
      .split(/[•\n]/)
      .map(item => item.trim())
      .filter(item => item.length > 0 && !item.startsWith('==='))

    if (items.length > 0) {
      const config = SECTION_CONFIG[sectionTitle] || {
        icon: Dumbbell,
        color: 'text-slate-600',
        bgColor: 'bg-slate-500/10'
      }

      sections.push({
        title: sectionTitle,
        icon: config.icon,
        color: config.color,
        bgColor: config.bgColor,
        items
      })
    }
  }

  return sections
}

function formatExerciseItem(item: string): { name: string; details?: string } {
  // Try to parse exercise format like "Knäböj: 3×16 @ 50% - Vila 45s [Tempo: 2-0-2-0]"
  const colonIndex = item.indexOf(':')
  if (colonIndex > 0 && colonIndex < 30) {
    return {
      name: item.substring(0, colonIndex).trim(),
      details: item.substring(colonIndex + 1).trim()
    }
  }
  return { name: item }
}

export function FormattedWorkoutInstructions({
  instructions,
  variant = 'compact',
  maxItems = 4,
  className
}: FormattedWorkoutInstructionsProps) {
  const t = useTranslations('components.formattedWorkoutInstructions')
  const sections = useMemo(() => parseWorkoutInstructions(instructions), [instructions])

  const formatSectionTitle = (title: string): string => {
    const key = SECTION_TITLE_KEYS[title]
    return key ? t(key) : title.charAt(0) + title.slice(1).toLowerCase()
  }

  if (sections.length === 0) {
    return null
  }

  // Compact variant - single line summary
  if (variant === 'compact') {
    const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0)
    const displaySections = sections.slice(0, 2)

    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex flex-wrap gap-1.5">
          {displaySections.map((section, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className={cn('text-xs', section.bgColor, section.color)}
            >
              <section.icon className="h-3 w-3 mr-1" />
              {formatSectionTitle(section.title)} ({section.items.length})
            </Badge>
          ))}
          {sections.length > 2 && (
            <Badge variant="outline" className="text-xs">
              {t('moreSections', { count: sections.length - 2 })}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('totalExercises', { count: totalItems })}
        </p>
      </div>
    )
  }

  // Expanded variant - shows items in each section
  if (variant === 'expanded') {
    return (
      <div className={cn('space-y-3', className)}>
        {sections.map((section, sectionIdx) => {
          const Icon = section.icon
          const displayItems = section.items.slice(0, maxItems)
          const hasMore = section.items.length > maxItems

          return (
            <div key={sectionIdx} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className={cn('p-1 rounded', section.bgColor)}>
                  <Icon className={cn('h-3 w-3', section.color)} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {formatSectionTitle(section.title)}
                </span>
              </div>
              <div className="pl-6 space-y-1">
                {displayItems.map((item, itemIdx) => {
                  const { name, details } = formatExerciseItem(item)
                  return (
                    <div key={itemIdx} className="text-xs">
                      <span className="font-medium">{name}</span>
                      {details && (
                        <span className="text-muted-foreground ml-1">
                          {details}
                        </span>
                      )}
                    </div>
                  )
                })}
                {hasMore && (
                  <p className="text-xs text-muted-foreground italic">
                    {t('moreExercises', { count: section.items.length - maxItems })}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Card variant - full display with cards
  return (
    <div className={cn('space-y-3', className)}>
      {sections.map((section, sectionIdx) => {
        const Icon = section.icon

        return (
          <div
            key={sectionIdx}
            className={cn(
              'rounded-lg border p-3 space-y-2',
              section.bgColor,
              'border-current/10'
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className={cn('h-4 w-4', section.color)} />
              <span className={cn('text-sm font-semibold', section.color)}>
                {formatSectionTitle(section.title)}
              </span>
              <Badge variant="outline" className="ml-auto text-xs">
                {t('exerciseCount', { count: section.items.length })}
              </Badge>
            </div>
            <ul className="space-y-1.5">
              {section.items.map((item, itemIdx) => {
                const { name, details } = formatExerciseItem(item)
                return (
                  <li
                    key={itemIdx}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="text-muted-foreground mt-1">•</span>
                    <div>
                      <span className="font-medium">{name}</span>
                      {details && (
                        <span className="text-muted-foreground block text-xs">
                          {details}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

export default FormattedWorkoutInstructions
