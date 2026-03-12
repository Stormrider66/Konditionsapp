// prisma/seed-workout-templates.ts
// Workout discovery templates for "Hitta pass" feature
// Run with: npx ts-node prisma/seed-workout-templates.ts

import { PrismaClient, WorkoutTemplateCategory, WorkoutTemplateDifficulty, WorkoutType, SportType } from '@prisma/client'

const prisma = new PrismaClient()

interface TemplateExercise {
  name: string
  nameSv: string
  sets?: number
  reps?: number | string
  duration?: number
  rest?: number
  weight?: string
  notes?: string
}

interface TemplateSection {
  type: 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'
  label: string
  exercises: TemplateExercise[]
}

interface WorkoutTemplateData {
  name: string
  nameSv: string
  description: string
  descriptionSv: string
  category: WorkoutTemplateCategory
  workoutType: WorkoutType
  difficulty: WorkoutTemplateDifficulty
  targetSports: SportType[]
  muscleGroups: string[]
  equipment: string[]
  estimatedDuration: number
  sections: TemplateSection[]
  tags: string[]
}

const templates: WorkoutTemplateData[] = [
  // ==================== STRENGTH (~20) ====================
  {
    name: 'Full Body Strength',
    nameSv: 'Helkroppsstyrka',
    description: 'Complete full body strength session targeting all major muscle groups.',
    descriptionSv: 'Komplett styrkepass för hela kroppen som tränar alla stora muskelgrupper.',
    category: 'STRENGTH',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: [],
    muscleGroups: ['Helkropp'],
    equipment: ['Skivstång', 'Hantlar'],
    estimatedDuration: 50,
    tags: ['styrka', 'helkropp', 'compound'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Rowing machine', nameSv: 'Roddmaskin', duration: 300, notes: 'Lugnt tempo' },
        { name: 'Air squats', nameSv: 'Luftknäböj', sets: 2, reps: 10 },
        { name: 'Arm circles', nameSv: 'Armcirklar', sets: 1, reps: '10 per riktning' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Back squat', nameSv: 'Knäböj', sets: 4, reps: 8, rest: 120, weight: 'Medel-tungt' },
        { name: 'Bench press', nameSv: 'Bänkpress', sets: 4, reps: 8, rest: 120, weight: 'Medel-tungt' },
        { name: 'Barbell row', nameSv: 'Skivstångsrodd', sets: 3, reps: 10, rest: 90, weight: 'Medel' },
        { name: 'Overhead press', nameSv: 'Militärpress', sets: 3, reps: 10, rest: 90, weight: 'Medel' },
        { name: 'Romanian deadlift', nameSv: 'Rumänsk marklyft', sets: 3, reps: 10, rest: 90, weight: 'Medel' },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Stretching', nameSv: 'Stretching', duration: 300, notes: 'Fokus på arbetade muskler' },
      ]},
    ],
  },
  {
    name: 'Lower Body Strength',
    nameSv: 'Benstyrka',
    description: 'Heavy lower body session focusing on quads, hamstrings and glutes.',
    descriptionSv: 'Tungt benpass med fokus på lår, hamstrings och gluteus.',
    category: 'STRENGTH',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: [],
    muscleGroups: ['Ben', 'Höfter'],
    equipment: ['Skivstång', 'Hantlar'],
    estimatedDuration: 50,
    tags: ['styrka', 'ben', 'underkropp'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Stationary bike', nameSv: 'Motionscykel', duration: 300, notes: 'Lugnt tempo' },
        { name: 'Bodyweight lunges', nameSv: 'Utfallssteg', sets: 2, reps: '8 per sida' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Back squat', nameSv: 'Knäböj', sets: 4, reps: 6, rest: 150, weight: 'Tungt' },
        { name: 'Bulgarian split squat', nameSv: 'Bulgarisk split squat', sets: 3, reps: '10 per sida', rest: 90, weight: 'Medel' },
        { name: 'Romanian deadlift', nameSv: 'Rumänsk marklyft', sets: 4, reps: 8, rest: 120, weight: 'Medel-tungt' },
        { name: 'Leg press', nameSv: 'Benpress', sets: 3, reps: 12, rest: 90, weight: 'Medel' },
        { name: 'Leg curl', nameSv: 'Bencurl', sets: 3, reps: 12, rest: 60, weight: 'Lätt-medel' },
        { name: 'Calf raise', nameSv: 'Vadpress', sets: 3, reps: 15, rest: 60, weight: 'Medel' },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Foam rolling legs', nameSv: 'Foam rolling ben', duration: 300 },
      ]},
    ],
  },
  {
    name: 'Upper Body Push',
    nameSv: 'Överkropp Push',
    description: 'Push-focused upper body session: chest, shoulders, triceps.',
    descriptionSv: 'Pushfokuserat överkroppspass: bröst, axlar, triceps.',
    category: 'STRENGTH',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: [],
    muscleGroups: ['Bröst', 'Axlar', 'Armar'],
    equipment: ['Skivstång', 'Hantlar', 'Bänk'],
    estimatedDuration: 45,
    tags: ['styrka', 'överkropp', 'push'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Band pull-aparts', nameSv: 'Bandisärdragar', sets: 2, reps: 15 },
        { name: 'Push-ups', nameSv: 'Armhävningar', sets: 2, reps: 10 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Bench press', nameSv: 'Bänkpress', sets: 4, reps: 8, rest: 120, weight: 'Medel-tungt' },
        { name: 'Incline dumbbell press', nameSv: 'Lutande hantelbänkpress', sets: 3, reps: 10, rest: 90, weight: 'Medel' },
        { name: 'Overhead press', nameSv: 'Militärpress', sets: 3, reps: 10, rest: 90, weight: 'Medel' },
        { name: 'Lateral raise', nameSv: 'Sidolyft', sets: 3, reps: 12, rest: 60, weight: 'Lätt' },
        { name: 'Tricep dips', nameSv: 'Triceps dips', sets: 3, reps: 12, rest: 60, weight: 'Kroppsvikt' },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Chest stretch', nameSv: 'Bröststretching', duration: 120 },
        { name: 'Shoulder stretch', nameSv: 'Axelstretching', duration: 120 },
      ]},
    ],
  },
  {
    name: 'Upper Body Pull',
    nameSv: 'Överkropp Pull',
    description: 'Pull-focused upper body session: back, biceps, rear delts.',
    descriptionSv: 'Pullfokuserat överkroppspass: rygg, biceps, bakre axlar.',
    category: 'STRENGTH',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: [],
    muscleGroups: ['Rygg', 'Armar'],
    equipment: ['Skivstång', 'Hantlar', 'Dragmaskin'],
    estimatedDuration: 45,
    tags: ['styrka', 'överkropp', 'pull', 'rygg'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Band pull-aparts', nameSv: 'Bandisärdragar', sets: 2, reps: 15 },
        { name: 'Cat-cow', nameSv: 'Katt-ko', sets: 1, reps: 10 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Deadlift', nameSv: 'Marklyft', sets: 4, reps: 6, rest: 150, weight: 'Tungt' },
        { name: 'Pull-ups', nameSv: 'Chins', sets: 4, reps: 8, rest: 90, weight: 'Kroppsvikt' },
        { name: 'Barbell row', nameSv: 'Skivstångsrodd', sets: 3, reps: 10, rest: 90, weight: 'Medel' },
        { name: 'Face pull', nameSv: 'Face pull', sets: 3, reps: 15, rest: 60, weight: 'Lätt' },
        { name: 'Bicep curl', nameSv: 'Bicepscurl', sets: 3, reps: 12, rest: 60, weight: 'Medel' },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Back stretch', nameSv: 'Ryggstretching', duration: 180 },
      ]},
    ],
  },
  {
    name: 'Runner Strength',
    nameSv: 'Löparstyrka',
    description: 'Strength training designed for runners. Focus on single-leg stability and hip strength.',
    descriptionSv: 'Styrketräning designad för löpare. Fokus på enbensstabilitet och höftstyrka.',
    category: 'STRENGTH',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: ['RUNNING', 'TRIATHLON'],
    muscleGroups: ['Ben', 'Höfter', 'Core'],
    equipment: ['Hantlar', 'Motståndband'],
    estimatedDuration: 40,
    tags: ['styrka', 'löpning', 'enbens', 'höfter'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Glute bridge', nameSv: 'Glute bridge', sets: 2, reps: 12 },
        { name: 'Clamshells', nameSv: 'Musselövningar', sets: 2, reps: '12 per sida' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Single leg squat', nameSv: 'Enbensknäböj', sets: 3, reps: '8 per sida', rest: 60, weight: 'Hantlar' },
        { name: 'Step-ups', nameSv: 'Steg-upp', sets: 3, reps: '10 per sida', rest: 60, weight: 'Hantlar' },
        { name: 'Single leg deadlift', nameSv: 'Enbens marklyft', sets: 3, reps: '8 per sida', rest: 60, weight: 'Hantel' },
        { name: 'Lateral band walk', nameSv: 'Sidopromenad med band', sets: 3, reps: '12 per sida', rest: 45 },
        { name: 'Calf raise', nameSv: 'Vadpress', sets: 3, reps: 15, rest: 45, weight: 'Kroppsvikt' },
      ]},
      { type: 'CORE', label: 'Core', exercises: [
        { name: 'Side plank', nameSv: 'Sidoplanka', sets: 2, reps: '30 sek per sida' },
        { name: 'Dead bug', nameSv: 'Dead bug', sets: 2, reps: '8 per sida' },
      ]},
    ],
  },
  {
    name: 'Cycling Strength',
    nameSv: 'Cykelstyrka',
    description: 'Strength training for cyclists. Quad, glute and core focus.',
    descriptionSv: 'Styrketräning för cyklister. Fokus på lår, gluteus och core.',
    category: 'STRENGTH',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: ['CYCLING', 'TRIATHLON'],
    muscleGroups: ['Ben', 'Höfter', 'Core'],
    equipment: ['Skivstång', 'Hantlar'],
    estimatedDuration: 45,
    tags: ['styrka', 'cykling', 'ben'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Bodyweight squats', nameSv: 'Luftknäböj', sets: 2, reps: 12 },
        { name: 'Hip circles', nameSv: 'Höftcirklar', sets: 1, reps: '10 per sida' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Front squat', nameSv: 'Frontböj', sets: 4, reps: 8, rest: 120, weight: 'Medel-tungt' },
        { name: 'Leg press', nameSv: 'Benpress', sets: 3, reps: 12, rest: 90, weight: 'Medel' },
        { name: 'Hip thrust', nameSv: 'Hip thrust', sets: 3, reps: 10, rest: 90, weight: 'Medel-tungt' },
        { name: 'Step-ups', nameSv: 'Steg-upp', sets: 3, reps: '10 per sida', rest: 60, weight: 'Hantlar' },
        { name: 'Leg extension', nameSv: 'Benspark', sets: 3, reps: 12, rest: 60, weight: 'Medel' },
      ]},
      { type: 'CORE', label: 'Core', exercises: [
        { name: 'Plank', nameSv: 'Planka', duration: 60, sets: 3, rest: 30 },
        { name: 'Back extension', nameSv: 'Ryggresning', sets: 3, reps: 12 },
      ]},
    ],
  },
  {
    name: 'Football Strength',
    nameSv: 'Fotbollsstyrka',
    description: 'Strength program for football players: explosive power and injury prevention.',
    descriptionSv: 'Styrkeprogram för fotbollsspelare: explosiv kraft och skadeförebyggande.',
    category: 'STRENGTH',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: ['TEAM_FOOTBALL'],
    muscleGroups: ['Helkropp', 'Ben'],
    equipment: ['Skivstång', 'Hantlar'],
    estimatedDuration: 50,
    tags: ['styrka', 'fotboll', 'explosivitet'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Jumping jacks', nameSv: 'Hopplösa Jansen', sets: 2, reps: 20 },
        { name: 'Leg swings', nameSv: 'Bensvingar', sets: 1, reps: '10 per sida' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Trap bar deadlift', nameSv: 'Trap bar marklyft', sets: 4, reps: 5, rest: 150, weight: 'Tungt' },
        { name: 'Bulgarian split squat', nameSv: 'Bulgarisk split squat', sets: 3, reps: '8 per sida', rest: 90, weight: 'Hantlar' },
        { name: 'Nordic hamstring curl', nameSv: 'Nordisk hamstringcurl', sets: 3, reps: 6, rest: 90, weight: 'Kroppsvikt' },
        { name: 'Barbell hip thrust', nameSv: 'Skivstångs hip thrust', sets: 3, reps: 10, rest: 90, weight: 'Medel-tungt' },
        { name: 'Copenhagen adductor', nameSv: 'Köpenhamns adduktor', sets: 2, reps: '8 per sida', rest: 60 },
      ]},
      { type: 'CORE', label: 'Core', exercises: [
        { name: 'Pallof press', nameSv: 'Pallof press', sets: 3, reps: '10 per sida', rest: 45 },
      ]},
    ],
  },
  {
    name: 'Hockey Strength',
    nameSv: 'Hockeystyrka',
    description: 'Strength training for ice hockey players. Focus on skating power and upper body.',
    descriptionSv: 'Styrketräning för hockeyspelare. Fokus på skridskoeffektivitet och överkropp.',
    category: 'STRENGTH',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: ['TEAM_ICE_HOCKEY'],
    muscleGroups: ['Helkropp', 'Ben', 'Core'],
    equipment: ['Skivstång', 'Hantlar'],
    estimatedDuration: 50,
    tags: ['styrka', 'hockey', 'skridskor'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Lateral lunges', nameSv: 'Sidoutfall', sets: 2, reps: '8 per sida' },
        { name: 'Band pull-aparts', nameSv: 'Bandisärdragar', sets: 2, reps: 15 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Back squat', nameSv: 'Knäböj', sets: 4, reps: 6, rest: 150, weight: 'Tungt' },
        { name: 'Lateral squat', nameSv: 'Sidoknäböj', sets: 3, reps: '8 per sida', rest: 90, weight: 'Medel' },
        { name: 'Single-arm dumbbell row', nameSv: 'Enarms hantelrodd', sets: 3, reps: '10 per sida', rest: 60, weight: 'Medel' },
        { name: 'Landmine press', nameSv: 'Landmine press', sets: 3, reps: '10 per sida', rest: 60, weight: 'Medel' },
        { name: 'Hip flexor lunge', nameSv: 'Höftböjarstretch', sets: 3, reps: '8 per sida', rest: 60 },
      ]},
      { type: 'CORE', label: 'Core', exercises: [
        { name: 'Woodchop', nameSv: 'Vedhugg', sets: 3, reps: '10 per sida', rest: 45 },
        { name: 'Dead bug', nameSv: 'Dead bug', sets: 3, reps: '8 per sida' },
      ]},
    ],
  },
  {
    name: 'Beginner Full Body',
    nameSv: 'Nybörjare helkropp',
    description: 'Introductory full body session with machines and basic movements.',
    descriptionSv: 'Introduktionspass för hela kroppen med maskiner och grundrörelser.',
    category: 'STRENGTH',
    workoutType: 'STRENGTH',
    difficulty: 'BEGINNER',
    targetSports: [],
    muscleGroups: ['Helkropp'],
    equipment: ['Hantlar'],
    estimatedDuration: 40,
    tags: ['styrka', 'nybörjare', 'helkropp', 'grundläggande'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Walking', nameSv: 'Promenad', duration: 300, notes: 'Rask promenad' },
        { name: 'Bodyweight squats', nameSv: 'Luftknäböj', sets: 2, reps: 10 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Goblet squat', nameSv: 'Goblet squat', sets: 3, reps: 10, rest: 90, weight: 'Lätt' },
        { name: 'Dumbbell row', nameSv: 'Hantelrodd', sets: 3, reps: 10, rest: 60, weight: 'Lätt' },
        { name: 'Push-ups', nameSv: 'Armhävningar', sets: 3, reps: 8, rest: 60, weight: 'Kroppsvikt', notes: 'På knä om det behövs' },
        { name: 'Dumbbell lunges', nameSv: 'Hantelutfall', sets: 3, reps: '8 per sida', rest: 60, weight: 'Lätt' },
        { name: 'Shoulder press', nameSv: 'Axelpress', sets: 3, reps: 10, rest: 60, weight: 'Lätt' },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Full body stretch', nameSv: 'Helkroppsstretching', duration: 300 },
      ]},
    ],
  },
  {
    name: 'Advanced Powerlifting',
    nameSv: 'Avancerad styrkelyft',
    description: 'Heavy compound lifts for experienced lifters.',
    descriptionSv: 'Tunga grundövningar för erfarna lyftare.',
    category: 'STRENGTH',
    workoutType: 'STRENGTH',
    difficulty: 'ADVANCED',
    targetSports: ['STRENGTH'],
    muscleGroups: ['Helkropp'],
    equipment: ['Skivstång', 'Bänk'],
    estimatedDuration: 60,
    tags: ['styrka', 'styrkelyft', 'tungt', 'avancerat'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Rowing machine', nameSv: 'Roddmaskin', duration: 300 },
        { name: 'Empty bar squats', nameSv: 'Knäböj med tom stång', sets: 3, reps: 10 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Back squat', nameSv: 'Knäböj', sets: 5, reps: 3, rest: 180, weight: 'Tungt (85-90%)' },
        { name: 'Bench press', nameSv: 'Bänkpress', sets: 5, reps: 3, rest: 180, weight: 'Tungt (85-90%)' },
        { name: 'Deadlift', nameSv: 'Marklyft', sets: 3, reps: 3, rest: 180, weight: 'Tungt (85-90%)' },
        { name: 'Barbell row', nameSv: 'Skivstångsrodd', sets: 3, reps: 8, rest: 120, weight: 'Medel-tungt' },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Foam rolling', nameSv: 'Foam rolling', duration: 300 },
      ]},
    ],
  },
  {
    name: 'Handball Strength',
    nameSv: 'Handbollsstyrka',
    description: 'Strength training for handball: shoulder stability, throwing power, leg drive.',
    descriptionSv: 'Styrketräning för handboll: axelstabilitet, kastkraft, benstyrka.',
    category: 'STRENGTH',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: ['TEAM_HANDBALL'],
    muscleGroups: ['Helkropp', 'Axlar'],
    equipment: ['Skivstång', 'Hantlar', 'Medicinboll'],
    estimatedDuration: 50,
    tags: ['styrka', 'handboll', 'kast', 'axlar'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Shoulder rotations', nameSv: 'Axelrotationer', sets: 2, reps: '10 per sida' },
        { name: 'Medicine ball throws', nameSv: 'Medicinbollskast', sets: 2, reps: 8 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Power clean', nameSv: 'Power clean', sets: 4, reps: 5, rest: 120, weight: 'Medel-tungt' },
        { name: 'Push press', nameSv: 'Push press', sets: 3, reps: 8, rest: 90, weight: 'Medel' },
        { name: 'Single-arm row', nameSv: 'Enarms rodd', sets: 3, reps: '10 per sida', rest: 60, weight: 'Medel' },
        { name: 'Front squat', nameSv: 'Frontböj', sets: 4, reps: 6, rest: 120, weight: 'Medel-tungt' },
        { name: 'External rotation', nameSv: 'Extern rotation', sets: 3, reps: 12, rest: 45, weight: 'Lätt' },
      ]},
      { type: 'CORE', label: 'Core', exercises: [
        { name: 'Russian twist', nameSv: 'Rysk twist', sets: 3, reps: '12 per sida', weight: 'Medicinboll' },
      ]},
    ],
  },
  {
    name: 'Padel Strength',
    nameSv: 'Padelstyrka',
    description: 'Strength and mobility for padel players.',
    descriptionSv: 'Styrka och rörlighet för padelspelare.',
    category: 'STRENGTH',
    workoutType: 'STRENGTH',
    difficulty: 'BEGINNER',
    targetSports: ['PADEL', 'TENNIS'],
    muscleGroups: ['Helkropp', 'Axlar', 'Core'],
    equipment: ['Hantlar', 'Motståndband'],
    estimatedDuration: 40,
    tags: ['styrka', 'padel', 'tennis', 'racket'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Arm circles', nameSv: 'Armcirklar', sets: 1, reps: '15 per riktning' },
        { name: 'Lateral shuffles', nameSv: 'Sidoförflyttningar', duration: 60 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Goblet squat', nameSv: 'Goblet squat', sets: 3, reps: 12, rest: 60, weight: 'Medel' },
        { name: 'Shoulder press', nameSv: 'Axelpress', sets: 3, reps: 10, rest: 60, weight: 'Lätt-medel' },
        { name: 'Lateral lunges', nameSv: 'Sidoutfall', sets: 3, reps: '8 per sida', rest: 60, weight: 'Lätt' },
        { name: 'Band external rotation', nameSv: 'Extern rotation med band', sets: 3, reps: 12, rest: 45 },
        { name: 'Wrist curls', nameSv: 'Handled curl', sets: 2, reps: 15, rest: 30, weight: 'Lätt' },
      ]},
      { type: 'CORE', label: 'Core', exercises: [
        { name: 'Anti-rotation press', nameSv: 'Anti-rotation press', sets: 3, reps: '8 per sida', rest: 45 },
      ]},
    ],
  },
  {
    name: 'Bodyweight Strength',
    nameSv: 'Kroppsviktsstyrka',
    description: 'No equipment needed. Full body strength using only bodyweight.',
    descriptionSv: 'Ingen utrustning behövs. Helkroppsstyrka med bara kroppsvikt.',
    category: 'STRENGTH',
    workoutType: 'STRENGTH',
    difficulty: 'BEGINNER',
    targetSports: [],
    muscleGroups: ['Helkropp'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 35,
    tags: ['styrka', 'kroppsvikt', 'hemmaträning', 'nybörjare'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Jumping jacks', nameSv: 'Hampelmannen', sets: 1, reps: 30 },
        { name: 'Inchworms', nameSv: 'Inchworms', sets: 1, reps: 5 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Push-ups', nameSv: 'Armhävningar', sets: 3, reps: 12, rest: 60 },
        { name: 'Bodyweight squats', nameSv: 'Knäböj', sets: 3, reps: 15, rest: 60 },
        { name: 'Inverted row', nameSv: 'Inverterad rodd', sets: 3, reps: 10, rest: 60, notes: 'Använd bord eller stång i lägre höjd' },
        { name: 'Lunges', nameSv: 'Utfallssteg', sets: 3, reps: '10 per sida', rest: 60 },
        { name: 'Pike push-ups', nameSv: 'Pike armhävningar', sets: 3, reps: 8, rest: 60 },
        { name: 'Glute bridge', nameSv: 'Glute bridge', sets: 3, reps: 15, rest: 45 },
      ]},
      { type: 'CORE', label: 'Core', exercises: [
        { name: 'Plank', nameSv: 'Planka', duration: 45, sets: 3, rest: 30 },
        { name: 'Mountain climbers', nameSv: 'Mountain climbers', sets: 2, reps: 20 },
      ]},
    ],
  },
  {
    name: 'Floorball Strength',
    nameSv: 'Innebandystyrka',
    description: 'Strength training targeting floorball-specific movement patterns.',
    descriptionSv: 'Styrketräning inriktad på innebandyspecifika rörelsemönster.',
    category: 'STRENGTH',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: ['TEAM_FLOORBALL'],
    muscleGroups: ['Ben', 'Core', 'Axlar'],
    equipment: ['Hantlar', 'Motståndband'],
    estimatedDuration: 45,
    tags: ['styrka', 'innebandy', 'snabbhet'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'High knees', nameSv: 'Höga knän', duration: 60 },
        { name: 'Lateral lunges', nameSv: 'Sidoutfall', sets: 2, reps: '8 per sida' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Split squat', nameSv: 'Split squat', sets: 3, reps: '10 per sida', rest: 60, weight: 'Hantlar' },
        { name: 'Romanian deadlift', nameSv: 'Rumänsk marklyft', sets: 3, reps: 10, rest: 90, weight: 'Hantlar' },
        { name: 'Lateral band walk', nameSv: 'Sidopromenad med band', sets: 3, reps: '12 per sida', rest: 45 },
        { name: 'Single-arm press', nameSv: 'Enarms press', sets: 3, reps: '10 per sida', rest: 60, weight: 'Hantel' },
        { name: 'Cable rotation', nameSv: 'Kabelrotation', sets: 3, reps: '10 per sida', rest: 45 },
      ]},
      { type: 'CORE', label: 'Core', exercises: [
        { name: 'Plank', nameSv: 'Planka', duration: 45, sets: 3, rest: 30 },
      ]},
    ],
  },
  {
    name: 'Swim Strength',
    nameSv: 'Simstyrka',
    description: 'Dry-land strength for swimmers: lats, core, shoulder stability.',
    descriptionSv: 'Landträning för simmare: latissimus, core, axelstabilitet.',
    category: 'STRENGTH',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: ['SWIMMING', 'TRIATHLON'],
    muscleGroups: ['Rygg', 'Axlar', 'Core'],
    equipment: ['Hantlar', 'Dragmaskin', 'Motståndband'],
    estimatedDuration: 40,
    tags: ['styrka', 'simning', 'landträning'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Band pull-aparts', nameSv: 'Bandisärdragar', sets: 2, reps: 15 },
        { name: 'Scapular push-ups', nameSv: 'Skulderbladsarmhävningar', sets: 2, reps: 10 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Lat pulldown', nameSv: 'Latsdrag', sets: 4, reps: 10, rest: 90, weight: 'Medel' },
        { name: 'Dumbbell pullover', nameSv: 'Hantelpullover', sets: 3, reps: 12, rest: 60, weight: 'Lätt-medel' },
        { name: 'Internal/external rotation', nameSv: 'Intern/extern rotation', sets: 3, reps: 12, rest: 45, weight: 'Lätt' },
        { name: 'Tricep extension', nameSv: 'Tricepspress', sets: 3, reps: 12, rest: 60, weight: 'Medel' },
        { name: 'Straight-arm pulldown', nameSv: 'Rakt latsdrag', sets: 3, reps: 12, rest: 60, weight: 'Lätt-medel' },
      ]},
      { type: 'CORE', label: 'Core', exercises: [
        { name: 'Flutter kicks', nameSv: 'Fladderben', sets: 3, reps: 20 },
        { name: 'Superman hold', nameSv: 'Superman-hold', duration: 30, sets: 3, rest: 30 },
      ]},
    ],
  },
  {
    name: 'Basketball Strength',
    nameSv: 'Basketstyrka',
    description: 'Vertical jump and agility-focused strength for basketball.',
    descriptionSv: 'Styrka med fokus på vertikalhopp och agility för basket.',
    category: 'STRENGTH',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: ['TEAM_BASKETBALL'],
    muscleGroups: ['Ben', 'Höfter', 'Core'],
    equipment: ['Skivstång', 'Hantlar'],
    estimatedDuration: 45,
    tags: ['styrka', 'basket', 'hopp', 'explosivitet'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Jump rope', nameSv: 'Hopprep', duration: 120 },
        { name: 'Bodyweight squats', nameSv: 'Luftknäböj', sets: 2, reps: 10 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Trap bar deadlift', nameSv: 'Trap bar marklyft', sets: 4, reps: 5, rest: 150, weight: 'Tungt' },
        { name: 'Box jumps', nameSv: 'Boxhopp', sets: 4, reps: 5, rest: 90 },
        { name: 'Split squat', nameSv: 'Split squat', sets: 3, reps: '8 per sida', rest: 60, weight: 'Hantlar' },
        { name: 'Lateral bounds', nameSv: 'Sidohopp', sets: 3, reps: '6 per sida', rest: 60 },
      ]},
      { type: 'CORE', label: 'Core', exercises: [
        { name: 'Pallof press', nameSv: 'Pallof press', sets: 3, reps: '10 per sida' },
        { name: 'Medicine ball slams', nameSv: 'Medicinbollssmäll', sets: 3, reps: 8 },
      ]},
    ],
  },
  {
    name: 'Volleyball Strength',
    nameSv: 'Volleybollstyrka',
    description: 'Jump and shoulder strength for volleyball players.',
    descriptionSv: 'Hopp- och axelstyrka för volleybollspelare.',
    category: 'STRENGTH',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: ['TEAM_VOLLEYBALL'],
    muscleGroups: ['Ben', 'Axlar', 'Core'],
    equipment: ['Skivstång', 'Hantlar'],
    estimatedDuration: 45,
    tags: ['styrka', 'volleyboll', 'hopp'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Band pull-aparts', nameSv: 'Bandisärdragar', sets: 2, reps: 15 },
        { name: 'Squat jumps', nameSv: 'Hoppknäböj', sets: 2, reps: 8 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Back squat', nameSv: 'Knäböj', sets: 4, reps: 6, rest: 120, weight: 'Tungt' },
        { name: 'Box jumps', nameSv: 'Boxhopp', sets: 4, reps: 5, rest: 90 },
        { name: 'Overhead press', nameSv: 'Militärpress', sets: 3, reps: 8, rest: 90, weight: 'Medel' },
        { name: 'Pull-ups', nameSv: 'Chins', sets: 3, reps: 8, rest: 90, weight: 'Kroppsvikt' },
        { name: 'Single-leg calf raise', nameSv: 'Enbens vadpress', sets: 3, reps: '12 per sida', rest: 45 },
      ]},
      { type: 'CORE', label: 'Core', exercises: [
        { name: 'Russian twist', nameSv: 'Rysk twist', sets: 3, reps: '12 per sida' },
      ]},
    ],
  },
  {
    name: 'Skiing Strength',
    nameSv: 'Skidstyrka',
    description: 'Strength and endurance for cross-country skiers.',
    descriptionSv: 'Styrka och uthållighet för längdskidåkare.',
    category: 'STRENGTH',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: ['SKIING'],
    muscleGroups: ['Helkropp', 'Core'],
    equipment: ['Skivstång', 'Hantlar', 'Dragmaskin'],
    estimatedDuration: 50,
    tags: ['styrka', 'skidor', 'längdskidor'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Rowing machine', nameSv: 'Roddmaskin', duration: 300 },
        { name: 'Arm circles', nameSv: 'Armcirklar', sets: 1, reps: '15 per riktning' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Front squat', nameSv: 'Frontböj', sets: 4, reps: 8, rest: 120, weight: 'Medel-tungt' },
        { name: 'Dumbbell step-ups', nameSv: 'Steg-upp med hantlar', sets: 3, reps: '10 per sida', rest: 60, weight: 'Medel' },
        { name: 'Lat pulldown', nameSv: 'Latsdrag', sets: 4, reps: 10, rest: 90, weight: 'Medel' },
        { name: 'Single-arm cable row', nameSv: 'Enarms kabelrodd', sets: 3, reps: '10 per sida', rest: 60, weight: 'Medel' },
        { name: 'Tricep dips', nameSv: 'Triceps dips', sets: 3, reps: 12, rest: 60 },
      ]},
      { type: 'CORE', label: 'Core', exercises: [
        { name: 'Hanging leg raise', nameSv: 'Hängande benlyft', sets: 3, reps: 10 },
        { name: 'Side plank', nameSv: 'Sidoplanka', sets: 2, reps: '30 sek per sida' },
      ]},
    ],
  },

  // ==================== CARDIO (~20) ====================
  {
    name: 'Running Intervals 4x4',
    nameSv: 'Löpintervaller 4x4 min',
    description: 'Classic 4x4 minute intervals at high intensity with active recovery.',
    descriptionSv: 'Klassiska 4x4 minuters intervaller i hög intensitet med aktiv vila.',
    category: 'CARDIO',
    workoutType: 'RUNNING',
    difficulty: 'INTERMEDIATE',
    targetSports: ['RUNNING', 'TRIATHLON'],
    muscleGroups: ['Ben', 'Helkropp'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 40,
    tags: ['cardio', 'intervaller', 'löpning', '4x4'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Easy jog', nameSv: 'Lugn jogg', duration: 600, notes: 'Zon 1-2, gradvis uppvärmning' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Interval 1', nameSv: 'Intervall 1', duration: 240, notes: 'Zon 4-5, hög intensitet' },
        { name: 'Recovery jog', nameSv: 'Vila jogg', duration: 180, notes: 'Zon 1-2, aktiv vila' },
        { name: 'Interval 2', nameSv: 'Intervall 2', duration: 240, notes: 'Zon 4-5' },
        { name: 'Recovery jog', nameSv: 'Vila jogg', duration: 180, notes: 'Zon 1-2' },
        { name: 'Interval 3', nameSv: 'Intervall 3', duration: 240, notes: 'Zon 4-5' },
        { name: 'Recovery jog', nameSv: 'Vila jogg', duration: 180, notes: 'Zon 1-2' },
        { name: 'Interval 4', nameSv: 'Intervall 4', duration: 240, notes: 'Zon 4-5, allt du har kvar!' },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Easy jog', nameSv: 'Lugn jogg', duration: 600, notes: 'Zon 1, lugn nedtrappning' },
      ]},
    ],
  },
  {
    name: 'Easy Zone 2 Run 40min',
    nameSv: 'Lugnt zon 2-pass 40 min',
    description: 'Base-building easy run in zone 2. Conversation pace throughout.',
    descriptionSv: 'Basbyggande lugnt löppass i zon 2. Konversationstempo hela passet.',
    category: 'CARDIO',
    workoutType: 'RUNNING',
    difficulty: 'BEGINNER',
    targetSports: ['RUNNING'],
    muscleGroups: ['Ben'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 40,
    tags: ['cardio', 'zon2', 'basträning', 'löpning', 'nybörjare'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Walk + easy jog', nameSv: 'Promenad + lugn jogg', duration: 300, notes: 'Starta med rask promenad, övergå till jogg' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Zone 2 running', nameSv: 'Zon 2-löpning', duration: 1800, notes: 'Håll konversationstempo. Ska kunna prata bekvämt.' },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Easy jog + walk', nameSv: 'Lugn jogg + promenad', duration: 300 },
      ]},
    ],
  },
  {
    name: 'Fartlek Run',
    nameSv: 'Fartlekpass',
    description: 'Unstructured speed play. Vary intensity based on feel.',
    descriptionSv: 'Ostrukturerat fartlek. Variera intensiteten efter känsla.',
    category: 'CARDIO',
    workoutType: 'RUNNING',
    difficulty: 'INTERMEDIATE',
    targetSports: ['RUNNING'],
    muscleGroups: ['Ben', 'Helkropp'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 35,
    tags: ['cardio', 'fartlek', 'löpning', 'variation'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Easy jog', nameSv: 'Lugn jogg', duration: 480, notes: 'Zon 1-2' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Fartlek block 1', nameSv: 'Fartlekblock 1', duration: 60, notes: 'Högt tempo, 1 min' },
        { name: 'Recovery', nameSv: 'Återhämtning', duration: 120, notes: 'Lugn jogg, 2 min' },
        { name: 'Fartlek block 2', nameSv: 'Fartlekblock 2', duration: 90, notes: 'Högt tempo, 90 sek' },
        { name: 'Recovery', nameSv: 'Återhämtning', duration: 120, notes: 'Lugn jogg, 2 min' },
        { name: 'Fartlek block 3', nameSv: 'Fartlekblock 3', duration: 120, notes: 'Medel-högt tempo, 2 min' },
        { name: 'Recovery', nameSv: 'Återhämtning', duration: 120, notes: 'Lugn jogg, 2 min' },
        { name: 'Fartlek block 4', nameSv: 'Fartlekblock 4', duration: 60, notes: 'Sprint, 1 min' },
        { name: 'Recovery', nameSv: 'Återhämtning', duration: 180, notes: 'Lugn jogg, 3 min' },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Easy jog', nameSv: 'Lugn jogg', duration: 360, notes: 'Zon 1' },
      ]},
    ],
  },
  {
    name: 'Tempo Run 30min',
    nameSv: 'Tempopass 30 min',
    description: 'Sustained threshold effort. Comfortably hard pace.',
    descriptionSv: 'Uthållet tröskeltempo. Bekvämt hårt tempo.',
    category: 'CARDIO',
    workoutType: 'RUNNING',
    difficulty: 'ADVANCED',
    targetSports: ['RUNNING', 'TRIATHLON'],
    muscleGroups: ['Ben'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 50,
    tags: ['cardio', 'tempo', 'tröskel', 'löpning'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Easy jog', nameSv: 'Lugn jogg', duration: 600, notes: 'Zon 1-2' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Tempo run', nameSv: 'Temporun', duration: 1800, notes: 'Zon 3-4, tröskeltempo. Ska kunna prata i korta meningar.' },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Easy jog + walk', nameSv: 'Lugn jogg + promenad', duration: 600, notes: 'Zon 1, lugn nedtrappning' },
      ]},
    ],
  },
  {
    name: 'Hill Repeats',
    nameSv: 'Backintervaller',
    description: 'Hill repeat intervals for leg strength and running economy.',
    descriptionSv: 'Backintervaller för benstyrka och löpekonomi.',
    category: 'CARDIO',
    workoutType: 'RUNNING',
    difficulty: 'INTERMEDIATE',
    targetSports: ['RUNNING'],
    muscleGroups: ['Ben', 'Höfter'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 35,
    tags: ['cardio', 'backar', 'löpning', 'styrka'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Easy jog', nameSv: 'Lugn jogg', duration: 600, notes: 'Zon 1-2, platt mark' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Hill repeat', nameSv: 'Backintervall', duration: 60, notes: '8x60 sek uppför i zon 4-5', reps: 8, rest: 120 },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Easy jog', nameSv: 'Lugn jogg', duration: 480, notes: 'Zon 1' },
      ]},
    ],
  },
  {
    name: 'Cycling Intervals 5x3',
    nameSv: 'Cykelintervaller 5x3 min',
    description: '5x3 minute cycling intervals at FTP or above.',
    descriptionSv: '5x3 minuters cykelintervaller vid FTP eller över.',
    category: 'CARDIO',
    workoutType: 'CYCLING',
    difficulty: 'INTERMEDIATE',
    targetSports: ['CYCLING', 'TRIATHLON'],
    muscleGroups: ['Ben'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 50,
    tags: ['cardio', 'cykling', 'intervaller', 'FTP'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Easy spinning', nameSv: 'Lugn spinning', duration: 600, notes: 'Zon 1-2, hög kadens' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Interval', nameSv: 'Intervall', duration: 180, notes: '5x3 min vid 100-105% FTP. Vila 3 min mellan.', reps: 5, rest: 180 },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Easy spinning', nameSv: 'Lugn spinning', duration: 600, notes: 'Zon 1, lugn kadens' },
      ]},
    ],
  },
  {
    name: 'Cycling Zone 2 60min',
    nameSv: 'Zon 2-cykel 60 min',
    description: 'Base endurance cycling in zone 2.',
    descriptionSv: 'Basuthållighet på cykel i zon 2.',
    category: 'CARDIO',
    workoutType: 'CYCLING',
    difficulty: 'BEGINNER',
    targetSports: ['CYCLING'],
    muscleGroups: ['Ben'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 60,
    tags: ['cardio', 'cykling', 'zon2', 'basträning'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Easy spinning', nameSv: 'Lugn spinning', duration: 300, notes: 'Gradvis uppvärmning' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Zone 2 cycling', nameSv: 'Zon 2-cykling', duration: 3000, notes: 'Stabilt zon 2, 80-90 RPM kadens' },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Easy spinning', nameSv: 'Lugn spinning', duration: 300, notes: 'Lugn nedvarvning' },
      ]},
    ],
  },
  {
    name: 'Rowing 20min Intervals',
    nameSv: 'Roddintervaller 20 min',
    description: 'Short rowing intervals for power and aerobic capacity.',
    descriptionSv: 'Korta roddintervaller för kraft och aerob kapacitet.',
    category: 'CARDIO',
    workoutType: 'ALTERNATIVE',
    difficulty: 'INTERMEDIATE',
    targetSports: [],
    muscleGroups: ['Helkropp'],
    equipment: ['Roddmaskin'],
    estimatedDuration: 30,
    tags: ['cardio', 'rodd', 'intervaller'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Easy rowing', nameSv: 'Lugn rodd', duration: 300, notes: 'Teknikfokus, 18-20 tag/min' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Row interval', nameSv: 'Roddintervall', duration: 60, notes: '8x1 min hårt, vila 1 min. 26-30 tag/min', reps: 8, rest: 60 },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Easy rowing', nameSv: 'Lugn rodd', duration: 300, notes: 'Lugn nedvarvning' },
      ]},
    ],
  },
  {
    name: 'Short Sprint Intervals',
    nameSv: 'Korta sprintintervaller',
    description: '10x30 second all-out sprints with full recovery.',
    descriptionSv: '10x30 sekunder allout-sprinter med full vila.',
    category: 'CARDIO',
    workoutType: 'RUNNING',
    difficulty: 'ADVANCED',
    targetSports: ['RUNNING', 'TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY'],
    muscleGroups: ['Ben', 'Helkropp'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 30,
    tags: ['cardio', 'sprint', 'anaerob', 'explosivitet'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Easy jog', nameSv: 'Lugn jogg', duration: 480 },
        { name: 'Strides', nameSv: 'Stigningslopp', sets: 4, reps: 1, duration: 15, rest: 45, notes: 'Gradvis öka fart' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Sprint', nameSv: 'Sprint', duration: 30, notes: '10x30 sek allout. Vila 90 sek.', reps: 10, rest: 90 },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Walk + easy jog', nameSv: 'Promenad + lugn jogg', duration: 480 },
      ]},
    ],
  },
  {
    name: 'Long Run 60min',
    nameSv: 'Långpass 60 min',
    description: 'Weekly long run for endurance building.',
    descriptionSv: 'Veckovist långpass för uthållighetsbygge.',
    category: 'CARDIO',
    workoutType: 'RUNNING',
    difficulty: 'INTERMEDIATE',
    targetSports: ['RUNNING', 'TRIATHLON'],
    muscleGroups: ['Ben'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 60,
    tags: ['cardio', 'långpass', 'löpning', 'uthållighet'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Walk + easy jog', nameSv: 'Promenad + lugn jogg', duration: 300, notes: 'Börja försiktigt' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Long run', nameSv: 'Långpass', duration: 3300, notes: 'Zon 2, jämnt tempo. Drick vatten regelbundet.' },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Walk', nameSv: 'Promenad', duration: 300 },
      ]},
    ],
  },
  {
    name: 'Swim Intervals',
    nameSv: 'Simintervaller',
    description: 'Pool interval session for swim fitness.',
    descriptionSv: 'Bassängintervaller för simkondition.',
    category: 'CARDIO',
    workoutType: 'SWIMMING',
    difficulty: 'INTERMEDIATE',
    targetSports: ['SWIMMING', 'TRIATHLON'],
    muscleGroups: ['Helkropp'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 45,
    tags: ['cardio', 'simning', 'intervaller'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Easy swim', nameSv: 'Lugn simning', duration: 400, notes: '400m blandade simtag' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Main set', nameSv: 'Huvudset', notes: '8x100m crawl med 20 sek vila', reps: 8, rest: 20 },
        { name: 'Kick set', nameSv: 'Sparkset', notes: '4x50m benspark med platta, vila 15 sek', reps: 4, rest: 15 },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Easy swim', nameSv: 'Lugn simning', duration: 200, notes: '200m valfritt simtag' },
      ]},
    ],
  },

  // ==================== FUNCTIONAL (~20) ====================
  {
    name: 'Full Body Circuit',
    nameSv: 'Helkroppscirkel',
    description: 'High-intensity circuit targeting full body with minimal rest.',
    descriptionSv: 'Högintensiv cirkel för hela kroppen med minimal vila.',
    category: 'FUNCTIONAL',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: [],
    muscleGroups: ['Helkropp'],
    equipment: ['Hantlar'],
    estimatedDuration: 30,
    tags: ['funktionell', 'circuit', 'helkropp', 'kondition'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Jumping jacks', nameSv: 'Hampelmannen', duration: 60 },
        { name: 'Inchworms', nameSv: 'Inchworms', sets: 1, reps: 5 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Dumbbell thrusters', nameSv: 'Hantelthrusters', sets: 4, reps: 12, rest: 15, weight: 'Medel', notes: '4 varv av hela cirkeln, 60 sek vila mellan varv' },
        { name: 'Renegade rows', nameSv: 'Renegade rodd', sets: 4, reps: '8 per sida', rest: 15, weight: 'Medel' },
        { name: 'Burpees', nameSv: 'Burpees', sets: 4, reps: 10, rest: 15 },
        { name: 'Goblet squat', nameSv: 'Goblet squat', sets: 4, reps: 12, rest: 15, weight: 'Medel' },
        { name: 'Mountain climbers', nameSv: 'Mountain climbers', sets: 4, reps: 20, rest: 60 },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Stretching', nameSv: 'Stretching', duration: 300 },
      ]},
    ],
  },
  {
    name: 'Kettlebell Flow',
    nameSv: 'Kettlebell-flow',
    description: 'Flowing kettlebell workout combining strength and conditioning.',
    descriptionSv: 'Flödande kettlebellpass som kombinerar styrka och kondition.',
    category: 'FUNCTIONAL',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: [],
    muscleGroups: ['Helkropp'],
    equipment: ['Kettlebell'],
    estimatedDuration: 35,
    tags: ['funktionell', 'kettlebell', 'flow', 'kondition'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Halos', nameSv: 'Halos', sets: 2, reps: '8 per riktning', weight: 'Lätt' },
        { name: 'Goblet squat', nameSv: 'Goblet squat', sets: 2, reps: 8, weight: 'Lätt' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Kettlebell swing', nameSv: 'Kettlebell swing', sets: 4, reps: 15, rest: 30, weight: 'Medel' },
        { name: 'Turkish get-up', nameSv: 'Turkish get-up', sets: 3, reps: '3 per sida', rest: 60, weight: 'Medel' },
        { name: 'Clean and press', nameSv: 'Clean och press', sets: 3, reps: '8 per sida', rest: 45, weight: 'Medel' },
        { name: 'Goblet squat', nameSv: 'Goblet squat', sets: 3, reps: 12, rest: 45, weight: 'Medel-tungt' },
        { name: 'Single-arm row', nameSv: 'Enarms rodd', sets: 3, reps: '10 per sida', rest: 30, weight: 'Medel' },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Stretching', nameSv: 'Stretching', duration: 300 },
      ]},
    ],
  },
  {
    name: 'HYROX Prep',
    nameSv: 'HYROX-förberedelse',
    description: 'Simulate HYROX race demands: running + functional stations.',
    descriptionSv: 'Simulera HYROX-tävlingskrav: löpning + funktionella stationer.',
    category: 'FUNCTIONAL',
    workoutType: 'HYROX',
    difficulty: 'ADVANCED',
    targetSports: ['HYROX', 'FUNCTIONAL_FITNESS'],
    muscleGroups: ['Helkropp'],
    equipment: ['Skivstång', 'Roddmaskin', 'Sandsäck'],
    estimatedDuration: 50,
    tags: ['funktionell', 'hyrox', 'tävling', 'uthållighet'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Easy jog', nameSv: 'Lugn jogg', duration: 300 },
        { name: 'Bodyweight squats', nameSv: 'Luftknäböj', sets: 2, reps: 10 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Run', nameSv: 'Löpning', duration: 300, notes: '1 km löpning, medeltempo' },
        { name: 'Rowing', nameSv: 'Rodd', notes: '1000m rodd', duration: 240 },
        { name: 'Run', nameSv: 'Löpning', duration: 300, notes: '1 km löpning' },
        { name: 'Burpees', nameSv: 'Burpees', reps: 30, notes: 'Broad jump burpees' },
        { name: 'Run', nameSv: 'Löpning', duration: 300, notes: '1 km löpning' },
        { name: 'Farmers carry', nameSv: 'Farmers carry', notes: '200m, tungt', weight: 'Tungt' },
        { name: 'Run', nameSv: 'Löpning', duration: 300, notes: '1 km löpning' },
        { name: 'Wall balls', nameSv: 'Wall balls', reps: 50, weight: '9/6 kg' },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Walk + stretch', nameSv: 'Promenad + stretching', duration: 300 },
      ]},
    ],
  },
  {
    name: 'Bodyweight AMRAP 20',
    nameSv: 'Kroppsvikt AMRAP 20 min',
    description: 'As many rounds as possible in 20 minutes. No equipment needed.',
    descriptionSv: 'Så många rundor som möjligt på 20 minuter. Ingen utrustning.',
    category: 'FUNCTIONAL',
    workoutType: 'STRENGTH',
    difficulty: 'BEGINNER',
    targetSports: [],
    muscleGroups: ['Helkropp'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 25,
    tags: ['funktionell', 'amrap', 'kroppsvikt', 'hemmaträning'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'High knees', nameSv: 'Höga knän', duration: 60 },
        { name: 'Arm circles', nameSv: 'Armcirklar', duration: 30 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Air squats', nameSv: 'Luftknäböj', reps: 15, notes: 'AMRAP 20 min: gör så många varv som möjligt' },
        { name: 'Push-ups', nameSv: 'Armhävningar', reps: 10 },
        { name: 'Sit-ups', nameSv: 'Situps', reps: 10 },
        { name: 'Jumping lunges', nameSv: 'Hopputfall', reps: '10 per sida' },
        { name: 'Burpees', nameSv: 'Burpees', reps: 5 },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Walk + stretch', nameSv: 'Promenad + stretching', duration: 300 },
      ]},
    ],
  },
  {
    name: 'Dumbbell Complex',
    nameSv: 'Hantelkomplex',
    description: 'Flowing dumbbell complex with no rest between movements.',
    descriptionSv: 'Flödande hantelkomplex utan vila mellan rörelserna.',
    category: 'FUNCTIONAL',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: [],
    muscleGroups: ['Helkropp'],
    equipment: ['Hantlar'],
    estimatedDuration: 25,
    tags: ['funktionell', 'komplex', 'hantlar', 'kondition'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Jumping jacks', nameSv: 'Hampelmannen', duration: 60 },
        { name: 'Light dumbbell swings', nameSv: 'Lätta hantelsvingar', sets: 2, reps: 10 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Deadlift', nameSv: 'Marklyft', reps: 6, weight: 'Medel', notes: '5 varv utan att släppa hantlarna. 90 sek vila mellan varv.' },
        { name: 'Hang clean', nameSv: 'Hang clean', reps: 6, weight: 'Medel' },
        { name: 'Front squat', nameSv: 'Frontböj', reps: 6, weight: 'Medel' },
        { name: 'Push press', nameSv: 'Push press', reps: 6, weight: 'Medel' },
        { name: 'Reverse lunge', nameSv: 'Bakåtutfall', reps: '6 per sida', weight: 'Medel' },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Stretching', nameSv: 'Stretching', duration: 300 },
      ]},
    ],
  },
  {
    name: 'Tabata Mix',
    nameSv: 'Tabata-mix',
    description: '4 rounds of Tabata (20s work / 10s rest x 8). Total 16 minutes of work.',
    descriptionSv: '4 rundor Tabata (20 sek arbete / 10 sek vila x 8). Totalt 16 minuter arbete.',
    category: 'FUNCTIONAL',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: [],
    muscleGroups: ['Helkropp'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 25,
    tags: ['funktionell', 'tabata', 'HIIT', 'kondition'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Light jog in place', nameSv: 'Lätt jogg på stället', duration: 120 },
        { name: 'Dynamic stretching', nameSv: 'Dynamisk stretching', duration: 120 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Tabata 1: Squat jumps', nameSv: 'Tabata 1: Hoppknäböj', duration: 20, rest: 10, notes: '8 rundor. Vila 1 min efter.' },
        { name: 'Tabata 2: Push-ups', nameSv: 'Tabata 2: Armhävningar', duration: 20, rest: 10, notes: '8 rundor. Vila 1 min efter.' },
        { name: 'Tabata 3: Mountain climbers', nameSv: 'Tabata 3: Mountain climbers', duration: 20, rest: 10, notes: '8 rundor. Vila 1 min efter.' },
        { name: 'Tabata 4: Burpees', nameSv: 'Tabata 4: Burpees', duration: 20, rest: 10, notes: '8 rundor.' },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Walk + stretch', nameSv: 'Promenad + stretching', duration: 300 },
      ]},
    ],
  },
  {
    name: 'Sandbag Workout',
    nameSv: 'Sandsäckspass',
    description: 'Full body functional training with a sandbag.',
    descriptionSv: 'Helkroppsfunktionell träning med sandsäck.',
    category: 'FUNCTIONAL',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: ['HYROX', 'FUNCTIONAL_FITNESS'],
    muscleGroups: ['Helkropp'],
    equipment: ['Sandsäck'],
    estimatedDuration: 30,
    tags: ['funktionell', 'sandsäck', 'styrka'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Light jog', nameSv: 'Lätt jogg', duration: 180 },
        { name: 'Air squats', nameSv: 'Luftknäböj', sets: 2, reps: 10 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Sandbag clean', nameSv: 'Sandsäck clean', sets: 4, reps: 8, rest: 60 },
        { name: 'Sandbag shoulder carry', nameSv: 'Sandsäck axelbärning', duration: 60, sets: 4, rest: 60, notes: '30 sek per axel' },
        { name: 'Sandbag squat', nameSv: 'Sandsäck knäböj', sets: 4, reps: 10, rest: 60 },
        { name: 'Sandbag over-shoulder', nameSv: 'Sandsäck över axel', sets: 4, reps: 8, rest: 60 },
        { name: 'Bear hug carry', nameSv: 'Björnkrams-bärning', duration: 60, sets: 3, rest: 60 },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Stretching', nameSv: 'Stretching', duration: 300 },
      ]},
    ],
  },
  {
    name: 'EMOM 20',
    nameSv: 'EMOM 20 min',
    description: 'Every minute on the minute for 20 minutes. Alternating movements.',
    descriptionSv: 'Varje minut i 20 minuter. Växlande rörelser.',
    category: 'FUNCTIONAL',
    workoutType: 'STRENGTH',
    difficulty: 'INTERMEDIATE',
    targetSports: ['FUNCTIONAL_FITNESS'],
    muscleGroups: ['Helkropp'],
    equipment: ['Kettlebell'],
    estimatedDuration: 25,
    tags: ['funktionell', 'emom', 'kondition', 'kettlebell'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Light KB swings', nameSv: 'Lätta KB-svingar', sets: 2, reps: 10, weight: 'Lätt' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Odd min: KB swings', nameSv: 'Udda min: KB-svingar', reps: 15, notes: 'EMOM 20 min: udda minuter gör swings, jämna gör goblet squats. Vila resten av minuten.' },
        { name: 'Even min: Goblet squats', nameSv: 'Jämna min: Goblet squats', reps: 10 },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Walk + stretch', nameSv: 'Promenad + stretching', duration: 300 },
      ]},
    ],
  },
  {
    name: 'Band Resistance Workout',
    nameSv: 'Motståndsbandspass',
    description: 'Full body workout using only resistance bands. Great for travel.',
    descriptionSv: 'Helkroppspass med bara motståndsband. Perfekt på resan.',
    category: 'FUNCTIONAL',
    workoutType: 'STRENGTH',
    difficulty: 'BEGINNER',
    targetSports: [],
    muscleGroups: ['Helkropp'],
    equipment: ['Motståndband'],
    estimatedDuration: 30,
    tags: ['funktionell', 'motståndsband', 'hemmaträning', 'resa'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'March in place', nameSv: 'Marsch på stället', duration: 120 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Band squat', nameSv: 'Bandknäböj', sets: 3, reps: 15, rest: 45 },
        { name: 'Band row', nameSv: 'Bandrodd', sets: 3, reps: 12, rest: 45 },
        { name: 'Band chest press', nameSv: 'Band bröstpress', sets: 3, reps: 12, rest: 45 },
        { name: 'Band lateral walk', nameSv: 'Sidopromenad med band', sets: 3, reps: '12 per sida', rest: 45 },
        { name: 'Band face pull', nameSv: 'Band face pull', sets: 3, reps: 15, rest: 45 },
        { name: 'Band deadlift', nameSv: 'Band marklyft', sets: 3, reps: 12, rest: 45 },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Full body stretch', nameSv: 'Helkroppsstretching', duration: 300 },
      ]},
    ],
  },
  {
    name: 'Obstacle Course Prep',
    nameSv: 'Hinderbaneförberedelse',
    description: 'Prepare for obstacle races with grip, climb, and carry exercises.',
    descriptionSv: 'Förbered dig för hinderbanelopp med grepp-, klätter- och bärövningar.',
    category: 'FUNCTIONAL',
    workoutType: 'STRENGTH',
    difficulty: 'ADVANCED',
    targetSports: ['FUNCTIONAL_FITNESS', 'HYROX'],
    muscleGroups: ['Helkropp'],
    equipment: ['Hantlar', 'Kettlebell'],
    estimatedDuration: 45,
    tags: ['funktionell', 'hinderbana', 'grepp', 'uthållighet'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Light jog', nameSv: 'Lätt jogg', duration: 300 },
        { name: 'Bear crawl', nameSv: 'Björnkrypning', duration: 60 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Dead hang', nameSv: 'Häng', duration: 45, sets: 3, rest: 60, notes: 'Greppträning' },
        { name: 'Farmers carry', nameSv: 'Farmers carry', duration: 60, sets: 3, rest: 60, weight: 'Tungt' },
        { name: 'Burpees', nameSv: 'Burpees', sets: 3, reps: 12, rest: 45 },
        { name: 'Pull-ups', nameSv: 'Chins', sets: 4, reps: 6, rest: 60 },
        { name: 'Box jumps', nameSv: 'Boxhopp', sets: 3, reps: 10, rest: 60 },
        { name: 'Sled push (or sprint)', nameSv: 'Släde (eller sprint)', duration: 30, sets: 4, rest: 90 },
      ]},
      { type: 'COOLDOWN', label: 'Nedvarvning', exercises: [
        { name: 'Walk + stretch', nameSv: 'Promenad + stretching', duration: 300 },
      ]},
    ],
  },

  // ==================== CORE (~10) ====================
  {
    name: 'Plank Variations',
    nameSv: 'Plankvariationer',
    description: 'Core session built around plank variations and anti-extension.',
    descriptionSv: 'Core-pass byggt kring plankvariationer och anti-extension.',
    category: 'CORE',
    workoutType: 'CORE',
    difficulty: 'BEGINNER',
    targetSports: [],
    muscleGroups: ['Core'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 15,
    tags: ['core', 'planka', 'nybörjare', 'stabilitet'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Cat-cow', nameSv: 'Katt-ko', sets: 1, reps: 10 },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Front plank', nameSv: 'Planka', duration: 30, sets: 3, rest: 30 },
        { name: 'Side plank right', nameSv: 'Sidoplanka höger', duration: 25, sets: 3, rest: 15 },
        { name: 'Side plank left', nameSv: 'Sidoplanka vänster', duration: 25, sets: 3, rest: 15 },
        { name: 'Plank shoulder taps', nameSv: 'Planka axelklapp', sets: 3, reps: '8 per sida', rest: 30 },
        { name: 'Reverse plank', nameSv: 'Omvänd planka', duration: 20, sets: 3, rest: 30 },
      ]},
    ],
  },
  {
    name: 'Anti-Rotation Core',
    nameSv: 'Anti-rotation core',
    description: 'Core stability focusing on anti-rotation and anti-flexion.',
    descriptionSv: 'Core-stabilitet med fokus på anti-rotation och anti-flexion.',
    category: 'CORE',
    workoutType: 'CORE',
    difficulty: 'INTERMEDIATE',
    targetSports: [],
    muscleGroups: ['Core'],
    equipment: ['Motståndband', 'Medicinboll'],
    estimatedDuration: 20,
    tags: ['core', 'anti-rotation', 'stabilitet'],
    sections: [
      { type: 'WARMUP', label: 'Uppvärmning', exercises: [
        { name: 'Dead bug', nameSv: 'Dead bug', sets: 2, reps: '6 per sida' },
      ]},
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Pallof press', nameSv: 'Pallof press', sets: 3, reps: '10 per sida', rest: 45 },
        { name: 'Bird dog', nameSv: 'Fågelhund', sets: 3, reps: '8 per sida', rest: 30 },
        { name: 'Half-kneeling chop', nameSv: 'Halvknästående hugg', sets: 3, reps: '8 per sida', rest: 45 },
        { name: 'Suitcase carry', nameSv: 'Resväskebärning', duration: 30, sets: 3, rest: 30, notes: '30 sek per sida' },
        { name: 'Plank pull-through', nameSv: 'Planka genomdragning', sets: 3, reps: '6 per sida', rest: 30 },
      ]},
    ],
  },
  {
    name: 'Runner Core',
    nameSv: 'Löparens core',
    description: 'Core program specifically designed for runners.',
    descriptionSv: 'Core-program speciellt designat för löpare.',
    category: 'CORE',
    workoutType: 'CORE',
    difficulty: 'BEGINNER',
    targetSports: ['RUNNING', 'TRIATHLON'],
    muscleGroups: ['Core', 'Höfter'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 15,
    tags: ['core', 'löpning', 'stabilitet', 'höfter'],
    sections: [
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Dead bug', nameSv: 'Dead bug', sets: 3, reps: '8 per sida', rest: 30 },
        { name: 'Side plank', nameSv: 'Sidoplanka', duration: 25, sets: 3, rest: 15, notes: 'Per sida' },
        { name: 'Glute bridge march', nameSv: 'Glute bridge marsch', sets: 3, reps: '8 per sida', rest: 30 },
        { name: 'Bird dog', nameSv: 'Fågelhund', sets: 3, reps: '8 per sida', rest: 30 },
        { name: 'Clamshell', nameSv: 'Musselövning', sets: 2, reps: '12 per sida', rest: 30 },
        { name: 'Bicycle crunches', nameSv: 'Cykelcrunches', sets: 2, reps: '12 per sida', rest: 30 },
      ]},
    ],
  },
  {
    name: 'Full Body Core',
    nameSv: 'Helkropps core',
    description: 'Comprehensive core session hitting all angles.',
    descriptionSv: 'Omfattande core-pass som tränar alla vinklar.',
    category: 'CORE',
    workoutType: 'CORE',
    difficulty: 'INTERMEDIATE',
    targetSports: [],
    muscleGroups: ['Core'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 20,
    tags: ['core', 'helkropp', 'stabilitet'],
    sections: [
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Plank', nameSv: 'Planka', duration: 45, sets: 3, rest: 30 },
        { name: 'Russian twist', nameSv: 'Rysk twist', sets: 3, reps: '12 per sida', rest: 30 },
        { name: 'Leg raises', nameSv: 'Benlyft', sets: 3, reps: 12, rest: 30 },
        { name: 'Superman', nameSv: 'Superman', sets: 3, reps: 10, rest: 30 },
        { name: 'V-ups', nameSv: 'V-situps', sets: 3, reps: 10, rest: 30 },
        { name: 'Flutter kicks', nameSv: 'Fladderben', sets: 3, reps: 20, rest: 30 },
        { name: 'Side plank dips', nameSv: 'Sidoplanka dips', sets: 2, reps: '10 per sida', rest: 30 },
      ]},
    ],
  },
  {
    name: 'Advanced Core Challenge',
    nameSv: 'Avancerad core-utmaning',
    description: 'Challenging core session for advanced athletes.',
    descriptionSv: 'Utmanande core-pass för avancerade atleter.',
    category: 'CORE',
    workoutType: 'CORE',
    difficulty: 'ADVANCED',
    targetSports: [],
    muscleGroups: ['Core'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 20,
    tags: ['core', 'avancerat', 'utmaning'],
    sections: [
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Dragon flag', nameSv: 'Dragon flag', sets: 3, reps: 6, rest: 60 },
        { name: 'L-sit hold', nameSv: 'L-sit hold', duration: 20, sets: 3, rest: 45 },
        { name: 'Ab wheel rollout', nameSv: 'Ab wheel rollout', sets: 3, reps: 10, rest: 60 },
        { name: 'Hanging leg raise', nameSv: 'Hängande benlyft', sets: 3, reps: 10, rest: 60 },
        { name: 'Plank to push-up', nameSv: 'Planka till armhävning', sets: 3, reps: '8 per sida', rest: 45 },
      ]},
    ],
  },

  // ==================== STRETCHING (~10) ====================
  {
    name: 'Full Body Stretch',
    nameSv: 'Helkroppsstretching',
    description: 'Complete stretching routine for all major muscle groups.',
    descriptionSv: 'Komplett stretchrutin för alla stora muskelgrupper.',
    category: 'STRETCHING',
    workoutType: 'RECOVERY',
    difficulty: 'BEGINNER',
    targetSports: [],
    muscleGroups: ['Helkropp'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 20,
    tags: ['stretching', 'helkropp', 'rörlighet', 'återhämtning'],
    sections: [
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Neck stretch', nameSv: 'Nacksträckning', duration: 30, notes: '30 sek per sida' },
        { name: 'Chest doorway stretch', nameSv: 'Bröststretching', duration: 30, notes: '30 sek per sida' },
        { name: 'Cat-cow', nameSv: 'Katt-ko', sets: 1, reps: 10 },
        { name: 'Standing quad stretch', nameSv: 'Stående lårsträckning', duration: 30, notes: 'Per sida' },
        { name: 'Standing hamstring stretch', nameSv: 'Stående hamstringsträckning', duration: 30, notes: 'Per sida' },
        { name: 'Hip flexor stretch', nameSv: 'Höftböjarstretching', duration: 30, notes: 'Per sida' },
        { name: 'Pigeon stretch', nameSv: 'Duva', duration: 45, notes: 'Per sida' },
        { name: 'Child pose', nameSv: 'Barnställning', duration: 60 },
        { name: 'Spinal twist', nameSv: 'Ryggradsvridning', duration: 30, notes: 'Per sida' },
      ]},
    ],
  },
  {
    name: 'Runner Stretch',
    nameSv: 'Löparstretching',
    description: 'Post-run stretching targeting legs, hips and lower back.',
    descriptionSv: 'Stretching efter löpning med fokus på ben, höfter och nedre rygg.',
    category: 'STRETCHING',
    workoutType: 'RECOVERY',
    difficulty: 'BEGINNER',
    targetSports: ['RUNNING', 'TRIATHLON'],
    muscleGroups: ['Ben', 'Höfter'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 15,
    tags: ['stretching', 'löpning', 'ben', 'höfter'],
    sections: [
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Standing calf stretch', nameSv: 'Stående vadsträckning', duration: 30, notes: 'Per sida' },
        { name: 'Standing quad stretch', nameSv: 'Stående lårsträckning', duration: 30, notes: 'Per sida' },
        { name: 'Forward fold', nameSv: 'Framåtfällning', duration: 45, notes: 'Hamstrings' },
        { name: 'Hip flexor lunge', nameSv: 'Höftböjarutfall', duration: 30, notes: 'Per sida' },
        { name: 'Pigeon pose', nameSv: 'Duva', duration: 45, notes: 'Per sida' },
        { name: 'Figure 4 stretch', nameSv: 'Figur 4-stretching', duration: 30, notes: 'Per sida, gluteus' },
        { name: 'IT band stretch', nameSv: 'IT-band stretching', duration: 30, notes: 'Per sida' },
      ]},
    ],
  },
  {
    name: 'Morning Mobility',
    nameSv: 'Morgonmobilitet',
    description: 'Quick morning mobility routine to start the day right.',
    descriptionSv: 'Snabb morgonmobilitet för att starta dagen rätt.',
    category: 'STRETCHING',
    workoutType: 'RECOVERY',
    difficulty: 'BEGINNER',
    targetSports: [],
    muscleGroups: ['Helkropp'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 10,
    tags: ['stretching', 'mobilitet', 'morgon', 'daglig'],
    sections: [
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Cat-cow', nameSv: 'Katt-ko', sets: 1, reps: 8 },
        { name: 'Thread the needle', nameSv: 'Trä nålen', reps: '5 per sida' },
        { name: 'World greatest stretch', nameSv: 'Världens bästa stretching', reps: '3 per sida' },
        { name: 'Hip circles', nameSv: 'Höftcirklar', reps: '8 per sida' },
        { name: 'Arm circles', nameSv: 'Armcirklar', reps: '10 per riktning' },
        { name: 'Standing side bend', nameSv: 'Stående sidböjning', reps: '6 per sida' },
        { name: 'Down dog to up dog', nameSv: 'Nedåthund till uppåthund', reps: 6 },
      ]},
    ],
  },
  {
    name: 'Post-Workout Stretch',
    nameSv: 'Post-workout stretching',
    description: 'Cool-down stretching routine after any workout.',
    descriptionSv: 'Nedvarvningsstretching efter valfritt pass.',
    category: 'STRETCHING',
    workoutType: 'RECOVERY',
    difficulty: 'BEGINNER',
    targetSports: [],
    muscleGroups: ['Helkropp'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 10,
    tags: ['stretching', 'nedvarvning', 'återhämtning'],
    sections: [
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Hamstring stretch', nameSv: 'Hamstringsträckning', duration: 30, notes: 'Per sida' },
        { name: 'Quad stretch', nameSv: 'Lårsträckning', duration: 30, notes: 'Per sida' },
        { name: 'Shoulder stretch', nameSv: 'Axelsträckning', duration: 20, notes: 'Per sida' },
        { name: 'Chest stretch', nameSv: 'Bröststretching', duration: 30 },
        { name: 'Hip flexor stretch', nameSv: 'Höftböjarstretching', duration: 30, notes: 'Per sida' },
        { name: 'Child pose', nameSv: 'Barnställning', duration: 45 },
      ]},
    ],
  },
  {
    name: 'Hip Opener Flow',
    nameSv: 'Höftöppnare',
    description: 'Deep hip mobility flow for tight hips.',
    descriptionSv: 'Djup höftmobilitet för stela höfter.',
    category: 'STRETCHING',
    workoutType: 'RECOVERY',
    difficulty: 'INTERMEDIATE',
    targetSports: [],
    muscleGroups: ['Höfter', 'Ben'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 15,
    tags: ['stretching', 'höfter', 'mobilitet'],
    sections: [
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Deep squat hold', nameSv: 'Djup knäböjshåll', duration: 60, notes: 'Hälar i golvet' },
        { name: 'Pigeon pose', nameSv: 'Duva', duration: 60, notes: 'Per sida' },
        { name: '90/90 stretch', nameSv: '90/90 stretching', duration: 45, notes: 'Per sida' },
        { name: 'Frog stretch', nameSv: 'Grodstretching', duration: 60 },
        { name: 'Lizard pose', nameSv: 'Ödleställning', duration: 45, notes: 'Per sida' },
        { name: 'Butterfly stretch', nameSv: 'Fjärilsstretching', duration: 45 },
        { name: 'Happy baby', nameSv: 'Glad bebis', duration: 45 },
      ]},
    ],
  },
  {
    name: 'Foam Rolling Recovery',
    nameSv: 'Foam rolling-pass',
    description: 'Full body foam rolling for myofascial release.',
    descriptionSv: 'Helkropps foam rolling för myofascial frigöring.',
    category: 'STRETCHING',
    workoutType: 'RECOVERY',
    difficulty: 'BEGINNER',
    targetSports: [],
    muscleGroups: ['Helkropp'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 15,
    tags: ['stretching', 'foam rolling', 'återhämtning', 'myofascial'],
    sections: [
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Calves', nameSv: 'Vader', duration: 60, notes: 'Rulla långsamt, pausa på ömma punkter' },
        { name: 'Quads', nameSv: 'Lår', duration: 60, notes: 'Per sida' },
        { name: 'IT band', nameSv: 'IT-band', duration: 45, notes: 'Per sida, var försiktig' },
        { name: 'Glutes', nameSv: 'Gluteus', duration: 45, notes: 'Sitt på rollen, per sida' },
        { name: 'Upper back', nameSv: 'Övre rygg', duration: 60 },
        { name: 'Lats', nameSv: 'Lats', duration: 45, notes: 'Per sida' },
      ]},
    ],
  },
  {
    name: 'Upper Body Mobility',
    nameSv: 'Överkroppsmobilitet',
    description: 'Shoulder and thoracic mobility for desk workers and athletes.',
    descriptionSv: 'Axel- och bröstryggsrörlighet för kontorsarbetare och atleter.',
    category: 'STRETCHING',
    workoutType: 'RECOVERY',
    difficulty: 'BEGINNER',
    targetSports: [],
    muscleGroups: ['Axlar', 'Rygg'],
    equipment: ['Ingen utrustning'],
    estimatedDuration: 15,
    tags: ['stretching', 'mobilitet', 'axlar', 'kontor'],
    sections: [
      { type: 'MAIN', label: 'Huvuddel', exercises: [
        { name: 'Neck rotations', nameSv: 'Nackrotationer', reps: '8 per riktning' },
        { name: 'Shoulder rolls', nameSv: 'Axelrullningar', reps: '10 per riktning' },
        { name: 'Thread the needle', nameSv: 'Trä nålen', reps: '5 per sida' },
        { name: 'Doorway chest stretch', nameSv: 'Bröststretching i dörrpost', duration: 30, notes: 'Per sida' },
        { name: 'Cat-cow', nameSv: 'Katt-ko', reps: 10 },
        { name: 'Thoracic rotation', nameSv: 'Bröstryggrotation', reps: '8 per sida' },
        { name: 'Wall slides', nameSv: 'Väggglid', reps: 10 },
        { name: 'Cross-body shoulder stretch', nameSv: 'Korsad axelsträckning', duration: 30, notes: 'Per sida' },
      ]},
    ],
  },
]

