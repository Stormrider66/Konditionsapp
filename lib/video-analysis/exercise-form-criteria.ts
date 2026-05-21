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
  cueBelow: string
  cueAbove: string
  phase?: 'bottom' | 'top' | 'concentric' | 'eccentric' | 'any'
}

export interface ExerciseFormCriteria {
  exerciseId?: string
  exerciseName: string
  exerciseNameSv: string
  videoType: 'STRENGTH' | 'RUNNING_GAIT' | 'SPORT_SPECIFIC'
  criteria: JointCriterion[]
  generalCues: string[]
}

export type FormLocale = 'en' | 'sv'

const isSv = (locale: FormLocale) => locale === 'sv'

const JOINT_NAMES: Record<string, string> = {
  'Vänster knä': 'Left knee',
  'Höger knä': 'Right knee',
  'Vänster höft': 'Left hip',
  'Höger höft': 'Right hip',
  'Vänster armbåge': 'Left elbow',
  'Höger armbåge': 'Right elbow',
}

const COACHING_CUES: Record<string, string> = {
  'Gå djupare i knäböjen för full rörlighet': 'Squat deeper to use the full range of motion',
  'Böj knäna mer i bottenläget': 'Bend your knees more at the bottom position',
  'Luta bröstkorgen framåt för bättre balans': 'Lean your torso forward slightly for better balance',
  'Håll bröstkorgen mer upprätt': 'Keep your chest more upright',
  'Sträck ut knäna mer i toppläget': 'Extend your knees more at the top position',
  'Låt knäna vara lätt böjda': 'Keep a slight bend in your knees',
  'Driv höfterna framåt i toppläget': 'Drive your hips forward at the top position',
  'Undvik överdriven bakåtlutning': 'Avoid excessive backward lean',
  'Sänk höfterna djupare': 'Lower your hips deeper',
  'Stoppa när knät är i 90 grader': 'Stop when the knee is at 90 degrees',
  'Håll överkroppen mer upprätt': 'Keep your torso more upright',
  'Sänk höfterna rakt ned': 'Lower your hips straight down',
  'Böj mer från höfterna, inte ryggen': 'Hinge more from the hips, not the back',
  'Sträck på höfterna i toppläget': 'Extend your hips at the top position',
  'Håll benen nästan raka': 'Keep your legs nearly straight',
  'Sänk inte höfterna - håll rak linje': 'Do not let your hips drop; keep a straight line',
  'Sänk inte höfterna': 'Do not let your hips drop',
  'Lyft inte rumpan för högt': 'Do not lift your hips too high',
  'Placera armbågarna rakt under axlarna': 'Place your elbows directly under your shoulders',
  'Håll armbågarna i 90 grader': 'Keep your elbows at 90 degrees',
  'Gå djupare i nedgången': 'Go deeper in the descent',
  'Undvik att gå för djupt': 'Avoid going too deep',
  'Håll kroppen rak som en planka': 'Keep your body straight like a plank',
  'Håll benen raka genom hela rörelsen': 'Keep your legs straight throughout the movement',
  'Undvik överutsträckning': 'Avoid overextension',
  'Undvik överdriven knälyft': 'Avoid excessive knee lift',
  'Håll knäna mer böjda vid landing': 'Keep your knees more bent on landing',
  'Öka höftextensionen vid avslut': 'Increase hip extension at toe-off',
  'Undvik överdriven framåtlutning': 'Avoid excessive forward lean',
  'Håll armbågarna i ca 90 grader': 'Keep your elbows at about 90 degrees',
  'Slappna av i armarna': 'Relax your arms',
  'Lyft höfterna högre': 'Lift your hips higher',
  'Undvik överdriven extension': 'Avoid excessive extension',
  'Flytta fötterna närmare': 'Move your feet closer',
  'Flytta fötterna längre bort': 'Move your feet farther away',
  'Driv höfterna helt upp': 'Drive your hips all the way up',
  'Undvik överextension i ryggen': 'Avoid overextending your back',
  'Justera fotplaceringen': 'Adjust your foot placement',
  'Knäna ska vara rakt över vristerna i toppen': 'Your knees should be directly over your ankles at the top',
  'Höj armbågarna högre': 'Lift your elbows higher',
  'Armbågarna ska peka framåt': 'Your elbows should point forward',
  'Använd en högre låda': 'Use a higher box',
  'Använd en lägre låda': 'Use a lower box',
  'Lyft höften högre - håll rak linje': 'Lift your hip higher and keep a straight line',
  'Sänk inte höften': 'Do not let your hip drop',
  'Håll höften i 90 grader': 'Keep your hip at 90 degrees',
  'Dra knät närmare bröstet': 'Pull your knee closer to your chest',
  'Håll knät i 90 grader': 'Keep your knee at 90 degrees',
  'Böj knät mer': 'Bend your knee more',
}

