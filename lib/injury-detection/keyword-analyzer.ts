/**
 * Keyword Analyzer for Injury Detection
 *
 * Analyzes free-text notes from daily check-ins to detect:
 * - Body part mentions (knee, achilles, etc.)
 * - Pain indicators (pain, sore, etc.)
 * - Severity indicators (acute, severe, etc.)
 * - Illness mentions (fever, stomach flu, etc.)
 *
 * Supports both Swedish and English keywords.
 */

import type { BodyPart, IllnessType } from './sport-injuries'

// ============================================
// TYPES
// ============================================

export interface KeywordMatch {
  keyword: string
  originalText: string // The matched text from notes
  category: 'BODY_PART' | 'PAIN_INDICATOR' | 'SEVERITY' | 'ILLNESS' | 'SIDE'
  value: string // The normalized value (e.g., 'KNEE', 'HIGH', etc.)
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface KeywordAnalysisResult {
  matches: KeywordMatch[]
  suggestedBodyPart: BodyPart | null
  suggestedSide: 'LEFT' | 'RIGHT' | 'BOTH' | null
  severityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null
  detectedIllness: IllnessType | null
  hasInjuryKeywords: boolean
  hasIllnessKeywords: boolean
  summary: string // Human-readable summary for coach notification
}

// ============================================
// KEYWORD DICTIONARIES
// ============================================

// Body part keywords → BodyPart mapping
// Format: [keyword, bodyPart, confidence]
const BODY_PART_KEYWORDS: [string, BodyPart, 'HIGH' | 'MEDIUM' | 'LOW'][] = [
  // Swedish - Knee
  ['knä', 'KNEE', 'HIGH'],
  ['knäet', 'KNEE', 'HIGH'],
  ['knäna', 'KNEE', 'HIGH'],
  ['knäskada', 'KNEE', 'HIGH'],
  ['löparknä', 'KNEE', 'HIGH'],

  // Swedish - Lower leg
  ['vad', 'LOWER_LEG', 'HIGH'],
  ['vader', 'LOWER_LEG', 'HIGH'],
  ['vaderna', 'LOWER_LEG', 'HIGH'],
  ['vadmuskel', 'LOWER_LEG', 'HIGH'],
  ['skenben', 'LOWER_LEG', 'HIGH'],
  ['skenbenet', 'LOWER_LEG', 'HIGH'],
  ['benhinneinflammation', 'LOWER_LEG', 'HIGH'],

  // Swedish - Achilles/Ankle/Foot
  ['hälsena', 'ANKLE_FOOT', 'HIGH'],
  ['hälsenan', 'ANKLE_FOOT', 'HIGH'],
  ['akillessena', 'ANKLE_FOOT', 'HIGH'],
  ['akillessenan', 'ANKLE_FOOT', 'HIGH'],
  ['akilles', 'ANKLE_FOOT', 'HIGH'],
  ['fotled', 'ANKLE_FOOT', 'HIGH'],
  ['fotleden', 'ANKLE_FOOT', 'HIGH'],
  ['ankeln', 'ANKLE_FOOT', 'HIGH'],
  ['fot', 'ANKLE_FOOT', 'MEDIUM'],
  ['foten', 'ANKLE_FOOT', 'HIGH'],
  ['fötterna', 'ANKLE_FOOT', 'HIGH'],
  ['häl', 'ANKLE_FOOT', 'HIGH'],
  ['hälen', 'ANKLE_FOOT', 'HIGH'],
  ['plantarfasciit', 'ANKLE_FOOT', 'HIGH'],
  ['hälsporre', 'ANKLE_FOOT', 'HIGH'],

  // Swedish - Hip/Groin
  ['höft', 'HIP_GROIN', 'HIGH'],
  ['höften', 'HIP_GROIN', 'HIGH'],
  ['höftböjare', 'HIP_GROIN', 'HIGH'],
  ['ljumske', 'HIP_GROIN', 'HIGH'],
  ['ljumsken', 'HIP_GROIN', 'HIGH'],
  ['ljumskskada', 'HIP_GROIN', 'HIGH'],

  // Swedish - Thigh
  ['lår', 'THIGH', 'HIGH'],
  ['låret', 'THIGH', 'HIGH'],
  ['hamstring', 'THIGH', 'HIGH'],
  ['hamstrings', 'THIGH', 'HIGH'],
  ['baksida lår', 'THIGH', 'HIGH'],
  ['baksidan av låret', 'THIGH', 'HIGH'],
  ['quadriceps', 'THIGH', 'HIGH'],
  ['framsida lår', 'THIGH', 'HIGH'],

  // Swedish - Back
  ['rygg', 'LOWER_BACK', 'MEDIUM'],
  ['ryggen', 'LOWER_BACK', 'MEDIUM'],
  ['ländrygg', 'LOWER_BACK', 'HIGH'],
  ['ländryggen', 'LOWER_BACK', 'HIGH'],
  ['nedre rygg', 'LOWER_BACK', 'HIGH'],
  ['övre rygg', 'UPPER_BACK', 'HIGH'],
  ['diskbråck', 'LOWER_BACK', 'HIGH'],
  ['ischias', 'LOWER_BACK', 'HIGH'],

  // Swedish - Shoulder
  ['axel', 'SHOULDER', 'HIGH'],
  ['axeln', 'SHOULDER', 'HIGH'],
  ['axlarna', 'SHOULDER', 'HIGH'],
  ['axelskada', 'SHOULDER', 'HIGH'],
  ['rotatorkuff', 'SHOULDER', 'HIGH'],

  // Swedish - Neck
  ['nacke', 'HEAD_NECK', 'HIGH'],
  ['nacken', 'HEAD_NECK', 'HIGH'],
  ['nacksmärta', 'HEAD_NECK', 'HIGH'],
  ['huvud', 'HEAD_NECK', 'MEDIUM'],
  ['huvudet', 'HEAD_NECK', 'MEDIUM'],

  // Swedish - Arm/Hand
  ['handled', 'ARM_HAND', 'HIGH'],
  ['handleden', 'ARM_HAND', 'HIGH'],
  ['hand', 'ARM_HAND', 'MEDIUM'],
  ['handen', 'ARM_HAND', 'MEDIUM'],
  ['armbåge', 'ARM_HAND', 'HIGH'],
  ['armbågen', 'ARM_HAND', 'HIGH'],
  ['arm', 'ARM_HAND', 'MEDIUM'],
  ['armen', 'ARM_HAND', 'MEDIUM'],
  ['underarm', 'ARM_HAND', 'HIGH'],
  ['grepp', 'ARM_HAND', 'MEDIUM'],

  // English - common terms
  ['knee', 'KNEE', 'HIGH'],
  ['achilles', 'ANKLE_FOOT', 'HIGH'],
  ['ankle', 'ANKLE_FOOT', 'HIGH'],
  ['foot', 'ANKLE_FOOT', 'HIGH'],
  ['calf', 'LOWER_LEG', 'HIGH'],
  ['shin', 'LOWER_LEG', 'HIGH'],
  ['hip', 'HIP_GROIN', 'HIGH'],
  ['groin', 'HIP_GROIN', 'HIGH'],
  ['hamstring', 'THIGH', 'HIGH'],
  ['quad', 'THIGH', 'HIGH'],
  ['thigh', 'THIGH', 'HIGH'],
  ['back', 'LOWER_BACK', 'MEDIUM'],
  ['lower back', 'LOWER_BACK', 'HIGH'],
  ['shoulder', 'SHOULDER', 'HIGH'],
  ['neck', 'HEAD_NECK', 'HIGH'],
  ['wrist', 'ARM_HAND', 'HIGH'],
  ['elbow', 'ARM_HAND', 'HIGH'],
]

// Pain indicator keywords → severity
// Format: [keyword, severity, confidence]
const PAIN_KEYWORDS: [string, 'LOW' | 'MEDIUM' | 'HIGH', 'HIGH' | 'MEDIUM' | 'LOW'][] = [
  // Swedish - Low severity
  ['öm', 'LOW', 'HIGH'],
  ['ömhet', 'LOW', 'HIGH'],
  ['stel', 'LOW', 'MEDIUM'],
  ['stelhet', 'LOW', 'MEDIUM'],
  ['trött', 'LOW', 'LOW'],
  ['trötthet', 'LOW', 'LOW'],
  ['obehag', 'LOW', 'MEDIUM'],

  // Swedish - Medium severity
  ['ont', 'MEDIUM', 'HIGH'],
  ['ont i', 'MEDIUM', 'HIGH'],
  ['smärta', 'MEDIUM', 'HIGH'],
  ['smärtar', 'MEDIUM', 'HIGH'],
  ['värk', 'MEDIUM', 'HIGH'],
  ['värker', 'MEDIUM', 'HIGH'],
  ['irriterad', 'MEDIUM', 'MEDIUM'],
  ['irritation', 'MEDIUM', 'MEDIUM'],
  ['besvär', 'MEDIUM', 'MEDIUM'],
  ['problem', 'MEDIUM', 'LOW'],

  // Swedish - High severity
  ['svullen', 'HIGH', 'HIGH'],
  ['svullnad', 'HIGH', 'HIGH'],
  ['inflammation', 'HIGH', 'HIGH'],
  ['inflammerad', 'HIGH', 'HIGH'],
  ['skada', 'HIGH', 'HIGH'],
  ['skadad', 'HIGH', 'HIGH'],
  ['skadat', 'HIGH', 'HIGH'],
  ['stukat', 'HIGH', 'HIGH'],
  ['stukad', 'HIGH', 'HIGH'],
  ['stukning', 'HIGH', 'HIGH'],
  ['akut', 'HIGH', 'HIGH'],
  ['kraftig', 'HIGH', 'HIGH'],
  ['intensiv', 'HIGH', 'MEDIUM'],
  ['brutit', 'HIGH', 'HIGH'],
  ['bruten', 'HIGH', 'HIGH'],

  // English
  ['sore', 'LOW', 'HIGH'],
  ['soreness', 'LOW', 'HIGH'],
  ['stiff', 'LOW', 'MEDIUM'],
  ['tight', 'LOW', 'MEDIUM'],
  ['pain', 'MEDIUM', 'HIGH'],
  ['painful', 'MEDIUM', 'HIGH'],
  ['hurt', 'MEDIUM', 'HIGH'],
  ['hurts', 'MEDIUM', 'HIGH'],
  ['ache', 'MEDIUM', 'HIGH'],
  ['aching', 'MEDIUM', 'HIGH'],
  ['swollen', 'HIGH', 'HIGH'],
  ['swelling', 'HIGH', 'HIGH'],
  ['injured', 'HIGH', 'HIGH'],
  ['injury', 'HIGH', 'HIGH'],
  ['sprain', 'HIGH', 'HIGH'],
  ['strain', 'HIGH', 'HIGH'],
  ['acute', 'HIGH', 'HIGH'],
  ['severe', 'HIGH', 'HIGH'],
]

// Illness keywords → IllnessType
// Format: [keyword, illnessType, confidence]
const ILLNESS_KEYWORDS: [string, IllnessType, 'HIGH' | 'MEDIUM' | 'LOW'][] = [
  // Swedish - Gastrointestinal
  ['magsjuka', 'GASTROINTESTINAL', 'HIGH'],
  ['magont', 'GASTROINTESTINAL', 'MEDIUM'],
  ['magsår', 'GASTROINTESTINAL', 'MEDIUM'],
  ['kräks', 'GASTROINTESTINAL', 'HIGH'],
  ['kräkningar', 'GASTROINTESTINAL', 'HIGH'],
  ['kräkt', 'GASTROINTESTINAL', 'HIGH'],
  ['spy', 'GASTROINTESTINAL', 'HIGH'],
  ['spyr', 'GASTROINTESTINAL', 'HIGH'],
  ['diarré', 'GASTROINTESTINAL', 'HIGH'],
  ['lös mage', 'GASTROINTESTINAL', 'HIGH'],
  ['illamående', 'GASTROINTESTINAL', 'HIGH'],
  ['må illa', 'GASTROINTESTINAL', 'HIGH'],

  // Swedish - Fever
  ['feber', 'FEVER', 'HIGH'],
  ['febrig', 'FEVER', 'HIGH'],
  ['hög temperatur', 'FEVER', 'HIGH'],

  // Swedish - Cold
  ['förkyld', 'COLD', 'HIGH'],
  ['förkylning', 'COLD', 'HIGH'],
  ['snuvig', 'COLD', 'MEDIUM'],
  ['snuva', 'COLD', 'MEDIUM'],
  ['täppt', 'COLD', 'MEDIUM'],
  ['täppt näsa', 'COLD', 'HIGH'],
  ['hosta', 'COLD', 'MEDIUM'],
  ['hostar', 'COLD', 'MEDIUM'],
  ['halsont', 'COLD', 'HIGH'],
  ['ont i halsen', 'COLD', 'HIGH'],
  ['influensa', 'COLD', 'HIGH'],
  ['flunsa', 'COLD', 'HIGH'],

  // Swedish - Headache
  ['huvudvärk', 'HEADACHE', 'HIGH'],
  ['migrän', 'HEADACHE', 'HIGH'],

  // Swedish - General
  ['sjuk', 'GENERAL_ILLNESS', 'HIGH'],
  ['mår dåligt', 'GENERAL_ILLNESS', 'HIGH'],
  ['mår inte bra', 'GENERAL_ILLNESS', 'HIGH'],
  ['inte frisk', 'GENERAL_ILLNESS', 'HIGH'],

  // English
  ['stomach flu', 'GASTROINTESTINAL', 'HIGH'],
  ['vomit', 'GASTROINTESTINAL', 'HIGH'],
  ['vomiting', 'GASTROINTESTINAL', 'HIGH'],
  ['diarrhea', 'GASTROINTESTINAL', 'HIGH'],
  ['nausea', 'GASTROINTESTINAL', 'HIGH'],
  ['nauseous', 'GASTROINTESTINAL', 'HIGH'],
  ['fever', 'FEVER', 'HIGH'],
  ['feverish', 'FEVER', 'HIGH'],
  ['cold', 'COLD', 'LOW'], // Low confidence - could be temperature
  ['flu', 'COLD', 'HIGH'],
  ['cough', 'COLD', 'MEDIUM'],
  ['sore throat', 'COLD', 'HIGH'],
  ['headache', 'HEADACHE', 'HIGH'],
  ['migraine', 'HEADACHE', 'HIGH'],
  ['sick', 'GENERAL_ILLNESS', 'MEDIUM'],
  ['unwell', 'GENERAL_ILLNESS', 'HIGH'],
]

// Side indicators
// Format: [keyword, side, confidence]
const SIDE_KEYWORDS: [string, 'LEFT' | 'RIGHT' | 'BOTH', 'HIGH' | 'MEDIUM' | 'LOW'][] = [
  // Swedish
  ['vänster', 'LEFT', 'HIGH'],
  ['vänstra', 'LEFT', 'HIGH'],
  ['höger', 'RIGHT', 'HIGH'],
  ['högra', 'RIGHT', 'HIGH'],
  ['båda', 'BOTH', 'HIGH'],
  ['bägge', 'BOTH', 'HIGH'],
  ['bilateral', 'BOTH', 'HIGH'],

  // English
  ['left', 'LEFT', 'HIGH'],
  ['right', 'RIGHT', 'HIGH'],
  ['both', 'BOTH', 'HIGH'],
  ['bilateral', 'BOTH', 'HIGH'],
]

// ============================================
// ANALYZER FUNCTION
// ============================================

/**
 * Analyze notes text for injury-related keywords
 */
export function analyzeNotesForInjury(notes: string): KeywordAnalysisResult {
  if (!notes || notes.trim().length === 0) {
    return {
      matches: [],
      suggestedBodyPart: null,
      suggestedSide: null,
      severityLevel: null,
      detectedIllness: null,
      hasInjuryKeywords: false,
      hasIllnessKeywords: false,
      summary: '',
    }
  }

  const normalizedNotes = notes.toLowerCase().trim()
  const matches: KeywordMatch[] = []

  // Track best matches for each category
  let bestBodyPart: { part: BodyPart; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } | null = null
  let bestSeverity: { level: 'LOW' | 'MEDIUM' | 'HIGH'; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } | null = null
  let bestIllness: { type: IllnessType; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } | null = null
  let bestSide: { side: 'LEFT' | 'RIGHT' | 'BOTH'; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } | null = null

  // Check body part keywords
  for (const [keyword, bodyPart, confidence] of BODY_PART_KEYWORDS) {
    if (normalizedNotes.includes(keyword)) {
      matches.push({
        keyword,
        originalText: extractContext(notes, keyword),
        category: 'BODY_PART',
        value: bodyPart,
        confidence,
      })

      // Track best match (prefer higher confidence)
      if (!bestBodyPart || confidenceValue(confidence) > confidenceValue(bestBodyPart.confidence)) {
        bestBodyPart = { part: bodyPart, confidence }
      }
    }
  }

  // Check pain keywords
  for (const [keyword, severity, confidence] of PAIN_KEYWORDS) {
    if (normalizedNotes.includes(keyword)) {
      matches.push({
        keyword,
        originalText: extractContext(notes, keyword),
        category: 'PAIN_INDICATOR',
        value: severity,
        confidence,
      })

      // Track highest severity with decent confidence
      if (!bestSeverity ||
          (severityValue(severity) > severityValue(bestSeverity.level)) ||
          (severityValue(severity) === severityValue(bestSeverity.level) &&
           confidenceValue(confidence) > confidenceValue(bestSeverity.confidence))) {
        bestSeverity = { level: severity, confidence }
      }
    }
  }

  // Check illness keywords
  for (const [keyword, illnessType, confidence] of ILLNESS_KEYWORDS) {
    if (normalizedNotes.includes(keyword)) {
      matches.push({
        keyword,
        originalText: extractContext(notes, keyword),
        category: 'ILLNESS',
        value: illnessType,
        confidence,
      })

      // Track best illness match
      if (!bestIllness || confidenceValue(confidence) > confidenceValue(bestIllness.confidence)) {
        bestIllness = { type: illnessType, confidence }
      }
    }
  }

  // Check side keywords
  for (const [keyword, side, confidence] of SIDE_KEYWORDS) {
    if (normalizedNotes.includes(keyword)) {
      matches.push({
        keyword,
        originalText: extractContext(notes, keyword),
        category: 'SIDE',
        value: side,
        confidence,
      })

      if (!bestSide || confidenceValue(confidence) > confidenceValue(bestSide.confidence)) {
        bestSide = { side, confidence }
      }
    }
  }

  // Build summary
  const summary = buildSummary(matches, bestBodyPart, bestSeverity, bestIllness, bestSide)

  return {
    matches,
    suggestedBodyPart: bestBodyPart?.part || null,
    suggestedSide: bestSide?.side || null,
    severityLevel: bestSeverity?.level || null,
    detectedIllness: bestIllness?.type || null,
    hasInjuryKeywords: matches.some(m => m.category === 'BODY_PART' || m.category === 'PAIN_INDICATOR'),
    hasIllnessKeywords: matches.some(m => m.category === 'ILLNESS'),
    summary,
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function confidenceValue(confidence: 'HIGH' | 'MEDIUM' | 'LOW'): number {
  switch (confidence) {
    case 'HIGH': return 3
    case 'MEDIUM': return 2
    case 'LOW': return 1
  }
}

function severityValue(severity: 'LOW' | 'MEDIUM' | 'HIGH'): number {
  switch (severity) {
    case 'HIGH': return 3
    case 'MEDIUM': return 2
    case 'LOW': return 1
  }
}

/**
 * Extract surrounding context for a keyword match
 */
function extractContext(notes: string, keyword: string): string {
  const lowerNotes = notes.toLowerCase()
  const index = lowerNotes.indexOf(keyword)

  if (index === -1) return keyword

  const start = Math.max(0, index - 20)
  const end = Math.min(notes.length, index + keyword.length + 20)

  let context = notes.slice(start, end)
  if (start > 0) context = '...' + context
  if (end < notes.length) context = context + '...'

  return context.trim()
}

/**
 * Build human-readable summary for coach notification
 */
function buildSummary(
  matches: KeywordMatch[],
  bodyPart: { part: BodyPart; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } | null,
  severity: { level: 'LOW' | 'MEDIUM' | 'HIGH'; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } | null,
  illness: { type: IllnessType; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } | null,
  side: { side: 'LEFT' | 'RIGHT' | 'BOTH'; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } | null
): string {
  if (matches.length === 0) return ''

  const parts: string[] = []

  if (illness) {
    const illnessLabels: Record<IllnessType, string> = {
      FEVER: 'feber',
      GASTROINTESTINAL: 'magbesvär',
      COLD: 'förkylning',
      HEADACHE: 'huvudvärk',
      GENERAL_ILLNESS: 'sjukdom',
    }
    parts.push(`Möjlig ${illnessLabels[illness.type]} nämnd i anteckningar`)
  }

  if (bodyPart) {
    const bodyPartLabels: Record<BodyPart, string> = {
      HEAD_NECK: 'huvud/nacke',
      SHOULDER: 'axel',
      ARM_HAND: 'arm/hand',
      UPPER_BACK: 'övre rygg',
      LOWER_BACK: 'nedre rygg',
      HIP_GROIN: 'höft/ljumske',
      THIGH: 'lår',
      KNEE: 'knä',
      LOWER_LEG: 'underben/vad',
      ANKLE_FOOT: 'fotled/fot',
      OTHER: 'ospecificerat område',
    }

    let bodyPartText = `Nämner ${bodyPartLabels[bodyPart.part]}`
    if (side) {
      const sideLabels = { LEFT: 'vänster', RIGHT: 'höger', BOTH: 'båda sidor' }
      bodyPartText += ` (${sideLabels[side.side]})`
    }
    parts.push(bodyPartText)
  }

  if (severity && severity.level !== 'LOW') {
    const severityLabels = { LOW: 'lindrig', MEDIUM: 'måttlig', HIGH: 'hög' }
    parts.push(`Indikerar ${severityLabels[severity.level]} allvarlighetsgrad`)
  }

  // Add relevant keywords mentioned
  const uniqueKeywords = [...new Set(matches.map(m => m.keyword))]
  if (uniqueKeywords.length > 0 && uniqueKeywords.length <= 5) {
    parts.push(`Nyckelord: "${uniqueKeywords.join('", "')}"`)
  }

  return parts.join('. ')
}

/**
 * Check if notes suggest athlete is sick (vs injured)
 */
export function isSicknessIndicated(notes: string): boolean {
  const result = analyzeNotesForInjury(notes)
  return result.hasIllnessKeywords
}

/**
 * Get confidence score for injury detection (0-100)
 */
export function getInjuryConfidenceScore(result: KeywordAnalysisResult): number {
  if (!result.hasInjuryKeywords) return 0

  let score = 0

  // Body part mention adds confidence
  if (result.suggestedBodyPart) {
    const bodyPartMatch = result.matches.find(m => m.category === 'BODY_PART')
    if (bodyPartMatch) {
      score += bodyPartMatch.confidence === 'HIGH' ? 40 : bodyPartMatch.confidence === 'MEDIUM' ? 25 : 10
    }
  }

  // Pain indicator adds confidence
  const painMatches = result.matches.filter(m => m.category === 'PAIN_INDICATOR')
  if (painMatches.length > 0) {
    const maxPainConfidence = Math.max(...painMatches.map(m => confidenceValue(m.confidence)))
    score += maxPainConfidence * 15
  }

  // Severity indicator adds confidence
  if (result.severityLevel) {
    score += severityValue(result.severityLevel) * 10
  }

  // Side mentioned adds minor confidence (shows specificity)
  if (result.suggestedSide) {
    score += 5
  }

  return Math.min(100, score)
}
