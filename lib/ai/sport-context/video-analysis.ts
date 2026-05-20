import type { VideoAnalysis } from './types'
import {
  getViewSpecificMetricsLabel,
  translateCameraAngle,
  translateFootStrike,
  translateRiskLevel,
} from './formatters'

type SportContextLocale = 'en' | 'sv'
type JsonRecord = Record<string, unknown>

function dateLocale(locale: SportContextLocale): string {
  return locale === 'sv' ? 'sv-SE' : 'en-US'
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function textField(record: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function formatJsonItem(item: unknown): string | null {
  if (typeof item === 'string') return item
  if (typeof item === 'number' || typeof item === 'boolean') return String(item)
  if (!isRecord(item)) return null

  const title = textField(item, ['issue', 'title', 'recommendation', 'cue', 'drillName', 'factor', 'pattern', 'area'])
  const description = textField(item, ['description', 'explanation', 'observation', 'impact', 'significance', 'reason'])
  const severity = textField(item, ['severity', 'priority', 'riskLevel'])

  const main = [title, description].filter(Boolean).join(': ')
  if (!main && severity) return severity
  if (main && severity) return `${main} (${severity})`
  return main || null
}

function formatList(items: unknown[] | null | undefined, maxItems = 6): string[] {
  if (!Array.isArray(items)) return []
  return items
    .map(formatJsonItem)
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems)
}

function hasPoseAnalysis(video: VideoAnalysis): boolean {
  const pose = video.aiPoseAnalysis
  return Boolean(
    pose?.interpretation ||
    pose?.overallAssessment ||
    typeof pose?.score === 'number' ||
    pose?.technicalFeedback?.length ||
    pose?.patterns?.length ||
    pose?.recommendations?.length
  )
}

/**
 * Build video and pose context for AI decisions.
 */
export function buildVideoAnalysisContext(
  videoAnalyses: VideoAnalysis[],
  locale: SportContextLocale = 'en'
): string {
  if (!videoAnalyses || videoAnalyses.length === 0) return ''

  const analyses = videoAnalyses.slice(0, 10)
  const poseCount = analyses.filter(hasPoseAnalysis).length
  let context = `\n## VIDEO- OCH POSEANALYS: TEKNIK, MOBILITET OCH SKADERISK\n`
  context += `*Använd detta som viktig helhetskontext för atleten. Pose/Gemini-fynd kan peka på rörlighetsbegränsningar, asymmetrier, kompensationer och tekniska mönster som påverkar belastningstolerans, skadehistorik och träningsval. Detta är coachande beslutsstöd, inte medicinsk diagnos.*\n`
  context += `- **Antal analyser i kontexten**: ${analyses.length}\n`
  if (poseCount > 0) {
    context += `- **Analyser med sparad pose/Gemini-data**: ${poseCount}\n`
  }

  const availableAngles = analyses
    .filter((v) => v.cameraAngle)
    .map((v) => v.cameraAngle)
  const hasMultipleViews = new Set(availableAngles).size > 1

  for (const video of analyses) {
    const date = new Date(video.createdAt).toLocaleDateString(dateLocale(locale))
    const angleLabel = translateCameraAngle(video.cameraAngle)
    const angleInfo = angleLabel ? ` (${angleLabel})` : ''
    const typeInfo = video.videoType ? ` | Typ: ${video.videoType}` : ''
    context += `\n### Analys från ${date}${angleInfo}${typeInfo}\n`

    if (video.cameraAngle) {
      context += getViewSpecificMetricsLabel(video.cameraAngle)
    }

    if (video.formScore !== null) {
      context += `- **Teknisk formpoäng**: ${video.formScore}/100\n`
    }

    const issues = formatList(video.issuesDetected)
    if (issues.length > 0) {
      context += `- **Identifierade problem**: ${issues.join('; ')}\n`
    }

    const recommendations = formatList(video.recommendations)
    if (recommendations.length > 0) {
      context += `- **Generella rekommendationer**: ${recommendations.join('; ')}\n`
    }

    const poseAnalysis = video.aiPoseAnalysis
    if (poseAnalysis && hasPoseAnalysis(video)) {
      context += `\n#### Gemini poseanalys: rörelseprofil\n`

      if (typeof poseAnalysis.score === 'number') {
        context += `- **Posepoäng**: ${poseAnalysis.score}/100\n`
      }
      if (poseAnalysis.interpretation) {
        context += `- **Tolkning**: ${poseAnalysis.interpretation}\n`
      }
      if (poseAnalysis.overallAssessment) {
        context += `- **Sammanfattande bedömning**: ${poseAnalysis.overallAssessment}\n`
      }

      if (poseAnalysis.technicalFeedback?.length) {
        context += `\n**Teknisk feedback att väga mot skador, smärta och belastning:**\n`
        for (const fb of poseAnalysis.technicalFeedback.slice(0, 6)) {
          context += `- **${fb.area}**: ${fb.observation}\n`
          context += `  - Påverkan: ${fb.impact}\n`
          context += `  - Praktiskt fokus: ${fb.suggestion}\n`
        }
      }

      if (poseAnalysis.patterns?.length) {
        context += `\n**Identifierade rörelsemönster:**\n`
        for (const pattern of poseAnalysis.patterns.slice(0, 6)) {
          context += `- **${pattern.pattern}**: ${pattern.significance}\n`
        }
      }

      if (poseAnalysis.recommendations?.length) {
        context += `\n**Prioriterade åtgärder från poseanalysen:**\n`
        const sortedRecs = [...poseAnalysis.recommendations].sort((a, b) => a.priority - b.priority)
        for (const rec of sortedRecs.slice(0, 5)) {
          context += `${rec.priority}. **${rec.title}**: ${rec.description}\n`
          if (rec.exercises?.length) {
            context += `   - Övningar: ${rec.exercises.join(', ')}\n`
          }
        }
      }
    }

    const gait = video.runningGaitAnalysis
    if (gait) {
      context += `\n#### Biomekanisk löpanalys\n`

      if (gait.cadence) {
        const cadenceStatus = gait.cadence < 170 ? '(låg - kan förbättras)' :
                              gait.cadence > 190 ? '(hög - bra effektivitet)' :
                              '(normal)'
        context += `- **Kadans**: ${gait.cadence} steg/min ${cadenceStatus}\n`
      }
      if (gait.groundContactTime) {
        const gctStatus = gait.groundContactTime > 280 ? '(lång - indikerar ineffektivitet)' :
                          gait.groundContactTime < 200 ? '(kort - elitliknande)' :
                          '(normal)'
        context += `- **Markkontakttid**: ${gait.groundContactTime} ms ${gctStatus}\n`
      }
      if (gait.verticalOscillation) {
        const voStatus = gait.verticalOscillation > 10 ? '(hög - energiläckage)' :
                         gait.verticalOscillation < 6 ? '(låg - effektivt)' :
                         '(normal)'
        context += `- **Vertikal oscillation**: ${gait.verticalOscillation} cm ${voStatus}\n`
      }
      if (gait.strideLength) {
        context += `- **Steglängd**: ${gait.strideLength} m\n`
      }
      if (gait.footStrikePattern) {
        context += `- **Fotisättning**: ${translateFootStrike(gait.footStrikePattern)}\n`
      }

      if (gait.asymmetryPercent !== null) {
        const asymmetryStatus = gait.asymmetryPercent > 8 ? 'hög asymmetri - skaderisk' :
                                gait.asymmetryPercent > 4 ? 'måttlig asymmetri' :
                                'balanserad'
        context += `\n#### Asymmetrianalys\n`
        context += `- **Asymmetrigrad**: ${gait.asymmetryPercent}% (${asymmetryStatus})\n`
        if (gait.leftContactTime && gait.rightContactTime) {
          const longerSide = gait.leftContactTime > gait.rightContactTime ? 'vänster' : 'höger'
          context += `- **Markkontakt vänster/höger**: ${gait.leftContactTime}/${gait.rightContactTime} ms (längre på ${longerSide} sida)\n`
        }
      }

      if (gait.injuryRiskLevel) {
        context += `\n#### Skaderiskbedömning\n`
        context += `- **Skaderisk**: ${translateRiskLevel(gait.injuryRiskLevel)}`
        if (gait.injuryRiskScore) {
          context += ` (${gait.injuryRiskScore}/100)`
        }
        context += '\n'

        const riskFactors = formatList(gait.injuryRiskFactors)
        if (riskFactors.length > 0) {
          context += `- **Riskfaktorer**: ${riskFactors.join('; ')}\n`
        }
      }

      if (gait.runningEfficiency) {
        context += `\n#### Löpeffektivitet\n`
        context += `- **Effektivitet**: ${gait.runningEfficiency}\n`
      }

      const energyLeakages = formatList(gait.energyLeakages)
      if (energyLeakages.length > 0) {
        context += `- **Identifierade energiläckage**: ${energyLeakages.join('; ')}\n`
      }

      const coachingCues = formatList(gait.coachingCues)
      if (coachingCues.length > 0) {
        context += `\n#### Coachingråd för träningen\n`
        for (const cue of coachingCues) {
          context += `- ${cue}\n`
        }
      }

      const drillRecommendations = formatList(gait.drillRecommendations)
      if (drillRecommendations.length > 0) {
        context += `\n#### Rekommenderade tekniska övningar\n`
        for (const drill of drillRecommendations) {
          context += `- ${drill}\n`
        }
      }

      if (gait.summary) {
        context += `\n#### Sammanfattning\n${gait.summary}\n`
      }
    }
  }

  if (hasMultipleViews) {
    context += `\n### Korsreferens - flera kameraperspektiv\n`
    context += `- Jämför knäspårning, höftkontroll, fotisättning och rotation mellan vinklar innan du drar slutsatser.\n`
    context += `- Prioritera sidovy för sagittalplansmekanik och front/bak-vy för frontalplanskontroll och asymmetri.\n`
  }

  context += `\n### Så ska AI:n använda pose/video i helhetsbilden\n`
  context += `- Koppla asymmetrier, rörlighetsbegränsningar och kompensationer till rapporterad smärta, skadehistorik, träningsbelastning, styrkepass och readiness innan träningsråd ges.\n`
  context += `- Om smärta eller återkommande skada finns nära ett område med svag kontroll eller låg rörlighet, behandla det som en hypotes att följa upp med coach/fysio, inte som en diagnos.\n`
  context += `- Vid tydlig asymmetri eller begränsad rörlighet: föreslå konservativ progression, unilateral styrka, mobilitet, aktivering, teknikdrills och enklare monitorering före stora volym- eller intensitetsökningar.\n`
  context += `- När posefynden är normala men atletens symtom är höga, prioritera återhämtning, belastningshistorik och medicinsk/fysioterapeutisk bedömning framför tekniska slutsatser.\n`

  return context
}