const GENERAL_CUES: Record<string, string> = {
  'Pressa ner hälarna i golvet': 'Press your heels into the floor',
  'Spänn sätesmusklerna i toppläget': 'Squeeze your glutes at the top',
  'Undvik att svänga i ryggen': 'Avoid arching through your back',
  'Håll ryggen rak genom hela rörelsen': 'Keep your back straight throughout the movement',
  'Skjut höfterna bakåt': 'Push your hips back',
  'Känn sträckningen i hamstrings': 'Feel the stretch in your hamstrings',
  'Håll stången nära kroppen': 'Keep the bar close to your body',
  'Håll ryggen neutral': 'Keep your back neutral',
  'Driv med benen först': 'Drive with your legs first',
  'Lås ut höfterna i toppen': 'Lock out your hips at the top',
  'Håll hakan mot bröstet': 'Keep your chin tucked',
  'Driv genom hälarna': 'Drive through your heels',
  'Spänn sätesmusklerna hårt i toppen': 'Squeeze your glutes hard at the top',
  'Tryck ut knäna över tårna': 'Push your knees out over your toes',
  'Håll bröstkorgen uppe': 'Keep your chest up',
  'Spänna core genom hela rörelsen': 'Brace your core throughout the movement',
  'Fördela vikten jämnt på foten': 'Distribute your weight evenly across the foot',
  'Håll vikten nära bröstet': 'Keep the weight close to your chest',
  'Armbågarna mellan knäna i botten': 'Keep your elbows between your knees at the bottom',
  'Håll överkroppen upprätt': 'Keep your torso upright',
  'Håll armbågarna högt': 'Keep your elbows high',
  'Håll överkroppen mer upprätt än bakknäböj': 'Keep your torso more upright than in a back squat',
  'Fokusera på quadriceps-aktivering': 'Focus on quadriceps activation',
  'Håll vikten på främre benet': 'Keep the weight on your front leg',
  'Kontrollerad rörelse ned': 'Control the movement down',
  'Främre knät ska följa tåriktningen': 'Your front knee should track in line with your toes',
  'Ta ett lagom långt steg': 'Take a suitably long step',
  'Bakre knät ska nästan nudda golvet': 'Your back knee should almost touch the floor',
  'Steg bakåt med kontroll': 'Step back with control',
  'Främre knät stannar över vristen': 'Keep your front knee over your ankle',
  'Driv upp genom främre hälen': 'Drive up through your front heel',
  'Driv genom hela foten på lådan': 'Drive through the whole foot on the box',
  'Undvik att skjuta iväg med bakre benet': 'Avoid pushing off with the back leg',
  'Kontrollerad nedgång': 'Control the descent',
  'Spänn magen som om du väntar på ett slag': 'Brace your abs as if preparing for contact',
  'Håll blicken i golvet framför dig': 'Keep your gaze on the floor in front of you',
  'Andas lugnt och kontrollerat': 'Breathe calmly and with control',
  'Rak linje från huvud till hälar': 'Keep a straight line from head to heels',
  'Stapla axel över armbåge': 'Stack your shoulder over your elbow',
  'Lyft höften så kroppen bildar en rak linje': 'Lift your hip so your body forms a straight line',
  'Aktivera sneda bukmusklerna': 'Engage your obliques',
  'Pressa ländyggen mot golvet': 'Press your lower back into the floor',
  'Långsam och kontrollerad rörelse': 'Move slowly and with control',
  'Andas ut när du sträcker ut': 'Exhale as you extend',
  'Full rörelseomfång - häl ned och upp på tå': 'Use full range of motion: heel down, then up onto the toes',
  'Undvik att svänga': 'Avoid swinging',
  'Pausa kort i toppläget': 'Pause briefly at the top',
  'Landa med foten under höften': 'Land with your foot under your hip',
  'Kort markontakt': 'Keep ground contact short',
  'Avslappnade axlar': 'Relax your shoulders',
  'Blicken framåt': 'Keep your gaze forward',
  'Armpendel fram och bak, inte i sidled': 'Swing your arms forward and back, not side to side',
  'Håll ryggen rak': 'Keep your back straight',
  'Kontrollerad rörelse': 'Use controlled movement',
  'Andas ut vid ansträngning': 'Exhale during effort',
}

