// components/athlete/ExportDataButton.tsx
'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileText, Table } from 'lucide-react'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { useLocale, useTranslations } from '@/i18n/client'

interface WorkoutLogExportRow {
  completedAt?: Date | string | null
  distance?: number | null
  duration?: number | null
  avgPace?: string | null
  avgHR?: number | null
  maxHR?: number | null
  perceivedEffort?: number | null
  difficulty?: number | null
  feeling?: string | null
  notes?: string | null
  coachFeedback?: string | null
  coachViewedAt?: Date | string | null
  workout: {
    name: string
    type: string
    intensity: string
    day: {
      week: {
        program: {
          name: string
        }
      }
    }
  }
}

interface ExportDataButtonProps {
  logs: WorkoutLogExportRow[]
}

export function ExportDataButton({ logs }: ExportDataButtonProps) {
  const t = useTranslations('components.exportDataButton')
  const locale = useLocale()
  const dateLocale = locale === 'en' ? enUS : sv

  function exportToCSV() {
    if (logs.length === 0) {
      alert(t('emptyAlert'))
      return
    }

    // Create CSV headers
    const headers = [
      t('csvHeaders.date'),
      t('csvHeaders.workout'),
      t('csvHeaders.program'),
      t('csvHeaders.type'),
      t('csvHeaders.intensity'),
      t('csvHeaders.distanceKm'),
      t('csvHeaders.durationMin'),
      t('csvHeaders.pace'),
      t('csvHeaders.averageHeartRate'),
      t('csvHeaders.maxHeartRate'),
      'RPE',
      t('csvHeaders.difficulty'),
      t('csvHeaders.feeling'),
      t('csvHeaders.notes'),
    ]

    // Create CSV rows
    const rows = logs.map((log) => [
      log.completedAt ? format(new Date(log.completedAt), 'yyyy-MM-dd', { locale: dateLocale }) : '',
      log.workout.name,
      log.workout.day.week.program.name,
      formatWorkoutType(log.workout.type, t),
      formatIntensity(log.workout.intensity, t),
      log.distance || '',
      log.duration || '',
      log.avgPace || '',
      log.avgHR || '',
      log.maxHR || '',
      log.perceivedEffort || '',
      log.difficulty || '',
      log.feeling || '',
      log.notes ? `"${log.notes.replace(/"/g, '""')}"` : '',
    ])

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n')

    // Create and download file
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${t('fileBaseName')}_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function exportToJSON() {
    if (logs.length === 0) {
      alert(t('emptyAlert'))
      return
    }

    // Create structured JSON data
    const jsonData = {
      exportDate: new Date().toISOString(),
      totalWorkouts: logs.length,
      workouts: logs.map((log) => ({
        date: log.completedAt ? format(new Date(log.completedAt), 'yyyy-MM-dd') : '',
        workout: {
          name: log.workout.name,
          type: log.workout.type,
          intensity: log.workout.intensity,
        },
        program: log.workout.day.week.program.name,
        performance: {
          distance: log.distance,
          duration: log.duration,
          avgPace: log.avgPace,
          avgHR: log.avgHR,
          maxHR: log.maxHR,
        },
        subjective: {
          perceivedEffort: log.perceivedEffort,
          difficulty: log.difficulty,
          feeling: log.feeling,
          notes: log.notes,
        },
        feedback: {
          coachFeedback: log.coachFeedback,
          coachViewedAt: log.coachViewedAt,
        },
      })),
    }

    // Create and download file
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: 'application/json',
    })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${t('fileBaseName')}_${format(new Date(), 'yyyy-MM-dd')}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          {t('trigger')}
          <InfoTooltip conceptKey="exportFormats" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('formatLabel')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToCSV}>
          <Table className="mr-2 h-4 w-4" />
          {t('csvFile')}
          <span className="ml-2 text-xs text-muted-foreground">(Excel)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <FileText className="mr-2 h-4 w-4" />
          {t('jsonFile')}
          <span className="ml-2 text-xs text-muted-foreground">(Backup)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Helper functions
function formatWorkoutType(type: string, t: (key: string) => string): string {
  switch (type) {
    case 'RUNNING':
      return t('workoutTypes.running')
    case 'CYCLING':
      return t('workoutTypes.cycling')
    case 'STRENGTH':
      return t('workoutTypes.strength')
    case 'CORE':
      return t('workoutTypes.core')
    case 'PLYOMETRIC':
      return t('workoutTypes.plyometric')
    case 'RECOVERY':
      return t('workoutTypes.recovery')
    case 'SKIING':
      return t('workoutTypes.skiing')
    case 'OTHER':
      return t('workoutTypes.other')
    default:
      return type
  }
}

function formatIntensity(intensity: string, t: (key: string) => string): string {
  switch (intensity) {
    case 'RECOVERY':
      return t('intensities.recovery')
    case 'EASY':
      return t('intensities.easy')
    case 'MODERATE':
      return t('intensities.moderate')
    case 'THRESHOLD':
      return t('intensities.threshold')
    case 'INTERVAL':
      return t('intensities.interval')
    case 'MAX':
      return t('intensities.max')
    default:
      return intensity
  }
}
