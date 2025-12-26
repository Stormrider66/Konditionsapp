'use client'

/**
 * AutoCardioDialog Component
 *
 * Dialog for auto-generating cardio workouts based on goals and parameters.
 */

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
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
  Wand2,
  Clock,
  Heart,
  Activity,
  Bike,
  Waves,
  Snowflake,
  Mountain,
  RefreshCw,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  generateCardioSession,
  generateCardioVariations,
  type GeneratedCardioSession,
  type CardioGenerationParams,
} from '@/lib/cardio-generator'

// Running icon (use Activity as fallback)
const RunningIcon = Activity

interface AutoCardioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSessionGenerated: (session: GeneratedCardioSession) => void
  defaultSport?: 'RUNNING' | 'CYCLING' | 'SWIMMING' | 'SKIING'
}

const SPORT_OPTIONS = [
  { value: 'RUNNING', label: 'Löpning', icon: <RunningIcon className="h-4 w-4" /> },
  { value: 'CYCLING', label: 'Cykling', icon: <Bike className="h-4 w-4" /> },
  { value: 'SWIMMING', label: 'Simning', icon: <Waves className="h-4 w-4" /> },
  { value: 'SKIING', label: 'Skidåkning', icon: <Snowflake className="h-4 w-4" /> },
]

const GOAL_OPTIONS = [
  { value: 'BASE_BUILDING', label: 'Basbyggnad', description: 'Bygg aerob bas i zon 2' },
  { value: 'THRESHOLD_DEVELOPMENT', label: 'Tröskelutveckling', description: 'Förbättra mjölksyratröskeln' },
  { value: 'VO2MAX_IMPROVEMENT', label: 'VO2max', description: 'Öka maximal syreupptagning' },
  { value: 'SPEED_DEVELOPMENT', label: 'Fartighetsträning', description: 'Utveckla fart och ekonomi' },
  { value: 'ENDURANCE', label: 'Uthållighet', description: 'Långpass för distans' },
  { value: 'RECOVERY', label: 'Återhämtning', description: 'Aktiv vila och regenerering' },
  { value: 'RACE_PREPARATION', label: 'Tävlingsförberedelse', description: 'Race-specifikt arbete' },
]

const EXPERIENCE_OPTIONS = [
  { value: 'BEGINNER', label: 'Nybörjare', description: '0-1 års träning' },
  { value: 'INTERMEDIATE', label: 'Mellannivå', description: '1-3 års träning' },
  { value: 'ADVANCED', label: 'Avancerad', description: '3-5 års träning' },
  { value: 'ELITE', label: 'Elit', description: '5+ års träning' },
]

const ZONE_COLORS: Record<number, string> = {
  1: 'bg-gray-100 text-gray-700',
  2: 'bg-green-100 text-green-700',
  3: 'bg-yellow-100 text-yellow-700',
  4: 'bg-orange-100 text-orange-700',
  5: 'bg-red-100 text-red-700',
}

