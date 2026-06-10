// lib/utils/csv-export.ts
// Utility functions for exporting data to CSV format

import type { Client, Test } from '@/types'
import { format } from 'date-fns'

type ExportLocale = 'en' | 'sv'

const getExportLocale = (locale?: string): ExportLocale => (locale === 'sv' ? 'sv' : 'en')
const text = (locale: ExportLocale, svText: string, enText: string) =>
  locale === 'sv' ? svText : enText

/**
 * Convert an array of objects to CSV format
 */
function convertToCSV(data: Array<Record<string, unknown>>, headers: string[]): string {
  const headerRow = headers.join(',')
  const rows = data.map(row => {
    return headers.map(header => {
      const value = row[header]
      // Handle null/undefined
      if (value === null || value === undefined) return ''
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }).join(',')
  })

  return [headerRow, ...rows].join('\n')
}

function getThresholdHeartRate(threshold: unknown): number | string {
  if (threshold && typeof threshold === 'object' && 'heartRate' in threshold) {
    const heartRate = (threshold as { heartRate?: unknown }).heartRate
    return typeof heartRate === 'number' || typeof heartRate === 'string' ? heartRate : ''
  }

  return ''
}

/**
 * Trigger browser download of CSV content
 */
function downloadCSV(content: string, filename: string): void {
  // Add BOM for Excel UTF-8 support
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export clients to CSV
 */
export function exportClientsToCSV(clients: Client[], localeValue?: string): void {
  const locale = getExportLocale(localeValue)
  const data = clients.map(client => {
    const birthDate =
      client.birthDate instanceof Date
        ? client.birthDate
        : new Date(client.birthDate as unknown as string)
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    const bmi = (client.weight / ((client.height / 100) ** 2)).toFixed(1)

    return {
      name: client.name,
      age,
      gender:
        client.gender === 'MALE'
          ? text(locale, 'Man', 'Male')
          : text(locale, 'Kvinna', 'Female'),
      email: client.email || '',
      phone: client.phone || '',
      height: client.height,
      weight: client.weight,
      bmi,
      notes: client.notes || '',
      createdAt: format(new Date(client.createdAt), 'yyyy-MM-dd'),
    }
  })

  const headers = [
    'name',
    'age',
    'gender',
    'email',
    'phone',
    'height',
    'weight',
    'bmi',
    'notes',
    'createdAt',
  ]
  const csv = convertToCSV(data, headers)
  const filename = `${text(locale, 'klienter', 'clients')}_${format(
    new Date(),
    'yyyy-MM-dd_HHmm'
  )}.csv`
  downloadCSV(csv, filename)
}

interface ExportableMealLog {
  date: string
  mealType: string
  time?: string | null
  description: string
  calories?: number | null
  proteinGrams?: number | null
  carbsGrams?: number | null
  fatGrams?: number | null
  fiberGrams?: number | null
}

/**
 * Export meal logs to CSV (one row per meal)
 */
export function exportMealsToCSV(meals: ExportableMealLog[], localeValue?: string): void {
  const locale = getExportLocale(localeValue)
  if (meals.length === 0) return

  const data = meals.map((meal) => ({
    date: format(new Date(meal.date), 'yyyy-MM-dd'),
    mealType: meal.mealType,
    time: meal.time || '',
    description: meal.description,
    calories: meal.calories ?? '',
    proteinGrams: meal.proteinGrams ?? '',
    carbsGrams: meal.carbsGrams ?? '',
    fatGrams: meal.fatGrams ?? '',
    fiberGrams: meal.fiberGrams ?? '',
  }))

  const headers = [
    'date',
    'mealType',
    'time',
    'description',
    'calories',
    'proteinGrams',
    'carbsGrams',
    'fatGrams',
    'fiberGrams',
  ]
  const csv = convertToCSV(data, headers)
  const filename = `${text(locale, 'kost', 'nutrition')}_${format(new Date(), 'yyyy-MM-dd')}.csv`
  downloadCSV(csv, filename)
}

/**
 * Export test data to CSV
 */
export function exportTestToCSV(test: Test, clientName: string): void {
  const testStages = test.testStages || []

  const data = testStages.map((stage, index) => ({
    stage: index + 1,
    duration: stage.duration,
    heartRate: stage.heartRate,
    lactate: stage.lactate.toFixed(1),
    vo2: stage.vo2?.toFixed(1) || '',
    speed: stage.speed?.toFixed(1) || '',
    incline: stage.incline?.toFixed(1) || '',
    power: stage.power || '',
    cadence: stage.cadence || '',
  }))

  const headers = test.testType === 'RUNNING'
    ? ['stage', 'duration', 'heartRate', 'lactate', 'vo2', 'speed', 'incline']
    : ['stage', 'duration', 'heartRate', 'lactate', 'vo2', 'power', 'cadence']

  const csv = convertToCSV(data, headers)
  const dateStr = format(test.testDate, 'yyyy-MM-dd')
  const filename = `test_${clientName.replace(/\s+/g, '_')}_${dateStr}.csv`
  downloadCSV(csv, filename)
}

/**
 * Export all tests for a client to CSV
 */
export function exportClientTestsToCSV(
  tests: Test[],
  clientName: string,
  localeValue?: string
): void {
  const locale = getExportLocale(localeValue)
  if (tests.length === 0) return

  const data = tests.map(test => ({
    date: format(test.testDate, 'yyyy-MM-dd'),
    type:
      test.testType === 'RUNNING'
        ? text(locale, 'Löpning', 'Running')
        : text(locale, 'Cykling', 'Cycling'),
    status:
      test.status === 'COMPLETED'
        ? text(locale, 'Genomfört', 'Completed')
        : test.status === 'DRAFT'
          ? text(locale, 'Utkast', 'Draft')
          : text(locale, 'Arkiverad', 'Archived'),
    vo2max: test.vo2max?.toFixed(1) || '',
    maxHR: test.maxHR || '',
    maxLactate: test.maxLactate?.toFixed(1) || '',
    aerobicThresholdHR: getThresholdHeartRate(test.aerobicThreshold),
    anaerobicThresholdHR: getThresholdHeartRate(test.anaerobicThreshold),
    notes: test.notes || '',
  }))

  const headers = [
    'date',
    'type',
    'status',
    'vo2max',
    'maxHR',
    'maxLactate',
    'aerobicThresholdHR',
    'anaerobicThresholdHR',
    'notes',
  ]
  const csv = convertToCSV(data, headers)
  const filename = `${text(locale, 'tester', 'tests')}_${clientName.replace(
    /\s+/g,
    '_'
  )}_${format(new Date(), 'yyyy-MM-dd')}.csv`
  downloadCSV(csv, filename)
}
