'use client'

import { AlertTriangle, Beef, Droplets, Leaf, Scale } from 'lucide-react'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { useTranslations } from '@/i18n/client'

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
  { key: 'saturated', labelKey: 'segments.saturated', color: 'bg-rose-400' },
  { key: 'mono', labelKey: 'segments.mono', color: 'bg-emerald-400' },
  { key: 'poly', labelKey: 'segments.poly', color: 'bg-sky-400' },
  { key: 'other', labelKey: 'segments.other', color: 'bg-slate-500' },
] as const

const SOURCE_SEGMENTS = [
  { key: 'animal', labelKey: 'segments.animal', color: 'bg-blue-400' },
  { key: 'plant', labelKey: 'segments.plant', color: 'bg-lime-400' },
  { key: 'mixed', labelKey: 'segments.mixed', color: 'bg-violet-400' },
  { key: 'unknown', labelKey: 'segments.unknown', color: 'bg-slate-500' },
] as const

function formatGrams(value: number): string {
  return `${Math.round(value)}g`
}

function ProgressMarker({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      className="absolute top-0 h-full w-px bg-slate-700/70 dark:bg-white/80"
      style={{ left: `${Math.min(100, Math.max(0, percent))}%` }}
    >
      <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-slate-500 dark:text-slate-400">
        {label}
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
  const t = useTranslations('components.nutritionQualityCard')
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
          {t('title')}
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent className="space-y-5">
        {hasLowCoverage && (
          <div className="flex gap-2 rounded-lg border border-amber-400/30 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p>
              {t('lowCoverageWarning')}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg bg-slate-100 p-3 dark:bg-white/5">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Beef className="h-4 w-4 text-blue-400" />
              {t('metrics.completeProtein')}
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {protein.completePercentOfKnown}%
            </p>
            <p className="text-[11px] text-slate-500">
              {t('metrics.ofKnownProtein', { grams: formatGrams(protein.completeGrams) })}
            </p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3 dark:bg-white/5">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Leaf className="h-4 w-4 text-lime-400" />
              {t('metrics.plantProtein')}
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {protein.sourceDistribution.plantPercent}%
            </p>
            <p className="text-[11px] text-slate-500">
              {t('totalGrams', { grams: formatGrams(protein.sourceDistribution.plantGrams) })}
            </p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3 dark:bg-white/5">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Droplets className="h-4 w-4 text-emerald-400" />
              {t('metrics.fatBreakdown')}
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {fat.knownBreakdownCoveragePercent}%
            </p>
            <p className="text-[11px] text-slate-500">
              {t('metrics.fatCoverage')}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-700 dark:text-slate-300">{t('completeProteinShare')}</span>
            <span className={lowProteinCoverage ? 'text-amber-300' : completeGap <= 0 ? 'text-emerald-400' : 'text-amber-400'}>
              {lowProteinCoverage ? t('status.lowConfidence') : completeGap <= 0 ? t('status.targetReached') : t('status.remaining', { percent: completeGap })}
            </span>
          </div>
          <div className="relative pt-1">
            <div className="h-3 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-400"
                style={{ width: `${Math.min(100, protein.completePercentOfKnown)}%` }}
              />
            </div>
            <ProgressMarker percent={protein.targetCompletePercent} label={t('targetMarker', { percent: protein.targetCompletePercent })} />
          </div>
          <p className="text-[11px] text-slate-500">
            {t('coverageDescription', { percent: protein.knownQualityCoveragePercent })}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 dark:text-slate-300">{t('proteinSource')}</span>
              <span className="text-slate-500">{t('totalGrams', { grams: formatGrams(protein.totalGrams) })}</span>
            </div>
            <SegmentedBar
              segments={[
                { label: t('segments.animal'), percent: protein.sourceDistribution.animalPercent, color: 'bg-blue-400' },
                { label: t('segments.plant'), percent: protein.sourceDistribution.plantPercent, color: 'bg-lime-400' },
                { label: t('segments.mixed'), percent: protein.sourceDistribution.mixedPercent, color: 'bg-violet-400' },
                { label: t('segments.unknown'), percent: protein.sourceDistribution.unknownPercent, color: 'bg-slate-500' },
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
                      {t(segment.labelKey)}
                    </span>
                    <span className="text-slate-500">{formatGrams(grams)} ({percent}%)</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 dark:text-slate-300">{t('fatType')}</span>
              <span className="text-slate-500">{t('totalGrams', { grams: formatGrams(fat.totalGrams) })}</span>
            </div>
            <SegmentedBar
              segments={[
                { label: t('segments.saturated'), percent: fat.saturatedPercent, color: 'bg-rose-400' },
                { label: t('segments.mono'), percent: fat.monounsaturatedPercent, color: 'bg-emerald-400' },
                { label: t('segments.poly'), percent: fat.polyunsaturatedPercent, color: 'bg-sky-400' },
                { label: t('segments.other'), percent: fat.otherPercent, color: 'bg-slate-500' },
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
                      {t(segment.labelKey)}
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