export function AutoCardioDialog({
  open,
  onOpenChange,
  onSessionGenerated,
  defaultSport = 'RUNNING',
}: AutoCardioDialogProps) {
  const { toast } = useToast()

  // Form state
  const [sport, setSport] = useState<'RUNNING' | 'CYCLING' | 'SWIMMING' | 'SKIING'>(defaultSport)
  const [goal, setGoal] = useState<CardioGenerationParams['goal']>('BASE_BUILDING')
  const [targetDuration, setTargetDuration] = useState(45)
  const [experienceLevel, setExperienceLevel] = useState<CardioGenerationParams['experienceLevel']>('INTERMEDIATE')
  const [includeWarmup, setIncludeWarmup] = useState(true)
  const [includeCooldown, setIncludeCooldown] = useState(true)
  const [includeHills, setIncludeHills] = useState(false)
  const [includeDrills, setIncludeDrills] = useState(false)

  // Generated sessions
  const [generatedSessions, setGeneratedSessions] = useState<GeneratedCardioSession[]>([])
  const [selectedVariation, setSelectedVariation] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [step, setStep] = useState<'configure' | 'preview'>('configure')

  // Generate sessions
  const handleGenerate = () => {
    setIsGenerating(true)

    // Simulate async for UX feedback
    setTimeout(() => {
      const params: CardioGenerationParams = {
        sport,
        goal,
        targetDuration,
        experienceLevel,
        includeWarmup,
        includeCooldown,
        includeHills,
        includeDrills,
      }

      try {
        const sessions = generateCardioVariations(params, 3)
        setGeneratedSessions(sessions)
        setSelectedVariation(0)
        setStep('preview')
      } catch {
        toast({
          title: 'Fel',
          description: 'Kunde inte generera pass',
          variant: 'destructive',
        })
      } finally {
        setIsGenerating(false)
      }
    }, 500)
  }

  // Handle selection
  const handleSelect = () => {
    const selectedSession = generatedSessions[selectedVariation]
    if (selectedSession) {
      onSessionGenerated(selectedSession)
      handleClose()
    }
  }

  // Reset and close
  const handleClose = () => {
    setStep('configure')
    setGeneratedSessions([])
    setSelectedVariation(0)
    onOpenChange(false)
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

  // Current selected session
  const currentSession = generatedSessions[selectedVariation]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            {step === 'configure' ? 'Generera Cardiopass' : 'Förhandsgranska Pass'}
          </DialogTitle>
          <DialogDescription>
            {step === 'configure'
              ? 'Konfigurera dina inställningar för att automatiskt generera ett träningspass.'
              : 'Välj den variation som passar bäst för din atlet.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'configure' ? (
          <div className="space-y-6 py-4">
            {/* Sport Selection */}
            <div className="space-y-2">
              <Label>Sport</Label>
              <div className="grid grid-cols-4 gap-2">
                {SPORT_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={sport === option.value ? 'default' : 'outline'}
                    className="flex flex-col h-auto py-3"
                    onClick={() => setSport(option.value as typeof sport)}
                  >
                    {option.icon}
                    <span className="text-xs mt-1">{option.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Goal Selection */}
            <div className="space-y-2">
              <Label>Träningsmål</Label>
              <Select value={goal} onValueChange={(v) => setGoal(v as typeof goal)}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj mål" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Längd
                </Label>
                <Badge variant="outline" className="text-lg px-3">
                  {targetDuration} min
                </Badge>
              </div>
              <Slider
                value={[targetDuration]}
                onValueChange={([value]) => setTargetDuration(value)}
                min={15}
                max={120}
                step={5}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>15 min</span>
                <span>60 min</span>
                <span>120 min</span>
              </div>
            </div>

            {/* Experience Level */}
            <div className="space-y-2">
              <Label>Erfarenhetsnivå</Label>
              <Select value={experienceLevel} onValueChange={(v) => setExperienceLevel(v as typeof experienceLevel)}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj nivå" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <Label>Alternativ</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="warmup" className="text-sm">Uppvärmning</Label>
                  <Switch
                    id="warmup"
                    checked={includeWarmup}
                    onCheckedChange={setIncludeWarmup}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="cooldown" className="text-sm">Nedvarvning</Label>
                  <Switch
                    id="cooldown"
                    checked={includeCooldown}
                    onCheckedChange={setIncludeCooldown}
                  />
                </div>
                {(sport === 'RUNNING' || sport === 'CYCLING') && (
                  <div className="flex items-center justify-between">
                    <Label htmlFor="hills" className="text-sm flex items-center gap-2">
                      <Mountain className="h-4 w-4" />
                      Backar
                    </Label>
                    <Switch
                      id="hills"
                      checked={includeHills}
                      onCheckedChange={setIncludeHills}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label htmlFor="drills" className="text-sm">Övningar</Label>
                  <Switch
                    id="drills"
                    checked={includeDrills}
                    onCheckedChange={setIncludeDrills}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Variation Selector */}
            {generatedSessions.length > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedVariation((prev) => Math.max(0, prev - 1))}
                  disabled={selectedVariation === 0}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Variation {selectedVariation + 1} av {generatedSessions.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setSelectedVariation((prev) => Math.min(generatedSessions.length - 1, prev + 1))
                  }
                  disabled={selectedVariation === generatedSessions.length - 1}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}

            {currentSession && (
              <>
                {/* Session Overview */}
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold text-lg mb-2">{currentSession.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{currentSession.description}</p>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDuration(currentSession.totalDuration)}
                      </div>
                      <Badge className={cn('text-xs', ZONE_COLORS[Math.round(currentSession.avgZone)])}>
                        Snitt Zon {currentSession.avgZone}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Zone Distribution */}
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Zonfördelning
                    </h4>
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((zone) => {
                        const percentage = currentSession.zoneDistribution[`zone${zone}` as keyof typeof currentSession.zoneDistribution]
                        return (
                          <div key={zone} className="flex items-center gap-3">
                            <Badge className={cn('text-xs w-14', ZONE_COLORS[zone])}>
                              Zon {zone}
                            </Badge>
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className={cn(
                                  'h-2 rounded-full transition-all',
                                  zone === 1 && 'bg-gray-400',
                                  zone === 2 && 'bg-green-500',
                                  zone === 3 && 'bg-yellow-500',
                                  zone === 4 && 'bg-orange-500',
                                  zone === 5 && 'bg-red-500'
                                )}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {percentage}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Segments */}
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-medium text-sm mb-3">Segment ({currentSession.segments.length})</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {currentSession.segments.map((segment, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {segment.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {segment.notes}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{formatDuration(segment.duration)}</span>
                            <Badge className={cn('text-xs', ZONE_COLORS[segment.zone])}>
                              Z{segment.zone}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {currentSession.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'configure' ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Avbryt
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Genererar...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generera pass
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('configure')}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Tillbaka
              </Button>
              <Button variant="outline" onClick={handleGenerate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generera igen
              </Button>
              <Button onClick={handleSelect}>
                <Check className="h-4 w-4 mr-2" />
                Använd detta pass
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AutoCardioDialog
