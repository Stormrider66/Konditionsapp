import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { generateHybridWorkoutExcel, type HybridWorkoutExportData } from './hybrid-workout-export'

const baseWorkout: HybridWorkoutExportData = {
  name: 'Engine Builder',
  format: 'AMRAP',
  scalingLevel: 'RX',
  movements: [
    {
      exerciseName: 'Row',
      calories: 20,
    },
  ],
}

async function readHeader(locale: 'en' | 'sv') {
  const blob = await generateHybridWorkoutExcel({ ...baseWorkout, locale })
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await blob.arrayBuffer())
  return workbook.getWorksheet('Info')?.getCell('A1').value
}

describe('generateHybridWorkoutExcel', () => {
  it('uses an English title in English exports', async () => {
    await expect(readHeader('en')).resolves.toBe('HYBRID SESSION')
  })

  it('uses a Swedish title in Swedish exports', async () => {
    await expect(readHeader('sv')).resolves.toBe('HYBRIDPASS')
  })
})
