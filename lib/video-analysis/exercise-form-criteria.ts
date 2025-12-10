/**
 * Exercise Form Criteria Library
 *
 * Defines ideal joint angle ranges and coaching cues for exercises.
 * Based on biomechanical research and exercise science best practices.
 */

export interface JointCriterion {
  joint: string
  idealMin: number
  idealMax: number
  warningMin: number
  warningMax: number
  cueBelow: string  // Swedish coaching cue when angle is too low
  cueAbove: string  // Swedish coaching cue when angle is too high
  phase?: 'bottom' | 'top' | 'concentric' | 'eccentric' | 'any'
}

export interface ExerciseFormCriteria {
  exerciseId?: string
  exerciseName: string
  exerciseNameSv: string
  videoType: 'STRENGTH' | 'RUNNING_GAIT' | 'SPORT_SPECIFIC'
  criteria: JointCriterion[]
  generalCues: string[]  // General coaching cues in Swedish
}

// Common angle criteria for different exercise categories
export const SQUAT_CRITERIA: JointCriterion[] = [
  {
    joint: 'Vänster knä',
    idealMin: 80,
    idealMax: 100,
    warningMin: 70,
    warningMax: 110,
    cueBelow: 'Gå djupare i knäböjen för full rörlighet',
    cueAbove: 'Böj knäna mer i bottenläget',
    phase: 'bottom',
  },
  {
    joint: 'Höger knä',
    idealMin: 80,
    idealMax: 100,
    warningMin: 70,
    warningMax: 110,
    cueBelow: 'Gå djupare i knäböjen för full rörlighet',
    cueAbove: 'Böj knäna mer i bottenläget',
    phase: 'bottom',
  },
  {
    joint: 'Vänster höft',
    idealMin: 70,
    idealMax: 100,
    warningMin: 60,
    warningMax: 110,
    cueBelow: 'Luta bröstkorgen framåt för bättre balans',
    cueAbove: 'Håll bröstkorgen mer upprätt',
    phase: 'bottom',
  },
  {
    joint: 'Höger höft',
    idealMin: 70,
    idealMax: 100,
    warningMin: 60,
    warningMax: 110,
    cueBelow: 'Luta bröstkorgen framåt för bättre balans',
    cueAbove: 'Håll bröstkorgen mer upprätt',
    phase: 'bottom',
  },
]

export const DEADLIFT_CRITERIA: JointCriterion[] = [
  {
    joint: 'Vänster knä',
    idealMin: 140,
    idealMax: 170,
    warningMin: 130,
    warningMax: 180,
    cueBelow: 'Sträck ut knäna mer i toppläget',
    cueAbove: 'Låt knäna vara lätt böjda',
    phase: 'top',
  },
  {
    joint: 'Höger knä',
    idealMin: 140,
    idealMax: 170,
    warningMin: 130,
    warningMax: 180,
    cueBelow: 'Sträck ut knäna mer i toppläget',
    cueAbove: 'Låt knäna vara lätt böjda',
    phase: 'top',
  },
  {
    joint: 'Vänster höft',
    idealMin: 160,
    idealMax: 180,
    warningMin: 150,
    warningMax: 180,
    cueBelow: 'Driv höfterna framåt i toppläget',
    cueAbove: 'Undvik överdriven bakåtlutning',
    phase: 'top',
  },
  {
    joint: 'Höger höft',
    idealMin: 160,
    idealMax: 180,
    warningMin: 150,
    warningMax: 180,
    cueBelow: 'Driv höfterna framåt i toppläget',
    cueAbove: 'Undvik överdriven bakåtlutning',
    phase: 'top',
  },
]

