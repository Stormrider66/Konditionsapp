'use client'

/**
 * WODPreviewScreen
 *
 * Beautiful full-screen introduction to the generated workout.
 * Shows workout details, readiness indicator, and section previews.
 * Leads into Focus Mode for workout execution.
 */

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Play,
  RefreshCw,
  X,
  Timer,
  Dumbbell,
  Zap,
  Flame,
  Target,
  Clock,
  ChevronDown,
  Heart,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import type { WODResponse, WODSection, WODSectionType } from '@/types/wod'
import { WOD_LABELS } from '@/types/wod'
import type { WODWorkoutType } from '@/types/wod'
import { cn } from '@/lib/utils'

interface WODPreviewScreenProps {
  response: WODResponse
  onStart: () => void
  onRegenerate: () => void
  onClose: () => void
}

// Section visual config
const SECTION_CONFIG: Record<WODSectionType, {
  icon: typeof Flame
  color: string
  bgColor: string
  borderColor: string
}> = {
  WARMUP: {
    icon: Flame,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
  },
  MAIN: {
    icon: Dumbbell,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  CORE: {
    icon: Target,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  COOLDOWN: {
    icon: Clock,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
  },
}

// Hero images based on intensity
const INTENSITY_IMAGES: Record<string, string> = {
  recovery: '/images/core/bird-dog-1.png',
  easy: '/images/foot-ankle/running-1.png',
  moderate: '/images/knee-dominance/knaboj-1.png',
  threshold: '/images/posterior-chain/marklyft-1.png',
}

export function WODPreviewScreen({
  response,
  onStart,
  onRegenerate,
  onClose,
}: WODPreviewScreenProps) {
  const { metadata, workout } = response
  const [openSections, setOpenSections] = useState<string[]>(['MAIN'])

  const toggleSection = (type: string) => {
    setOpenSections(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  // Get hero image
  const heroImage = INTENSITY_IMAGES[metadata.adjustedIntensity] || INTENSITY_IMAGES.moderate

  // Get readiness message
  const getReadinessMessage = () => {
    if (metadata.readinessScore === null) return WOD_LABELS.readiness.unknown
    if (metadata.readinessScore >= 7) return WOD_LABELS.readiness.high
    if (metadata.readinessScore >= 5) return WOD_LABELS.readiness.medium
    return WOD_LABELS.readiness.low
  }

  // Intensity badge color
  const getIntensityBadgeColor = () => {
    switch (metadata.adjustedIntensity) {
      case 'recovery':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'threshold':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Hero Section */}
      <div className="relative h-[40vh] min-h-[300px]">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt="Workout"
            fill
            className="object-cover object-center"
            priority
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors"
        >
          <X className="h-5 w-5 text-white" />
        </button>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-8">
          {/* AI Badge + Workout Type */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
              <Sparkles className="h-3 w-3 mr-1" />
              AI-genererat pass
            </Badge>
            {metadata.workoutType && (
              <Badge variant="secondary" className="text-sm">
                {WOD_LABELS.workoutTypes[metadata.workoutType as WODWorkoutType]?.title || 'Styrka'}
              </Badge>
            )}
          </div>

          {/* Title with glow effect */}
          <h1
            className="text-3xl md:text-4xl font-bold text-white mb-2"
            style={{
              textShadow: '0 0 20px rgba(251, 146, 60, 0.4), 0 0 40px rgba(239, 68, 68, 0.2)',
            }}
          >
            {workout.title}
          </h1>

          <p className="text-lg text-white/80 mb-4">{workout.subtitle}</p>

          {/* Stats row */}
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary" className="text-sm">
              <Timer className="h-3 w-3 mr-1" />
              {workout.totalDuration} min
            </Badge>
            <Badge variant="secondary" className="text-sm">
              <Dumbbell className="h-3 w-3 mr-1" />
              {workout.totalExercises} övningar
            </Badge>
            <Badge className={cn('text-sm', getIntensityBadgeColor())}>
              <Zap className="h-3 w-3 mr-1" />
              {WOD_LABELS.intensity[metadata.adjustedIntensity]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-32 -mt-4 relative z-10 max-w-2xl mx-auto">
        {/* Readiness indicator */}
        <GlassCard className="mb-4">
          <GlassCardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-full',
                metadata.readinessScore !== null && metadata.readinessScore >= 7
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : metadata.readinessScore !== null && metadata.readinessScore >= 5
                    ? 'bg-yellow-100 dark:bg-yellow-900/30'
                    : 'bg-orange-100 dark:bg-orange-900/30'
              )}>
                <Heart className={cn(
                  'h-5 w-5',
                  metadata.readinessScore !== null && metadata.readinessScore >= 7
                    ? 'text-green-600 dark:text-green-400'
                    : metadata.readinessScore !== null && metadata.readinessScore >= 5
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-orange-600 dark:text-orange-400'
                )} />
              </div>
              <div>
                <p className="font-medium">{getReadinessMessage()}</p>
                {metadata.readinessScore !== null && (
                  <p className="text-sm text-muted-foreground">
                    Beredskap: {metadata.readinessScore.toFixed(1)}/10
                  </p>
                )}
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Guardrails applied */}
        {metadata.guardrailsApplied.length > 0 && (
          <GlassCard className="mb-4 border-yellow-200 dark:border-yellow-800">
            <GlassCardContent className="py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-700 dark:text-yellow-400">
                    Anpassningar gjorda
                  </p>
                  {metadata.guardrailsApplied.map((g, i) => (
                    <p key={i} className="text-muted-foreground">{g.description}</p>
                  ))}
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Description */}
        <p className="text-muted-foreground mb-6">{workout.description}</p>

        {/* Sections */}
        <div className="space-y-3 mb-6">
          {workout.sections.map(section => {
            const config = SECTION_CONFIG[section.type] || SECTION_CONFIG.MAIN
            const Icon = config.icon
            const isOpen = openSections.includes(section.type)

            return (
              <Collapsible
                key={section.type}
                open={isOpen}
                onOpenChange={() => toggleSection(section.type)}
              >
                <GlassCard className={cn(config.borderColor, 'border')}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full">
                      <GlassCardHeader className={cn(config.bgColor, 'py-3 px-4')}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon className={cn('h-4 w-4', config.color)} />
                            <div className="text-left">
                              <p className="font-medium">{section.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {section.exercises.length} övningar &bull; {section.duration} min
                              </p>
                            </div>
                          </div>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 text-muted-foreground transition-transform',
                              isOpen && 'rotate-180'
                            )}
                          />
                        </div>
                      </GlassCardHeader>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <GlassCardContent className="pt-0 pb-3">
                      <div className="space-y-2">
                        {section.exercises.map((exercise, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-2 border-b last:border-0 border-border/50"
                          >
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                                config.bgColor,
                                config.color
                              )}>
                                {idx + 1}
                              </span>
                              <div>
                                <p className="font-medium text-sm">{exercise.nameSv}</p>
                                {exercise.instructions && (
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {exercise.instructions}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              {exercise.sets && exercise.reps && (
                                <span>{exercise.sets}×{exercise.reps}</span>
                              )}
                              {exercise.duration && !exercise.sets && (
                                <span>{exercise.duration}s</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </GlassCardContent>
                  </CollapsibleContent>
                </GlassCard>
              </Collapsible>
            )
          })}
        </div>

        {/* Coach notes */}
        {workout.coachNotes && (
          <GlassCard className="mb-6">
            <GlassCardContent className="py-4">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-orange-500 shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-sm mb-1">AI-resonemang</p>
                  <p className="text-sm text-muted-foreground">{workout.coachNotes}</p>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}
      </div>

      {/* Fixed bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent z-[60] pointer-events-auto">
        <div className="max-w-2xl mx-auto flex gap-3 pointer-events-auto">
          <Button
            variant="outline"
            onClick={onRegenerate}
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Generera nytt
          </Button>
          <Button
            type="button"
            onClick={onStart}
            className="flex-[2] bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 cursor-pointer"
          >
            <Play className="h-4 w-4 mr-2" />
            Starta Pass
          </Button>
        </div>
      </div>
    </div>
  )
}
