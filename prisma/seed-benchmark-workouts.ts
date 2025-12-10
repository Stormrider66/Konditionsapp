/**
 * Benchmark Workouts Seeder
 *
 * Seeds classic CrossFit benchmark workouts (The Girls, Hero WODs)
 * and HYROX simulation workouts.
 */

import { PrismaClient, HybridFormat, ScalingLevel } from '@prisma/client';

const prisma = new PrismaClient();

interface BenchmarkWorkout {
  name: string;
  description: string;
  format: HybridFormat;
  timeCap?: number;
  workTime?: number;
  restTime?: number;
  totalRounds?: number;
  totalMinutes?: number;
  repScheme?: string;
  scalingLevel: ScalingLevel;
  benchmarkSource: string;
  benchmarkYear?: number;
  tags: string[];
  movements: {
    exerciseName: string;
    order: number;
    reps?: number;
    calories?: number;
    distance?: number;
    duration?: number;
    weightMale?: number;
    weightFemale?: number;
  }[];
}

const benchmarkWorkouts: BenchmarkWorkout[] = [
  // ==================== THE GIRLS ====================
  {
    name: 'Fran',
    description: '21-15-9 reps, for time, of: Thrusters (43/29 kg), Pull-ups',
    format: 'FOR_TIME',
    repScheme: '21-15-9',
    scalingLevel: 'RX',
    benchmarkSource: 'The Girls',
    tags: ['benchmark', 'the-girls', 'classic'],
    movements: [
      { exerciseName: 'Thruster', order: 1, reps: 21, weightMale: 43, weightFemale: 29 },
      { exerciseName: 'Pull-Up', order: 2, reps: 21 },
      { exerciseName: 'Thruster', order: 3, reps: 15, weightMale: 43, weightFemale: 29 },
      { exerciseName: 'Pull-Up', order: 4, reps: 15 },
      { exerciseName: 'Thruster', order: 5, reps: 9, weightMale: 43, weightFemale: 29 },
      { exerciseName: 'Pull-Up', order: 6, reps: 9 },
    ],
  },
  {
    name: 'Grace',
    description: '30 Clean & Jerks for time (61/43 kg)',
    format: 'FOR_TIME',
    scalingLevel: 'RX',
    benchmarkSource: 'The Girls',
    tags: ['benchmark', 'the-girls', 'classic', 'olympic-lift'],
    movements: [
      { exerciseName: 'Clean & Jerk', order: 1, reps: 30, weightMale: 61, weightFemale: 43 },
    ],
  },
  {
    name: 'Isabel',
    description: '30 Snatches for time (61/43 kg)',
    format: 'FOR_TIME',
    scalingLevel: 'RX',
    benchmarkSource: 'The Girls',
    tags: ['benchmark', 'the-girls', 'classic', 'olympic-lift'],
    movements: [
      { exerciseName: 'Snatch', order: 1, reps: 30, weightMale: 61, weightFemale: 43 },
    ],
  },
  {
    name: 'Helen',
    description: '3 rounds for time: 400m run, 21 KB swings (24/16 kg), 12 pull-ups',
    format: 'FOR_TIME',
    totalRounds: 3,
    scalingLevel: 'RX',
    benchmarkSource: 'The Girls',
    tags: ['benchmark', 'the-girls', 'classic'],
    movements: [
      { exerciseName: 'Run', order: 1, distance: 400 },
      { exerciseName: 'Kettlebell Swing', order: 2, reps: 21, weightMale: 24, weightFemale: 16 },
      { exerciseName: 'Pull-Up', order: 3, reps: 12 },
    ],
  },
  {
    name: 'Diane',
    description: '21-15-9 reps, for time, of: Deadlifts (102/70 kg), Handstand Push-ups',
    format: 'FOR_TIME',
    repScheme: '21-15-9',
    scalingLevel: 'RX',
    benchmarkSource: 'The Girls',
    tags: ['benchmark', 'the-girls', 'classic'],
    movements: [
      { exerciseName: 'Deadlift', order: 1, reps: 21, weightMale: 102, weightFemale: 70 },
      { exerciseName: 'Handstand Push-Up', order: 2, reps: 21 },
      { exerciseName: 'Deadlift', order: 3, reps: 15, weightMale: 102, weightFemale: 70 },
      { exerciseName: 'Handstand Push-Up', order: 4, reps: 15 },
      { exerciseName: 'Deadlift', order: 5, reps: 9, weightMale: 102, weightFemale: 70 },
      { exerciseName: 'Handstand Push-Up', order: 6, reps: 9 },
    ],
  },
  {
    name: 'Elizabeth',
    description: '21-15-9 reps, for time, of: Cleans (61/43 kg), Ring Dips',
    format: 'FOR_TIME',
    repScheme: '21-15-9',
    scalingLevel: 'RX',
    benchmarkSource: 'The Girls',
    tags: ['benchmark', 'the-girls', 'classic'],
    movements: [
      { exerciseName: 'Clean', order: 1, reps: 21, weightMale: 61, weightFemale: 43 },
      { exerciseName: 'Ring Dip', order: 2, reps: 21 },
      { exerciseName: 'Clean', order: 3, reps: 15, weightMale: 61, weightFemale: 43 },
      { exerciseName: 'Ring Dip', order: 4, reps: 15 },
      { exerciseName: 'Clean', order: 5, reps: 9, weightMale: 61, weightFemale: 43 },
      { exerciseName: 'Ring Dip', order: 6, reps: 9 },
    ],
  },
  {
    name: 'Cindy',
    description: '20 min AMRAP: 5 Pull-ups, 10 Push-ups, 15 Air Squats',
    format: 'AMRAP',
    totalMinutes: 20,
    scalingLevel: 'RX',
    benchmarkSource: 'The Girls',
    tags: ['benchmark', 'the-girls', 'classic', 'bodyweight'],
    movements: [
      { exerciseName: 'Pull-Up', order: 1, reps: 5 },
      { exerciseName: 'Push-Up', order: 2, reps: 10 },
      { exerciseName: 'Air Squat', order: 3, reps: 15 },
    ],
  },
  {
    name: 'Mary',
    description: '20 min AMRAP: 5 HSPU, 10 Pistols, 15 Pull-ups',
    format: 'AMRAP',
    totalMinutes: 20,
    scalingLevel: 'RX',
    benchmarkSource: 'The Girls',
    tags: ['benchmark', 'the-girls', 'classic', 'gymnastics'],
    movements: [
      { exerciseName: 'Handstand Push-Up', order: 1, reps: 5 },
      { exerciseName: 'Pistol Squat', order: 2, reps: 10 },
      { exerciseName: 'Pull-Up', order: 3, reps: 15 },
    ],
  },
  {
    name: 'Annie',
    description: '50-40-30-20-10 reps for time: Double Unders, Sit-ups',
    format: 'FOR_TIME',
    repScheme: '50-40-30-20-10',
    scalingLevel: 'RX',
    benchmarkSource: 'The Girls',
    tags: ['benchmark', 'the-girls', 'classic'],
    movements: [
      { exerciseName: 'Double Under', order: 1, reps: 50 },
      { exerciseName: 'Sit-Up', order: 2, reps: 50 },
      { exerciseName: 'Double Under', order: 3, reps: 40 },
      { exerciseName: 'Sit-Up', order: 4, reps: 40 },
      { exerciseName: 'Double Under', order: 5, reps: 30 },
      { exerciseName: 'Sit-Up', order: 6, reps: 30 },
      { exerciseName: 'Double Under', order: 7, reps: 20 },
      { exerciseName: 'Sit-Up', order: 8, reps: 20 },
      { exerciseName: 'Double Under', order: 9, reps: 10 },
      { exerciseName: 'Sit-Up', order: 10, reps: 10 },
    ],
  },
  {
    name: 'Karen',
    description: '150 Wall Balls for time (9/6 kg)',
    format: 'FOR_TIME',
    scalingLevel: 'RX',
    benchmarkSource: 'The Girls',
    tags: ['benchmark', 'the-girls', 'classic'],
    movements: [
      { exerciseName: 'Wall Ball', order: 1, reps: 150, weightMale: 9, weightFemale: 6 },
    ],
  },
  {
    name: 'Jackie',
    description: 'For time: 1000m Row, 50 Thrusters (20/15 kg), 30 Pull-ups',
    format: 'FOR_TIME',
    scalingLevel: 'RX',
    benchmarkSource: 'The Girls',
    tags: ['benchmark', 'the-girls', 'classic'],
    movements: [
      { exerciseName: 'Row (Meters)', order: 1, distance: 1000 },
      { exerciseName: 'Thruster', order: 2, reps: 50, weightMale: 20, weightFemale: 15 },
      { exerciseName: 'Pull-Up', order: 3, reps: 30 },
    ],
  },
  {
    name: 'Nancy',
    description: '5 rounds for time: 400m run, 15 overhead squats (43/29 kg)',
    format: 'FOR_TIME',
    totalRounds: 5,
    scalingLevel: 'RX',
    benchmarkSource: 'The Girls',
    tags: ['benchmark', 'the-girls', 'classic'],
    movements: [
      { exerciseName: 'Run', order: 1, distance: 400 },
      { exerciseName: 'Overhead Squat', order: 2, reps: 15, weightMale: 43, weightFemale: 29 },
    ],
  },
  {
    name: 'Kelly',
    description: '5 rounds for time: 400m run, 30 box jumps (24/20"), 30 wall balls (9/6 kg)',
    format: 'FOR_TIME',
    totalRounds: 5,
    scalingLevel: 'RX',
    benchmarkSource: 'The Girls',
    tags: ['benchmark', 'the-girls', 'classic'],
    movements: [
      { exerciseName: 'Run', order: 1, distance: 400 },
      { exerciseName: 'Box Jump', order: 2, reps: 30 },
      { exerciseName: 'Wall Ball', order: 3, reps: 30, weightMale: 9, weightFemale: 6 },
    ],
  },

  // ==================== HERO WODS ====================
  {
    name: 'Murph',
    description: 'For time: 1 mile run, 100 pull-ups, 200 push-ups, 300 air squats, 1 mile run. Partition as needed. Wear 20/14 lb vest.',
    format: 'FOR_TIME',
    scalingLevel: 'RX',
    benchmarkSource: 'Hero WOD',
    tags: ['benchmark', 'hero-wod', 'memorial-day'],
    movements: [
      { exerciseName: 'Run', order: 1, distance: 1600 },
      { exerciseName: 'Pull-Up', order: 2, reps: 100 },
      { exerciseName: 'Push-Up', order: 3, reps: 200 },
      { exerciseName: 'Air Squat', order: 4, reps: 300 },
      { exerciseName: 'Run', order: 5, distance: 1600 },
    ],
  },
  {
    name: 'DT',
    description: '5 rounds for time: 12 Deadlifts (70/47 kg), 9 Hang Power Cleans, 6 Push Jerks',
    format: 'FOR_TIME',
    totalRounds: 5,
    scalingLevel: 'RX',
    benchmarkSource: 'Hero WOD',
    tags: ['benchmark', 'hero-wod', 'barbell'],
    movements: [
      { exerciseName: 'Deadlift', order: 1, reps: 12, weightMale: 70, weightFemale: 47 },
      { exerciseName: 'Hang Power Clean', order: 2, reps: 9, weightMale: 70, weightFemale: 47 },
      { exerciseName: 'Push Jerk', order: 3, reps: 6, weightMale: 70, weightFemale: 47 },
    ],
  },
  {
    name: 'Nate',
    description: '20 min AMRAP: 2 Muscle-ups, 4 HSPU, 8 KB Swings (32/24 kg)',
    format: 'AMRAP',
    totalMinutes: 20,
    scalingLevel: 'RX',
    benchmarkSource: 'Hero WOD',
    tags: ['benchmark', 'hero-wod', 'gymnastics'],
    movements: [
      { exerciseName: 'Muscle-Up (Ring)', order: 1, reps: 2 },
      { exerciseName: 'Handstand Push-Up', order: 2, reps: 4 },
      { exerciseName: 'Kettlebell Swing', order: 3, reps: 8, weightMale: 32, weightFemale: 24 },
    ],
  },
  {
    name: 'Joshie',
    description: '21-15-9 reps for time: SDHP (43/29 kg), Burpees, Run 200m after each round',
    format: 'FOR_TIME',
    repScheme: '21-15-9',
    scalingLevel: 'RX',
    benchmarkSource: 'Hero WOD',
    tags: ['benchmark', 'hero-wod'],
    movements: [
      { exerciseName: 'Sumo Deadlift High Pull', order: 1, reps: 21, weightMale: 43, weightFemale: 29 },
      { exerciseName: 'Burpee', order: 2, reps: 21 },
      { exerciseName: 'Run', order: 3, distance: 200 },
      { exerciseName: 'Sumo Deadlift High Pull', order: 4, reps: 15, weightMale: 43, weightFemale: 29 },
      { exerciseName: 'Burpee', order: 5, reps: 15 },
      { exerciseName: 'Run', order: 6, distance: 200 },
      { exerciseName: 'Sumo Deadlift High Pull', order: 7, reps: 9, weightMale: 43, weightFemale: 29 },
      { exerciseName: 'Burpee', order: 8, reps: 9 },
      { exerciseName: 'Run', order: 9, distance: 200 },
    ],
  },

  // ==================== CROSSFIT OPEN WORKOUTS ====================
  {
    name: 'Open 23.1',
    description: '14 min AMRAP: 60 Cal Row, 50 Toes-to-Bar, 40 Wall Balls (9/6 kg), 30 Power Cleans (61/43 kg), 20 Muscle-ups',
    format: 'AMRAP',
    totalMinutes: 14,
    scalingLevel: 'RX',
    benchmarkSource: 'CrossFit Open',
    benchmarkYear: 2023,
    tags: ['benchmark', 'open', '2023'],
    movements: [
      { exerciseName: 'Row (Calories)', order: 1, calories: 60 },
      { exerciseName: 'Toes-to-Bar', order: 2, reps: 50 },
      { exerciseName: 'Wall Ball', order: 3, reps: 40, weightMale: 9, weightFemale: 6 },
      { exerciseName: 'Power Clean', order: 4, reps: 30, weightMale: 61, weightFemale: 43 },
      { exerciseName: 'Muscle-Up (Ring)', order: 5, reps: 20 },
    ],
  },

  // ==================== HYROX SIMULATION ====================
  {
    name: 'HYROX Simulation',
    description: 'Full HYROX race simulation: 8 x 1km runs with stations between each run',
    format: 'HYROX_SIM',
    scalingLevel: 'RX',
    benchmarkSource: 'HYROX',
    tags: ['benchmark', 'hyrox', 'simulation', 'full-race'],
    movements: [
      // Run 1 + SkiErg
      { exerciseName: 'Run', order: 1, distance: 1000 },
      { exerciseName: 'Ski Erg (Meters)', order: 2, distance: 1000 },
      // Run 2 + Sled Push
      { exerciseName: 'Run', order: 3, distance: 1000 },
      { exerciseName: 'Sled Push (HYROX)', order: 4, distance: 50 },
      // Run 3 + Sled Pull
      { exerciseName: 'Run', order: 5, distance: 1000 },
      { exerciseName: 'Sled Pull (HYROX)', order: 6, distance: 50 },
      // Run 4 + Burpee Broad Jumps
      { exerciseName: 'Run', order: 7, distance: 1000 },
      { exerciseName: 'Burpee Broad Jump', order: 8, distance: 80 },
      // Run 5 + Row
      { exerciseName: 'Run', order: 9, distance: 1000 },
      { exerciseName: 'Rowing (HYROX)', order: 10, distance: 1000 },
      // Run 6 + Farmers Carry
      { exerciseName: 'Run', order: 11, distance: 1000 },
      { exerciseName: 'Farmers Carry (HYROX)', order: 12, distance: 200 },
      // Run 7 + Sandbag Lunges
      { exerciseName: 'Run', order: 13, distance: 1000 },
      { exerciseName: 'Sandbag Lunges (HYROX)', order: 14, distance: 100 },
      // Run 8 + Wall Balls
      { exerciseName: 'Run', order: 15, distance: 1000 },
      { exerciseName: 'Wall Balls (HYROX)', order: 16, reps: 100 },
    ],
  },
  {
    name: 'HYROX Half',
    description: 'Half HYROX simulation: 4 stations with runs',
    format: 'HYROX_SIM',
    scalingLevel: 'RX',
    benchmarkSource: 'HYROX',
    tags: ['benchmark', 'hyrox', 'simulation', 'half'],
    movements: [
      { exerciseName: 'Run', order: 1, distance: 1000 },
      { exerciseName: 'Ski Erg (Meters)', order: 2, distance: 1000 },
      { exerciseName: 'Run', order: 3, distance: 1000 },
      { exerciseName: 'Sled Push (HYROX)', order: 4, distance: 50 },
      { exerciseName: 'Run', order: 5, distance: 1000 },
      { exerciseName: 'Rowing (HYROX)', order: 6, distance: 1000 },
      { exerciseName: 'Run', order: 7, distance: 1000 },
      { exerciseName: 'Wall Balls (HYROX)', order: 8, reps: 75 },
    ],
  },

  // ==================== EMOM WORKOUTS ====================
  {
    name: 'Death by Thrusters',
    description: 'EMOM until failure: 1 thruster min 1, 2 thrusters min 2, etc. (43/29 kg)',
    format: 'EMOM',
    scalingLevel: 'RX',
    benchmarkSource: 'CrossFit',
    tags: ['benchmark', 'emom', 'death-by'],
    movements: [
      { exerciseName: 'Thruster', order: 1, reps: 1, weightMale: 43, weightFemale: 29 },
    ],
  },
  {
    name: 'Death by Burpees',
    description: 'EMOM until failure: 1 burpee min 1, 2 burpees min 2, etc.',
    format: 'EMOM',
    scalingLevel: 'RX',
    benchmarkSource: 'CrossFit',
    tags: ['benchmark', 'emom', 'death-by', 'bodyweight'],
    movements: [
      { exerciseName: 'Burpee', order: 1, reps: 1 },
    ],
  },
  {
    name: '10 Min EMOM',
    description: '10 min EMOM: 10 Wall Balls (9/6 kg), 5 Burpees',
    format: 'EMOM',
    totalMinutes: 10,
    scalingLevel: 'RX',
    benchmarkSource: 'CrossFit',
    tags: ['emom', 'conditioning'],
    movements: [
      { exerciseName: 'Wall Ball', order: 1, reps: 10, weightMale: 9, weightFemale: 6 },
      { exerciseName: 'Burpee', order: 2, reps: 5 },
    ],
  },

  // ==================== TABATA ====================
  {
    name: 'Tabata Something Else',
    description: '32 rounds of 20s work/10s rest: 8 Pull-ups, 8 Push-ups, 8 Sit-ups, 8 Air Squats',
    format: 'TABATA',
    workTime: 20,
    restTime: 10,
    totalRounds: 32,
    scalingLevel: 'RX',
    benchmarkSource: 'CrossFit',
    tags: ['benchmark', 'tabata', 'bodyweight'],
    movements: [
      { exerciseName: 'Pull-Up', order: 1, reps: 8 },
      { exerciseName: 'Push-Up', order: 2, reps: 8 },
      { exerciseName: 'Sit-Up', order: 3, reps: 8 },
      { exerciseName: 'Air Squat', order: 4, reps: 8 },
    ],
  },

  // ==================== CHIPPER ====================
  {
    name: 'Filthy Fifty',
    description: 'For time: 50 box jumps, 50 jumping pull-ups, 50 KB swings, 50 walking lunges, 50 K2E, 50 push press, 50 back extensions, 50 wall balls, 50 burpees, 50 double unders',
    format: 'CHIPPER',
    scalingLevel: 'RX',
    benchmarkSource: 'CrossFit',
    tags: ['benchmark', 'chipper', 'classic'],
    movements: [
      { exerciseName: 'Box Jump', order: 1, reps: 50 },
      { exerciseName: 'Pull-Up', order: 2, reps: 50 },
      { exerciseName: 'Kettlebell Swing', order: 3, reps: 50, weightMale: 16, weightFemale: 12 },
      { exerciseName: 'Walking Lunge', order: 4, reps: 50 },
      { exerciseName: 'Knees-to-Elbow', order: 5, reps: 50 },
      { exerciseName: 'Push Press', order: 6, reps: 50, weightMale: 20, weightFemale: 15 },
      { exerciseName: 'Back Extension', order: 7, reps: 50 },
      { exerciseName: 'Wall Ball', order: 8, reps: 50, weightMale: 9, weightFemale: 6 },
      { exerciseName: 'Burpee', order: 9, reps: 50 },
      { exerciseName: 'Double Under', order: 10, reps: 50 },
    ],
  },
];

