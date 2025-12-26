'use client'

/**
 * CardioTemplateLibrary Component
 *
 * Browse and use system cardio templates.
 * Coaches can preview, filter, and copy templates to their library.
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search,
  Clock,
  MapPin,
  Heart,
  Activity,
  Copy,
  Check,
  Bike,
  Waves,
  Snowflake,
  Filter,
  X,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

// Running icon (use Activity as fallback)
const RunningIcon = Activity

interface CardioSegment {
  type: string
  duration?: number
  distance?: number
  pace?: number
  zone?: number
  notes?: string
  repeats?: number
}

interface CardioTemplate {
  id: string
  name: string
  description: string
  sport: string
  segments: CardioSegment[]
  totalDuration: number
  totalDistance?: number
  avgZone: number
  tags: string[]
  createdAt: string
}

interface CardioTemplateLibraryProps {
  onTemplateSelect?: (template: CardioTemplate) => void
  onClose?: () => void
  showCopyButton?: boolean
}

const SPORT_ICONS: Record<string, React.ReactNode> = {
  RUNNING: <RunningIcon className="h-4 w-4" />,
  CYCLING: <Bike className="h-4 w-4" />,
  SWIMMING: <Waves className="h-4 w-4" />,
  SKIING: <Snowflake className="h-4 w-4" />,
}

const SPORT_COLORS: Record<string, string> = {
  RUNNING: 'bg-green-100 text-green-700',
  CYCLING: 'bg-blue-100 text-blue-700',
  SWIMMING: 'bg-cyan-100 text-cyan-700',
  SKIING: 'bg-indigo-100 text-indigo-700',
}

const ZONE_COLORS: Record<number, string> = {
  1: 'bg-gray-100 text-gray-700',
  2: 'bg-green-100 text-green-700',
  3: 'bg-yellow-100 text-yellow-700',
  4: 'bg-orange-100 text-orange-700',
  5: 'bg-red-100 text-red-700',
}

const SEGMENT_TYPE_LABELS: Record<string, string> = {
  WARMUP: 'Uppvärmning',
  COOLDOWN: 'Nedvarvning',
  INTERVAL: 'Intervall',
  STEADY: 'Jämnt',
  RECOVERY: 'Återhämtning',
  HILL: 'Backe',
  DRILLS: 'Övningar',
}

export function CardioTemplateLibrary({
  onTemplateSelect,
  onClose,
  showCopyButton = true,
}: CardioTemplateLibraryProps) {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<CardioTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<CardioTemplate | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [sportFilter, setSportFilter] = useState<string>('')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [availableTags, setAvailableTags] = useState<string[]>([])

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (sportFilter) params.set('sport', sportFilter)
      if (tagFilter) params.set('tag', tagFilter)
      if (searchQuery) params.set('search', searchQuery)

      const response = await fetch(`/api/cardio-templates?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setTemplates(result.data.templates)
        setAvailableTags(result.data.filters.availableTags)
      }
    } catch {
      toast({
        title: 'Fel',
        description: 'Kunde inte hämta mallar',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [sportFilter, tagFilter, searchQuery, toast])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // Copy template to coach's library
  const handleCopyTemplate = async (template: CardioTemplate) => {
    setCopying(template.id)
    try {
      const response = await fetch('/api/cardio-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Mall kopierad',
          description: `"${template.name}" har lagts till i ditt bibliotek`,
        })
      } else {
        throw new Error(result.error)
      }
    } catch {
      toast({
        title: 'Fel',
        description: 'Kunde inte kopiera mallen',
        variant: 'destructive',
      })
    } finally {
      setCopying(null)
    }
  }

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    if (mins >= 60) {
      const hours = Math.floor(mins / 60)
      const remainingMins = mins % 60
      return `${hours}h ${remainingMins}min`
    }
    return `${mins} min`
  }

  // Format distance
  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`
    }
    return `${meters}m`
  }

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('')
    setSportFilter('')
    setTagFilter('')
  }

  const hasActiveFilters = !!searchQuery || !!sportFilter || !!tagFilter

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök mallar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={sportFilter} onValueChange={setSportFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sport" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla sporter</SelectItem>
            <SelectItem value="RUNNING">Löpning</SelectItem>
            <SelectItem value="CYCLING">Cykling</SelectItem>
            <SelectItem value="SWIMMING">Simning</SelectItem>
            <SelectItem value="SKIING">Skidåkning</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla typer</SelectItem>
            {availableTags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Rensa filter
          </Button>
        )}
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Inga mallar hittades</p>
          {hasActiveFilters && (
            <Button variant="link" onClick={clearFilters}>
              Rensa filter och försök igen
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedTemplate(template)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={cn('text-xs', SPORT_COLORS[template.sport])}>
                      {SPORT_ICONS[template.sport]}
                      <span className="ml-1">{template.sport}</span>
                    </Badge>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', ZONE_COLORS[Math.round(template.avgZone)])}
                  >
                    Zon {Math.round(template.avgZone)}
                  </Badge>
                </div>
                <CardTitle className="text-base mt-2">{template.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(template.totalDuration)}
                  </div>
                  {template.totalDistance && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {formatDistance(template.totalDistance)}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {template.segments.length} segment
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {template.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {template.tags.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{template.tags.length - 4}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Preview Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={cn('text-xs', SPORT_COLORS[selectedTemplate.sport])}>
                    {SPORT_ICONS[selectedTemplate.sport]}
                    <span className="ml-1">{selectedTemplate.sport}</span>
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', ZONE_COLORS[Math.round(selectedTemplate.avgZone)])}
                  >
                    Zon {Math.round(selectedTemplate.avgZone)}
                  </Badge>
                </div>
                <DialogTitle>{selectedTemplate.name}</DialogTitle>
                <DialogDescription>
                  {selectedTemplate.description.split('\n')[0]}
                </DialogDescription>
              </DialogHeader>

              {/* Quick Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground border-b pb-4">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDuration(selectedTemplate.totalDuration)}
                </div>
                {selectedTemplate.totalDistance && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {formatDistance(selectedTemplate.totalDistance)}
                  </div>
                )}
              </div>

              {/* Segments */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Segment</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedTemplate.segments.map((segment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          {SEGMENT_TYPE_LABELS[segment.type] || segment.type}
                        </Badge>
                        {segment.notes && (
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {segment.notes}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {segment.duration && (
                          <span>{formatDuration(segment.duration)}</span>
                        )}
                        {segment.zone && (
                          <Badge
                            variant="outline"
                            className={cn('text-xs', ZONE_COLORS[segment.zone])}
                          >
                            Z{segment.zone}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {selectedTemplate.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  Stäng
                </Button>
                {onTemplateSelect && (
                  <Button
                    onClick={() => {
                      onTemplateSelect(selectedTemplate)
                      setSelectedTemplate(null)
                      onClose?.()
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Använd mall
                  </Button>
                )}
                {showCopyButton && (
                  <Button
                    onClick={() => handleCopyTemplate(selectedTemplate)}
                    disabled={copying === selectedTemplate.id}
                  >
                    {copying === selectedTemplate.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    Kopiera till bibliotek
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CardioTemplateLibrary
