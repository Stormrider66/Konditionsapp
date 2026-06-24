export type CardioDebriefSource = 'manual' | 'voice' | 'mixed'

export type CardioDebriefQuestionType = 'choice' | 'text'

export interface CardioDebriefOption {
  value: string
  label: string
}

export interface CardioDebriefQuestion {
  id: string
  type: CardioDebriefQuestionType
  label: string
  options?: CardioDebriefOption[]
}

export interface CardioDebriefAnswer {
  questionId: string
  question: string
  answer: string
  value?: string | null
}

export interface CardioPostWorkoutDebrief {
  version: 1
  capturedAt: string
  source: CardioDebriefSource
  answers: CardioDebriefAnswer[]
}

export interface CardioDebriefSignals {
  locale: 'en' | 'sv'
  totalSegments: number
  completedSegments: number
  skippedSegments: number
  plannedPowerLowWindows?: number
  plannedPowerHighWindows?: number
  lowRhythmWindows?: number
  slowHeartRateRecovery?: boolean
  painMentioned?: boolean
}

const DEBRIEF_START = '[CARDIO_DEBRIEF_V1]'
const DEBRIEF_END = '[/CARDIO_DEBRIEF_V1]'
const DEBRIEF_BLOCK_RE = /\n?\[CARDIO_DEBRIEF_V1\]([\s\S]*?)\[\/CARDIO_DEBRIEF_V1\]\n?/g