async function main() {
  console.log('🏋️ Starting Benchmark Workouts Seeder...');
  console.log(`📦 Seeding ${benchmarkWorkouts.length} benchmark workouts...`);

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Build exercise name to ID map
  const exercises = await prisma.exercise.findMany({
    where: { isHybridMovement: true },
    select: { id: true, name: true },
  });

  const exerciseMap = new Map(exercises.map((e) => [e.name, e.id]));

  for (const workout of benchmarkWorkouts) {
    // Check if workout already exists
    const existing = await prisma.hybridWorkout.findFirst({
      where: {
        name: workout.name,
        isBenchmark: true,
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Map exercise names to IDs
    const movementsWithIds = [];
    let hasAllExercises = true;

    for (const m of workout.movements) {
      const exerciseId = exerciseMap.get(m.exerciseName);
      if (!exerciseId) {
        errors.push(`Exercise not found: "${m.exerciseName}" in workout "${workout.name}"`);
        hasAllExercises = false;
        break;
      }
      movementsWithIds.push({
        ...m,
        exerciseId,
      });
    }

    if (!hasAllExercises) {
      continue;
    }

    try {
      await prisma.hybridWorkout.create({
        data: {
          name: workout.name,
          description: workout.description,
          format: workout.format,
          timeCap: workout.timeCap,
          workTime: workout.workTime,
          restTime: workout.restTime,
          totalRounds: workout.totalRounds,
          totalMinutes: workout.totalMinutes,
          repScheme: workout.repScheme,
          scalingLevel: workout.scalingLevel,
          isBenchmark: true,
          benchmarkSource: workout.benchmarkSource,
          benchmarkYear: workout.benchmarkYear,
          isPublic: true,
          tags: workout.tags,
          movements: {
            create: movementsWithIds.map((m) => ({
              exerciseId: m.exerciseId,
              order: m.order,
              reps: m.reps,
              calories: m.calories,
              distance: m.distance,
              duration: m.duration,
              weightMale: m.weightMale,
              weightFemale: m.weightFemale,
            })),
          },
        },
      });
      created++;
      console.log(`  ✅ Created: ${workout.name}`);
    } catch (error) {
      errors.push(`Failed to create "${workout.name}": ${error}`);
    }
  }

  console.log('\n📊 Seeding Summary:');
  console.log(`  ✅ Created: ${created}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  if (errors.length > 0) {
    console.log(`  ❌ Errors: ${errors.length}`);
    errors.forEach((e) => console.log(`     - ${e}`));
  }
  console.log('\n🎉 Benchmark workouts seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding benchmark workouts:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
