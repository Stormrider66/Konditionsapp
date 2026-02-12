/**
 * Visual Report Service
 *
 * Orchestrator for generating sport-customized visual reports.
 * Supports: progression, training-summary, test-report, program
 */

import { GoogleGenAI } from '@google/genai'
import { prisma } from '@/lib/prisma'
import { resolveGoogleApiKey } from '@/lib/ai/program-infographic'
import { GEMINI_MODELS } from '@/lib/ai/gemini-config'
import { getSportConfig } from './sport-templates'
import { buildVisualReportPrompt } from './prompt-builder'
import { uploadVisualReport } from './storage'
import {
  gatherProgressionData,
  gatherTrainingSummaryData,
  gatherTestReportData,
  gatherProgramData,
} from './data-gatherers'
import { logger } from '@/lib/logger'
import type { GenerateVisualReportOptions, VisualReportResult } from './types'

export { ALLOWED_IMAGE_MODELS } from '@/lib/ai/program-infographic'
export type { ReportType, GenerateVisualReportOptions, VisualReportResult } from './types'

export async function generateVisualReport(
  options: GenerateVisualReportOptions
): Promise<VisualReportResult | null> {
  const {
    reportType,
    clientId,
    coachId,
    locale,
    model,
    testId,
    programId,
    periodStart,
    periodEnd,
  } = options

  const selectedModel = model || GEMINI_MODELS.IMAGE_GENERATION

  // 1. Resolve Google API key
  const apiKey = await resolveGoogleApiKey(coachId)
  if (!apiKey) {
    logger.warn('No Google API key for visual report', { reportType, clientId, coachId })
    return null
  }

  // 2. Resolve sport type
  const sportProfile = await prisma.sportProfile.findFirst({
    where: { clientId },
    select: { primarySport: true },
  })
  const sportType = sportProfile?.primarySport || null
  const sportConfig = getSportConfig(sportType)

  // 3. Gather data
  let data
  switch (reportType) {
    case 'progression':
      data = await gatherProgressionData(clientId, periodStart, periodEnd)
      break
    case 'training-summary':
      data = await gatherTrainingSummaryData(clientId, periodStart, periodEnd)
      break
    case 'test-report':
      if (!testId) throw new Error('testId required for test-report')
      data = await gatherTestReportData(testId)
      break
    case 'program':
      if (!programId) throw new Error('programId required for program report')
      data = await gatherProgramData(programId)
      break
    default:
      throw new Error(`Unknown report type: ${reportType}`)
  }

  if (!data) {
    logger.warn('No data available for visual report', { reportType, clientId })
    return null
  }

  // 4. Build prompt
  const prompt = buildVisualReportPrompt(reportType, data, sportConfig, locale)

  // 5. Call Gemini image generation
  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: selectedModel,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  })

  const parts = response.candidates?.[0]?.content?.parts
  const imagePart = parts?.find(
    (part) => part.inlineData?.mimeType?.startsWith('image/')
  )

  if (!imagePart?.inlineData?.data) {
    logger.warn('No image in Gemini response for visual report', { reportType, model: selectedModel })
    return null
  }

  // 6. Upload to Supabase
  const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64')
  const mimeType = imagePart.inlineData.mimeType || 'image/png'

  const { storagePath, publicUrl } = await uploadVisualReport(
    reportType,
    clientId,
    imageBuffer,
    mimeType
  )

  // 7. Create DB record
  const report = await prisma.visualReport.create({
    data: {
      clientId,
      coachId,
      reportType,
      sportType,
      testId: testId || null,
      programId: programId || null,
      periodStart: periodStart || null,
      periodEnd: periodEnd || null,
      imageUrl: publicUrl,
      storagePath,
      mimeType,
      model: selectedModel,
    },
  })

  return {
    id: report.id,
    imageUrl: report.imageUrl,
    reportType: report.reportType,
    sportType: report.sportType,
    model: report.model,
    createdAt: report.createdAt,
  }
}
