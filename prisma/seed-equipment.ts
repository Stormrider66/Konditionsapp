// prisma/seed-equipment.ts
// Run with: npx ts-node prisma/seed-equipment.ts

import { PrismaClient, EquipmentCategory } from '@prisma/client'

const prisma = new PrismaClient()

interface EquipmentSeed {
  name: string
  nameSv: string
  category: EquipmentCategory
  brand?: string
  description?: string
  enablesTests: string[]
  enablesExercises: string[]
}

const equipmentCatalog: EquipmentSeed[] = [
  // ==================== CARDIO MACHINES ====================
  {
    name: 'Concept2 RowErg',
    nameSv: 'Concept2 Roddmaskin',
    category: 'CARDIO_MACHINE',
    brand: 'Concept2',
    description: 'Air resistance rowing machine with PM5 monitor',
    enablesTests: ['rowing_2k', 'rowing_1k', 'rowing_cp', 'rowing_intervals'],
    enablesExercises: ['rowing', 'row_intervals', 'row_steady_state']
  },
  {
    name: 'Concept2 SkiErg',
    nameSv: 'Concept2 SkiErg',
    category: 'CARDIO_MACHINE',
    brand: 'Concept2',
    description: 'Air resistance double-pole skiing machine',
    enablesTests: ['skiing_1k', 'skiing_2k', 'skiing_cp'],
    enablesExercises: ['skierg', 'skierg_intervals', 'skierg_steady_state']
  },
  {
    name: 'Concept2 BikeErg',
    nameSv: 'Concept2 BikeErg',
    category: 'CARDIO_MACHINE',
    brand: 'Concept2',
    description: 'Air resistance stationary bike',
    enablesTests: ['cycling_cp', 'cycling_ftp'],
    enablesExercises: ['bikeerg', 'cycling_intervals']
  },
  {
    name: 'Wattbike Atom',
    nameSv: 'Wattbike Atom',
    category: 'CARDIO_MACHINE',
    brand: 'Wattbike',
    description: 'Electromagnetic resistance smart bike',
    enablesTests: ['cycling_ftp', 'cycling_ramp', 'cycling_6s_power'],
    enablesExercises: ['wattbike', 'cycling_intervals', 'cycling_steady_state']
  },
  {
    name: 'Assault Bike',
    nameSv: 'Assault Bike',
    category: 'CARDIO_MACHINE',
    brand: 'Assault Fitness',
    description: 'Fan bike with arm and leg resistance',
    enablesTests: ['airbike_10min', 'airbike_calories'],
    enablesExercises: ['assault_bike', 'airbike_intervals', 'airbike_steady_state']
  },
  {
    name: 'Treadmill',
    nameSv: 'Löpband',
    category: 'CARDIO_MACHINE',
    description: 'Running/walking machine with incline adjustment',
    enablesTests: ['running_lactate', 'running_vo2max'],
    enablesExercises: ['treadmill_run', 'treadmill_walk', 'incline_walking']
  },
  {
    name: 'Curved Treadmill',
    nameSv: 'Självdriven Löpband',
    category: 'CARDIO_MACHINE',
    description: 'Self-powered curved running surface',
    enablesTests: [],
    enablesExercises: ['curved_treadmill_run', 'sled_push_alternative']
  },
  {
    name: 'Stair Climber',
    nameSv: 'Trappmaskin',
    category: 'CARDIO_MACHINE',
    description: 'Stair climbing machine',
    enablesTests: [],
    enablesExercises: ['stair_climb', 'step_intervals']
  },
  {
    name: 'Elliptical',
    nameSv: 'Crosstrainer',
    category: 'CARDIO_MACHINE',
    description: 'Low-impact elliptical trainer',
    enablesTests: [],
    enablesExercises: ['elliptical', 'elliptical_intervals']
  },

  // ==================== STRENGTH MACHINES ====================
  {
    name: 'Cable Machine',
    nameSv: 'Kabelmaskin',
    category: 'STRENGTH_MACHINE',
    description: 'Adjustable cable pulley system',
    enablesTests: [],
    enablesExercises: ['cable_row', 'cable_fly', 'tricep_pushdown', 'lat_pulldown', 'face_pull', 'cable_woodchop', 'pallof_press']
  },
  {
    name: 'Lat Pulldown Machine',
    nameSv: 'Latsdragsmaskin',
    category: 'STRENGTH_MACHINE',
    description: 'Dedicated lat pulldown station',
    enablesTests: [],
    enablesExercises: ['lat_pulldown', 'wide_grip_pulldown', 'close_grip_pulldown']
  },
  {
    name: 'Leg Press',
    nameSv: 'Benpress',
    category: 'STRENGTH_MACHINE',
    description: 'Leg press machine (45-degree or horizontal)',
    enablesTests: ['leg_press_1rm'],
    enablesExercises: ['leg_press', 'single_leg_press', 'calf_raises_leg_press']
  },
  {
    name: 'Leg Curl Machine',
    nameSv: 'Bencurlmaskin',
    category: 'STRENGTH_MACHINE',
    description: 'Seated or lying leg curl machine',
    enablesTests: [],
    enablesExercises: ['leg_curl', 'nordic_curl_assisted']
  },
  {
    name: 'Leg Extension Machine',
    nameSv: 'Benextensionsmaskin',
    category: 'STRENGTH_MACHINE',
    description: 'Seated leg extension machine',
    enablesTests: [],
    enablesExercises: ['leg_extension']
  },
  {
    name: 'Hack Squat Machine',
    nameSv: 'Hack Squat Maskin',
    category: 'STRENGTH_MACHINE',
    description: 'Machine squat with back support',
    enablesTests: [],
    enablesExercises: ['hack_squat', 'reverse_hack_squat']
  },
  {
    name: 'Smith Machine',
    nameSv: 'Smithmaskin',
    category: 'STRENGTH_MACHINE',
    description: 'Barbell on fixed vertical rails',
    enablesTests: [],
    enablesExercises: ['smith_squat', 'smith_bench_press', 'smith_shoulder_press']
  },
  {
    name: 'Hip Thrust Machine',
    nameSv: 'Hip Thrust Maskin',
    category: 'STRENGTH_MACHINE',
    description: 'Dedicated hip thrust/glute bridge machine',
    enablesTests: [],
    enablesExercises: ['hip_thrust_machine']
  },
  {
    name: 'GHD (Glute Ham Developer)',
    nameSv: 'GHD Maskin',
    category: 'STRENGTH_MACHINE',
    description: 'For GHD raises, back extensions, sit-ups',
    enablesTests: [],
    enablesExercises: ['ghd_situp', 'ghd_raise', 'back_extension', 'hip_extension']
  },
  {
    name: 'Reverse Hyper',
    nameSv: 'Reverse Hyper',
    category: 'STRENGTH_MACHINE',
    description: 'Reverse hyper extension machine',
    enablesTests: [],
    enablesExercises: ['reverse_hyper']
  },

  // ==================== FREE WEIGHTS ====================
  {
    name: 'Olympic Barbell (20kg)',
    nameSv: 'Olympisk Skivstång (20kg)',
    category: 'FREE_WEIGHTS',
    description: 'Standard 20kg Olympic barbell',
    enablesTests: ['squat_1rm', 'deadlift_1rm', 'bench_1rm'],
    enablesExercises: ['back_squat', 'front_squat', 'deadlift', 'bench_press', 'overhead_press', 'barbell_row', 'romanian_deadlift', 'power_clean', 'snatch', 'clean_and_jerk']
  },
  {
    name: 'Olympic Barbell (15kg)',
    nameSv: 'Olympisk Skivstång (15kg)',
    category: 'FREE_WEIGHTS',
    description: 'Women\'s Olympic barbell',
    enablesTests: ['squat_1rm', 'deadlift_1rm', 'bench_1rm'],
    enablesExercises: ['back_squat', 'front_squat', 'deadlift', 'bench_press', 'overhead_press', 'barbell_row']
  },
  {
    name: 'Trap Bar / Hex Bar',
    nameSv: 'Trapstång / Hexstång',
    category: 'FREE_WEIGHTS',
    description: 'Hexagonal barbell for trap bar deadlifts',
    enablesTests: ['trap_bar_deadlift_1rm'],
    enablesExercises: ['trap_bar_deadlift', 'trap_bar_shrug', 'trap_bar_carry']
  },
  {
    name: 'EZ Curl Bar',
    nameSv: 'EZ Curlstång',
    category: 'FREE_WEIGHTS',
    description: 'Curved barbell for curls and extensions',
    enablesTests: [],
    enablesExercises: ['ez_curl', 'skull_crusher', 'preacher_curl']
  },
  {
    name: 'Dumbbells (Set)',
    nameSv: 'Hantlar (Set)',
    category: 'FREE_WEIGHTS',
    description: 'Adjustable or fixed dumbbells',
    enablesTests: [],
    enablesExercises: ['dumbbell_curl', 'dumbbell_press', 'dumbbell_row', 'dumbbell_fly', 'lateral_raise', 'goblet_squat', 'dumbbell_lunge', 'dumbbell_rdl']
  },
  {
    name: 'Kettlebells (Set)',
    nameSv: 'Kettlebells (Set)',
    category: 'FREE_WEIGHTS',
    description: 'Various weights kettlebells',
    enablesTests: [],
    enablesExercises: ['kettlebell_swing', 'turkish_getup', 'goblet_squat', 'kb_clean', 'kb_snatch', 'kb_press', 'kb_windmill']
  },
  {
    name: 'Weight Plates',
    nameSv: 'Viktskivor',
    category: 'FREE_WEIGHTS',
    description: 'Bumper plates for Olympic lifting',
    enablesTests: [],
    enablesExercises: ['plate_loaded_exercises']
  },

  // ==================== RACKS ====================
  {
    name: 'Power Rack / Squat Cage',
    nameSv: 'Power Rack / Squatrack',
    category: 'RACKS',
    description: 'Full cage with safety bars and J-hooks',
    enablesTests: ['squat_1rm', 'bench_1rm'],
    enablesExercises: ['back_squat', 'front_squat', 'bench_press', 'rack_pulls', 'pin_squat']
  },
  {
    name: 'Squat Stand',
    nameSv: 'Squatställning',
    category: 'RACKS',
    description: 'Basic squat stands',
    enablesTests: [],
    enablesExercises: ['back_squat', 'front_squat', 'overhead_press']
  },
  {
    name: 'Bench Press Station',
    nameSv: 'Bänkpressstation',
    category: 'RACKS',
    description: 'Dedicated bench press with uprights',
    enablesTests: ['bench_1rm'],
    enablesExercises: ['bench_press', 'close_grip_bench']
  },
  {
    name: 'Pull-up Rig',
    nameSv: 'Pullupställning',
    category: 'RACKS',
    description: 'Pull-up bars and monkey bars',
    enablesTests: [],
    enablesExercises: ['pullup', 'chin_up', 'muscle_up', 'hanging_leg_raise', 'toes_to_bar']
  },
  {
    name: 'Dip Station',
    nameSv: 'Dipstation',
    category: 'RACKS',
    description: 'Parallel bars for dips',
    enablesTests: [],
    enablesExercises: ['dip', 'straight_bar_dip', 'ring_dip']
  },

  // ==================== TESTING EQUIPMENT ====================
  {
    name: 'Lactate Analyzer',
    nameSv: 'Laktatanalysator',
    category: 'TESTING',
    brand: 'Lactate Pro',
    description: 'Portable blood lactate meter',
    enablesTests: ['lactate_running', 'lactate_cycling', 'lactate_skiing'],
    enablesExercises: []
  },
  {
    name: 'VO2max System',
    nameSv: 'VO2max-system',
    category: 'TESTING',
    description: 'Metabolic cart for gas analysis',
    enablesTests: ['vo2max_running', 'vo2max_cycling'],
    enablesExercises: []
  },
  {
    name: 'Force Plates',
    nameSv: 'Kraftplattor',
    category: 'TESTING',
    description: 'Dual force plates for jump testing',
    enablesTests: ['cmj', 'squat_jump', 'drop_jump', 'isometric_strength'],
    enablesExercises: []
  },
  {
    name: 'Timing Gates',
    nameSv: 'Tidtagningsgrindar',
    category: 'TESTING',
    description: 'Electronic timing system for sprints',
    enablesTests: ['sprint_10m', 'sprint_20m', 'sprint_40m', 'agility_tests'],
    enablesExercises: []
  },
  {
    name: 'Heart Rate Monitors',
    nameSv: 'Pulsklockor',
    category: 'TESTING',
    description: 'Chest strap HR monitors',
    enablesTests: ['hr_zones', 'hrv_testing'],
    enablesExercises: []
  },
  {
    name: 'Body Composition Analyzer',
    nameSv: 'Kroppssammansättningsanalysator',
    category: 'TESTING',
    brand: 'InBody',
    description: 'BIA device for body composition',
    enablesTests: ['body_composition'],
    enablesExercises: []
  },
  {
    name: 'VBT Device (GymAware/Vitruve)',
    nameSv: 'VBT-enhet',
    category: 'TESTING',
    description: 'Velocity-based training sensor',
    enablesTests: ['velocity_profiling', '1rm_estimation'],
    enablesExercises: ['vbt_tracking']
  },

  // ==================== ACCESSORIES ====================
  {
    name: 'Resistance Bands (Set)',
    nameSv: 'Motståndsband (Set)',
    category: 'ACCESSORIES',
    description: 'Loop bands and long bands',
    enablesTests: [],
    enablesExercises: ['banded_exercises', 'band_pull_apart', 'banded_walks']
  },
  {
    name: 'Plyo Boxes (Set)',
    nameSv: 'Plyo Boxes (Set)',
    category: 'ACCESSORIES',
    description: 'Wooden or foam plyo boxes',
    enablesTests: ['box_jump_height'],
    enablesExercises: ['box_jump', 'step_up', 'box_squat', 'depth_jump']
  },
  {
    name: 'Medicine Balls',
    nameSv: 'Medicinbollar',
    category: 'ACCESSORIES',
    description: 'Various weight medicine balls',
    enablesTests: ['med_ball_throw'],
    enablesExercises: ['wall_ball', 'med_ball_slam', 'rotational_throw']
  },
  {
    name: 'Slam Balls',
    nameSv: 'Slam Balls',
    category: 'ACCESSORIES',
    description: 'Dead-bounce slam balls',
    enablesTests: [],
    enablesExercises: ['ball_slam', 'overhead_slam']
  },
  {
    name: 'Battle Ropes',
    nameSv: 'Battle Ropes',
    category: 'ACCESSORIES',
    description: 'Heavy ropes for conditioning',
    enablesTests: [],
    enablesExercises: ['battle_rope_waves', 'rope_slams', 'rope_circles']
  },
  {
    name: 'Sandbag',
    nameSv: 'Sandsäck',
    category: 'ACCESSORIES',
    description: 'Training sandbag with handles',
    enablesTests: [],
    enablesExercises: ['sandbag_carry', 'sandbag_clean', 'sandbag_lunge', 'sandbag_shoulder']
  },
  {
    name: 'Sled (Push/Pull)',
    nameSv: 'Släde (Drag/Push)',
    category: 'ACCESSORIES',
    description: 'Weight sled for pushing and pulling',
    enablesTests: [],
    enablesExercises: ['sled_push', 'sled_pull', 'prowler_push']
  },
  {
    name: 'Farmers Carry Handles',
    nameSv: 'Farmers Walk Handtag',
    category: 'ACCESSORIES',
    description: 'Heavy carry handles',
    enablesTests: [],
    enablesExercises: ['farmers_carry', 'farmers_walk']
  },
  {
    name: 'Gymnastics Rings',
    nameSv: 'Gymnastikringar',
    category: 'ACCESSORIES',
    description: 'Wooden or plastic rings with straps',
    enablesTests: [],
    enablesExercises: ['ring_row', 'ring_dip', 'ring_muscle_up', 'ring_pushup']
  },
  {
    name: 'Ab Wheel',
    nameSv: 'Ab Wheel',
    category: 'ACCESSORIES',
    description: 'Abdominal roller wheel',
    enablesTests: [],
    enablesExercises: ['ab_wheel_rollout']
  },
  {
    name: 'Jump Rope',
    nameSv: 'Hopprep',
    category: 'ACCESSORIES',
    description: 'Speed rope or weighted rope',
    enablesTests: [],
    enablesExercises: ['jump_rope', 'double_unders']
  },
  {
    name: 'TRX / Suspension Trainer',
    nameSv: 'TRX / Suspensionsband',
    category: 'ACCESSORIES',
    description: 'Suspension training straps',
    enablesTests: [],
    enablesExercises: ['trx_row', 'trx_pushup', 'trx_pistol', 'trx_fallout']
  },
  {
    name: 'Bench (Flat/Incline)',
    nameSv: 'Träningsbänk',
    category: 'ACCESSORIES',
    description: 'Adjustable weight bench',
    enablesTests: [],
    enablesExercises: ['bench_press', 'incline_press', 'dumbbell_row', 'step_up']
  },

  // ==================== RECOVERY ====================
  {
    name: 'Foam Rollers',
    nameSv: 'Foam Rollers',
    category: 'RECOVERY',
    description: 'Self-myofascial release rollers',
    enablesTests: [],
    enablesExercises: ['foam_rolling']
  },
  {
    name: 'Massage Gun',
    nameSv: 'Massagepistol',
    category: 'RECOVERY',
    description: 'Percussion therapy device',
    enablesTests: [],
    enablesExercises: []
  },
  {
    name: 'Lacrosse Balls',
    nameSv: 'Lacrossebollar',
    category: 'RECOVERY',
    description: 'For trigger point release',
    enablesTests: [],
    enablesExercises: ['trigger_point_release']
  },
  {
    name: 'Stretching Mat',
    nameSv: 'Stretchmatta',
    category: 'RECOVERY',
    description: 'Padded mat for stretching and mobility',
    enablesTests: [],
    enablesExercises: ['stretching', 'yoga', 'mobility_work']
  },
  {
    name: 'Sauna',
    nameSv: 'Bastu',
    category: 'RECOVERY',
    description: 'Heat recovery sauna',
    enablesTests: [],
    enablesExercises: []
  },
  {
    name: 'Cold Plunge / Ice Bath',
    nameSv: 'Kallbad / Isbad',
    category: 'RECOVERY',
    description: 'Cold water immersion for recovery',
    enablesTests: [],
    enablesExercises: []
  },
  {
    name: 'Compression Boots',
    nameSv: 'Kompressionsbyxor',
    category: 'RECOVERY',
    brand: 'Normatec',
    description: 'Pneumatic compression recovery system',
    enablesTests: [],
    enablesExercises: []
  }
]

async function main() {
  console.log('🏋️ Seeding equipment catalog...')

  for (const equipment of equipmentCatalog) {
    const existing = await prisma.equipment.findFirst({
      where: { name: equipment.name }
    })

    if (existing) {
      console.log(`  Updating: ${equipment.name}`)
      await prisma.equipment.update({
        where: { id: existing.id },
        data: {
          nameSv: equipment.nameSv,
          category: equipment.category,
          brand: equipment.brand,
          description: equipment.description,
          enablesTests: equipment.enablesTests,
          enablesExercises: equipment.enablesExercises
        }
      })
    } else {
      console.log(`  Creating: ${equipment.name}`)
      await prisma.equipment.create({
        data: {
          name: equipment.name,
          nameSv: equipment.nameSv,
          category: equipment.category,
          brand: equipment.brand,
          description: equipment.description,
          enablesTests: equipment.enablesTests,
          enablesExercises: equipment.enablesExercises
        }
      })
    }
  }

  const count = await prisma.equipment.count()
  console.log(`\n✅ Equipment catalog seeded with ${count} items`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