export const LUNGE_CRITERIA: JointCriterion[] = [
  {
    joint: 'Vänster knä',
    idealMin: 85,
    idealMax: 100,
    warningMin: 75,
    warningMax: 110,
    cueBelow: 'Sänk höfterna djupare',
    cueAbove: 'Stoppa när knät är i 90 grader',
    phase: 'bottom',
  },
  {
    joint: 'Höger knä',
    idealMin: 85,
    idealMax: 100,
    warningMin: 75,
    warningMax: 110,
    cueBelow: 'Sänk höfterna djupare',
    cueAbove: 'Stoppa när knät är i 90 grader',
    phase: 'bottom',
  },
  {
    joint: 'Vänster höft',
    idealMin: 90,
    idealMax: 110,
    warningMin: 80,
    warningMax: 120,
    cueBelow: 'Håll överkroppen mer upprätt',
    cueAbove: 'Sänk höfterna rakt ned',
    phase: 'bottom',
  },
]

export const HIP_HINGE_CRITERIA: JointCriterion[] = [
  {
    joint: 'Vänster höft',
    idealMin: 70,
    idealMax: 100,
    warningMin: 60,
    warningMax: 110,
    cueBelow: 'Böj mer från höfterna, inte ryggen',
    cueAbove: 'Sträck på höfterna i toppläget',
    phase: 'bottom',
  },
  {
    joint: 'Höger höft',
    idealMin: 70,
    idealMax: 100,
    warningMin: 60,
    warningMax: 110,
    cueBelow: 'Böj mer från höfterna, inte ryggen',
    cueAbove: 'Sträck på höfterna i toppläget',
    phase: 'bottom',
  },
  {
    joint: 'Vänster knä',
    idealMin: 150,
    idealMax: 175,
    warningMin: 140,
    warningMax: 180,
    cueBelow: 'Håll benen nästan raka',
    cueAbove: 'Låt knäna vara lätt böjda',
    phase: 'any',
  },
]

export const PLANK_CRITERIA: JointCriterion[] = [
  {
    joint: 'Vänster höft',
    idealMin: 160,
    idealMax: 180,
    warningMin: 150,
    warningMax: 180,
    cueBelow: 'Sänk inte höfterna - håll rak linje',
    cueAbove: 'Sänk inte höfterna',
    phase: 'any',
  },
  {
    joint: 'Höger höft',
    idealMin: 160,
    idealMax: 180,
    warningMin: 150,
    warningMax: 180,
    cueBelow: 'Sänk inte höfterna - håll rak linje',
    cueAbove: 'Lyft inte rumpan för högt',
    phase: 'any',
  },
  {
    joint: 'Vänster armbåge',
    idealMin: 85,
    idealMax: 95,
    warningMin: 75,
    warningMax: 105,
    cueBelow: 'Placera armbågarna rakt under axlarna',
    cueAbove: 'Håll armbågarna i 90 grader',
    phase: 'any',
  },
]

export const PUSH_UP_CRITERIA: JointCriterion[] = [
  {
    joint: 'Vänster armbåge',
    idealMin: 80,
    idealMax: 100,
    warningMin: 70,
    warningMax: 110,
    cueBelow: 'Gå djupare i nedgången',
    cueAbove: 'Undvik att gå för djupt',
    phase: 'bottom',
  },
  {
    joint: 'Höger armbåge',
    idealMin: 80,
    idealMax: 100,
    warningMin: 70,
    warningMax: 110,
    cueBelow: 'Gå djupare i nedgången',
    cueAbove: 'Undvik att gå för djupt',
    phase: 'bottom',
  },
  {
    joint: 'Vänster höft',
    idealMin: 160,
    idealMax: 180,
    warningMin: 150,
    warningMax: 180,
    cueBelow: 'Håll kroppen rak som en planka',
    cueAbove: 'Sänk inte höfterna',
    phase: 'any',
  },
]

export const CALF_RAISE_CRITERIA: JointCriterion[] = [
  {
    joint: 'Vänster knä',
    idealMin: 170,
    idealMax: 180,
    warningMin: 160,
    warningMax: 180,
    cueBelow: 'Håll benen raka genom hela rörelsen',
    cueAbove: 'Undvik överutsträckning',
    phase: 'any',
  },
  {
    joint: 'Höger knä',
    idealMin: 170,
    idealMax: 180,
    warningMin: 160,
    warningMax: 180,
    cueBelow: 'Håll benen raka genom hela rörelsen',
    cueAbove: 'Undvik överutsträckning',
    phase: 'any',
  },
]

