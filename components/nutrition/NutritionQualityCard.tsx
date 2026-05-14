'use client'

import { AlertTriangle, Beef, Droplets, Leaf, Scale } from 'lucide-react'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'

export interface NutritionQuality {
  protein: {
    totalGrams: number
    completeGrams: number
    incompleteKnownGrams: number
    unknownQualityGrams: number
    completePercentOfKnown: number
    knownQualityCoveragePercent: number
    targetCompletePercent: number
    sourceDistribution: {
      animalGrams: number
      plantGrams: number
      mixedGrams: number
      unknownGrams: number
      animalPercent: number
      plantPercent: number
      mixedPercent: number
      unknownPercent: number
    }
  }
  fat: {
    totalGrams: number
    saturatedGrams: number
    monounsaturatedGrams: number
    polyunsaturatedGrams: number
    otherGrams: number
    saturatedPercent: number
    monounsaturatedPercent: number
    polyunsaturatedPercent: number
    otherPercent: number
    knownBreakdownCoveragePercent: number
  }
}

interface NutritionQualityCardProps {
  quality: NutritionQuality
}

const FAT_SEGMENTS = [
  { key: 'saturated', label: 'Mättat', color: 'bg-rose-400' },
  { key: 'mono', label: 'Enkelomättat', color: 'bg-emerald-400' },
  { key: 'poly', label: 'Fleromättat', color: 'bg-sky-400' },
  { key: 'other', label: 'Okänt/övrigt', color: 'bg-slate-500' },
] as const

const SOURCE_SEGMENTS = [
  { key: 'animal', label: 'Animaliskt', color: 'bg-blue-400' },
  { key: 'plant', label: 'Växtbaserat', color: 'bg-lime-400' },
  { key: 'mixed', label: 'Blandat', color: 'bg-violet-400' },
  { key: 'unknown', label: 'Okänt', color: 'bg-slate-500' },
] as const

function formatGrams(value: number): string {
  return `${Math.round(value)}g`
}

function ProgressMarker({ percent }: { percent: number }) {
  return (
    <div
      className="absolute top-0 h-full w-px bg-slate-700/70 dark:bg-white/80"
      style={{ left: `${Math.min(100, Math.max(0, percent))}%` }}
    >
      <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-slate-500 dark:text-slate-400">
        {percent}% mål
      </span>
    </div>
  )
}

function SegmentedBar({
  segments,
}: {
  segments: { label: string; percent: number; color: string }[]
}) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5 flex">
      {segments.map((segment) => (
        <div
          key={segment.label}
          className={segment.color}
          style={{ width: `${Math.max(0, segment.percent)}%` }}
          title={`${segment.label}: ${segment.percent}%`}
        />
      ))}
    </div>
  )
}

