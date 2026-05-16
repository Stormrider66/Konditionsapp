'use client'

import { useEffect, useMemo, useState } from 'react'
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

const CATEGORY_LABELS: Record<string, string> = {
  METHODOLOGY: 'Metodik',
  TESTING: 'Tester',
  SPORT_SPECIFIC: 'Sportspecifikt',
  RECOVERY: 'Återhämtning',
  NUTRITION: 'Nutrition',
  STRENGTH: 'Styrka',
  INJURY_PREVENTION: 'Skadeprevention',
  RACE_DAY: 'Tävlingsdag',
}

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

function groupSkills(skills: AISkillOption[]): Array<[string, AISkillOption[]]> {
  const grouped = skills.reduce<Record<string, AISkillOption[]>>((acc, skill) => {
    const category = skill.category || 'OTHER'
    if (!acc[category]) acc[category] = []
    acc[category].push(skill)
    return acc
  }, {})

  return Object.entries(grouped)
    .map(([category, categorySkills]) => [
      category,
      [...categorySkills].sort((a, b) => a.name.localeCompare(b.name, 'sv')),
    ] as [string, AISkillOption[]])
    .sort(([a], [b]) => getCategoryLabel(a).localeCompare(getCategoryLabel(b), 'sv'))
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
          throw new Error(payload.error || 'Kunde inte hämta AI skills.')
        }

        if (!isMounted) return
        setSkills(payload.data.skills)
        setResolvedMaxSelectable(maxSelectable ?? payload.data.maxSelectable ?? 5)
      } catch (fetchError) {
        if (!isMounted || controller.signal.aborted) return
        setError(fetchError instanceof Error ? fetchError.message : 'Kunde inte hämta AI skills.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadSkills()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [endpoint, maxSelectable])

  const selectedSkills = useMemo(() => {
    const skillMap = new Map(skills.map((skill) => [skill.id, skill]))
    return selectedSkillIds
      .map((id) => skillMap.get(id))
      .filter((skill): skill is AISkillOption => Boolean(skill))
  }, [selectedSkillIds, skills])

  const groupedSkills = useMemo(() => groupSkills(skills), [skills])
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
              aria-label="Välj AI skills"
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
                    <p className="text-sm font-semibold text-foreground">AI skills</p>
                    <p className="text-xs text-muted-foreground">
                      Välj upp till {resolvedMaxSelectable} expertområden.
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
                      Rensa
                    </Button>
                  ) : null}
                </div>
              </div>
              <CommandInput placeholder="Sök metod, test, sport..." />
              <CommandList className="max-h-[360px]">
                {isLoading ? (
                  <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Hämtar skills...
                  </div>
                ) : null}
                {!isLoading && error ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    {error}
                  </div>
                ) : null}
                {!isLoading && !error ? (
                  <>
                    <CommandEmpty>Inga skills matchar sökningen.</CommandEmpty>
                    {groupedSkills.map(([category, categorySkills]) => (
                      <CommandGroup key={category} heading={getCategoryLabel(category)}>
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
                                  {skill.name}
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
                <span className="max-w-[180px] truncate">{skill.name}</span>
                <button
                  type="button"
                  onClick={() => removeSkill(skill.id)}
                  className="rounded-sm text-muted-foreground transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`Ta bort ${skill.name}`}
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
