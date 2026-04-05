'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IceHockeyRink, type DrillStructure } from './IceHockeyRink'
import {
  HOCKEY_DRILL_TEMPLATES,
  DRILL_CATEGORIES,
  type DrillTemplate,
  type DrillCategory,
} from '@/lib/drills/templates'
import { Copy, Users, ChevronDown, ChevronUp } from 'lucide-react'

interface DrillTemplateLibraryProps {
  onSelect: (template: DrillTemplate) => void
}

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Nybörjare', color: 'bg-green-100 text-green-800' },
  intermediate: { label: 'Medel', color: 'bg-yellow-100 text-yellow-800' },
  advanced: { label: 'Avancerad', color: 'bg-red-100 text-red-800' },
}

export function DrillTemplateLibrary({ onSelect }: DrillTemplateLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<DrillCategory | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!selectedCategory) return HOCKEY_DRILL_TEMPLATES
    return HOCKEY_DRILL_TEMPLATES.filter((t) => t.category === selectedCategory)
  }, [selectedCategory])

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setSelectedCategory(null)}
        >
          Alla ({HOCKEY_DRILL_TEMPLATES.length})
        </Button>
        {DRILL_CATEGORIES.map((cat) => {
          const count = HOCKEY_DRILL_TEMPLATES.filter((t) => t.category === cat.value).length
          if (count === 0) return null
          return (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedCategory(cat.value)}
            >
              {cat.label} ({count})
            </Button>
          )
        })}
      </div>

      {/* Template cards */}
      <div className="space-y-2">
        {filtered.map((template) => {
          const diff = DIFFICULTY_LABELS[template.difficulty]
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
                      {diff.label}
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
                        Använd mall
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