export function NutritionQualityCard({ quality }: NutritionQualityCardProps) {
  const protein = quality.protein
  const fat = quality.fat
  const completeGap = protein.targetCompletePercent - protein.completePercentOfKnown
  const lowProteinCoverage = protein.knownQualityCoveragePercent < 50
  const lowFatCoverage = fat.knownBreakdownCoveragePercent < 50
  const hasLowCoverage = lowProteinCoverage || lowFatCoverage

  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="text-base text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
          <Scale className="h-4 w-4" />
          Fett & proteinkvalitet
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent className="space-y-5">
        {hasLowCoverage && (
          <div className="flex gap-2 rounded-lg border border-amber-400/30 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p>
              Låg datatäckning. Största delen av protein/fett kunde inte klassificeras, så kvaliteten ska tolkas försiktigt.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg bg-slate-100 p-3 dark:bg-white/5">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Beef className="h-4 w-4 text-blue-400" />
              Fullvärdigt protein
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {protein.completePercentOfKnown}%
            </p>
            <p className="text-[11px] text-slate-500">
              {formatGrams(protein.completeGrams)} av känt protein
            </p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3 dark:bg-white/5">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Leaf className="h-4 w-4 text-lime-400" />
              Växtbaserat protein
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {protein.sourceDistribution.plantPercent}%
            </p>
            <p className="text-[11px] text-slate-500">
              {formatGrams(protein.sourceDistribution.plantGrams)} totalt
            </p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3 dark:bg-white/5">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Droplets className="h-4 w-4 text-emerald-400" />
              Fettfördelning
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {fat.knownBreakdownCoveragePercent}%
            </p>
            <p className="text-[11px] text-slate-500">
              datatäckning för fettyp
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-700 dark:text-slate-300">Andel fullvärdigt protein</span>
            <span className={lowProteinCoverage ? 'text-amber-300' : completeGap <= 0 ? 'text-emerald-400' : 'text-amber-400'}>
              {lowProteinCoverage ? 'Låg säkerhet' : completeGap <= 0 ? 'Mål uppnått' : `${completeGap}% kvar till mål`}
            </span>
          </div>
          <div className="relative pt-1">
            <div className="h-3 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-400"
                style={{ width: `${Math.min(100, protein.completePercentOfKnown)}%` }}
              />
            </div>
            <ProgressMarker percent={protein.targetCompletePercent} />
          </div>
          <p className="text-[11px] text-slate-500">
            Beräknat på protein där kvaliteten kan bedömas. Datatäckning: {protein.knownQualityCoveragePercent}%.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 dark:text-slate-300">Proteinkälla</span>
              <span className="text-slate-500">{formatGrams(protein.totalGrams)} totalt</span>
            </div>
            <SegmentedBar
              segments={[
                { label: 'Animaliskt', percent: protein.sourceDistribution.animalPercent, color: 'bg-blue-400' },
                { label: 'Växtbaserat', percent: protein.sourceDistribution.plantPercent, color: 'bg-lime-400' },
                { label: 'Blandat', percent: protein.sourceDistribution.mixedPercent, color: 'bg-violet-400' },
                { label: 'Okänt', percent: protein.sourceDistribution.unknownPercent, color: 'bg-slate-500' },
              ]}
            />
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {SOURCE_SEGMENTS.map((segment) => {
                const grams =
                  segment.key === 'animal' ? protein.sourceDistribution.animalGrams
                  : segment.key === 'plant' ? protein.sourceDistribution.plantGrams
                  : segment.key === 'mixed' ? protein.sourceDistribution.mixedGrams
                  : protein.sourceDistribution.unknownGrams
                const percent =
                  segment.key === 'animal' ? protein.sourceDistribution.animalPercent
                  : segment.key === 'plant' ? protein.sourceDistribution.plantPercent
                  : segment.key === 'mixed' ? protein.sourceDistribution.mixedPercent
                  : protein.sourceDistribution.unknownPercent
                return (
                  <div key={segment.key} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <span className={`h-2 w-2 rounded-full ${segment.color}`} />
                      {segment.label}
                    </span>
                    <span className="text-slate-500">{formatGrams(grams)} ({percent}%)</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 dark:text-slate-300">Fettyp</span>
              <span className="text-slate-500">{formatGrams(fat.totalGrams)} totalt</span>
            </div>
            <SegmentedBar
              segments={[
                { label: 'Mättat', percent: fat.saturatedPercent, color: 'bg-rose-400' },
                { label: 'Enkelomättat', percent: fat.monounsaturatedPercent, color: 'bg-emerald-400' },
                { label: 'Fleromättat', percent: fat.polyunsaturatedPercent, color: 'bg-sky-400' },
                { label: 'Okänt/övrigt', percent: fat.otherPercent, color: 'bg-slate-500' },
              ]}
            />
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {FAT_SEGMENTS.map((segment) => {
                const grams =
                  segment.key === 'saturated' ? fat.saturatedGrams
                  : segment.key === 'mono' ? fat.monounsaturatedGrams
                  : segment.key === 'poly' ? fat.polyunsaturatedGrams
                  : fat.otherGrams
                const percent =
                  segment.key === 'saturated' ? fat.saturatedPercent
                  : segment.key === 'mono' ? fat.monounsaturatedPercent
                  : segment.key === 'poly' ? fat.polyunsaturatedPercent
                  : fat.otherPercent
                return (
                  <div key={segment.key} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <span className={`h-2 w-2 rounded-full ${segment.color}`} />
                      {segment.label}
                    </span>
                    <span className="text-slate-500">{formatGrams(grams)} ({percent}%)</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
