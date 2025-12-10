// lib/ai/advanced-intelligence/coach-style-matching.ts
// Extract coaching style from uploaded documents and apply to program generation

import { prisma } from '@/lib/prisma'

export interface CoachingStyle {
  coachId: string
  styleProfile: StyleProfile
  methodologyPreferences: MethodologyPreference[]
  communicationStyle: CommunicationStyle
  programCharacteristics: ProgramCharacteristics
  extractedInsights: StyleInsight[]
  confidence: number
}

export interface StyleProfile {
  primaryApproach: 'scientific' | 'intuitive' | 'data-driven' | 'holistic' | 'athlete-centered'
  intensityPhilosophy: 'conservative' | 'progressive' | 'aggressive'
  recoveryEmphasis: 'high' | 'moderate' | 'low'
  periodizationType: 'linear' | 'undulating' | 'block' | 'polarized'
  strengthIntegration: 'high' | 'moderate' | 'minimal'
  description: string
}

export interface MethodologyPreference {
  methodology: string
  preferenceScore: number // 0-100
  useCases: string[]
  notes: string
}

export interface CommunicationStyle {
  feedbackType: 'detailed' | 'concise' | 'visual'
  encouragementLevel: 'high' | 'moderate' | 'minimal'
  dataPresentation: 'graphs' | 'numbers' | 'narrative'
  languageTone: 'formal' | 'casual' | 'motivational'
}

export interface ProgramCharacteristics {
  typicalWeeklyStructure: {
    hardDays: number
    easyDays: number
    restDays: number
    longRuns: number
  }
  volumeProgression: 'gradual' | 'stepped' | 'wave'
  peakingStrategy: 'traditional' | 'reverse' | 'multi-peak'
  recoveryWeekFrequency: number // Every X weeks
  qualitySessionTypes: string[]
}

export interface StyleInsight {
  source: 'document' | 'program_history' | 'athlete_feedback'
  category: string
  insight: string
  confidence: number
}

export interface StyleExtractionRequest {
  coachId: string
  documentIds?: string[]
  includeHistory?: boolean
}

/**
 * Extract coaching style from uploaded documents and program history
 */