// Running gait criteria
export const RUNNING_GAIT_CRITERIA: JointCriterion[] = [
  {
    joint: 'Vänster knä',
    idealMin: 140,
    idealMax: 170,
    warningMin: 130,
    warningMax: 180,
    cueBelow: 'Undvik överdriven knälyft',
    cueAbove: 'Håll knäna mer böjda vid landing',
    phase: 'any',
  },
  {
    joint: 'Höger knä',
    idealMin: 140,
    idealMax: 170,
    warningMin: 130,
    warningMax: 180,
    cueBelow: 'Undvik överdriven knälyft',
    cueAbove: 'Håll knäna mer böjda vid landing',
    phase: 'any',
  },
  {
    joint: 'Vänster höft',
    idealMin: 150,
    idealMax: 175,
    warningMin: 140,
    warningMax: 180,
    cueBelow: 'Öka höftextensionen vid avslut',
    cueAbove: 'Undvik överdriven framåtlutning',
    phase: 'any',
  },
  {
    joint: 'Höger höft',
    idealMin: 150,
    idealMax: 175,
    warningMin: 140,
    warningMax: 180,
    cueBelow: 'Öka höftextensionen vid avslut',
    cueAbove: 'Undvik överdriven framåtlutning',
    phase: 'any',
  },
  {
    joint: 'Vänster armbåge',
    idealMin: 80,
    idealMax: 100,
    warningMin: 70,
    warningMax: 110,
    cueBelow: 'Håll armbågarna i ca 90 grader',
    cueAbove: 'Slappna av i armarna',
    phase: 'any',
  },
  {
    joint: 'Höger armbåge',
    idealMin: 80,
    idealMax: 100,
    warningMin: 70,
    warningMax: 110,
    cueBelow: 'Håll armbågarna i ca 90 grader',
    cueAbove: 'Slappna av i armarna',
    phase: 'any',
  },
]

