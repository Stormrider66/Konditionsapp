'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Utensils, Zap, Video } from 'lucide-react'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { InputMethodSelector } from '@/components/athlete/adhoc/InputMethodSelector'
import { MealInputMethodSelector } from '@/components/athlete/nutrition/MealInputMethodSelector'
import { VoiceMealCapture } from '@/components/athlete/nutrition/VoiceMealCapture'
import { FoodPhotoScanner } from '@/components/nutrition/FoodPhotoScanner'
import { QuickMealLog } from '@/components/athlete/nutrition/QuickMealLog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface QuickActionsGridProps {
  sessionHref: string
  sessionLabel: string
}

const TILE_BASE =
  'dark:bg-slate-800/50 dark:hover:bg-slate-700/60 bg-white hover:bg-slate-50 rounded-xl p-4 ring-1 ring-black/5 dark:ring-white/5 hover:ring-black/10 dark:hover:ring-white/10 transition-all cursor-pointer flex flex-col items-center gap-2'

export function QuickActionsGrid({ sessionHref, sessionLabel }: QuickActionsGridProps) {
  const basePath = useBasePath()

  const [workoutSelectorOpen, setWorkoutSelectorOpen] = useState(false)
  const [mealSelectorOpen, setMealSelectorOpen] = useState(false)
  const [foodScannerOpen, setFoodScannerOpen] = useState(false)
  const [voiceMealOpen, setVoiceMealOpen] = useState(false)
  const [quickMealOpen, setQuickMealOpen] = useState(false)

  const handleMealMethod = (method: 'photo' | 'voice' | 'quick') => {
    setMealSelectorOpen(false)

    // Let the selector dialog fully close before opening the next sheet.
    // This avoids stacked Radix dialog state races on mobile camera return.
    window.setTimeout(() => {
      if (method === 'photo') setFoodScannerOpen(true)
      else if (method === 'voice') setVoiceMealOpen(true)
      else setQuickMealOpen(true)
    }, 0)
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {/* Logga pass */}
        <button onClick={() => setWorkoutSelectorOpen(true)} className={TILE_BASE}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-500/10 dark:bg-slate-400/10">
            <Plus className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Logga pass</span>
        </button>

        {/* Logga mat */}
        <button onClick={() => setMealSelectorOpen(true)} className={TILE_BASE}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/10">
            <Utensils className="h-5 w-5 text-emerald-500" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Logga mat</span>
        </button>

        {/* Starta / Hitta pass */}
        <Link href={sessionHref} className={TILE_BASE}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-500/10">
            <Zap className="h-5 w-5 text-orange-500" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{sessionLabel}</span>
        </Link>

        {/* Video Analys */}
        <Link href={`${basePath}/athlete/video-analysis`} className={TILE_BASE}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/10">
            <Video className="h-5 w-5 text-purple-500" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Video Analys</span>
        </Link>
      </div>

      {/* Workout input method selector */}
      <InputMethodSelector open={workoutSelectorOpen} onOpenChange={setWorkoutSelectorOpen} />

      {/* Meal input method selector */}
      <MealInputMethodSelector
        open={mealSelectorOpen}
        onOpenChange={setMealSelectorOpen}
        onSelectMethod={handleMealMethod}
      />

      {/* Food photo scanner sheet */}
      <Sheet open={foodScannerOpen} onOpenChange={setFoodScannerOpen}>
        <SheetContent
          side="bottom"
          className="h-[90vh] overflow-y-auto bg-slate-900 text-white border-slate-700"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader>
            <SheetTitle>Fota din mat</SheetTitle>
          </SheetHeader>
          <FoodPhotoScanner
            onMealSaved={() => {
              setFoodScannerOpen(false)
              window.dispatchEvent(new Event('meal-logged'))
            }}
            onClose={() => setFoodScannerOpen(false)}
            redirectPathOnSave={`${basePath}/athlete/dashboard`}
          />
        </SheetContent>
      </Sheet>

      {/* Voice meal capture sheet */}
      <Sheet open={voiceMealOpen} onOpenChange={setVoiceMealOpen}>
        <SheetContent
          side="bottom"
          className="h-[85vh] overflow-y-auto bg-slate-900 text-white border-slate-700"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader>
            <SheetTitle className="text-white">Beskriv din måltid</SheetTitle>
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
      />
    </>
  )
}
