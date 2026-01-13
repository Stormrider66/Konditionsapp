/**
 * Sport-Specific Injury Definitions
 *
 * Comprehensive mapping of common injuries by sport and body part.
 * Used for the conditional injury selector in daily check-in.
 *
 * Based on epidemiological data for each sport:
 * - Running: Nielsen et al. (2012), van Gent et al. (2007)
 * - Cycling: Clarsen et al. (2010)
 * - Swimming: Wanivenhaus et al. (2012)
 * - Triathlon: Burns et al. (2003)
 * - HYROX: CrossFit injury patterns
 * - Skiing (XC): Bahr et al. (2004)
 */

import type { SportType } from '@prisma/client'

// ============================================
// TYPES
// ============================================

export type BodyPart =
  | 'HEAD_NECK'
  | 'SHOULDER'
  | 'ARM_HAND'
  | 'UPPER_BACK'
  | 'LOWER_BACK'
  | 'HIP_GROIN'
  | 'THIGH'
  | 'KNEE'
  | 'LOWER_LEG'
  | 'ANKLE_FOOT'
  | 'OTHER'

export type InjurySide = 'LEFT' | 'RIGHT' | 'BOTH' | 'NA'

export interface BodyPartDefinition {
  id: BodyPart
  labelSv: string
  labelEn: string
  icon?: string
}

export interface InjuryDefinition {
  id: string
  labelSv: string
  labelEn: string
  typicalRecoveryDays: {
    mild: number    // Pain 3-4
    moderate: number // Pain 5-7
    severe: number   // Pain 8-10
  }
  crossTrainingAllowed: boolean
  requiresRestIfSevere: boolean
}

export interface InjurySelection {
  bodyPart: BodyPart
  injuryType: string
  side: InjurySide
  painLevel: number
}

export type IllnessType =
  | 'FEVER'
  | 'GASTROINTESTINAL'
  | 'COLD'
  | 'HEADACHE'
  | 'GENERAL_ILLNESS'

export interface IllnessDefinition {
  id: IllnessType
  labelSv: string
  labelEn: string
  minRestDays: number
  returnCriteria: string
}

// ============================================
// BODY PARTS (Universal)
// ============================================

export const BODY_PARTS: BodyPartDefinition[] = [
  { id: 'HEAD_NECK', labelSv: 'Huvud/Nacke', labelEn: 'Head/Neck' },
  { id: 'SHOULDER', labelSv: 'Axel', labelEn: 'Shoulder' },
  { id: 'ARM_HAND', labelSv: 'Arm/Hand/Handled', labelEn: 'Arm/Hand/Wrist' },
  { id: 'UPPER_BACK', labelSv: 'Övre rygg', labelEn: 'Upper Back' },
  { id: 'LOWER_BACK', labelSv: 'Nedre rygg/Ländrygg', labelEn: 'Lower Back' },
  { id: 'HIP_GROIN', labelSv: 'Höft/Ljumske', labelEn: 'Hip/Groin' },
  { id: 'THIGH', labelSv: 'Lår', labelEn: 'Thigh' },
  { id: 'KNEE', labelSv: 'Knä', labelEn: 'Knee' },
  { id: 'LOWER_LEG', labelSv: 'Underben/Vad', labelEn: 'Lower Leg/Calf' },
  { id: 'ANKLE_FOOT', labelSv: 'Fotled/Fot', labelEn: 'Ankle/Foot' },
  { id: 'OTHER', labelSv: 'Annat/Osäker', labelEn: 'Other/Unsure' },
]

// ============================================
// ILLNESS DEFINITIONS
// ============================================

export const ILLNESSES: IllnessDefinition[] = [
  {
    id: 'FEVER',
    labelSv: 'Feber',
    labelEn: 'Fever',
    minRestDays: 3,
    returnCriteria: 'Feberfri i minst 24 timmar utan febernedsättande medicin',
  },
  {
    id: 'GASTROINTESTINAL',
    labelSv: 'Magsjuka/Kräkningar/Diarré',
    labelEn: 'Stomach flu/Vomiting/Diarrhea',
    minRestDays: 2,
    returnCriteria: 'Symptomfri i minst 24 timmar, vätskebalans återställd',
  },
  {
    id: 'COLD',
    labelSv: 'Förkylning/Halsont',
    labelEn: 'Cold/Sore throat',
    minRestDays: 1,
    returnCriteria: 'Inga symptom under halsen (hosta, bröstsmärta)',
  },
  {
    id: 'HEADACHE',
    labelSv: 'Huvudvärk/Migrän',
    labelEn: 'Headache/Migraine',
    minRestDays: 1,
    returnCriteria: 'Smärtfri utan medicin',
  },
  {
    id: 'GENERAL_ILLNESS',
    labelSv: 'Allmänt sjuk/Annat',
    labelEn: 'Generally unwell/Other',
    minRestDays: 2,
    returnCriteria: 'Energinivå tillbaka till normalt',
  },
]