// Exercise-specific form criteria database
export const EXERCISE_FORM_DATABASE: ExerciseFormCriteria[] = [
  // POSTERIOR CHAIN
  {
    exerciseName: 'Glute Bridge',
    exerciseNameSv: 'Höftbrygga',
    videoType: 'STRENGTH',
    criteria: [
      {
        joint: 'Vänster höft',
        idealMin: 160,
        idealMax: 180,
        warningMin: 150,
        warningMax: 180,
        cueBelow: 'Lyft höfterna högre',
        cueAbove: 'Undvik överdriven extension',
        phase: 'top',
      },
      {
        joint: 'Höger höft',
        idealMin: 160,
        idealMax: 180,
        warningMin: 150,
        warningMax: 180,
        cueBelow: 'Lyft höfterna högre',
        cueAbove: 'Undvik överdriven extension',
        phase: 'top',
      },
      {
        joint: 'Vänster knä',
        idealMin: 80,
        idealMax: 100,
        warningMin: 70,
        warningMax: 110,
        cueBelow: 'Flytta fötterna närmare',
        cueAbove: 'Flytta fötterna längre bort',
        phase: 'any',
      },
    ],
    generalCues: [
      'Pressa ner hälarna i golvet',
      'Spänn sätesmusklerna i toppläget',
      'Undvik att svänga i ryggen',
    ],
  },
  {
    exerciseName: 'Romanian Deadlift',
    exerciseNameSv: 'Rumänsk marklyft',
    videoType: 'STRENGTH',
    criteria: HIP_HINGE_CRITERIA,
    generalCues: [
      'Håll ryggen rak genom hela rörelsen',
      'Skjut höfterna bakåt',
      'Känn sträckningen i hamstrings',
      'Håll stången nära kroppen',
    ],
  },
  {
    exerciseName: 'Deadlift',
    exerciseNameSv: 'Marklyft',
    videoType: 'STRENGTH',
    criteria: DEADLIFT_CRITERIA,
    generalCues: [
      'Håll ryggen neutral',
      'Driv med benen först',
      'Lås ut höfterna i toppen',
      'Håll stången nära kroppen',
    ],
  },
  {
    exerciseName: 'Hip Thrust',
    exerciseNameSv: 'Hip Thrust med skivstång',
    videoType: 'STRENGTH',
    criteria: [
      {
        joint: 'Vänster höft',
        idealMin: 170,
        idealMax: 180,
        warningMin: 160,
        warningMax: 180,
        cueBelow: 'Driv höfterna helt upp',
        cueAbove: 'Undvik överextension i ryggen',
        phase: 'top',
      },
      {
        joint: 'Höger höft',
        idealMin: 170,
        idealMax: 180,
        warningMin: 160,
        warningMax: 180,
        cueBelow: 'Driv höfterna helt upp',
        cueAbove: 'Undvik överextension i ryggen',
        phase: 'top',
      },
      {
        joint: 'Vänster knä',
        idealMin: 85,
        idealMax: 100,
        warningMin: 75,
        warningMax: 110,
        cueBelow: 'Justera fotplaceringen',
        cueAbove: 'Knäna ska vara rakt över vristerna i toppen',
        phase: 'top',
      },
    ],
    generalCues: [
      'Håll hakan mot bröstet',
      'Driv genom hälarna',
      'Spänn sätesmusklerna hårt i toppen',
    ],
  },
  // KNEE DOMINANCE
  {
    exerciseName: 'Squat',
    exerciseNameSv: 'Knäböj',
    videoType: 'STRENGTH',
    criteria: SQUAT_CRITERIA,
    generalCues: [
      'Tryck ut knäna över tårna',
      'Håll bröstkorgen uppe',
      'Spänna core genom hela rörelsen',
      'Fördela vikten jämnt på foten',
    ],
  },
  {
    exerciseName: 'Goblet Squat',
    exerciseNameSv: 'Goblet Squat',
    videoType: 'STRENGTH',
    criteria: SQUAT_CRITERIA,
    generalCues: [
      'Håll vikten nära bröstet',
      'Armbågarna mellan knäna i botten',
      'Håll överkroppen upprätt',
    ],
  },
  {
    exerciseName: 'Front Squat',
    exerciseNameSv: 'Front Squat',
    videoType: 'STRENGTH',
    criteria: [
      ...SQUAT_CRITERIA,
      {
        joint: 'Vänster armbåge',
        idealMin: 0,
        idealMax: 45,
        warningMin: 0,
        warningMax: 60,
        cueBelow: 'Höj armbågarna högre',
        cueAbove: 'Armbågarna ska peka framåt',
        phase: 'any',
      },
    ],
    generalCues: [
      'Håll armbågarna högt',
      'Håll överkroppen mer upprätt än bakknäböj',
      'Fokusera på quadriceps-aktivering',
    ],
  },
  // UNILATERAL
  {
    exerciseName: 'Bulgarian Split Squat',
    exerciseNameSv: 'Bulgarisk utfallsböj',
    videoType: 'STRENGTH',
    criteria: LUNGE_CRITERIA,
    generalCues: [
      'Håll vikten på främre benet',
      'Kontrollerad rörelse ned',
      'Främre knät ska följa tåriktningen',
    ],
  },
  {
    exerciseName: 'Lunge',
    exerciseNameSv: 'Utfallssteg',
    videoType: 'STRENGTH',
    criteria: LUNGE_CRITERIA,
    generalCues: [
      'Ta ett lagom långt steg',
      'Bakre knät ska nästan nudda golvet',
      'Håll överkroppen upprätt',
    ],
  },
  {
    exerciseName: 'Reverse Lunge',
    exerciseNameSv: 'Bakåtlunges',
    videoType: 'STRENGTH',
    criteria: LUNGE_CRITERIA,
    generalCues: [
      'Steg bakåt med kontroll',
      'Främre knät stannar över vristen',
      'Driv upp genom främre hälen',
    ],
  },
  {
    exerciseName: 'Step-Ups',
    exerciseNameSv: 'Step-Ups',
    videoType: 'STRENGTH',
    criteria: [
      {
        joint: 'Vänster knä',
        idealMin: 85,
        idealMax: 100,
        warningMin: 75,
        warningMax: 110,
        cueBelow: 'Använd en högre låda',
        cueAbove: 'Använd en lägre låda',
        phase: 'bottom',
      },
      {
        joint: 'Höger knä',
        idealMin: 85,
        idealMax: 100,
        warningMin: 75,
        warningMax: 110,
        cueBelow: 'Använd en högre låda',
        cueAbove: 'Använd en lägre låda',
        phase: 'bottom',
      },
    ],
    generalCues: [
      'Driv genom hela foten på lådan',
      'Undvik att skjuta iväg med bakre benet',
      'Kontrollerad nedgång',
    ],
  },
  // CORE
  {
    exerciseName: 'Plank',
    exerciseNameSv: 'Plank',
    videoType: 'STRENGTH',
    criteria: PLANK_CRITERIA,
    generalCues: [
      'Spänn magen som om du väntar på ett slag',
      'Håll blicken i golvet framför dig',
      'Andas lugnt och kontrollerat',
      'Rak linje från huvud till hälar',
    ],
  },
  {
    exerciseName: 'Side Plank',
    exerciseNameSv: 'Sidplank',
    videoType: 'STRENGTH',
    criteria: [
      {
        joint: 'Vänster höft',
        idealMin: 170,
        idealMax: 180,
        warningMin: 160,
        warningMax: 180,
        cueBelow: 'Lyft höften högre - håll rak linje',
        cueAbove: 'Sänk inte höften',
        phase: 'any',
      },
    ],
    generalCues: [
      'Stapla axel över armbåge',
      'Lyft höften så kroppen bildar en rak linje',
      'Aktivera sneda bukmusklerna',
    ],
  },
  {
    exerciseName: 'Dead Bug',
    exerciseNameSv: 'Dead Bug',
    videoType: 'STRENGTH',
    criteria: [
      {
        joint: 'Vänster höft',
        idealMin: 85,
        idealMax: 100,
        warningMin: 75,
        warningMax: 110,
        cueBelow: 'Håll höften i 90 grader',
        cueAbove: 'Dra knät närmare bröstet',
        phase: 'any',
      },
      {
        joint: 'Vänster knä',
        idealMin: 85,
        idealMax: 100,
        warningMin: 75,
        warningMax: 110,
        cueBelow: 'Håll knät i 90 grader',
        cueAbove: 'Böj knät mer',
        phase: 'any',
      },
    ],
    generalCues: [
      'Pressa ländyggen mot golvet',
      'Långsam och kontrollerad rörelse',
      'Andas ut när du sträcker ut',
    ],
  },
  // FOOT/ANKLE
  {
    exerciseName: 'Calf Raise',
    exerciseNameSv: 'Tåhävningar',
    videoType: 'STRENGTH',
    criteria: CALF_RAISE_CRITERIA,
    generalCues: [
      'Full rörelseomfång - häl ned och upp på tå',
      'Undvik att svänga',
      'Pausa kort i toppläget',
    ],
  },
  // RUNNING GAIT
  {
    exerciseName: 'Running',
    exerciseNameSv: 'Löpning',
    videoType: 'RUNNING_GAIT',
    criteria: RUNNING_GAIT_CRITERIA,
    generalCues: [
      'Landa med foten under höften',
      'Kort markontakt',
      'Avslappnade axlar',
      'Blicken framåt',
      'Armpendel fram och bak, inte i sidled',
    ],
  },
]

