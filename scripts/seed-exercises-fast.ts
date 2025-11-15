// Fast exercise seeder using createMany
import { PrismaClient, WorkoutType } from '@prisma/client'

const prisma = new PrismaClient()

const exercises = [
  // STRENGTH - Lower Body
  { name: 'Knäböj', nameSv: 'Knäböj', nameEn: 'Squat', category: 'STRENGTH' as WorkoutType, muscleGroup: 'Ben', description: 'Grundläggande styrkeövning för ben och höfter', equipment: 'Skivstång, rack', difficulty: 'Intermediate', isPublic: true },
  { name: 'Marklyft', nameSv: 'Marklyft', nameEn: 'Deadlift', category: 'STRENGTH' as WorkoutType, muscleGroup: 'Ben', description: 'Helkroppsövning med fokus på bakre kedjan', equipment: 'Skivstång', difficulty: 'Advanced', isPublic: true },
  { name: 'Utfallssteg', nameSv: 'Utfallssteg', nameEn: 'Lunges', category: 'STRENGTH' as WorkoutType, muscleGroup: 'Ben', description: 'Enbensstyrka för löpare', equipment: 'Hantlar (valfritt)', difficulty: 'Beginner', isPublic: true },
  { name: 'Rumänsk marklyft', nameSv: 'Rumänsk marklyft', nameEn: 'Romanian Deadlift', category: 'STRENGTH' as WorkoutType, muscleGroup: 'Ben', description: 'Isolerar hases och gluteus', equipment: 'Skivstång', difficulty: 'Intermediate', isPublic: true },

  // STRENGTH - Upper Body
  { name: 'Bänkpress', nameSv: 'Bänkpress', nameEn: 'Bench Press', category: 'STRENGTH' as WorkoutType, muscleGroup: 'Överkropp', description: 'Grundövning för bröst och triceps', equipment: 'Skivstång, bänk', difficulty: 'Intermediate', isPublic: true },
  { name: 'Rodd', nameSv: 'Rodd', nameEn: 'Barbell Row', category: 'STRENGTH' as WorkoutType, muscleGroup: 'Överkropp', description: 'Stärker rygg och baksida axlar', equipment: 'Skivstång', difficulty: 'Intermediate', isPublic: true },
  { name: 'Chins', nameSv: 'Chins', nameEn: 'Pull-ups', category: 'STRENGTH' as WorkoutType, muscleGroup: 'Överkropp', description: 'Vertikal dragövning', equipment: 'Chinsstång', difficulty: 'Advanced', isPublic: true },
  { name: 'Axelpress', nameSv: 'Axelpress', nameEn: 'Overhead Press', category: 'STRENGTH' as WorkoutType, muscleGroup: 'Överkropp', description: 'Axelstyrka', equipment: 'Skivstång', difficulty: 'Intermediate', isPublic: true },

  // PLYOMETRIC
  { name: 'Lådhopp', nameSv: 'Lådhopp', nameEn: 'Box Jumps', category: 'PLYOMETRIC' as WorkoutType, muscleGroup: 'Ben', description: 'Explosiv styrka', equipment: 'Plyolåda', difficulty: 'Intermediate', isPublic: true },
  { name: 'Depth Jumps', nameSv: 'Depth Jumps', nameEn: 'Depth Jumps', category: 'PLYOMETRIC' as WorkoutType, muscleGroup: 'Ben', description: 'Reaktiv styrka', equipment: 'Låda', difficulty: 'Advanced', isPublic: true },
  { name: 'Enbenhopp', nameSv: 'Enbenhopp', nameEn: 'Single Leg Hops', category: 'PLYOMETRIC' as WorkoutType, muscleGroup: 'Ben', description: 'Enbensstyrka och stabilitet', equipment: 'Ingen', difficulty: 'Intermediate', isPublic: true },
  { name: 'Broad Jump', nameSv: 'Broad Jump', nameEn: 'Broad Jump', category: 'PLYOMETRIC' as WorkoutType, muscleGroup: 'Ben', description: 'Horisontell explosivitet', equipment: 'Ingen', difficulty: 'Intermediate', isPublic: true },

  // CORE
  { name: 'Plank', nameSv: 'Plank', nameEn: 'Plank', category: 'CORE' as WorkoutType, muscleGroup: 'Core', description: 'Corestabilitet', equipment: 'Ingen', difficulty: 'Beginner', isPublic: true },
  { name: 'Sidplank', nameSv: 'Sidplank', nameEn: 'Side Plank', category: 'CORE' as WorkoutType, muscleGroup: 'Core', description: 'Lateral corestabilitet', equipment: 'Ingen', difficulty: 'Beginner', isPublic: true },
  { name: 'Dead Bug', nameSv: 'Dead Bug', nameEn: 'Dead Bug', category: 'CORE' as WorkoutType, muscleGroup: 'Core', description: 'Anti-extension core', equipment: 'Ingen', difficulty: 'Beginner', isPublic: true },
  { name: 'Bird Dog', nameSv: 'Bird Dog', nameEn: 'Bird Dog', category: 'CORE' as WorkoutType, muscleGroup: 'Core', description: 'Corestabilitet och balans', equipment: 'Ingen', difficulty: 'Beginner', isPublic: true },
  { name: 'Pallof Press', nameSv: 'Pallof Press', nameEn: 'Pallof Press', category: 'CORE' as WorkoutType, muscleGroup: 'Core', description: 'Anti-rotation corestyrka', equipment: 'Kabel eller gummiband', difficulty: 'Intermediate', isPublic: true },
  { name: 'Russian Twist', nameSv: 'Russian Twist', nameEn: 'Russian Twist', category: 'CORE' as WorkoutType, muscleGroup: 'Core', description: 'Rotationsstyrka', equipment: 'Viktskiva (valfritt)', difficulty: 'Intermediate', isPublic: true },
  { name: 'Benlyft', nameSv: 'Benlyft', nameEn: 'Leg Raises', category: 'CORE' as WorkoutType, muscleGroup: 'Core', description: 'Nedre magmuskler', equipment: 'Ingen', difficulty: 'Intermediate', isPublic: true },
  { name: 'Mountain Climbers', nameSv: 'Mountain Climbers', nameEn: 'Mountain Climbers', category: 'CORE' as WorkoutType, muscleGroup: 'Core', description: 'Dynamisk core och kondition', equipment: 'Ingen', difficulty: 'Intermediate', isPublic: true },
]

async function main() {
  console.log('🌱 Fast seeding exercises...')

  try {
    // Delete existing public exercises
    const deleted = await prisma.exercise.deleteMany({
      where: { coachId: null }
    })
    console.log(`Deleted ${deleted.count} existing public exercises`)

    // Insert all at once
    const result = await prisma.exercise.createMany({
      data: exercises,
      skipDuplicates: true
    })

    console.log(`✅ Created ${result.count} exercises!`)

    // Verify
    const count = await prisma.exercise.count()
    console.log(`Total exercises in database: ${count}`)

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