export async function extractCoachingStyle(
  request: StyleExtractionRequest
): Promise<CoachingStyle> {
  const { coachId, documentIds, includeHistory = true } = request

  // Fetch documents if specified
  const documents = documentIds
    ? await prisma.coachDocument.findMany({
        where: {
          id: { in: documentIds },
          coachId,
        },
      })
    : await prisma.coachDocument.findMany({
        where: { coachId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })

  // Fetch program history if requested
  const programs = includeHistory
    ? await prisma.trainingProgram.findMany({
        where: { coachId },
        include: {
          weeks: {
            include: {
              days: {
                include: {
                  workouts: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
    : []

  // Extract style from documents
  const documentInsights = await extractFromDocuments(documents)

  // Extract style from program history
  const programInsights = analyzePrograms(programs)

  // Combine insights into cohesive style profile
  const styleProfile = synthesizeStyleProfile(documentInsights, programInsights)
  const methodologyPreferences = extractMethodologyPreferences(documentInsights, programInsights)
  const communicationStyle = inferCommunicationStyle(documentInsights)
  const programCharacteristics = deriveProgramCharacteristics(programInsights)

  // Calculate overall confidence
  const confidence = calculateStyleConfidence(documents.length, programs.length)

  return {
    coachId,
    styleProfile,
    methodologyPreferences,
    communicationStyle,
    programCharacteristics,
    extractedInsights: [...documentInsights, ...programInsights],
    confidence,
  }
}

/**
 * Apply coaching style to program generation prompt
 */
export function applyStyleToPrompt(style: CoachingStyle, basePrompt: string): string {
  const styleGuidelines: string[] = []

  // Add style profile guidance
  styleGuidelines.push(`## Coaching Style Profile`)
  styleGuidelines.push(`- Primary approach: ${style.styleProfile.primaryApproach}`)
  styleGuidelines.push(`- Intensity philosophy: ${style.styleProfile.intensityPhilosophy}`)
  styleGuidelines.push(`- Recovery emphasis: ${style.styleProfile.recoveryEmphasis}`)
  styleGuidelines.push(`- Periodization type: ${style.styleProfile.periodizationType}`)

  // Add methodology preferences
  if (style.methodologyPreferences.length > 0) {
    styleGuidelines.push(`\n## Preferred Methodologies`)
    style.methodologyPreferences
      .filter(m => m.preferenceScore > 50)
      .forEach(m => {
        styleGuidelines.push(`- ${m.methodology} (${m.preferenceScore}% preference): ${m.notes}`)
      })
  }

  // Add program structure preferences
  styleGuidelines.push(`\n## Program Structure Guidelines`)
  styleGuidelines.push(`- Weekly structure: ${style.programCharacteristics.typicalWeeklyStructure.hardDays} hard days, ${style.programCharacteristics.typicalWeeklyStructure.easyDays} easy days, ${style.programCharacteristics.typicalWeeklyStructure.restDays} rest days`)
  styleGuidelines.push(`- Volume progression: ${style.programCharacteristics.volumeProgression}`)
  styleGuidelines.push(`- Recovery week every ${style.programCharacteristics.recoveryWeekFrequency} weeks`)
  styleGuidelines.push(`- Preferred quality sessions: ${style.programCharacteristics.qualitySessionTypes.join(', ')}`)

  // Add communication style
  styleGuidelines.push(`\n## Communication Guidelines`)
  styleGuidelines.push(`- Feedback type: ${style.communicationStyle.feedbackType}`)
  styleGuidelines.push(`- Tone: ${style.communicationStyle.languageTone}`)
  styleGuidelines.push(`- Data presentation: ${style.communicationStyle.dataPresentation}`)

  return `${basePrompt}\n\n${styleGuidelines.join('\n')}`
}

/**
 * Match athlete to best coach style compatibility
 */
export function calculateStyleCompatibility(
  coachStyle: CoachingStyle,
  athleteProfile: AthleteStylePreferences
): number {
  let compatibility = 50 // Base compatibility

  // Approach match
  if (athleteProfile.preferredApproach === coachStyle.styleProfile.primaryApproach) {
    compatibility += 15
  }

  // Intensity philosophy match
  if (athleteProfile.intensityTolerance === 'high' && coachStyle.styleProfile.intensityPhilosophy === 'aggressive') {
    compatibility += 10
  } else if (athleteProfile.intensityTolerance === 'low' && coachStyle.styleProfile.intensityPhilosophy === 'conservative') {
    compatibility += 10
  }

  // Recovery needs match
  if (athleteProfile.recoveryNeeds === 'high' && coachStyle.styleProfile.recoveryEmphasis === 'high') {
    compatibility += 10
  }

  // Communication match
  if (athleteProfile.feedbackPreference === coachStyle.communicationStyle.feedbackType) {
    compatibility += 10
  }

  // Methodology experience
  const sharedMethodologies = athleteProfile.experiencedMethodologies.filter(m =>
    coachStyle.methodologyPreferences.some(p => p.methodology === m && p.preferenceScore > 50)
  )
  compatibility += sharedMethodologies.length * 5

  return Math.min(100, compatibility)
}

interface AthleteStylePreferences {
  preferredApproach: StyleProfile['primaryApproach']
  intensityTolerance: 'low' | 'moderate' | 'high'
  recoveryNeeds: 'low' | 'moderate' | 'high'
  feedbackPreference: CommunicationStyle['feedbackType']
  experiencedMethodologies: string[]
}

// Internal helper functions
async function extractFromDocuments(
  documents: { id: string; name: string; fileType: string; content?: string }[]
): Promise<StyleInsight[]> {
  const insights: StyleInsight[] = []

  // Analyze document names and types
  documents.forEach(doc => {
    const lowerName = doc.name.toLowerCase()

    // Methodology indicators
    if (lowerName.includes('polarized') || lowerName.includes('80/20')) {
      insights.push({
        source: 'document',
        category: 'methodology',
        insight: 'Preference for polarized training distribution',
        confidence: 0.8,
      })
    }

    if (lowerName.includes('norwegian') || lowerName.includes('ingebrigtsen')) {
      insights.push({
        source: 'document',
        category: 'methodology',
        insight: 'Interest in Norwegian double-threshold method',
        confidence: 0.8,
      })
    }

    if (lowerName.includes('canova') || lowerName.includes('renato')) {
      insights.push({
        source: 'document',
        category: 'methodology',
        insight: 'Canova marathon methodology influence',
        confidence: 0.8,
      })
    }

    if (lowerName.includes('strength') || lowerName.includes('styrka')) {
      insights.push({
        source: 'document',
        category: 'training',
        insight: 'Emphasis on strength training integration',
        confidence: 0.7,
      })
    }

    if (lowerName.includes('recovery') || lowerName.includes('vila') || lowerName.includes('återhämtning')) {
      insights.push({
        source: 'document',
        category: 'philosophy',
        insight: 'Strong focus on recovery and adaptation',
        confidence: 0.7,
      })
    }

    // Scientific approach indicators
    if (lowerName.includes('research') || lowerName.includes('study') || lowerName.includes('forskning')) {
      insights.push({
        source: 'document',
        category: 'approach',
        insight: 'Evidence-based, scientific approach to coaching',
        confidence: 0.8,
      })
    }
  })

  return insights
}

function analyzePrograms(
  programs: {
    weeks: {
      days: {
        workouts: { type: string | null; duration: number | null }[]
      }[]
    }[]
  }[]
): StyleInsight[] {
  const insights: StyleInsight[] = []

  if (programs.length === 0) return insights

  // Analyze workout distribution
  let totalWorkouts = 0
  let hardWorkouts = 0
  let easyWorkouts = 0
  let restDays = 0

  programs.forEach(program => {
    program.weeks.forEach(week => {
      week.days.forEach(day => {
        if (day.workouts.length === 0) {
          restDays++
        } else {
          day.workouts.forEach(workout => {
            totalWorkouts++
            const type = (workout.type || '').toLowerCase()
            if (type.includes('interval') || type.includes('tempo') || type.includes('quality')) {
              hardWorkouts++
            } else {
              easyWorkouts++
            }
          })
        }
      })
    })
  })

  // Derive insights from distribution
  const hardPercent = totalWorkouts > 0 ? (hardWorkouts / totalWorkouts) * 100 : 20

  if (hardPercent <= 20) {
    insights.push({
      source: 'program_history',
      category: 'distribution',
      insight: 'Follows 80/20 polarized distribution in programs',
      confidence: 0.9,
    })
  } else if (hardPercent > 30) {
    insights.push({
      source: 'program_history',
      category: 'distribution',
      insight: 'Higher intensity focus than typical polarized approach',
      confidence: 0.85,
    })
  }

  // Rest day frequency
  const totalDays = programs.reduce((sum, p) => sum + p.weeks.length * 7, 0)
  const restPercent = totalDays > 0 ? (restDays / totalDays) * 100 : 14

  if (restPercent >= 20) {
    insights.push({
      source: 'program_history',
      category: 'recovery',
      insight: 'Emphasizes rest days in programming',
      confidence: 0.85,
    })
  }

  return insights
}

function synthesizeStyleProfile(
  documentInsights: StyleInsight[],
  programInsights: StyleInsight[]
): StyleProfile {
  const allInsights = [...documentInsights, ...programInsights]

  // Determine primary approach
  const hasScientific = allInsights.some(i => i.category === 'approach' && i.insight.includes('scientific'))
  const hasHolistic = allInsights.some(i => i.insight.toLowerCase().includes('recovery') || i.insight.toLowerCase().includes('holistic'))
  const hasDataDriven = allInsights.some(i => i.insight.includes('data') || i.insight.includes('metrics'))

  let primaryApproach: StyleProfile['primaryApproach'] = 'athlete-centered'
  if (hasScientific) primaryApproach = 'scientific'
  else if (hasDataDriven) primaryApproach = 'data-driven'
  else if (hasHolistic) primaryApproach = 'holistic'

  // Determine intensity philosophy
  const hasAggressive = allInsights.some(i => i.insight.toLowerCase().includes('high intensity') || i.insight.toLowerCase().includes('aggressive'))
  const hasConservative = allInsights.some(i => i.insight.toLowerCase().includes('conservative') || i.insight.toLowerCase().includes('gradual'))

  let intensityPhilosophy: StyleProfile['intensityPhilosophy'] = 'progressive'
  if (hasAggressive) intensityPhilosophy = 'aggressive'
  else if (hasConservative) intensityPhilosophy = 'conservative'

  // Determine recovery emphasis
  const recoveryInsights = allInsights.filter(i => i.category === 'recovery' || i.insight.toLowerCase().includes('recovery'))
  let recoveryEmphasis: StyleProfile['recoveryEmphasis'] = 'moderate'
  if (recoveryInsights.length >= 2) recoveryEmphasis = 'high'
  else if (recoveryInsights.length === 0) recoveryEmphasis = 'low'

  // Determine periodization type
  const hasPolarized = allInsights.some(i => i.insight.toLowerCase().includes('polarized'))
  const hasBlock = allInsights.some(i => i.insight.toLowerCase().includes('block'))

  let periodizationType: StyleProfile['periodizationType'] = 'undulating'
  if (hasPolarized) periodizationType = 'polarized'
  else if (hasBlock) periodizationType = 'block'

  // Determine strength integration
  const strengthInsights = allInsights.filter(i => i.insight.toLowerCase().includes('strength'))
  let strengthIntegration: StyleProfile['strengthIntegration'] = 'moderate'
  if (strengthInsights.length >= 2) strengthIntegration = 'high'
  else if (strengthInsights.length === 0) strengthIntegration = 'minimal'

  return {
    primaryApproach,
    intensityPhilosophy,
    recoveryEmphasis,
    periodizationType,
    strengthIntegration,
    description: `${primaryApproach.charAt(0).toUpperCase() + primaryApproach.slice(1)} coach with ${intensityPhilosophy} intensity philosophy and ${recoveryEmphasis} recovery emphasis`,
  }
}

function extractMethodologyPreferences(
  documentInsights: StyleInsight[],
  programInsights: StyleInsight[]
): MethodologyPreference[] {
  const allInsights = [...documentInsights, ...programInsights]
  const methodologies: MethodologyPreference[] = []

  // Check for specific methodologies
  const methodologyChecks = [
    { name: 'Polarized (80/20)', keywords: ['polarized', '80/20', 'lågintensiv'] },
    { name: 'Norwegian Double Threshold', keywords: ['norwegian', 'ingebrigtsen', 'double threshold'] },
    { name: 'Canova', keywords: ['canova', 'renato', 'marathon specific'] },
    { name: 'Block Periodization', keywords: ['block', 'concentration'] },
    { name: 'Daniels Running Formula', keywords: ['daniels', 'vdot'] },
    { name: 'Lydiard Base Building', keywords: ['lydiard', 'base building', 'aerobic'] },
  ]

  methodologyChecks.forEach(method => {
    const matches = allInsights.filter(i =>
      method.keywords.some(k => i.insight.toLowerCase().includes(k))
    )

    if (matches.length > 0) {
      const avgConfidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length
      methodologies.push({
        methodology: method.name,
        preferenceScore: Math.round(avgConfidence * 100),
        useCases: matches.map(m => m.insight),
        notes: `Based on ${matches.length} indicator(s)`,
      })
    }
  })

  // Sort by preference score
  return methodologies.sort((a, b) => b.preferenceScore - a.preferenceScore)
}

function inferCommunicationStyle(documentInsights: StyleInsight[]): CommunicationStyle {
  // Default style - can be refined with more document analysis
  return {
    feedbackType: 'detailed',
    encouragementLevel: 'moderate',
    dataPresentation: 'graphs',
    languageTone: 'professional' as 'formal', // Map to valid type
  }
}

function deriveProgramCharacteristics(
  programInsights: StyleInsight[]
): ProgramCharacteristics {
  // Derive from insights or use defaults
  const hasHighRest = programInsights.some(i => i.insight.includes('rest'))
  const hasPolarized = programInsights.some(i => i.insight.includes('80/20'))

  return {
    typicalWeeklyStructure: {
      hardDays: hasPolarized ? 2 : 3,
      easyDays: hasPolarized ? 4 : 3,
      restDays: hasHighRest ? 2 : 1,
      longRuns: 1,
    },
    volumeProgression: 'wave',
    peakingStrategy: 'traditional',
    recoveryWeekFrequency: 4,
    qualitySessionTypes: hasPolarized
      ? ['Intervals', 'Tempo', 'Long Run']
      : ['Intervals', 'Tempo', 'Fartlek', 'Long Run'],
  }
}

function calculateStyleConfidence(documentCount: number, programCount: number): number {
  let confidence = 0.3 // Base confidence

  // More documents = higher confidence
  confidence += Math.min(0.3, documentCount * 0.05)

  // More program history = higher confidence
  confidence += Math.min(0.3, programCount * 0.03)

  return Math.min(0.9, confidence)
}