/**
 * Get form criteria for a specific exercise
 */
export function getExerciseFormCriteria(
  exerciseName?: string,
  exerciseNameSv?: string,
  videoType?: string
): ExerciseFormCriteria | null {
  if (exerciseName || exerciseNameSv) {
    const criteria = EXERCISE_FORM_DATABASE.find(
      (e) =>
        e.exerciseName.toLowerCase() === exerciseName?.toLowerCase() ||
        e.exerciseNameSv.toLowerCase() === exerciseNameSv?.toLowerCase() ||
        exerciseName?.toLowerCase().includes(e.exerciseName.toLowerCase()) ||
        exerciseNameSv?.toLowerCase().includes(e.exerciseNameSv.toLowerCase())
    )
    if (criteria) return criteria
  }

  // Fallback to video type defaults
  if (videoType === 'RUNNING_GAIT') {
    return EXERCISE_FORM_DATABASE.find((e) => e.exerciseName === 'Running') || null
  }

  // Generic strength criteria
  if (videoType === 'STRENGTH') {
    return {
      exerciseName: 'Generic Strength',
      exerciseNameSv: 'Generell styrkeövning',
      videoType: 'STRENGTH',
      criteria: [
        ...SQUAT_CRITERIA.slice(0, 2), // Basic knee criteria
        ...HIP_HINGE_CRITERIA.slice(0, 2), // Basic hip criteria
      ],
      generalCues: [
        'Håll ryggen rak',
        'Kontrollerad rörelse',
        'Andas ut vid ansträngning',
      ],
    }
  }

  return null
}

