'use client'

/**
 * StrengthTemplateSelector Component
 *
 * Allows self-service athletes to browse and select strength templates.
 * Used for PRO/ENTERPRISE subscription tiers.
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dumbbell,
  Clock,
  Target,
  Flame,
  Timer,
  Calendar,
  CheckCircle2,
  Search,
  Loader2,
  AlertCircle,
  Zap,
  Shield,
  TrendingUp,
} from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

interface TemplateSummary {
  id: string
  name: string
  nameSv: string
  description: string
  descriptionSv: string
  category: string
  phase: string
  sessionsPerWeek: number
  estimatedDuration: number
  athleteLevel: string
  equipmentRequired: string[]
  includesWarmup: boolean
  includesCore: boolean
  includesCooldown: boolean
  tags: string[]
  exerciseCount: number
  isSystemTemplate: boolean
}

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  RUNNER: { label: 'Löpare', icon: TrendingUp, color: 'bg-blue-100 text-blue-800' },
  BEGINNER: { label: 'Nybörjare', icon: Target, color: 'bg-green-100 text-green-800' },
  MARATHON: { label: 'Maraton', icon: Target, color: 'bg-purple-100 text-purple-800' },
  INJURY_PREVENTION: { label: 'Skadeprevention', icon: Shield, color: 'bg-yellow-100 text-yellow-800' },
  POWER: { label: 'Kraft', icon: Zap, color: 'bg-red-100 text-red-800' },
  MAINTENANCE: { label: 'Underhåll', icon: Dumbbell, color: 'bg-gray-100 text-gray-800' },
}

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Nybörjare',
  INTERMEDIATE: 'Mellan',
  ADVANCED: 'Avancerad',
  ELITE: 'Elit',
}

interface StrengthTemplateSelectorProps {
  onAssigned?: () => void
}

export function StrengthTemplateSelector({ onAssigned }: StrengthTemplateSelectorProps) {
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSummary | null>(null)
  const [assignDate, setAssignDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignSuccess, setAssignSuccess] = useState(false)

  // Fetch templates
  useEffect(() => {
    async function fetchTemplates() {
      try {
        setIsLoading(true)
        const params = new URLSearchParams()
        if (categoryFilter !== 'ALL') params.set('category', categoryFilter)
        if (searchQuery) params.set('q', searchQuery)

        const response = await fetch(`/api/strength-templates/system?${params}`)
        if (!response.ok) throw new Error('Failed to fetch templates')

        const result = await response.json()
        setTemplates(result.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplates()
  }, [categoryFilter, searchQuery])

  // Handle template assignment
  const handleAssign = async () => {
    if (!selectedTemplate) return

    setIsAssigning(true)
    setAssignError(null)

    try {
      const response = await fetch('/api/athlete/strength-sessions/self-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          assignedDate: assignDate,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.upgradeRequired) {
          setAssignError('Du behöver PRO-prenumeration för att använda denna funktion.')
        } else {
          setAssignError(result.error || 'Kunde inte tilldela passet')
        }
        return
      }

      setAssignSuccess(true)
      setTimeout(() => {
        setSelectedTemplate(null)
        setAssignSuccess(false)
        if (onAssigned) onAssigned()
      }, 1500)
    } catch (err) {
      setAssignError('Ett fel uppstod. Försök igen.')
    } finally {
      setIsAssigning(false)
    }
  }

  // Filter templates by search
  const filteredTemplates = templates.filter((t) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      t.nameSv.toLowerCase().includes(query) ||
      t.descriptionSv.toLowerCase().includes(query) ||
      t.tags.some((tag) => tag.includes(query))
    )
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-800">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök mallar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alla kategorier</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Inga mallar hittades.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredTemplates.map((template) => {
            const categoryInfo = CATEGORY_LABELS[template.category] || {
              label: template.category,
              icon: Dumbbell,
              color: 'bg-gray-100 text-gray-800',
            }
            const CategoryIcon = categoryInfo.icon

            return (
              <Card
                key={template.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedTemplate(template)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={categoryInfo.color}>
                          <CategoryIcon className="h-3 w-3 mr-1" />
                          {categoryInfo.label}
                        </Badge>
                        <Badge variant="outline">
                          {LEVEL_LABELS[template.athleteLevel]}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{template.nameSv}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {template.descriptionSv}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pb-4">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <Dumbbell className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">{template.exerciseCount}</p>
                      <p className="text-xs text-muted-foreground">Övningar</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">{template.estimatedDuration}</p>
                      <p className="text-xs text-muted-foreground">min</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <Calendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">{template.sessionsPerWeek}x</p>
                      <p className="text-xs text-muted-foreground">/vecka</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {template.includesWarmup && (
                      <Badge variant="outline" className="text-xs">
                        <Flame className="h-3 w-3 mr-1 text-yellow-500" />
                        Uppvärmning
                      </Badge>
                    )}
                    {template.includesCore && (
                      <Badge variant="outline" className="text-xs">
                        <Target className="h-3 w-3 mr-1 text-purple-500" />
                        Core
                      </Badge>
                    )}
                    {template.includesCooldown && (
                      <Badge variant="outline" className="text-xs">
                        <Timer className="h-3 w-3 mr-1 text-green-500" />
                        Nedvarvning
                      </Badge>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-0">
                  <Button className="w-full" variant="outline">
                    Välj denna mall
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Assignment dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schemalägg styrkepass</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.nameSv} - {selectedTemplate?.estimatedDuration} min
            </DialogDescription>
          </DialogHeader>

          {assignSuccess ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-green-800">Pass schemalagt!</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Välj datum</Label>
                  <Input
                    id="date"
                    type="date"
                    value={assignDate}
                    onChange={(e) => setAssignDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>

                {selectedTemplate && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium">Passet innehåller:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>- {selectedTemplate.exerciseCount} övningar</li>
                      <li>- Uppskattad tid: {selectedTemplate.estimatedDuration} min</li>
                      {selectedTemplate.includesWarmup && <li>- Uppvärmning</li>}
                      {selectedTemplate.includesCore && <li>- Core-övningar</li>}
                      {selectedTemplate.includesCooldown && <li>- Nedvarvning</li>}
                    </ul>
                  </div>
                )}

                {assignError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
                    {assignError}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  Avbryt
                </Button>
                <Button onClick={handleAssign} disabled={isAssigning}>
                  {isAssigning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Schemalägger...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Schemalägg pass
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default StrengthTemplateSelector