async function main() {
  console.log('🏋️ Starting Workout Templates Seeder...')
  console.log(`📦 Seeding ${templates.length} workout templates...`)

  let created = 0
  let skipped = 0
  const errors: string[] = []

  for (const template of templates) {
    const existing = await prisma.workoutTemplate.findFirst({
      where: { name: template.name, isSystem: true },
    })

    if (existing) {
      skipped++
      continue
    }

    try {
      await prisma.workoutTemplate.create({
        data: {
          name: template.name,
          nameSv: template.nameSv,
          description: template.description,
          descriptionSv: template.descriptionSv,
          category: template.category,
          workoutType: template.workoutType,
          difficulty: template.difficulty,
          targetSports: template.targetSports,
          muscleGroups: template.muscleGroups,
          equipment: template.equipment,
          estimatedDuration: template.estimatedDuration,
          sections: template.sections as unknown as any,
          isSystem: true,
          tags: template.tags,
        },
      })
      created++
      console.log(`  ✅ Created: ${template.nameSv}`)
    } catch (error) {
      errors.push(`Failed to create "${template.name}": ${error}`)
    }
  }

  console.log('\n📊 Seeding Summary:')
  console.log(`  ✅ Created: ${created}`)
  console.log(`  ⏭️  Skipped: ${skipped}`)
  if (errors.length > 0) {
    console.log(`  ❌ Errors: ${errors.length}`)
    errors.forEach((e) => console.log(`     - ${e}`))
  }
  console.log('\n🎉 Workout templates seeding complete!')
}

main()
  .catch((e) => {
    console.error('Error seeding workout templates:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