/**
 * Generate form feedback based on detected angles
 */
export interface FormFeedback {
  joint: string
  detectedAngle: number
  idealRange: string
  status: 'good' | 'warning' | 'critical'
  feedback: string
}

export function generateFormFeedback(
  angles: { name: string; angle: number; status: string }[],
  criteria: ExerciseFormCriteria
): FormFeedback[] {
  const feedback: FormFeedback[] = []

  for (const angle of angles) {
    const criterion = criteria.criteria.find(
      (c) => c.joint.toLowerCase() === angle.name.toLowerCase()
    )

    if (criterion) {
      const idealRange = `${criterion.idealMin}°-${criterion.idealMax}°`
      let status: 'good' | 'warning' | 'critical' = 'good'
      let feedbackText = 'Bra vinkel!'

      if (angle.angle < criterion.warningMin) {
        status = 'critical'
        feedbackText = criterion.cueBelow
      } else if (angle.angle < criterion.idealMin) {
        status = 'warning'
        feedbackText = criterion.cueBelow
      } else if (angle.angle > criterion.warningMax) {
        status = 'critical'
        feedbackText = criterion.cueAbove
      } else if (angle.angle > criterion.idealMax) {
        status = 'warning'
        feedbackText = criterion.cueAbove
      }

      feedback.push({
        joint: angle.name,
        detectedAngle: angle.angle,
        idealRange,
        status,
        feedback: feedbackText,
      })
    }
  }

  return feedback
}

/**
 * Generate a summary of form analysis
 */
export function generateFormSummary(
  feedback: FormFeedback[],
  criteria: ExerciseFormCriteria
): string {
  const goodCount = feedback.filter((f) => f.status === 'good').length
  const warningCount = feedback.filter((f) => f.status === 'warning').length
  const criticalCount = feedback.filter((f) => f.status === 'critical').length

  let summary = `## Teknikanalys: ${criteria.exerciseNameSv}\n\n`

  // Overall score
  const totalJoints = feedback.length
  const score = Math.round((goodCount / Math.max(totalJoints, 1)) * 100)
  summary += `**Teknisk poäng:** ${score}%\n\n`

  // Status breakdown
  summary += `### Sammanfattning\n`
  summary += `- ✅ Godkända vinklar: ${goodCount}\n`
  summary += `- ⚠️ Behöver justering: ${warningCount}\n`
  summary += `- ❌ Behöver förbättring: ${criticalCount}\n\n`

  // Specific feedback
  if (criticalCount > 0 || warningCount > 0) {
    summary += `### Förbättringsområden\n`
    for (const fb of feedback) {
      if (fb.status !== 'good') {
        const icon = fb.status === 'critical' ? '❌' : '⚠️'
        summary += `${icon} **${fb.joint}:** ${fb.feedback} (Detekterad: ${fb.detectedAngle}°, Ideal: ${fb.idealRange})\n`
      }
    }
    summary += '\n'
  }

  // General coaching cues
  if (criteria.generalCues.length > 0) {
    summary += `### Generella tips\n`
    for (const cue of criteria.generalCues) {
      summary += `- ${cue}\n`
    }
  }

  return summary
}
