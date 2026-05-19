'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, Check, Loader2, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/client'

export interface AISkillOption {
  id: string
  name: string
  nameEn?: string | null
  description?: string | null
  category: string
  keywords: string[]
  maxChunks?: number | null
}

interface AISkillsResponse {
  success?: boolean
  data?: {
    maxSelectable?: number
    skills?: AISkillOption[]
  }
  error?: string
}

interface AISkillPickerProps {
  selectedSkillIds: string[]
  onSelectedSkillIdsChange: (skillIds: string[]) => void
  className?: string
  triggerClassName?: string
  chipsClassName?: string
  disabled?: boolean
  endpoint?: string
  maxSelectable?: number
  showSelectedChips?: boolean
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
}

const CATEGORY_LABELS: Record<'en' | 'sv', Record<string, string>> = {
  en: {
    METHODOLOGY: 'Methodology',
    PHYSIOLOGY: 'Physiology',
    TESTING: 'Testing',
    SPORT_SPECIFIC: 'Sport-specific',
    PROGRAMMING: 'Programming',
    RECOVERY: 'Recovery',
    NUTRITION: 'Nutrition',
    STRENGTH: 'Strength',
    INJURY_PREVENTION: 'Injury prevention',
    PERFORMANCE: 'Performance',
    MONITORING: 'Monitoring',
    YOUTH: 'Youth',
    MASTERS: 'Masters',
    PSYCHOLOGY: 'Mental training',
    MOBILITY: 'Mobility',
    TEAM_SPORTS: 'Team sports',
    ANALYSIS: 'Analysis',
    PLATFORM: 'Platform',
  },
  sv: {
    METHODOLOGY: 'Metodik',
    PHYSIOLOGY: 'Fysiologi',
    TESTING: 'Tester',
    SPORT_SPECIFIC: 'Sportspecifikt',
    PROGRAMMING: 'Programmering',
    RECOVERY: 'Återhämtning',
    NUTRITION: 'Nutrition',
    STRENGTH: 'Styrka',
    INJURY_PREVENTION: 'Skadeprevention',
    PERFORMANCE: 'Prestation',
    MONITORING: 'Monitorering',
    YOUTH: 'Ungdom',
    MASTERS: 'Masters',
    PSYCHOLOGY: 'Mental träning',
    MOBILITY: 'Mobilitet',
    TEAM_SPORTS: 'Lagsport',
    ANALYSIS: 'Analys',
    PLATFORM: 'Plattform',
  },
}

