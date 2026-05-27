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

function t(locale: SportContextLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
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
  let context = `\n## ${t(locale, 'VIDEO AND POSE ANALYSIS: TECHNIQUE, MOBILITY, AND INJURY RISK', 'VIDEO- OCH POSEANALYS: TEKNIK, MOBILITET OCH SKADERISK')}\n`
  context += `*${t(locale, 'Use this as important whole-athlete context. Pose/Gemini findings may point to mobility limits, asymmetries, compensations, and technical patterns that affect load tolerance, injury history, and training choices. This is coaching decision support, not a medical diagnosis.', 'Använd detta som viktig helhetskontext för atleten. Pose/Gemini-fynd kan peka på rörlighetsbegränsningar, asymmetrier, kompensationer och tekniska mönster som påverkar belastningstolerans, skadehistorik och träningsval. Detta är coachande beslutsstöd, inte medicinsk diagnos.')}*\n`
  context += `- **${t(locale, 'Analyses in context', 'Antal analyser i kontexten')}**: ${analyses.length}\n`
  if (poseCount > 0) {
    context += `- **${t(locale, 'Analyses with saved pose/Gemini data', 'Analyser med sparad pose/Gemini-data')}**: ${poseCount}\n`
  }

  const availableAngles = analyses
    .filter((v) => v.cameraAngle)
    .map((v) => v.cameraAngle)
  const hasMultipleViews = new Set(availableAngles).size > 1

  for (const video of analyses) {
    const date = new Date(video.createdAt).toLocaleDateString(dateLocale(locale))
    const angleLabel = translateCameraAngle(video.cameraAngle, locale)
    const angleInfo = angleLabel ? ` (${angleLabel})` : ''
    const typeInfo = video.videoType ? ` | ${t(locale, 'Type', 'Typ')}: ${video.videoType}` : ''
    context += `\n### ${t(locale, 'Analysis from', 'Analys från')} ${date}${angleInfo}${typeInfo}\n`

    if (video.cameraAngle) {
      context += getViewSpecificMetricsLabel(video.cameraAngle, locale)
    }

    if (video.formScore !== null) {
      context += `- **${t(locale, 'Technical form score', 'Teknisk formpoäng')}**: ${video.formScore}/100\n`
    }

    const issues = formatList(video.issuesDetected)
    if (issues.length > 0) {
      context += `- **${t(locale, 'Detected issues', 'Identifierade problem')}**: ${issues.join('; ')}\n`
    }

    const recommendations = formatList(video.recommendations)
    if (recommendations.length > 0) {
      context += `- **${t(locale, 'General recommendations', 'Generella rekommendationer')}**: ${recommendations.join('; ')}\n`
    }

    const poseAnalysis = video.aiPoseAnalysis
    if (poseAnalysis && hasPoseAnalysis(video)) {
      context += `\n#### ${t(locale, 'Gemini pose analysis: movement profile', 'Gemini poseanalys: rörelseprofil')}\n`

      if (typeof poseAnalysis.score === 'number') {
        context += `- **${t(locale, 'Pose score', 'Posepoäng')}**: ${poseAnalysis.score}/100\n`
      }
      if (poseAnalysis.interpretation) {
        context += `- **${t(locale, 'Interpretation', 'Tolkning')}**: ${poseAnalysis.interpretation}\n`
      }
      if (poseAnalysis.overallAssessment) {
        context += `- **${t(locale, 'Overall assessment', 'Sammanfattande bedömning')}**: ${poseAnalysis.overallAssessment}\n`
      }

      if (poseAnalysis.technicalFeedback?.length) {
        context += `\n**${t(locale, 'Technical feedback to weigh against injury, pain, and load', 'Teknisk feedback att väga mot skador, smärta och belastning')}:**\n`
        for (const fb of poseAnalysis.technicalFeedback.slice(0, 6)) {
          context += `- **${fb.area}**: ${fb.observation}\n`
          context += `  - ${t(locale, 'Impact', 'Påverkan')}: ${fb.impact}\n`
          context += `  - ${t(locale, 'Practical focus', 'Praktiskt fokus')}: ${fb.suggestion}\n`
        }
      }

      if (poseAnalysis.patterns?.length) {
        context += `\n**${t(locale, 'Detected movement patterns', 'Identifierade rörelsemönster')}:**\n`
        for (const pattern of poseAnalysis.patterns.slice(0, 6)) {
          context += `- **${pattern.pattern}**: ${pattern.significance}\n`
        }
      }

      if (poseAnalysis.recommendations?.length) {
        context += `\n**${t(locale, 'Prioritized actions from the pose analysis', 'Prioriterade åtgärder från poseanalysen')}:**\n`
        const sortedRecs = [...poseAnalysis.recommendations].sort((a, b) => a.priority - b.priority)
        for (const rec of sortedRecs.slice(0, 5)) {
          context += `${rec.priority}. **${rec.title}**: ${rec.description}\n`
          if (rec.exercises?.length) {
            context += `   - ${t(locale, 'Exercises', 'Övningar')}: ${rec.exercises.join(', ')}\n`
          }
        }
      }
    }

    const gait = video.runningGaitAnalysis
    if (gait) {
      context += `\n#### ${t(locale, 'Biomechanical running analysis', 'Biomekanisk löpanalys')}\n`

      if (gait.cadence) {
        const cadenceStatus = gait.cadence < 170
          ? t(locale, '(low - can improve)', '(låg - kan förbättras)')
          : gait.cadence > 190
            ? t(locale, '(high - good efficiency)', '(hög - bra effektivitet)')
            : t(locale, '(normal)', '(normal)')
        context += `- **${t(locale, 'Cadence', 'Kadans')}**: ${gait.cadence} ${t(locale, 'steps/min', 'steg/min')} ${cadenceStatus}\n`
      }
      if (gait.groundContactTime) {
        const gctStatus = gait.groundContactTime > 280
          ? t(locale, '(long - indicates inefficiency)', '(lång - indikerar ineffektivitet)')
          : gait.groundContactTime < 200
            ? t(locale, '(short - elite-like)', '(kort - elitliknande)')
            : t(locale, '(normal)', '(normal)')
        context += `- **${t(locale, 'Ground contact time', 'Markkontakttid')}**: ${gait.groundContactTime} ms ${gctStatus}\n`
      }
      if (gait.verticalOscillation) {
        const voStatus = gait.verticalOscillation > 10
          ? t(locale, '(high - energy leakage)', '(hög - energiläckage)')
          : gait.verticalOscillation < 6
            ? t(locale, '(low - efficient)', '(låg - effektivt)')
            : t(locale, '(normal)', '(normal)')
        context += `- **${t(locale, 'Vertical oscillation', 'Vertikal oscillation')}**: ${gait.verticalOscillation} cm ${voStatus}\n`
      }
      if (gait.strideLength) {
        context += `- **${t(locale, 'Stride length', 'Steglängd')}**: ${gait.strideLength} m\n`
      }
      if (gait.footStrikePattern) {
        context += `- **${t(locale, 'Foot strike', 'Fotisättning')}**: ${translateFootStrike(gait.footStrikePattern, locale)}\n`
      }

      if (gait.asymmetryPercent !== null) {
        const asymmetryStatus = gait.asymmetryPercent > 8
          ? t(locale, 'high asymmetry - injury risk', 'hög asymmetri - skaderisk')
          : gait.asymmetryPercent > 4
            ? t(locale, 'moderate asymmetry', 'måttlig asymmetri')
            : t(locale, 'balanced', 'balanserad')
        context += `\n#### ${t(locale, 'Asymmetry analysis', 'Asymmetrianalys')}\n`
        context += `- **${t(locale, 'Asymmetry level', 'Asymmetrigrad')}**: ${gait.asymmetryPercent}% (${asymmetryStatus})\n`
        if (gait.leftContactTime && gait.rightContactTime) {
          const longerSide = gait.leftContactTime > gait.rightContactTime ? t(locale, 'left', 'vänster') : t(locale, 'right', 'höger')
          context += `- **${t(locale, 'Ground contact left/right', 'Markkontakt vänster/höger')}**: ${gait.leftContactTime}/${gait.rightContactTime} ms (${t(locale, 'longer on the', 'längre på')} ${longerSide} ${t(locale, 'side', 'sida')})\n`
        }
      }

      if (gait.injuryRiskLevel) {
        context += `\n#### ${t(locale, 'Injury risk assessment', 'Skaderiskbedömning')}\n`
        context += `- **${t(locale, 'Injury risk', 'Skaderisk')}**: ${translateRiskLevel(gait.injuryRiskLevel, locale)}`
        if (gait.injuryRiskScore) {
          context += ` (${gait.injuryRiskScore}/100)`
        }
        context += '\n'

        const riskFactors = formatList(gait.injuryRiskFactors)
        if (riskFactors.length > 0) {
          context += `- **${t(locale, 'Risk factors', 'Riskfaktorer')}**: ${riskFactors.join('; ')}\n`
        }
      }

      if (gait.runningEfficiency) {
        context += `\n#### ${t(locale, 'Running efficiency', 'Löpeffektivitet')}\n`
        context += `- **${t(locale, 'Efficiency', 'Effektivitet')}**: ${gait.runningEfficiency}\n`
      }

      const energyLeakages = formatList(gait.energyLeakages)
      if (energyLeakages.length > 0) {
        context += `- **${t(locale, 'Detected energy leaks', 'Identifierade energiläckage')}**: ${energyLeakages.join('; ')}\n`
      }

      const coachingCues = formatList(gait.coachingCues)
      if (coachingCues.length > 0) {
        context += `\n#### ${t(locale, 'Training coaching cues', 'Coachingråd för träningen')}\n`
        for (const cue of coachingCues) {
          context += `- ${cue}\n`
        }
      }

      const drillRecommendations = formatList(gait.drillRecommendations)
      if (drillRecommendations.length > 0) {
        context += `\n#### ${t(locale, 'Recommended technique drills', 'Rekommenderade tekniska övningar')}\n`
        for (const drill of drillRecommendations) {
          context += `- ${drill}\n`
        }
      }

      if (gait.summary) {
        context += `\n#### ${t(locale, 'Summary', 'Sammanfattning')}\n${gait.summary}\n`
      }
    }
  }

  if (hasMultipleViews) {
    context += `\n### ${t(locale, 'Cross-reference - multiple camera angles', 'Korsreferens - flera kameraperspektiv')}\n`
    context += `- ${t(locale, 'Compare knee tracking, hip control, foot strike, and rotation across views before drawing conclusions.', 'Jämför knäspårning, höftkontroll, fotisättning och rotation mellan vinklar innan du drar slutsatser.')}\n`
    context += `- ${t(locale, 'Prioritize the side view for sagittal-plane mechanics and front/back views for frontal-plane control and asymmetry.', 'Prioritera sidovy för sagittalplansmekanik och front/bak-vy för frontalplanskontroll och asymmetri.')}\n`
  }

  context += `\n### ${t(locale, 'How the AI should use pose/video in the whole picture', 'Så ska AI:n använda pose/video i helhetsbilden')}\n`
  context += `- ${t(locale, 'Connect asymmetries, mobility limits, and compensations to reported pain, injury history, training load, strength work, and readiness before giving training advice.', 'Koppla asymmetrier, rörlighetsbegränsningar och kompensationer till rapporterad smärta, skadehistorik, träningsbelastning, styrkepass och readiness innan träningsråd ges.')}\n`
  context += `- ${t(locale, 'If pain or recurrent injury is near an area with weak control or low mobility, treat it as a hypothesis to follow up with the coach/physio, not as a diagnosis.', 'Om smärta eller återkommande skada finns nära ett område med svag kontroll eller låg rörlighet, behandla det som en hypotes att följa upp med coach/fysio, inte som en diagnos.')}\n`
  context += `- ${t(locale, 'With clear asymmetry or limited mobility: suggest conservative progression, unilateral strength, mobility, activation, technique drills, and simple monitoring before large volume or intensity increases.', 'Vid tydlig asymmetri eller begränsad rörlighet: föreslå konservativ progression, unilateral styrka, mobilitet, aktivering, teknikdrills och enklare monitorering före stora volym- eller intensitetsökningar.')}\n`
  context += `- ${t(locale, 'When pose findings are normal but the athlete has significant symptoms, prioritize recovery, load history, and medical/physio assessment over technical conclusions.', 'När posefynden är normala men atletens symtom är höga, prioritera återhämtning, belastningshistorik och medicinsk/fysioterapeutisk bedömning framför tekniska slutsatser.')}\n`

  return context
}
