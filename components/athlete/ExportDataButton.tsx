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
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

interface ExportDataButtonProps {
  logs: any[]
}

export function ExportDataButton({ logs }: ExportDataButtonProps) {
  function exportToCSV() {
    if (logs.length === 0) {
      alert('Ingen data att exportera')
      return
    }

    // Create CSV headers
    const headers = [
      'Datum',
      'Pass',
      'Program',
      'Typ',
      'Intensitet',
      'Distans (km)',
      'Tid (min)',
      'Tempo',
      'Snitt-puls',
      'Max-puls',
      'RPE',
      'Svårighetsgrad',
      'Känsla',
      'Anteckningar',
    ]

    // Create CSV rows
    const rows = logs.map((log) => [
      log.completedAt ? format(new Date(log.completedAt), 'yyyy-MM-dd', { locale: sv }) : '',
      log.workout.name,
      log.workout.day.week.program.name,
      formatWorkoutType(log.workout.type),
      formatIntensity(log.workout.intensity),
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
    link.setAttribute('download', `traningsdata_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function exportToJSON() {
    if (logs.length === 0) {
      alert('Ingen data att exportera')
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
    link.setAttribute('download', `traningsdata_${format(new Date(), 'yyyy-MM-dd')}.json`)
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
          Exportera data
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Exportformat</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToCSV}>
          <Table className="mr-2 h-4 w-4" />
          CSV-fil
          <span className="ml-2 text-xs text-muted-foreground">(Excel)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <FileText className="mr-2 h-4 w-4" />
          JSON-fil
          <span className="ml-2 text-xs text-muted-foreground">(Backup)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Helper functions
function formatWorkoutType(type: string): string {
  const types: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    STRENGTH: 'Styrka',
    CORE: 'Core',
    PLYOMETRIC: 'Plyometri',
    RECOVERY: 'Återhämtning',
    SKIING: 'Skidåkning',
    OTHER: 'Annat',
  }
  return types[type] || type
}

function formatIntensity(intensity: string): string {
  const intensities: Record<string, string> = {
    RECOVERY: 'Återhämtning',
    EASY: 'Lätt',
    MODERATE: 'Måttlig',
    THRESHOLD: 'Tröskel',
    INTERVAL: 'Intervall',
    MAX: 'Max',
  }
  return intensities[intensity] || intensity
}