function getCategoryLabel(category: string, locale: 'en' | 'sv'): string {
  return CATEGORY_LABELS[locale][category] ?? category
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

function getSkillName(skill: AISkillOption, locale: 'en' | 'sv'): string {
  return locale === 'sv' ? skill.name : skill.nameEn || skill.name
}

function groupSkills(skills: AISkillOption[], locale: 'en' | 'sv'): Array<[string, AISkillOption[]]> {
  const grouped = skills.reduce<Record<string, AISkillOption[]>>((acc, skill) => {
    const category = skill.category || 'OTHER'
    if (!acc[category]) acc[category] = []
    acc[category].push(skill)
    return acc
  }, {})

  return Object.entries(grouped)
    .map(([category, categorySkills]) => [
      category,
      [...categorySkills].sort((a, b) => getSkillName(a, locale).localeCompare(getSkillName(b, locale), locale)),
    ] as [string, AISkillOption[]])
    .sort(([a], [b]) => getCategoryLabel(a, locale).localeCompare(getCategoryLabel(b, locale), locale))
}

export function AISkillPicker({
  selectedSkillIds,
  onSelectedSkillIdsChange,
  className,
  triggerClassName,
  chipsClassName,
  disabled = false,
  endpoint = '/api/ai/skills',
  maxSelectable,
  showSelectedChips = true,
  align = 'end',
  side = 'top',
}: AISkillPickerProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const t = useCallback((svText: string, enText: string) => locale === 'sv' ? svText : enText, [locale])
  const [open, setOpen] = useState(false)
  const [skills, setSkills] = useState<AISkillOption[]>([])
  const [resolvedMaxSelectable, setResolvedMaxSelectable] = useState(maxSelectable ?? 5)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    async function loadSkills() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          signal: controller.signal,
        })
        const payload = await response.json() as AISkillsResponse

        if (!response.ok || !payload.success || !payload.data?.skills) {
          throw new Error(payload.error || t('Kunde inte hämta AI skills.', 'Could not fetch AI skills.'))
        }

        if (!isMounted) return
        setSkills(payload.data.skills)
        setResolvedMaxSelectable(maxSelectable ?? payload.data.maxSelectable ?? 5)
      } catch (fetchError) {
        if (!isMounted || controller.signal.aborted) return
        setError(fetchError instanceof Error ? fetchError.message : t('Kunde inte hämta AI skills.', 'Could not fetch AI skills.'))
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadSkills()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [endpoint, maxSelectable, t])

  const selectedSkills = useMemo(() => {
    const skillMap = new Map(skills.map((skill) => [skill.id, skill]))
    return selectedSkillIds
      .map((id) => skillMap.get(id))
      .filter((skill): skill is AISkillOption => Boolean(skill))
  }, [selectedSkillIds, skills])

  const groupedSkills = useMemo(() => groupSkills(skills, locale), [skills, locale])
  const selectedSet = useMemo(() => new Set(selectedSkillIds), [selectedSkillIds])
  const selectedCount = selectedSkillIds.length

  function toggleSkill(skillId: string) {
    if (selectedSet.has(skillId)) {
      onSelectedSkillIdsChange(selectedSkillIds.filter((id) => id !== skillId))
      return
    }

    if (selectedCount >= resolvedMaxSelectable) return
    onSelectedSkillIdsChange([...selectedSkillIds, skillId])
  }

  function removeSkill(skillId: string) {
    onSelectedSkillIdsChange(selectedSkillIds.filter((id) => id !== skillId))
  }

  function clearSkills() {
    onSelectedSkillIdsChange([])
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={selectedCount > 0 ? 'default' : 'outline'}
              size="sm"
              className={cn('h-9 gap-2', triggerClassName)}
              disabled={disabled}
              aria-label={t('Välj AI skills', 'Select AI skills')}
            >
              <Sparkles className="h-4 w-4" />
              <span>Skills</span>
              {selectedCount > 0 ? (
                <span className="rounded bg-background/20 px-1.5 py-0.5 text-[11px] leading-none">
                  {selectedCount}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align={align}
            side={side}
            className="w-[min(420px,calc(100vw-2rem))] p-0"
          >
            <Command>
              <div className="border-b px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t('AI skills', 'AI skills')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('Välj upp till', 'Choose up to')} {resolvedMaxSelectable} {t('expertområden.', 'expert areas.')}
                    </p>
                  </div>
                  {selectedCount > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={clearSkills}
                    >
                      {t('Rensa', 'Clear')}
                    </Button>
                  ) : null}
                </div>
              </div>
              <CommandInput placeholder={t('Sök metod, test, sport...', 'Search methodology, test, sport...')} />
              <CommandList className="max-h-[360px]">
                {isLoading ? (
                  <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('Hämtar skills...', 'Loading skills...')}
                  </div>
                ) : null}
                {!isLoading && error ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    {error}
                  </div>
                ) : null}
                {!isLoading && !error ? (
                  <>
                    <CommandEmpty>{t('Inga skills matchar sökningen.', 'No skills match your search.')}</CommandEmpty>
                    {groupedSkills.map(([category, categorySkills]) => (
                      <CommandGroup key={category} heading={getCategoryLabel(category, locale)}>
                        {categorySkills.map((skill) => {
                          const isSelected = selectedSet.has(skill.id)
                          const isLimitReached = !isSelected && selectedCount >= resolvedMaxSelectable

                          return (
                            <CommandItem
                              key={skill.id}
                              value={`${skill.name} ${skill.nameEn ?? ''} ${skill.description ?? ''} ${skill.keywords.join(' ')}`}
                              disabled={isLimitReached}
                              onSelect={() => toggleSkill(skill.id)}
                              className="items-start gap-3 py-3"
                            >
                              <span
                                className={cn(
                                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                                  isSelected
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-muted-foreground/30'
                                )}
                              >
                                {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium leading-5">
                                  {getSkillName(skill, locale)}
                                </span>
                                {skill.description ? (
                                  <span className="line-clamp-2 block text-xs leading-5 text-muted-foreground">
                                    {skill.description}
                                  </span>
                                ) : null}
                              </span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    ))}
                  </>
                ) : null}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selectedCount >= resolvedMaxSelectable ? (
          <span className="text-xs text-muted-foreground">Max {resolvedMaxSelectable}</span>
        ) : null}
      </div>

      {showSelectedChips && selectedSkills.length > 0 ? (
        <ScrollArea className={cn('max-w-full', chipsClassName)}>
          <div className="flex max-w-full gap-1.5 pb-1">
            {selectedSkills.map((skill) => (
              <Badge
                key={skill.id}
                variant="secondary"
                className="h-7 shrink-0 gap-1.5 rounded-md px-2 text-xs font-medium"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span className="max-w-[180px] truncate">{getSkillName(skill, locale)}</span>
                <button
                  type="button"
                  onClick={() => removeSkill(skill.id)}
                  className="rounded-sm text-muted-foreground transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={t(`Ta bort ${getSkillName(skill, locale)}`, `Remove ${getSkillName(skill, locale)}`)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Badge>
            ))}
          </div>
        </ScrollArea>
      ) : null}
    </div>
  )
}
