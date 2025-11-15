// lib/utils/csv-export.ts
// Utility functions for exporting data to CSV format

import type { Client, Test } from '@/types'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

/**
 * Convert an array of objects to CSV format
 */
function convertToCSV(data: any[], headers: string[]): string {
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
export function exportClientsToCSV(clients: Client[]): void {
  const data = clients.map(client => {
    const birthDate = client.birthDate instanceof Date ? client.birthDate : new Date(client.birthDate as unknown as string)
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    const bmi = (client.weight / ((client.height / 100) ** 2)).toFixed(1)

    return {
      name: client.name,
      age,
      gender: client.gender === 'MALE' ? 'Man' : 'Kvinna',
      email: client.email || '',
      phone: client.phone || '',
      height: client.height,
      weight: client.weight,
      bmi,
      notes: client.notes || '',
      createdAt: format(new Date(client.createdAt), 'yyyy-MM-dd', { locale: sv }),
    }
  })

  const headers = ['name', 'age', 'gender', 'email', 'phone', 'height', 'weight', 'bmi', 'notes', 'createdAt']
  const csv = convertToCSV(data, headers)
  const filename = `klienter_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`
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
  const dateStr = format(test.testDate, 'yyyy-MM-dd', { locale: sv })
  const filename = `test_${clientName.replace(/\s+/g, '_')}_${dateStr}.csv`
  downloadCSV(csv, filename)
}

/**
 * Export all tests for a client to CSV
 */
export function exportClientTestsToCSV(tests: Test[], clientName: string): void {
  if (tests.length === 0) return

  const data = tests.map(test => ({
    date: format(test.testDate, 'yyyy-MM-dd', { locale: sv }),
    type: test.testType === 'RUNNING' ? 'Löpning' : 'Cykling',
    status: test.status === 'COMPLETED' ? 'Genomfört' : test.status === 'DRAFT' ? 'Utkast' : 'Arkiverad',
    vo2max: test.vo2max?.toFixed(1) || '',
    maxHR: test.maxHR || '',
    maxLactate: test.maxLactate?.toFixed(1) || '',
    aerobicThresholdHR: (test.aerobicThreshold as any)?.heartRate || '',
    anaerobicThresholdHR: (test.anaerobicThreshold as any)?.heartRate || '',
    notes: test.notes || '',
  }))

  const headers = ['date', 'type', 'status', 'vo2max', 'maxHR', 'maxLactate', 'aerobicThresholdHR', 'anaerobicThresholdHR', 'notes']
  const csv = convertToCSV(data, headers)
  const filename = `tester_${clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`
  downloadCSV(csv, filename)
}
