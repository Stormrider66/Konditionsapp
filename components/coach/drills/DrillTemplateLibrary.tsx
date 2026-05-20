'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IceHockeyRink } from './IceHockeyRink'
import {
  getDrillSports,
  getLocalizedTemplatesBySport,
  getSportCategories,
  type DrillTemplate,
  type DrillCategory,
} from '@/lib/drills/templates'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Copy, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'

interface DrillTemplateLibraryProps {
  onSelect: (template: DrillTemplate) => void
}

const DIFFICULTY_COLORS: Record<string, { color: string; key: string }> = {
  beginner: { key: 'difficulty.beginner', color: 'bg-green-100 text-green-800' },
  intermediate: { key: 'difficulty.intermediate', color: 'bg-yellow-100 text-yellow-800' },
  advanced: { key: 'difficulty.advanced', color: 'bg-red-100 text-red-800' },
}

export function DrillTemplateLibrary({ onSelect }: DrillTemplateLibraryProps) {
  const [selectedSport, setSelectedSport] = useState('ICE_HOCKEY')
  const [selectedCategory, setSelectedCategory] = useState<DrillCategory | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const t = useTranslations('components.drillTemplate')
  const locale = useLocale() === 'sv' ? 'sv' : 'en'

  const drillSports = useMemo(() => getDrillSports(locale), [locale])
  const sportCategories = useMemo(() => getSportCategories(selectedSport, locale), [selectedSport, locale])
  const templates = useMemo(
    () => getLocalizedTemplatesBySport(selectedSport, selectedCategory || undefined, locale),
    [selectedSport, selectedCategory, locale]
  )

  return (
    <div className="space-y-4">
      {/* Sport selector */}
      <Select value={selectedSport} onValueChange={(v) => { setSelectedSport(v); setSelectedCategory(null) }}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {drillSports.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setSelectedCategory(null)}
        >
          {t('library.showAll')}
        </Button>
        {sportCategories.map((cat) => (
          <Button
            key={cat.value}
            variant={selectedCategory === cat.value ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedCategory(cat.value as DrillCategory)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Template cards */}
      <div className="space-y-2">
        {templates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('library.empty')}</p>
            <p className="text-sm mt-1">{t('library.emptyHint')}</p>
          </div>
        )}
        {templates.map((template) => {
          const diff = DIFFICULTY_COLORS[template.difficulty]
          const isExpanded = expandedId === template.id

          return (
            <Card
              key={template.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setExpandedId(isExpanded ? null : template.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-sm truncate">{template.name}</h3>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge variant="outline" className="text-[10px] gap-0.5">
                      <Users className="h-2.5 w-2.5" />
                      {template.playerCount}
                    </Badge>
                    <Badge className={`text-[10px] ${diff.color} border-0`}>
                      {t(diff.key)}
                    </Badge>
                  </div>
                </div>

                {/* Expanded: preview + use button */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t space-y-3">
                    <IceHockeyRink
                      structure={template.structure}
                      width={500}
                      className="mx-auto"
                    />
                    <div className="flex justify-center">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelect(template)
                        }}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        {t('library.useTemplate')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
