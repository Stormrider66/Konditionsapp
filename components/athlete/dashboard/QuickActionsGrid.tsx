'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Bluetooth,
  ChevronRight,
  Dumbbell,
  Library,
  MapPin,
  Play,
  Plus,
  ShieldAlert,
  Utensils,
  Zap,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { InputMethodSelector } from '@/components/athlete/adhoc/InputMethodSelector'
import { MealInputMethodSelector, type MealInputMethod } from '@/components/athlete/nutrition/MealInputMethodSelector'
import { VoiceMealCapture } from '@/components/athlete/nutrition/VoiceMealCapture'
import { QuickMealLog } from '@/components/athlete/nutrition/QuickMealLog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useTranslations } from '@/i18n/client'

interface QuickActionsGridProps {
  sessionHref: string
  sessionLabel: string
  showInjuryReport?: boolean
}

const TILE_BASE =
  'dark:bg-slate-800/50 dark:hover:bg-slate-700/60 bg-white hover:bg-slate-50 rounded-xl p-4 ring-1 ring-black/5 dark:ring-white/5 hover:ring-black/10 dark:hover:ring-white/10 transition-all cursor-pointer flex flex-col items-center gap-2'

export function QuickActionsGrid({ sessionHref, sessionLabel, showInjuryReport = true }: QuickActionsGridProps) {
  const basePath = useBasePath()
  const t = useTranslations('components.quickActionsGrid')

  const [workoutSelectorOpen, setWorkoutSelectorOpen] = useState(false)
  const [startSessionOpen, setStartSessionOpen] = useState(false)
  const [mealSelectorOpen, setMealSelectorOpen] = useState(false)
  const [voiceMealOpen, setVoiceMealOpen] = useState(false)
  const [quickMealOpen, setQuickMealOpen] = useState(false)
  const [quickMealTab, setQuickMealTab] = useState<'text' | 'ingredients'>('text')
  const [recipeScanRequestKey, setRecipeScanRequestKey] = useState(0)

  const browseWorkoutsHref = `${basePath}/athlete/browse-workouts`
  const isBrowseSession = sessionHref === browseWorkoutsHref
  const isNutritionShortcut = sessionHref === `${basePath}/athlete/nutrition`

  const startSessionOptions: Array<{
    href: string
    title: string
    description: string
    icon: LucideIcon
    color: string
  }> = [
    {
      href: sessionHref,
      title: isBrowseSession ? t('findSession') : sessionLabel,
      description: isBrowseSession ? t('findSessionDescription') : t('assignedSessionDescription'),
      icon: Play,
      color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    },
    {
      href: `${basePath}/athlete/log-workout/run`,
      title: t('recordRun'),
      description: t('recordRunDescription'),
      icon: MapPin,
      color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    },
    {
      href: `${basePath}/athlete/log-workout/erg`,
      title: t('recordErg'),
      description: t('recordErgDescription'),
      icon: Bluetooth,
      color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    },
    ...(!isBrowseSession
      ? [
          {
            href: browseWorkoutsHref,
            title: t('browseTemplates'),
            description: t('browseTemplatesDescription'),
            icon: Dumbbell,
            color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          },
        ]
      : []),
    {
      href: `${basePath}/athlete/training-library`,
      title: t('trainingLibrary'),
      description: t('trainingLibraryDescription'),
      icon: Library,
      color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    },
  ]

  const handleMealMethod = (method: MealInputMethod) => {
    if (method === 'photo') {
      // Use a full navigation here because dialog teardown on mobile browsers can swallow
      // Next router pushes from this callback. The dedicated scan page avoids the old modal issue.
      window.location.assign(`${basePath}/athlete/nutrition/scan?returnTo=dashboard`)
      return
    }

    // Let the selector dialog fully close before opening the next surface.
    // This avoids stacked Radix dialog state races on mobile camera return.
    window.setTimeout(() => {
      if (method === 'voice') {
        setVoiceMealOpen(true)
      } else {
        if (method === 'recipe') setRecipeScanRequestKey((key) => key + 1)
        setQuickMealTab(method === 'ingredients' || method === 'recipe' ? 'ingredients' : 'text')
        setQuickMealOpen(true)
      }
    }, 0)
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {/* Log workout */}
        <button onClick={() => setWorkoutSelectorOpen(true)} className={TILE_BASE}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-500/10 dark:bg-slate-400/10">
            <Plus className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('logWorkout')}</span>
        </button>

        {/* Log food */}
        <button onClick={() => setMealSelectorOpen(true)} className={TILE_BASE}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/10">
            <Utensils className="h-5 w-5 text-emerald-500" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('logFood')}</span>
        </button>

        {/* Start / find session */}
        {isNutritionShortcut ? (
          <Link href={sessionHref} className={TILE_BASE}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-500/10">
              <Zap className="h-5 w-5 text-orange-500" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{sessionLabel}</span>
          </Link>
        ) : (
          <button onClick={() => setStartSessionOpen(true)} className={TILE_BASE}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-500/10">
              <Zap className="h-5 w-5 text-orange-500" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{sessionLabel}</span>
          </button>
        )}

        {/* Video analysis */}
        <Link href={`${basePath}/athlete/video-analysis`} className={TILE_BASE}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/10">
            <Video className="h-5 w-5 text-purple-500" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('videoAnalysis')}</span>
        </Link>

        {showInjuryReport && (
          <Link href={`${basePath}/athlete/injury-report`} className={TILE_BASE}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-500/10">
              <ShieldAlert className="h-5 w-5 text-red-500" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Rapportera skada</span>
          </Link>
        )}
      </div>

      {/* Workout input method selector */}
      <InputMethodSelector open={workoutSelectorOpen} onOpenChange={setWorkoutSelectorOpen} />

      {/* Start session chooser */}
      <Sheet open={startSessionOpen} onOpenChange={setStartSessionOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto bg-white text-slate-950 dark:bg-slate-900 dark:text-white border-slate-200 dark:border-slate-700"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader className="text-left">
            <SheetTitle className="text-slate-950 dark:text-white">{t('startSessionTitle')}</SheetTitle>
            <SheetDescription>{t('startSessionDescription')}</SheetDescription>
          </SheetHeader>

          <div className="grid gap-3 py-4">
            {startSessionOptions.map((option) => {
              const Icon = option.icon

              return (
                <Link
                  key={`${option.href}-${option.title}`}
                  href={option.href}
                  onClick={() => setStartSessionOpen(false)}
                  className="flex items-center gap-4 rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition-all hover:border-primary/50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border ${option.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 dark:text-white">{option.title}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{option.description}</div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
                </Link>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Meal input method selector */}
      <MealInputMethodSelector
        open={mealSelectorOpen}
        onOpenChange={setMealSelectorOpen}
        onSelectMethod={handleMealMethod}
      />

      {/* Voice meal capture sheet */}
      <Sheet open={voiceMealOpen} onOpenChange={setVoiceMealOpen}>
        <SheetContent
          side="bottom"
          className="h-[85vh] overflow-y-auto bg-slate-900 text-white border-slate-700"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader>
            <SheetTitle className="text-white">{t('describeMeal')}</SheetTitle>
          </SheetHeader>
          <VoiceMealCapture
            onMealSaved={() => {
              setVoiceMealOpen(false)
              window.dispatchEvent(new Event('meal-logged'))
            }}
            onClose={() => setVoiceMealOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Quick meal text log */}
      <QuickMealLog
        open={quickMealOpen}
        onClose={() => setQuickMealOpen(false)}
        onMealSaved={() => {
          setQuickMealOpen(false)
          window.dispatchEvent(new Event('meal-logged'))
        }}
        defaultTab={quickMealTab}
        recipeScanRequestKey={recipeScanRequestKey}
      />
    </>
  )
}