function text(locale: FormLocale, en: string, sv: string): string {
  return isSv(locale) ? sv : en
}

function localizeJoint(joint: string, locale: FormLocale): string {
  return isSv(locale) ? joint : JOINT_NAMES[joint] || joint
}

function localizeCue(cue: string, locale: FormLocale): string {
  return isSv(locale) ? cue : COACHING_CUES[cue] || cue
}

export function getLocalizedGeneralCues(criteria: ExerciseFormCriteria, locale: FormLocale = 'en'): string[] {
  return isSv(locale)
    ? criteria.generalCues
    : criteria.generalCues.map((cue) => GENERAL_CUES[cue] || cue)
}

export function getLocalizedExerciseName(criteria: ExerciseFormCriteria, locale: FormLocale = 'en'): string {
  return isSv(locale) ? criteria.exerciseNameSv : criteria.exerciseName
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
  criteria: ExerciseFormCriteria,
  locale: FormLocale = 'en'
): FormFeedback[] {
  const feedback: FormFeedback[] = []

  for (const angle of angles) {
    const criterion = criteria.criteria.find(
      (c) => c.joint.toLowerCase() === angle.name.toLowerCase()
    )

    if (criterion) {
      const idealRange = `${criterion.idealMin}°-${criterion.idealMax}°`
      let status: 'good' | 'warning' | 'critical' = 'good'
      let feedbackText = text(locale, 'Good angle!', 'Bra vinkel!')

      if (angle.angle < criterion.warningMin) {
        status = 'critical'
        feedbackText = localizeCue(criterion.cueBelow, locale)
      } else if (angle.angle < criterion.idealMin) {
        status = 'warning'
        feedbackText = localizeCue(criterion.cueBelow, locale)
      } else if (angle.angle > criterion.warningMax) {
        status = 'critical'
        feedbackText = localizeCue(criterion.cueAbove, locale)
      } else if (angle.angle > criterion.idealMax) {
        status = 'warning'
        feedbackText = localizeCue(criterion.cueAbove, locale)
      }

      feedback.push({
        joint: localizeJoint(angle.name, locale),
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
  criteria: ExerciseFormCriteria,
  locale: FormLocale = 'en'
): string {
  const goodCount = feedback.filter((f) => f.status === 'good').length
  const warningCount = feedback.filter((f) => f.status === 'warning').length
  const criticalCount = feedback.filter((f) => f.status === 'critical').length

  const exerciseName = isSv(locale) ? criteria.exerciseNameSv : criteria.exerciseName
  let summary = `## ${text(locale, 'Technique Analysis', 'Teknikanalys')}: ${exerciseName}\n\n`

  // Overall score
  const totalJoints = feedback.length
  const score = Math.round((goodCount / Math.max(totalJoints, 1)) * 100)
  summary += `**${text(locale, 'Technique score', 'Teknisk poäng')}:** ${score}%\n\n`

  // Status breakdown
  summary += `### ${text(locale, 'Summary', 'Sammanfattning')}\n`
  summary += `- ✅ ${text(locale, 'Good angles', 'Godkända vinklar')}: ${goodCount}\n`
  summary += `- ⚠️ ${text(locale, 'Needs adjustment', 'Behöver justering')}: ${warningCount}\n`
  summary += `- ❌ ${text(locale, 'Needs improvement', 'Behöver förbättring')}: ${criticalCount}\n\n`

  // Specific feedback
  if (criticalCount > 0 || warningCount > 0) {
    summary += `### ${text(locale, 'Improvement Areas', 'Förbättringsområden')}\n`
    for (const fb of feedback) {
      if (fb.status !== 'good') {
        const icon = fb.status === 'critical' ? '❌' : '⚠️'
        summary += `${icon} **${fb.joint}:** ${fb.feedback} (${text(locale, 'Detected', 'Detekterad')}: ${fb.detectedAngle}°, ${text(locale, 'Ideal', 'Ideal')}: ${fb.idealRange})\n`
      }
    }
    summary += '\n'
  }

  // General coaching cues
  if (criteria.generalCues.length > 0) {
    summary += `### ${text(locale, 'General Tips', 'Generella tips')}\n`
    for (const cue of getLocalizedGeneralCues(criteria, locale)) {
      summary += `- ${cue}\n`
    }
  }

  return summary
}