// ============================================
// COMMON INJURIES BY BODY PART (Base definitions)
// ============================================

const KNEE_INJURIES: InjuryDefinition[] = [
  {
    id: 'PATELLOFEMORAL',
    labelSv: 'Löparknä (främre knäsmärta)',
    labelEn: "Runner's Knee (Patellofemoral)",
    typicalRecoveryDays: { mild: 7, moderate: 21, severe: 42 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: true,
  },
  {
    id: 'IT_BAND_KNEE',
    labelSv: 'IT-bands syndrom',
    labelEn: 'IT Band Syndrome',
    typicalRecoveryDays: { mild: 7, moderate: 28, severe: 56 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: true,
  },
  {
    id: 'PATELLAR_TENDINOPATHY',
    labelSv: 'Hopparknä (patellartendinit)',
    labelEn: "Jumper's Knee (Patellar Tendinopathy)",
    typicalRecoveryDays: { mild: 14, moderate: 42, severe: 84 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: true,
  },
  {
    id: 'MENISCUS',
    labelSv: 'Meniskbesvär',
    labelEn: 'Meniscus Issue',
    typicalRecoveryDays: { mild: 14, moderate: 42, severe: 90 },
    crossTrainingAllowed: false,
    requiresRestIfSevere: true,
  },
  {
    id: 'KNEE_GENERAL',
    labelSv: 'Allmän knäsmärta',
    labelEn: 'General Knee Pain',
    typicalRecoveryDays: { mild: 3, moderate: 14, severe: 28 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
]

const LOWER_LEG_INJURIES: InjuryDefinition[] = [
  {
    id: 'SHIN_SPLINTS',
    labelSv: 'Benhinneinflammation',
    labelEn: 'Shin Splints',
    typicalRecoveryDays: { mild: 7, moderate: 21, severe: 42 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: true,
  },
  {
    id: 'ACHILLES_TENDINOPATHY',
    labelSv: 'Hälseneskada/Akillestendinit',
    labelEn: 'Achilles Tendinopathy',
    typicalRecoveryDays: { mild: 14, moderate: 42, severe: 90 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: true,
  },
  {
    id: 'CALF_STRAIN',
    labelSv: 'Vadskada/Sträckning',
    labelEn: 'Calf Strain',
    typicalRecoveryDays: { mild: 7, moderate: 21, severe: 42 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: true,
  },
  {
    id: 'COMPARTMENT_SYNDROME',
    labelSv: 'Kompartmentsyndrom',
    labelEn: 'Compartment Syndrome',
    typicalRecoveryDays: { mild: 14, moderate: 28, severe: 60 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: true,
  },
  {
    id: 'LOWER_LEG_GENERAL',
    labelSv: 'Allmän underbensmärta',
    labelEn: 'General Lower Leg Pain',
    typicalRecoveryDays: { mild: 3, moderate: 14, severe: 28 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
]

const ANKLE_FOOT_INJURIES: InjuryDefinition[] = [
  {
    id: 'PLANTAR_FASCIITIS',
    labelSv: 'Plantarfasciit (hälsporre)',
    labelEn: 'Plantar Fasciitis',
    typicalRecoveryDays: { mild: 14, moderate: 42, severe: 90 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: true,
  },
  {
    id: 'ANKLE_SPRAIN',
    labelSv: 'Stukad fotled',
    labelEn: 'Ankle Sprain',
    typicalRecoveryDays: { mild: 7, moderate: 21, severe: 42 },
    crossTrainingAllowed: false,
    requiresRestIfSevere: true,
  },
  {
    id: 'STRESS_FRACTURE_FOOT',
    labelSv: 'Stressfraktur (fot/metatarsal)',
    labelEn: 'Stress Fracture (Foot)',
    typicalRecoveryDays: { mild: 28, moderate: 56, severe: 84 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: true,
  },
  {
    id: 'PERONEAL_TENDINOPATHY',
    labelSv: 'Peroneusseneskada',
    labelEn: 'Peroneal Tendinopathy',
    typicalRecoveryDays: { mild: 14, moderate: 28, severe: 56 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: true,
  },
  {
    id: 'ANKLE_FOOT_GENERAL',
    labelSv: 'Allmän fot/fotledsmärta',
    labelEn: 'General Ankle/Foot Pain',
    typicalRecoveryDays: { mild: 3, moderate: 14, severe: 28 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
]

const HIP_GROIN_INJURIES: InjuryDefinition[] = [
  {
    id: 'HIP_FLEXOR_STRAIN',
    labelSv: 'Höftböjaresträckning',
    labelEn: 'Hip Flexor Strain',
    typicalRecoveryDays: { mild: 7, moderate: 21, severe: 42 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: true,
  },
  {
    id: 'GROIN_STRAIN',
    labelSv: 'Ljumskskada',
    labelEn: 'Groin Strain',
    typicalRecoveryDays: { mild: 7, moderate: 28, severe: 56 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: true,
  },
  {
    id: 'PIRIFORMIS_SYNDROME',
    labelSv: 'Piriformissyndrom',
    labelEn: 'Piriformis Syndrome',
    typicalRecoveryDays: { mild: 7, moderate: 21, severe: 42 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
  {
    id: 'HIP_BURSITIS',
    labelSv: 'Höftbursit (slemsäcksinflammation)',
    labelEn: 'Hip Bursitis',
    typicalRecoveryDays: { mild: 7, moderate: 21, severe: 42 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
  {
    id: 'HIP_GROIN_GENERAL',
    labelSv: 'Allmän höft/ljumsksmärta',
    labelEn: 'General Hip/Groin Pain',
    typicalRecoveryDays: { mild: 3, moderate: 14, severe: 28 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
]

const THIGH_INJURIES: InjuryDefinition[] = [
  {
    id: 'HAMSTRING_STRAIN',
    labelSv: 'Hamstringsskada (baksida lår)',
    labelEn: 'Hamstring Strain',
    typicalRecoveryDays: { mild: 7, moderate: 21, severe: 56 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: true,
  },
  {
    id: 'QUADRICEPS_STRAIN',
    labelSv: 'Quadricepsskada (framsida lår)',
    labelEn: 'Quadriceps Strain',
    typicalRecoveryDays: { mild: 7, moderate: 21, severe: 42 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: true,
  },
  {
    id: 'THIGH_CONTUSION',
    labelSv: 'Lårkontusion (lårkaka)',
    labelEn: 'Thigh Contusion',
    typicalRecoveryDays: { mild: 3, moderate: 14, severe: 28 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
  {
    id: 'THIGH_GENERAL',
    labelSv: 'Allmän lårsmärta',
    labelEn: 'General Thigh Pain',
    typicalRecoveryDays: { mild: 3, moderate: 14, severe: 28 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
]

const LOWER_BACK_INJURIES: InjuryDefinition[] = [
  {
    id: 'LOWER_BACK_STRAIN',
    labelSv: 'Ryggmuskelsträckning',
    labelEn: 'Lower Back Muscle Strain',
    typicalRecoveryDays: { mild: 3, moderate: 14, severe: 28 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
  {
    id: 'DISC_ISSUE',
    labelSv: 'Diskbråck/Diskbuktning',
    labelEn: 'Disc Herniation/Bulge',
    typicalRecoveryDays: { mild: 14, moderate: 42, severe: 90 },
    crossTrainingAllowed: false,
    requiresRestIfSevere: true,
  },
  {
    id: 'SCIATICA',
    labelSv: 'Ischias',
    labelEn: 'Sciatica',
    typicalRecoveryDays: { mild: 14, moderate: 42, severe: 84 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: true,
  },
  {
    id: 'LOWER_BACK_GENERAL',
    labelSv: 'Allmän ländryggsmärta',
    labelEn: 'General Lower Back Pain',
    typicalRecoveryDays: { mild: 3, moderate: 14, severe: 28 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
]

const UPPER_BACK_INJURIES: InjuryDefinition[] = [
  {
    id: 'THORACIC_STRAIN',
    labelSv: 'Övre ryggmuskelsträckning',
    labelEn: 'Upper Back Muscle Strain',
    typicalRecoveryDays: { mild: 3, moderate: 14, severe: 28 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
  {
    id: 'UPPER_BACK_GENERAL',
    labelSv: 'Allmän övre ryggsmärta',
    labelEn: 'General Upper Back Pain',
    typicalRecoveryDays: { mild: 3, moderate: 14, severe: 21 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
]

const SHOULDER_INJURIES: InjuryDefinition[] = [
  {
    id: 'ROTATOR_CUFF',
    labelSv: 'Rotatorkuffskada (simmaraxel)',
    labelEn: 'Rotator Cuff Injury',
    typicalRecoveryDays: { mild: 14, moderate: 42, severe: 90 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: true,
  },
  {
    id: 'SHOULDER_IMPINGEMENT',
    labelSv: 'Axelimpingement',
    labelEn: 'Shoulder Impingement',
    typicalRecoveryDays: { mild: 14, moderate: 28, severe: 56 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
  {
    id: 'SHOULDER_BURSITIS',
    labelSv: 'Axelbursit',
    labelEn: 'Shoulder Bursitis',
    typicalRecoveryDays: { mild: 7, moderate: 21, severe: 42 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
  {
    id: 'SHOULDER_GENERAL',
    labelSv: 'Allmän axelsmärta',
    labelEn: 'General Shoulder Pain',
    typicalRecoveryDays: { mild: 3, moderate: 14, severe: 28 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
]

const HEAD_NECK_INJURIES: InjuryDefinition[] = [
  {
    id: 'NECK_STRAIN',
    labelSv: 'Nacksträckning',
    labelEn: 'Neck Strain',
    typicalRecoveryDays: { mild: 3, moderate: 14, severe: 28 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
  {
    id: 'TENSION_HEADACHE',
    labelSv: 'Spänningshuvudvärk',
    labelEn: 'Tension Headache',
    typicalRecoveryDays: { mild: 1, moderate: 3, severe: 7 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
  {
    id: 'HEAD_NECK_GENERAL',
    labelSv: 'Allmän nacke/huvudsmärta',
    labelEn: 'General Head/Neck Pain',
    typicalRecoveryDays: { mild: 2, moderate: 7, severe: 14 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
]

const ARM_HAND_INJURIES: InjuryDefinition[] = [
  {
    id: 'WRIST_STRAIN',
    labelSv: 'Handledssmärta/Sträckning',
    labelEn: 'Wrist Pain/Strain',
    typicalRecoveryDays: { mild: 3, moderate: 14, severe: 28 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
  {
    id: 'ELBOW_TENDINOPATHY',
    labelSv: 'Armbågstendinit (tennis/golfarmbåge)',
    labelEn: 'Elbow Tendinopathy',
    typicalRecoveryDays: { mild: 14, moderate: 42, severe: 84 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
  {
    id: 'HAND_NUMBNESS',
    labelSv: 'Domningar i hand/fingrar',
    labelEn: 'Hand/Finger Numbness',
    typicalRecoveryDays: { mild: 3, moderate: 14, severe: 28 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
  {
    id: 'FOREARM_GRIP',
    labelSv: 'Underarm/Grepptrötthet',
    labelEn: 'Forearm/Grip Fatigue',
    typicalRecoveryDays: { mild: 2, moderate: 7, severe: 14 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
  {
    id: 'ARM_HAND_GENERAL',
    labelSv: 'Allmän arm/handsmärta',
    labelEn: 'General Arm/Hand Pain',
    typicalRecoveryDays: { mild: 3, moderate: 14, severe: 28 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
]

const OTHER_INJURIES: InjuryDefinition[] = [
  {
    id: 'GENERAL_MUSCLE_SORENESS',
    labelSv: 'Allmän muskelömhet (DOMS)',
    labelEn: 'General Muscle Soreness (DOMS)',
    typicalRecoveryDays: { mild: 1, moderate: 3, severe: 5 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
  {
    id: 'OVERTRAINING',
    labelSv: 'Överträning/Utmattning',
    labelEn: 'Overtraining/Exhaustion',
    typicalRecoveryDays: { mild: 3, moderate: 14, severe: 28 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: true,
  },
  {
    id: 'OTHER_UNSPECIFIED',
    labelSv: 'Annat/Vet ej',
    labelEn: 'Other/Unknown',
    typicalRecoveryDays: { mild: 3, moderate: 14, severe: 28 },
    crossTrainingAllowed: true,
    requiresRestIfSevere: false,
  },
]

// ============================================
// SPORT-SPECIFIC INJURY MAPPINGS
// ============================================

// Which injuries are most relevant per sport and body part
// Order matters: most common first

type SportInjuryMap = Record<BodyPart, string[]>

const RUNNING_INJURIES: SportInjuryMap = {
  HEAD_NECK: ['NECK_STRAIN', 'TENSION_HEADACHE', 'HEAD_NECK_GENERAL'],
  SHOULDER: ['SHOULDER_GENERAL'],
  ARM_HAND: ['ARM_HAND_GENERAL'],
  UPPER_BACK: ['THORACIC_STRAIN', 'UPPER_BACK_GENERAL'],
  LOWER_BACK: ['LOWER_BACK_STRAIN', 'SCIATICA', 'LOWER_BACK_GENERAL'],
  HIP_GROIN: ['HIP_FLEXOR_STRAIN', 'PIRIFORMIS_SYNDROME', 'HIP_BURSITIS', 'GROIN_STRAIN', 'HIP_GROIN_GENERAL'],
  THIGH: ['HAMSTRING_STRAIN', 'QUADRICEPS_STRAIN', 'THIGH_GENERAL'],
  KNEE: ['PATELLOFEMORAL', 'IT_BAND_KNEE', 'PATELLAR_TENDINOPATHY', 'MENISCUS', 'KNEE_GENERAL'],
  LOWER_LEG: ['SHIN_SPLINTS', 'CALF_STRAIN', 'ACHILLES_TENDINOPATHY', 'COMPARTMENT_SYNDROME', 'LOWER_LEG_GENERAL'],
  ANKLE_FOOT: ['PLANTAR_FASCIITIS', 'ANKLE_SPRAIN', 'STRESS_FRACTURE_FOOT', 'ACHILLES_TENDINOPATHY', 'ANKLE_FOOT_GENERAL'],
  OTHER: ['GENERAL_MUSCLE_SORENESS', 'OVERTRAINING', 'OTHER_UNSPECIFIED'],
}

const CYCLING_INJURIES: SportInjuryMap = {
  HEAD_NECK: ['NECK_STRAIN', 'HEAD_NECK_GENERAL'],
  SHOULDER: ['SHOULDER_GENERAL'],
  ARM_HAND: ['HAND_NUMBNESS', 'WRIST_STRAIN', 'ARM_HAND_GENERAL'],
  UPPER_BACK: ['THORACIC_STRAIN', 'UPPER_BACK_GENERAL'],
  LOWER_BACK: ['LOWER_BACK_STRAIN', 'DISC_ISSUE', 'LOWER_BACK_GENERAL'],
  HIP_GROIN: ['HIP_FLEXOR_STRAIN', 'PIRIFORMIS_SYNDROME', 'HIP_GROIN_GENERAL'],
  THIGH: ['QUADRICEPS_STRAIN', 'HAMSTRING_STRAIN', 'THIGH_GENERAL'],
  KNEE: ['PATELLOFEMORAL', 'IT_BAND_KNEE', 'PATELLAR_TENDINOPATHY', 'KNEE_GENERAL'],
  LOWER_LEG: ['CALF_STRAIN', 'ACHILLES_TENDINOPATHY', 'LOWER_LEG_GENERAL'],
  ANKLE_FOOT: ['ACHILLES_TENDINOPATHY', 'ANKLE_FOOT_GENERAL'],
  OTHER: ['GENERAL_MUSCLE_SORENESS', 'OVERTRAINING', 'OTHER_UNSPECIFIED'],
}

const SWIMMING_INJURIES: SportInjuryMap = {
  HEAD_NECK: ['NECK_STRAIN', 'HEAD_NECK_GENERAL'],
  SHOULDER: ['ROTATOR_CUFF', 'SHOULDER_IMPINGEMENT', 'SHOULDER_BURSITIS', 'SHOULDER_GENERAL'],
  ARM_HAND: ['ELBOW_TENDINOPATHY', 'WRIST_STRAIN', 'ARM_HAND_GENERAL'],
  UPPER_BACK: ['THORACIC_STRAIN', 'UPPER_BACK_GENERAL'],
  LOWER_BACK: ['LOWER_BACK_STRAIN', 'DISC_ISSUE', 'LOWER_BACK_GENERAL'],
  HIP_GROIN: ['HIP_FLEXOR_STRAIN', 'GROIN_STRAIN', 'HIP_GROIN_GENERAL'],
  THIGH: ['QUADRICEPS_STRAIN', 'THIGH_GENERAL'],
  KNEE: ['PATELLOFEMORAL', 'KNEE_GENERAL'], // Breaststroker's knee
  LOWER_LEG: ['CALF_STRAIN', 'LOWER_LEG_GENERAL'],
  ANKLE_FOOT: ['ANKLE_FOOT_GENERAL'],
  OTHER: ['GENERAL_MUSCLE_SORENESS', 'OVERTRAINING', 'OTHER_UNSPECIFIED'],
}

const TRIATHLON_INJURIES: SportInjuryMap = {
  // Combination of all three - most common from each
  HEAD_NECK: ['NECK_STRAIN', 'HEAD_NECK_GENERAL'],
  SHOULDER: ['ROTATOR_CUFF', 'SHOULDER_IMPINGEMENT', 'SHOULDER_GENERAL'],
  ARM_HAND: ['HAND_NUMBNESS', 'WRIST_STRAIN', 'ARM_HAND_GENERAL'],
  UPPER_BACK: ['THORACIC_STRAIN', 'UPPER_BACK_GENERAL'],
  LOWER_BACK: ['LOWER_BACK_STRAIN', 'DISC_ISSUE', 'SCIATICA', 'LOWER_BACK_GENERAL'],
  HIP_GROIN: ['HIP_FLEXOR_STRAIN', 'PIRIFORMIS_SYNDROME', 'GROIN_STRAIN', 'HIP_GROIN_GENERAL'],
  THIGH: ['HAMSTRING_STRAIN', 'QUADRICEPS_STRAIN', 'THIGH_GENERAL'],
  KNEE: ['PATELLOFEMORAL', 'IT_BAND_KNEE', 'PATELLAR_TENDINOPATHY', 'KNEE_GENERAL'],
  LOWER_LEG: ['SHIN_SPLINTS', 'CALF_STRAIN', 'ACHILLES_TENDINOPATHY', 'LOWER_LEG_GENERAL'],
  ANKLE_FOOT: ['PLANTAR_FASCIITIS', 'ANKLE_SPRAIN', 'ACHILLES_TENDINOPATHY', 'ANKLE_FOOT_GENERAL'],
  OTHER: ['GENERAL_MUSCLE_SORENESS', 'OVERTRAINING', 'OTHER_UNSPECIFIED'],
}

const HYROX_INJURIES: SportInjuryMap = {
  HEAD_NECK: ['NECK_STRAIN', 'HEAD_NECK_GENERAL'],
  SHOULDER: ['ROTATOR_CUFF', 'SHOULDER_IMPINGEMENT', 'SHOULDER_GENERAL'],
  ARM_HAND: ['FOREARM_GRIP', 'WRIST_STRAIN', 'ELBOW_TENDINOPATHY', 'ARM_HAND_GENERAL'],
  UPPER_BACK: ['THORACIC_STRAIN', 'UPPER_BACK_GENERAL'],
  LOWER_BACK: ['LOWER_BACK_STRAIN', 'DISC_ISSUE', 'LOWER_BACK_GENERAL'],
  HIP_GROIN: ['HIP_FLEXOR_STRAIN', 'GROIN_STRAIN', 'HIP_GROIN_GENERAL'],
  THIGH: ['HAMSTRING_STRAIN', 'QUADRICEPS_STRAIN', 'THIGH_CONTUSION', 'THIGH_GENERAL'],
  KNEE: ['PATELLOFEMORAL', 'PATELLAR_TENDINOPATHY', 'KNEE_GENERAL'],
  LOWER_LEG: ['CALF_STRAIN', 'ACHILLES_TENDINOPATHY', 'SHIN_SPLINTS', 'LOWER_LEG_GENERAL'],
  ANKLE_FOOT: ['ANKLE_SPRAIN', 'ACHILLES_TENDINOPATHY', 'ANKLE_FOOT_GENERAL'],
  OTHER: ['GENERAL_MUSCLE_SORENESS', 'OVERTRAINING', 'OTHER_UNSPECIFIED'],
}

const SKIING_INJURIES: SportInjuryMap = {
  HEAD_NECK: ['NECK_STRAIN', 'HEAD_NECK_GENERAL'],
  SHOULDER: ['ROTATOR_CUFF', 'SHOULDER_GENERAL'],
  ARM_HAND: ['WRIST_STRAIN', 'FOREARM_GRIP', 'ARM_HAND_GENERAL'],
  UPPER_BACK: ['THORACIC_STRAIN', 'UPPER_BACK_GENERAL'],
  LOWER_BACK: ['LOWER_BACK_STRAIN', 'SCIATICA', 'LOWER_BACK_GENERAL'],
  HIP_GROIN: ['HIP_FLEXOR_STRAIN', 'GROIN_STRAIN', 'PIRIFORMIS_SYNDROME', 'HIP_GROIN_GENERAL'],
  THIGH: ['QUADRICEPS_STRAIN', 'HAMSTRING_STRAIN', 'THIGH_GENERAL'],
  KNEE: ['PATELLOFEMORAL', 'IT_BAND_KNEE', 'MENISCUS', 'KNEE_GENERAL'],
  LOWER_LEG: ['CALF_STRAIN', 'ACHILLES_TENDINOPATHY', 'SHIN_SPLINTS', 'LOWER_LEG_GENERAL'],
  ANKLE_FOOT: ['ANKLE_SPRAIN', 'ACHILLES_TENDINOPATHY', 'ANKLE_FOOT_GENERAL'],
  OTHER: ['GENERAL_MUSCLE_SORENESS', 'OVERTRAINING', 'OTHER_UNSPECIFIED'],
}

const GENERAL_FITNESS_INJURIES: SportInjuryMap = {
  HEAD_NECK: ['NECK_STRAIN', 'TENSION_HEADACHE', 'HEAD_NECK_GENERAL'],
  SHOULDER: ['ROTATOR_CUFF', 'SHOULDER_IMPINGEMENT', 'SHOULDER_GENERAL'],
  ARM_HAND: ['WRIST_STRAIN', 'ELBOW_TENDINOPATHY', 'ARM_HAND_GENERAL'],
  UPPER_BACK: ['THORACIC_STRAIN', 'UPPER_BACK_GENERAL'],
  LOWER_BACK: ['LOWER_BACK_STRAIN', 'DISC_ISSUE', 'LOWER_BACK_GENERAL'],
  HIP_GROIN: ['HIP_FLEXOR_STRAIN', 'HIP_BURSITIS', 'HIP_GROIN_GENERAL'],
  THIGH: ['QUADRICEPS_STRAIN', 'HAMSTRING_STRAIN', 'THIGH_GENERAL'],
  KNEE: ['PATELLOFEMORAL', 'KNEE_GENERAL'],
  LOWER_LEG: ['CALF_STRAIN', 'LOWER_LEG_GENERAL'],
  ANKLE_FOOT: ['ANKLE_SPRAIN', 'ANKLE_FOOT_GENERAL'],
  OTHER: ['GENERAL_MUSCLE_SORENESS', 'OVERTRAINING', 'OTHER_UNSPECIFIED'],
}

// Strength training specific injuries (gym/weightlifting)
const STRENGTH_INJURIES: SportInjuryMap = {
  KNEE: ['PATELLOFEMORAL_SYNDROME', 'MENISCUS_TEAR', 'KNEE_TENDINITIS', 'KNEE_GENERAL'],
  LOWER_LEG: ['SHIN_SPLINTS', 'CALF_STRAIN', 'LOWER_LEG_GENERAL'],
  ANKLE_FOOT: ['ANKLE_SPRAIN', 'ANKLE_FOOT_GENERAL'],
  HIP_GROIN: ['HIP_FLEXOR_STRAIN', 'GROIN_STRAIN', 'HIP_BURSITIS', 'HIP_GROIN_GENERAL'],
  THIGH: ['QUAD_STRAIN', 'HAMSTRING_STRAIN', 'THIGH_GENERAL'],
  LOWER_BACK: ['LUMBAR_STRAIN', 'DISC_ISSUE', 'SI_JOINT_PAIN', 'LOWER_BACK_GENERAL'],
  UPPER_BACK: ['THORACIC_STRAIN', 'TRAPEZIUS_STRAIN', 'UPPER_BACK_GENERAL'],
  SHOULDER: ['ROTATOR_CUFF', 'SHOULDER_IMPINGEMENT', 'SHOULDER_INSTABILITY', 'SHOULDER_GENERAL'],
  HEAD_NECK: ['NECK_STRAIN', 'HEAD_NECK_GENERAL'],
  ARM_HAND: ['ELBOW_TENDINITIS', 'WRIST_STRAIN', 'BICEP_STRAIN', 'TRICEP_STRAIN', 'ARM_HAND_GENERAL'],
  OTHER: ['GENERAL_MUSCLE_SORENESS', 'OVERTRAINING', 'OTHER_UNSPECIFIED'],
}

// Master mapping of sport to injury map
export const SPORT_INJURY_MAPS: Record<SportType, SportInjuryMap> = {
  RUNNING: RUNNING_INJURIES,
  CYCLING: CYCLING_INJURIES,
  SWIMMING: SWIMMING_INJURIES,
  TRIATHLON: TRIATHLON_INJURIES,
  HYROX: HYROX_INJURIES,
  SKIING: SKIING_INJURIES,
  GENERAL_FITNESS: GENERAL_FITNESS_INJURIES,
  FUNCTIONAL_FITNESS: GENERAL_FITNESS_INJURIES, // Uses general fitness injuries as base
  STRENGTH: STRENGTH_INJURIES,
  // Team sports - use general fitness injuries as base
  TEAM_FOOTBALL: GENERAL_FITNESS_INJURIES,
  TEAM_ICE_HOCKEY: GENERAL_FITNESS_INJURIES,
  TEAM_HANDBALL: GENERAL_FITNESS_INJURIES,
  TEAM_FLOORBALL: GENERAL_FITNESS_INJURIES,
  TEAM_BASKETBALL: GENERAL_FITNESS_INJURIES,
  TEAM_VOLLEYBALL: GENERAL_FITNESS_INJURIES,
  // Racket sports - use general fitness injuries as base
  TENNIS: GENERAL_FITNESS_INJURIES,
  PADEL: GENERAL_FITNESS_INJURIES,
}

// All injury definitions in a lookup map
const ALL_INJURIES: InjuryDefinition[] = [
  ...KNEE_INJURIES,
  ...LOWER_LEG_INJURIES,
  ...ANKLE_FOOT_INJURIES,
  ...HIP_GROIN_INJURIES,
  ...THIGH_INJURIES,
  ...LOWER_BACK_INJURIES,
  ...UPPER_BACK_INJURIES,
  ...SHOULDER_INJURIES,
  ...HEAD_NECK_INJURIES,
  ...ARM_HAND_INJURIES,
  ...OTHER_INJURIES,
]

export const INJURY_LOOKUP: Record<string, InjuryDefinition> = Object.fromEntries(
  ALL_INJURIES.map(injury => [injury.id, injury])
)

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get injuries for a specific sport and body part
 */
export function getInjuriesForSportAndBodyPart(
  sport: SportType,
  bodyPart: BodyPart
): InjuryDefinition[] {
  const sportMap = SPORT_INJURY_MAPS[sport] || SPORT_INJURY_MAPS.GENERAL_FITNESS
  const injuryIds = sportMap[bodyPart] || []

  return injuryIds
    .map(id => INJURY_LOOKUP[id])
    .filter((injury): injury is InjuryDefinition => injury !== undefined)
}

/**
 * Get injury definition by ID
 */
export function getInjuryById(injuryId: string): InjuryDefinition | undefined {
  return INJURY_LOOKUP[injuryId]
}

/**
 * Get illness definition by ID
 */
export function getIllnessById(illnessId: IllnessType): IllnessDefinition | undefined {
  return ILLNESSES.find(i => i.id === illnessId)
}

/**
 * Calculate estimated recovery days based on pain level
 */
export function getEstimatedRecoveryDays(
  injuryId: string,
  painLevel: number
): number {
  const injury = INJURY_LOOKUP[injuryId]
  if (!injury) return 14 // Default 2 weeks if unknown

  if (painLevel <= 4) {
    return injury.typicalRecoveryDays.mild
  } else if (painLevel <= 7) {
    return injury.typicalRecoveryDays.moderate
  } else {
    return injury.typicalRecoveryDays.severe
  }
}

/**
 * Determine if cross-training is allowed for an injury
 */
export function canCrossTrainWithInjury(
  injuryId: string,
  painLevel: number
): boolean {
  const injury = INJURY_LOOKUP[injuryId]
  if (!injury) return true // Default to allowing if unknown

  // If severe and requires rest, no cross-training
  if (painLevel >= 8 && injury.requiresRestIfSevere) {
    return false
  }

  return injury.crossTrainingAllowed
}

/**
 * Get body part by ID
 */
export function getBodyPartById(bodyPartId: BodyPart): BodyPartDefinition | undefined {
  return BODY_PARTS.find(bp => bp.id === bodyPartId)
}