function text(locale: 'en' | 'sv', en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function choice(id: string, label: string, options: CardioDebriefOption[]): CardioDebriefQuestion {
  return { id, type: 'choice', label, options }
}

function freeText(id: string, label: string): CardioDebriefQuestion {
  return { id, type: 'text', label }
}

function limiterOptions(locale: 'en' | 'sv'): CardioDebriefOption[] {
  return [
    { value: 'legs', label: text(locale, 'Legs', 'Ben') },
    { value: 'breathing', label: text(locale, 'Breathing', 'Andning') },
    { value: 'energy', label: text(locale, 'Energy', 'Energi') },
    { value: 'pacing', label: text(locale, 'Pacing', 'Fartdisponering') },
    { value: 'none', label: text(locale, 'No limiter', 'Ingen begränsning') },
  ]
}

export function buildCardioDebriefQuestions(signals: CardioDebriefSignals): CardioDebriefQuestion[] {
  const locale = signals.locale
  const questions: CardioDebriefQuestion[] = []

  if (signals.painMentioned) {
    questions.push(freeText(
      'pain_detail',
      text(locale, 'Where did you feel it, and did it change during the workout?', 'Var kände du det, och förändrades det under passet?'),
    ))
  }

  if (signals.skippedSegments > 0 || signals.completedSegments < signals.totalSegments) {
    questions.push(freeText(
      'missed_work_reason',
      text(locale, 'What made you skip or shorten the work?', 'Vad gjorde att du kortade eller hoppade över delar?'),
    ))
  }

  if ((signals.plannedPowerLowWindows ?? 0) > 0) {
    questions.push(choice(
      'target_fit',
      text(locale, 'How did the watt target feel?', 'Hur kändes wattmålet?'),
      [
        { value: 'too_hard', label: text(locale, 'Too hard', 'För hårt') },
        { value: 'about_right', label: text(locale, 'About right', 'Lagom') },
        { value: 'too_easy', label: text(locale, 'Too easy', 'För lätt') },
        { value: 'pacing_issue', label: text(locale, 'Pacing issue', 'Fartdisponering') },
      ],
    ))
  } else if ((signals.plannedPowerHighWindows ?? 0) > 0) {
    questions.push(choice(
      'target_fit',
      text(locale, 'How did the intensity cap feel?', 'Hur kändes intensitetstaket?'),
      [
        { value: 'too_easy', label: text(locale, 'Too easy', 'För lätt') },
        { value: 'about_right', label: text(locale, 'About right', 'Lagom') },
        { value: 'surged', label: text(locale, 'I surged', 'Jag gick över') },
      ],
    ))
  }

  if ((signals.lowRhythmWindows ?? 0) > 0) {
    questions.push(choice(
      'rhythm_issue',
      text(locale, 'What happened to rhythm/cadence?', 'Vad hände med rytm/kadens?'),
      [
        { value: 'load_too_high', label: text(locale, 'Load too high', 'För hög belastning') },
        { value: 'legs_heavy', label: text(locale, 'Heavy legs', 'Tunga ben') },
        { value: 'focus_slipped', label: text(locale, 'Focus slipped', 'Tappade fokus') },
        { value: 'felt_fine', label: text(locale, 'Felt fine', 'Kändes bra') },
      ],
    ))
  }

  if (signals.slowHeartRateRecovery) {
    questions.push(choice(
      'recovery_feel',
      text(locale, 'How did the recovery feel between efforts?', 'Hur kändes vilan mellan intervallerna?'),
      [
        { value: 'not_enough', label: text(locale, 'Not enough', 'För kort') },
        { value: 'about_right', label: text(locale, 'About right', 'Lagom') },
        { value: 'could_repeat', label: text(locale, 'Could repeat', 'Kunde upprepa') },
      ],
    ))
  }

  if (questions.length < 3) {
    questions.push(choice(
      'main_limiter',
      text(locale, 'Main limiter today?', 'Största begränsningen idag?'),
      limiterOptions(locale),
    ))
  }

  if (questions.length < 3) {
    questions.push(freeText(
      'coach_note',
      text(locale, 'Anything your coach should know before the next workout?', 'Något coachen bör veta innan nästa pass?'),
    ))
  }

  return questions.slice(0, 3)
}

export function buildCardioPostWorkoutDebrief(input: {
  questions: CardioDebriefQuestion[]
  answersByQuestionId: Record<string, string>
  capturedAt?: string
  source?: CardioDebriefSource
}): CardioPostWorkoutDebrief | null {
  const answers = input.questions
    .map((question): CardioDebriefAnswer | null => {
      const rawValue = input.answersByQuestionId[question.id]?.trim()
      if (!rawValue) return null
      const option = question.options?.find((candidate) => candidate.value === rawValue)
      return {
        questionId: question.id,
        question: question.label,
        value: option ? option.value : null,
        answer: option ? option.label : rawValue,
      }
    })
    .filter((answer): answer is CardioDebriefAnswer => answer != null)

  if (answers.length === 0) return null

  return {
    version: 1,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    source: input.source ?? 'manual',
    answers,
  }
}

function normalizeDebrief(value: unknown): CardioPostWorkoutDebrief | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<CardioPostWorkoutDebrief>
  if (candidate.version !== 1) return null
  if (typeof candidate.capturedAt !== 'string') return null
  if (candidate.source !== 'manual' && candidate.source !== 'voice' && candidate.source !== 'mixed') return null
  if (!Array.isArray(candidate.answers)) return null

  const answers = candidate.answers
    .map((answer): CardioDebriefAnswer | null => {
      if (!answer || typeof answer !== 'object') return null
      const item = answer as Partial<CardioDebriefAnswer>
      if (typeof item.questionId !== 'string' || typeof item.question !== 'string' || typeof item.answer !== 'string') {
        return null
      }
      return {
        questionId: item.questionId,
        question: item.question,
        answer: item.answer,
        value: typeof item.value === 'string' ? item.value : null,
      }
    })
    .filter((answer): answer is CardioDebriefAnswer => answer != null)

  if (answers.length === 0) return null

  return {
    version: 1,
    capturedAt: candidate.capturedAt,
    source: candidate.source,
    answers,
  }
}

export function parseCardioDebriefFromNotes(notes: string | null | undefined): CardioPostWorkoutDebrief | null {
  if (!notes) return null

  let parsed: CardioPostWorkoutDebrief | null = null
  for (const match of notes.matchAll(DEBRIEF_BLOCK_RE)) {
    try {
      const candidate = normalizeDebrief(JSON.parse(match[1]))
      if (candidate) parsed = candidate
    } catch {
      // Ignore malformed legacy/manual note blocks and keep the visible notes intact.
    }
  }

  return parsed
}

export function stripCardioDebriefFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null
  const stripped = notes.replace(DEBRIEF_BLOCK_RE, '\n').trim()
  return stripped.length > 0 ? stripped : null
}

export function attachCardioDebriefToNotes(
  notes: string | null | undefined,
  debrief: CardioPostWorkoutDebrief | null,
): string | undefined {
  const plainNotes = stripCardioDebriefFromNotes(notes) ?? ''
  if (!debrief || debrief.answers.length === 0) {
    return plainNotes || undefined
  }

  const block = `${DEBRIEF_START}${JSON.stringify(debrief)}${DEBRIEF_END}`
  return [plainNotes, block].filter(Boolean).join('\n\n') || undefined
}
