// prisma/seed-exercises.ts
// Seed file for exercise library with Swedish exercises
// Run with: npx ts-node prisma/seed-exercises.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const exercises = [
  // ==================== STRENGTH - Lower Body ====================
  {
    name: 'Knäböj',
    nameEn: 'Squat',
    category: 'STRENGTH' as const,
    muscleGroup: 'Ben',
    description: 'Grundläggande styrkeövning för ben och höfter',
    instructions: '1. Stå med fötterna axelbrett\n2. Sänk dig nedåt med rak rygg\n3. Knäna ska inte gå förbi tårna\n4. Tryck upp till startposition',
    equipment: 'Skivstång, rack',
    difficulty: 'Intermediate',
    videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8',
    isPublic: true,
  },
  {
    name: 'Marklyft',
    nameEn: 'Deadlift',
    category: 'STRENGTH' as const,
    muscleGroup: 'Ben',
    description: 'Helkroppsövning med fokus på bakre kedjan',
    instructions: '1. Stå med fötterna höftbrett\n2. Böj i höften och grip stången\n3. Håll ryggen rak\n4. Lyft genom att sträcka höfter och knän',
    equipment: 'Skivstång',
    difficulty: 'Advanced',
    videoUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q',
    isPublic: true,
  },
  {
    name: 'Utfallssteg',
    nameEn: 'Lunges',
    category: 'STRENGTH' as const,
    muscleGroup: 'Ben',
    description: 'Enbensstyrka för löpare',
    instructions: '1. Steg framåt med ett ben\n2. Sänk bakre knät mot golvet\n3. Pressa upp till startposition',
    equipment: 'Hantlar (valfritt)',
    difficulty: 'Beginner',
    videoUrl: 'https://www.youtube.com/watch?v=QOVaHwm-Q6U',
    isPublic: true,
  },
  {
    name: 'Rumänsk marklyft',
    nameEn: 'Romanian Deadlift',
    category: 'STRENGTH' as const,
    muscleGroup: 'Ben',
    description: 'Isolerar hases och gluteus',
    instructions: '1. Håll stången med raka armar\n2. Böj i höften med lätt böjda knän\n3. Känn stretch i hases\n4. Återgå till startposition',
    equipment: 'Skivstång',
    difficulty: 'Intermediate',
    isPublic: true,
  },

  // ==================== STRENGTH - Upper Body ====================
  {
    name: 'Bänkpress',
    nameEn: 'Bench Press',
    category: 'STRENGTH' as const,
    muscleGroup: 'Överkropp',
    description: 'Grundövning för bröst och triceps',
    instructions: '1. Ligg på bänk\n2. Grip stången något bredare än axelbredd\n3. Sänk till bröstet\n4. Pressa upp',
    equipment: 'Skivstång, bänk',
    difficulty: 'Intermediate',
    videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
    isPublic: true,
  },
  {
    name: 'Rodd',
    nameEn: 'Barbell Row',
    category: 'STRENGTH' as const,
    muscleGroup: 'Överkropp',
    description: 'Stärker rygg och baksida axlar',
    instructions: '1. Böj framåt i höften\n2. Grip stången\n3. Dra mot mage\n4. Håll armbågarna nära kroppen',
    equipment: 'Skivstång',
    difficulty: 'Intermediate',
    videoUrl: 'https://www.youtube.com/watch?v=2yquMvCEgHs',
    isPublic: true,
  },
  {
    name: 'Chins',
    nameEn: 'Pull-ups/Chin-ups',
    category: 'STRENGTH' as const,
    muscleGroup: 'Överkropp',
    description: 'Drar hela kroppsvikten för ryggstyrka',
    instructions: '1. Häng i stång\n2. Dra dig uppåt\n3. Hakan över stången\n4. Kontrollerad nedgång',
    equipment: 'Chin-up bar',
    difficulty: 'Advanced',
    isPublic: true,
  },
  {
    name: 'Axelpress',
    nameEn: 'Overhead Press',
    category: 'STRENGTH' as const,
    muscleGroup: 'Överkropp',
    description: 'Bygger axelstyrka',
    instructions: '1. Stå med stången vid axelhöjd\n2. Pressa rakt uppåt\n3. Lås ut armarna\n4. Sänk kontrollerat',
    equipment: 'Skivstång',
    difficulty: 'Intermediate',
    isPublic: true,
  },

  // ==================== PLYOMETRIC ====================
  {
    name: 'Lådhopp',
    nameEn: 'Box Jumps',
    category: 'PLYOMETRIC' as const,
    muscleGroup: 'Ben',
    description: 'Explosiv kraft för ben',
    instructions: '1. Stå framför låda\n2. Svinga armarna och hoppa upp\n3. Landa mjukt på lådan\n4. Kliv ner',
    equipment: 'Plyobox',
    difficulty: 'Intermediate',
    videoUrl: 'https://www.youtube.com/watch?v=hxldG9FX4j4',
    isPublic: true,
  },
  {
    name: 'Depth Jumps',
    nameEn: 'Depth Jumps',
    category: 'PLYOMETRIC' as const,
    muscleGroup: 'Ben',
    description: 'Maximal explosiv kraft',
    instructions: '1. Stå på låda\n2. Kliv av och landa mjukt\n3. Hoppa omedelbart maximalt uppåt',
    equipment: 'Plyobox',
    difficulty: 'Advanced',
    isPublic: true,
  },
  {
    name: 'Enbenhopp',
    nameEn: 'Single-Leg Bounds',
    category: 'PLYOMETRIC' as const,
    muscleGroup: 'Ben',
    description: 'Löpspecifik plyometri',
    instructions: '1. Hoppa framåt på ett ben\n2. Maximalt avstånd per hopp\n3. Mjuk landning\n4. Upprepa',
    equipment: 'Ingen',
    difficulty: 'Intermediate',
    isPublic: true,
  },
  {
    name: 'Hoppande utfall',
    nameEn: 'Jump Lunges',
    category: 'PLYOMETRIC' as const,
    muscleGroup: 'Ben',
    description: 'Explosivitet i utfallsposition',
    instructions: '1. Utfallsställning\n2. Hoppa och byt ben i luften\n3. Landa i utfall\n4. Upprepa',
    equipment: 'Ingen',
    difficulty: 'Intermediate',
    isPublic: true,
  },
  {
    name: 'Bred hopp',
    nameEn: 'Broad Jump',
    category: 'PLYOMETRIC' as const,
    muscleGroup: 'Ben',
    description: 'Horisontell explosivitet',
    instructions: '1. Stå med fötterna axelbrett\n2. Svinga armarna och hoppa framåt\n3. Landa mjukt\n4. Mät avstånd',
    equipment: 'Ingen',
    difficulty: 'Beginner',
    isPublic: true,
  },

  // ==================== CORE ====================
  {
    name: 'Plank',
    nameEn: 'Plank',
    category: 'CORE' as const,
    muscleGroup: 'Core',
    description: 'Isometrisk corestyrka',
    instructions: '1. Stöd på underarmar och tår\n2. Håll kroppen rak\n3. Spänn mage och skinkor\n4. Håll position',
    equipment: 'Ingen',
    difficulty: 'Beginner',
    videoUrl: 'https://www.youtube.com/watch?v=ASdvN_XEl_c',
    isPublic: true,
  },
  {
    name: 'Sidplank',
    nameEn: 'Side Plank',
    category: 'CORE' as const,
    muscleGroup: 'Core',
    description: 'Lateral corestabilitet',
    instructions: '1. Ligg på sidan\n2. Stöd på underarm\n3. Lyft höften från golvet\n4. Håll kroppen rak',
    equipment: 'Ingen',
    difficulty: 'Intermediate',
    isPublic: true,
  },
  {
    name: 'Dead Bug',
    nameEn: 'Dead Bug',
    category: 'CORE' as const,
    muscleGroup: 'Core',
    description: 'Anti-extension corestyrka',
    instructions: '1. Ligg på rygg\n2. Armar rakt upp, knän i 90 grader\n3. Sträck motsatt arm och ben\n4. Återgå till startposition\n5. Växla sida',
    equipment: 'Ingen',
    difficulty: 'Beginner',
    videoUrl: 'https://www.youtube.com/watch?v=g_BYB0R-4Ws',
    isPublic: true,
  },
  {
    name: 'Bird Dog',
    nameEn: 'Bird Dog',
    category: 'CORE' as const,
    muscleGroup: 'Core',
    description: 'Corestabilitet och balans',
    instructions: '1. På alla fyra\n2. Sträck motsatt arm och ben\n3. Håll ryggen rak\n4. Växla sida',
    equipment: 'Ingen',
    difficulty: 'Beginner',
    isPublic: true,
  },
  {
    name: 'Pallof Press',
    nameEn: 'Pallof Press',
    category: 'CORE' as const,
    muscleGroup: 'Core',
    description: 'Anti-rotation corestyrka',
    instructions: '1. Stå sidledes mot kabel/band\n2. Håll handtag vid bröstet\n3. Pressa rakt framåt\n4. Motstå rotationen',
    equipment: 'Kabel eller gummiband',
    difficulty: 'Intermediate',
    videoUrl: 'https://www.youtube.com/watch?v=AH_QZLm_0-s',
    isPublic: true,
  },
  {
    name: 'Russian Twist',
    nameEn: 'Russian Twist',
    category: 'CORE' as const,
    muscleGroup: 'Core',
    description: 'Rotationsstyrka',
    instructions: '1. Sitt med fötterna i luften\n2. Luta bakåt något\n3. Rotera från sida till sida\n4. Vidrör golvet på varje sida',
    equipment: 'Viktskiva (valfritt)',
    difficulty: 'Intermediate',
    isPublic: true,
  },
  {
    name: 'Benlyft',
    nameEn: 'Leg Raises',
    category: 'CORE' as const,
    muscleGroup: 'Core',
    description: 'Nedre magmuskler',
    instructions: '1. Ligg på rygg\n2. Lyft raka ben upp\n3. Sänk kontrollerat\n4. Håll ländryggen mot golvet',
    equipment: 'Ingen',
    difficulty: 'Intermediate',
    isPublic: true,
  },
  {
    name: 'Mountain Climbers',
    nameEn: 'Mountain Climbers',
    category: 'CORE' as const,
    muscleGroup: 'Core',
    description: 'Dynamisk corestyrka',
    instructions: '1. Planposition\n2. Dra knä mot bröstet\n3. Växla ben snabbt\n4. Håll höfterna nere',
    equipment: 'Ingen',
    difficulty: 'Beginner',
    isPublic: true,
  },
]

async function main() {
  console.log('Seeding exercise library...')

  for (const exercise of exercises) {
    // Check if exercise already exists
    const existing = await prisma.exercise.findFirst({
      where: { name: exercise.name, coachId: null },
    })

    if (existing) {
      console.log(`Exercise already exists: ${exercise.name}`)
      continue
    }

    const created = await prisma.exercise.create({
      data: {
        ...exercise,
        nameSv: exercise.name,
      },
    })
    console.log(`Created exercise: ${created.name}`)
  }

  console.log('Exercise library seeding complete!')
  console.log(`Total exercises: ${exercises.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
