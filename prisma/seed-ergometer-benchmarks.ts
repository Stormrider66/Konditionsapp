/**
 * Ergometer Benchmark Seed Data
 *
 * Reference data for classifying athletes by performance tier
 * Sources: Concept2 world records, CrossFit standards, research data
 *
 * Tiers: ELITE (top 5%), ADVANCED (top 25%), INTERMEDIATE (top 50%), BEGINNER (learning)
 */

import { PrismaClient, ErgometerType, ErgometerTestProtocol, SportType } from '@prisma/client';

const prisma = new PrismaClient();

interface BenchmarkData {
  ergometerType: ErgometerType;
  testProtocol: ErgometerTestProtocol;
  sport: SportType | null;
  gender: 'MALE' | 'FEMALE';
  tier: 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER';
  powerMin?: number;
  powerMax?: number;
  paceMin?: number; // sec/500m (faster)
  paceMax?: number; // sec/500m (slower)
  timeMin?: number; // seconds (faster)
  timeMax?: number; // seconds (slower)
  caloriesMin?: number;
  caloriesMax?: number;
  wattsPerKg?: number;
  description: string;
  descriptionSwedish: string;
  source?: string;
}

// ==================== CONCEPT2 ROWER 2K ====================
// Based on Concept2 rankings and competitive rowing standards

const rower2kBenchmarks: BenchmarkData[] = [
  // Male - General
  {
    ergometerType: 'CONCEPT2_ROW',
    testProtocol: 'TT_2K',
    sport: null,
    gender: 'MALE',
    tier: 'ELITE',
    timeMin: 0, // No minimum
    timeMax: 390, // 6:30
    paceMin: 0,
    paceMax: 97.5, // 1:37.5
    powerMin: 350,
    wattsPerKg: 4.5,
    description: 'Elite level - competitive rowers, national team caliber',
    descriptionSwedish: 'Elitniva - tavlingsroddare, landslagskaliber',
    source: 'Concept2 World Rankings',
  },
  {
    ergometerType: 'CONCEPT2_ROW',
    testProtocol: 'TT_2K',
    sport: null,
    gender: 'MALE',
    tier: 'ADVANCED',
    timeMin: 390,
    timeMax: 420, // 7:00
    paceMin: 97.5,
    paceMax: 105, // 1:45
    powerMin: 280,
    powerMax: 350,
    wattsPerKg: 3.8,
    description: 'Advanced - experienced athletes, club competitive',
    descriptionSwedish: 'Avancerad - erfarna atleter, klubbniva',
    source: 'Concept2 World Rankings',
  },
  {
    ergometerType: 'CONCEPT2_ROW',
    testProtocol: 'TT_2K',
    sport: null,
    gender: 'MALE',
    tier: 'INTERMEDIATE',
    timeMin: 420,
    timeMax: 480, // 8:00
    paceMin: 105,
    paceMax: 120, // 2:00
    powerMin: 200,
    powerMax: 280,
    wattsPerKg: 3.0,
    description: 'Intermediate - regular training, fitness focused',
    descriptionSwedish: 'Mellanliggande - regelbunden traning, fitnessfokus',
    source: 'Concept2 World Rankings',
  },
  {
    ergometerType: 'CONCEPT2_ROW',
    testProtocol: 'TT_2K',
    sport: null,
    gender: 'MALE',
    tier: 'BEGINNER',
    timeMin: 480,
    timeMax: 600, // 10:00
    paceMin: 120,
    paceMax: 150, // 2:30
    powerMin: 120,
    powerMax: 200,
    wattsPerKg: 2.0,
    description: 'Beginner - learning technique, building base',
    descriptionSwedish: 'Nyborjare - lar sig teknik, bygger bas',
    source: 'Concept2 World Rankings',
  },
  // Female - General
  {
    ergometerType: 'CONCEPT2_ROW',
    testProtocol: 'TT_2K',
    sport: null,
    gender: 'FEMALE',
    tier: 'ELITE',
    timeMin: 0,
    timeMax: 420, // 7:00
    paceMin: 0,
    paceMax: 105, // 1:45
    powerMin: 280,
    wattsPerKg: 4.2,
    description: 'Elite level - competitive rowers, national team caliber',
    descriptionSwedish: 'Elitniva - tavlingsroddare, landslagskaliber',
    source: 'Concept2 World Rankings',
  },
  {
    ergometerType: 'CONCEPT2_ROW',
    testProtocol: 'TT_2K',
    sport: null,
    gender: 'FEMALE',
    tier: 'ADVANCED',
    timeMin: 420,
    timeMax: 465, // 7:45
    paceMin: 105,
    paceMax: 116.25, // 1:56.25
    powerMin: 220,
    powerMax: 280,
    wattsPerKg: 3.5,
    description: 'Advanced - experienced athletes, club competitive',
    descriptionSwedish: 'Avancerad - erfarna atleter, klubbniva',
    source: 'Concept2 World Rankings',
  },
  {
    ergometerType: 'CONCEPT2_ROW',
    testProtocol: 'TT_2K',
    sport: null,
    gender: 'FEMALE',
    tier: 'INTERMEDIATE',
    timeMin: 465,
    timeMax: 540, // 9:00
    paceMin: 116.25,
    paceMax: 135, // 2:15
    powerMin: 150,
    powerMax: 220,
    wattsPerKg: 2.7,
    description: 'Intermediate - regular training, fitness focused',
    descriptionSwedish: 'Mellanliggande - regelbunden traning, fitnessfokus',
    source: 'Concept2 World Rankings',
  },
  {
    ergometerType: 'CONCEPT2_ROW',
    testProtocol: 'TT_2K',
    sport: null,
    gender: 'FEMALE',
    tier: 'BEGINNER',
    timeMin: 540,
    timeMax: 660, // 11:00
    paceMin: 135,
    paceMax: 165, // 2:45
    powerMin: 90,
    powerMax: 150,
    wattsPerKg: 1.8,
    description: 'Beginner - learning technique, building base',
    descriptionSwedish: 'Nyborjare - lar sig teknik, bygger bas',
    source: 'Concept2 World Rankings',
  },
];

// ==================== CONCEPT2 SKIERG 1K ====================
// Standard for HYROX and CrossFit

const skiErg1kBenchmarks: BenchmarkData[] = [
  // Male
  {
    ergometerType: 'CONCEPT2_SKIERG',
    testProtocol: 'TT_1K',
    sport: null,
    gender: 'MALE',
    tier: 'ELITE',
    timeMin: 0,
    timeMax: 195, // 3:15
    paceMin: 0,
    paceMax: 97.5, // 1:37.5
    powerMin: 300,
    description: 'Elite - competitive CrossFit/HYROX athletes',
    descriptionSwedish: 'Elit - tavlings-CrossFit/HYROX atleter',
    source: 'CrossFit Games Standards',
  },
  {
    ergometerType: 'CONCEPT2_SKIERG',
    testProtocol: 'TT_1K',
    sport: null,
    gender: 'MALE',
    tier: 'ADVANCED',
    timeMin: 195,
    timeMax: 225, // 3:45
    paceMin: 97.5,
    paceMax: 112.5, // 1:52.5
    powerMin: 230,
    powerMax: 300,
    description: 'Advanced - regular functional fitness training',
    descriptionSwedish: 'Avancerad - regelbunden funktionell traning',
    source: 'CrossFit Games Standards',
  },
  {
    ergometerType: 'CONCEPT2_SKIERG',
    testProtocol: 'TT_1K',
    sport: null,
    gender: 'MALE',
    tier: 'INTERMEDIATE',
    timeMin: 225,
    timeMax: 270, // 4:30
    paceMin: 112.5,
    paceMax: 135, // 2:15
    powerMin: 160,
    powerMax: 230,
    description: 'Intermediate - building ski erg capacity',
    descriptionSwedish: 'Mellanliggande - bygger SkiErg-kapacitet',
    source: 'CrossFit Games Standards',
  },
  {
    ergometerType: 'CONCEPT2_SKIERG',
    testProtocol: 'TT_1K',
    sport: null,
    gender: 'MALE',
    tier: 'BEGINNER',
    timeMin: 270,
    timeMax: 360, // 6:00
    paceMin: 135,
    paceMax: 180, // 3:00
    powerMin: 100,
    powerMax: 160,
    description: 'Beginner - learning technique',
    descriptionSwedish: 'Nyborjare - lar sig teknik',
    source: 'CrossFit Games Standards',
  },
  // Female
  {
    ergometerType: 'CONCEPT2_SKIERG',
    testProtocol: 'TT_1K',
    sport: null,
    gender: 'FEMALE',
    tier: 'ELITE',
    timeMin: 0,
    timeMax: 225, // 3:45
    paceMin: 0,
    paceMax: 112.5, // 1:52.5
    powerMin: 230,
    description: 'Elite - competitive CrossFit/HYROX athletes',
    descriptionSwedish: 'Elit - tavlings-CrossFit/HYROX atleter',
    source: 'CrossFit Games Standards',
  },
  {
    ergometerType: 'CONCEPT2_SKIERG',
    testProtocol: 'TT_1K',
    sport: null,
    gender: 'FEMALE',
    tier: 'ADVANCED',
    timeMin: 225,
    timeMax: 270, // 4:30
    paceMin: 112.5,
    paceMax: 135, // 2:15
    powerMin: 170,
    powerMax: 230,
    description: 'Advanced - regular functional fitness training',
    descriptionSwedish: 'Avancerad - regelbunden funktionell traning',
    source: 'CrossFit Games Standards',
  },
  {
    ergometerType: 'CONCEPT2_SKIERG',
    testProtocol: 'TT_1K',
    sport: null,
    gender: 'FEMALE',
    tier: 'INTERMEDIATE',
    timeMin: 270,
    timeMax: 330, // 5:30
    paceMin: 135,
    paceMax: 165, // 2:45
    powerMin: 110,
    powerMax: 170,
    description: 'Intermediate - building ski erg capacity',
    descriptionSwedish: 'Mellanliggande - bygger SkiErg-kapacitet',
    source: 'CrossFit Games Standards',
  },
  {
    ergometerType: 'CONCEPT2_SKIERG',
    testProtocol: 'TT_1K',
    sport: null,
    gender: 'FEMALE',
    tier: 'BEGINNER',
    timeMin: 330,
    timeMax: 420, // 7:00
    paceMin: 165,
    paceMax: 210, // 3:30
    powerMin: 70,
    powerMax: 110,
    description: 'Beginner - learning technique',
    descriptionSwedish: 'Nyborjare - lar sig teknik',
    source: 'CrossFit Games Standards',
  },
];

// ==================== WATTBIKE 20MIN FTP ====================
// Standard cycling FTP benchmarks

const wattbikeFtpBenchmarks: BenchmarkData[] = [
  // Male
  {
    ergometerType: 'WATTBIKE',
    testProtocol: 'TT_20MIN',
    sport: null,
    gender: 'MALE',
    tier: 'ELITE',
    powerMin: 320,
    wattsPerKg: 5.0,
    description: 'Elite - professional/semi-pro level',
    descriptionSwedish: 'Elit - professionell/semi-pro niva',
    source: 'British Cycling Standards',
  },
  {
    ergometerType: 'WATTBIKE',
    testProtocol: 'TT_20MIN',
    sport: null,
    gender: 'MALE',
    tier: 'ADVANCED',
    powerMin: 260,
    powerMax: 320,
    wattsPerKg: 4.0,
    description: 'Advanced - competitive amateur',
    descriptionSwedish: 'Avancerad - tavlingsamator',
    source: 'British Cycling Standards',
  },
  {
    ergometerType: 'WATTBIKE',
    testProtocol: 'TT_20MIN',
    sport: null,
    gender: 'MALE',
    tier: 'INTERMEDIATE',
    powerMin: 200,
    powerMax: 260,
    wattsPerKg: 3.2,
    description: 'Intermediate - regular cyclist',
    descriptionSwedish: 'Mellanliggande - regelbunden cyklist',
    source: 'British Cycling Standards',
  },
  {
    ergometerType: 'WATTBIKE',
    testProtocol: 'TT_20MIN',
    sport: null,
    gender: 'MALE',
    tier: 'BEGINNER',
    powerMin: 120,
    powerMax: 200,
    wattsPerKg: 2.5,
    description: 'Beginner - new to cycling',
    descriptionSwedish: 'Nyborjare - ny till cykling',
    source: 'British Cycling Standards',
  },
  // Female
  {
    ergometerType: 'WATTBIKE',
    testProtocol: 'TT_20MIN',
    sport: null,
    gender: 'FEMALE',
    tier: 'ELITE',
    powerMin: 260,
    wattsPerKg: 4.5,
    description: 'Elite - professional/semi-pro level',
    descriptionSwedish: 'Elit - professionell/semi-pro niva',
    source: 'British Cycling Standards',
  },
  {
    ergometerType: 'WATTBIKE',
    testProtocol: 'TT_20MIN',
    sport: null,
    gender: 'FEMALE',
    tier: 'ADVANCED',
    powerMin: 200,
    powerMax: 260,
    wattsPerKg: 3.7,
    description: 'Advanced - competitive amateur',
    descriptionSwedish: 'Avancerad - tavlingsamator',
    source: 'British Cycling Standards',
  },
  {
    ergometerType: 'WATTBIKE',
    testProtocol: 'TT_20MIN',
    sport: null,
    gender: 'FEMALE',
    tier: 'INTERMEDIATE',
    powerMin: 140,
    powerMax: 200,
    wattsPerKg: 2.9,
    description: 'Intermediate - regular cyclist',
    descriptionSwedish: 'Mellanliggande - regelbunden cyklist',
    source: 'British Cycling Standards',
  },
  {
    ergometerType: 'WATTBIKE',
    testProtocol: 'TT_20MIN',
    sport: null,
    gender: 'FEMALE',
    tier: 'BEGINNER',
    powerMin: 80,
    powerMax: 140,
    wattsPerKg: 2.2,
    description: 'Beginner - new to cycling',
    descriptionSwedish: 'Nyborjare - ny till cykling',
    source: 'British Cycling Standards',
  },
];

// ==================== AIR BIKE 10MIN CALORIES ====================
// HYROX and CrossFit standard

const airBike10minBenchmarks: BenchmarkData[] = [
  // Male
  {
    ergometerType: 'ASSAULT_BIKE',
    testProtocol: 'TT_10MIN',
    sport: null,
    gender: 'MALE',
    tier: 'ELITE',
    caloriesMin: 200,
    powerMin: 400,
    description: 'Elite - competitive CrossFit athletes',
    descriptionSwedish: 'Elit - tavlings-CrossFit atleter',
    source: 'CrossFit Games Standards',
  },
  {
    ergometerType: 'ASSAULT_BIKE',
    testProtocol: 'TT_10MIN',
    sport: null,
    gender: 'MALE',
    tier: 'ADVANCED',
    caloriesMin: 160,
    caloriesMax: 200,
    powerMin: 300,
    powerMax: 400,
    description: 'Advanced - regular CrossFit/functional training',
    descriptionSwedish: 'Avancerad - regelbunden CrossFit/funktionell traning',
    source: 'CrossFit Games Standards',
  },
  {
    ergometerType: 'ASSAULT_BIKE',
    testProtocol: 'TT_10MIN',
    sport: null,
    gender: 'MALE',
    tier: 'INTERMEDIATE',
    caloriesMin: 120,
    caloriesMax: 160,
    powerMin: 200,
    powerMax: 300,
    description: 'Intermediate - building work capacity',
    descriptionSwedish: 'Mellanliggande - bygger arbetskapacitet',
    source: 'CrossFit Games Standards',
  },
  {
    ergometerType: 'ASSAULT_BIKE',
    testProtocol: 'TT_10MIN',
    sport: null,
    gender: 'MALE',
    tier: 'BEGINNER',
    caloriesMin: 80,
    caloriesMax: 120,
    powerMin: 120,
    powerMax: 200,
    description: 'Beginner - new to air bike',
    descriptionSwedish: 'Nyborjare - ny till air bike',
    source: 'CrossFit Games Standards',
  },
  // Female
  {
    ergometerType: 'ASSAULT_BIKE',
    testProtocol: 'TT_10MIN',
    sport: null,
    gender: 'FEMALE',
    tier: 'ELITE',
    caloriesMin: 150,
    powerMin: 280,
    description: 'Elite - competitive CrossFit athletes',
    descriptionSwedish: 'Elit - tavlings-CrossFit atleter',
    source: 'CrossFit Games Standards',
  },
  {
    ergometerType: 'ASSAULT_BIKE',
    testProtocol: 'TT_10MIN',
    sport: null,
    gender: 'FEMALE',
    tier: 'ADVANCED',
    caloriesMin: 120,
    caloriesMax: 150,
    powerMin: 200,
    powerMax: 280,
    description: 'Advanced - regular CrossFit/functional training',
    descriptionSwedish: 'Avancerad - regelbunden CrossFit/funktionell traning',
    source: 'CrossFit Games Standards',
  },
  {
    ergometerType: 'ASSAULT_BIKE',
    testProtocol: 'TT_10MIN',
    sport: null,
    gender: 'FEMALE',
    tier: 'INTERMEDIATE',
    caloriesMin: 90,
    caloriesMax: 120,
    powerMin: 140,
    powerMax: 200,
    description: 'Intermediate - building work capacity',
    descriptionSwedish: 'Mellanliggande - bygger arbetskapacitet',
    source: 'CrossFit Games Standards',
  },
  {
    ergometerType: 'ASSAULT_BIKE',
    testProtocol: 'TT_10MIN',
    sport: null,
    gender: 'FEMALE',
    tier: 'BEGINNER',
    caloriesMin: 60,
    caloriesMax: 90,
    powerMin: 90,
    powerMax: 140,
    description: 'Beginner - new to air bike',
    descriptionSwedish: 'Nyborjare - ny till air bike',
    source: 'CrossFit Games Standards',
  },
];

// ==================== WATTBIKE 6S PEAK POWER ====================
// Neuromuscular power benchmarks

const wattbike6sBenchmarks: BenchmarkData[] = [
  // Male
  {
    ergometerType: 'WATTBIKE',
    testProtocol: 'PEAK_POWER_6S',
    sport: null,
    gender: 'MALE',
    tier: 'ELITE',
    powerMin: 1400,
    wattsPerKg: 18,
    description: 'Elite - explosive power athletes',
    descriptionSwedish: 'Elit - explosiva kraftatleter',
    source: 'Wattbike Standards',
  },
  {
    ergometerType: 'WATTBIKE',
    testProtocol: 'PEAK_POWER_6S',
    sport: null,
    gender: 'MALE',
    tier: 'ADVANCED',
    powerMin: 1100,
    powerMax: 1400,
    wattsPerKg: 14,
    description: 'Advanced - well-developed power',
    descriptionSwedish: 'Avancerad - valutvecklad kraft',
    source: 'Wattbike Standards',
  },
  {
    ergometerType: 'WATTBIKE',
    testProtocol: 'PEAK_POWER_6S',
    sport: null,
    gender: 'MALE',
    tier: 'INTERMEDIATE',
    powerMin: 800,
    powerMax: 1100,
    wattsPerKg: 10,
    description: 'Intermediate - developing power',
    descriptionSwedish: 'Mellanliggande - utvecklar kraft',
    source: 'Wattbike Standards',
  },
  {
    ergometerType: 'WATTBIKE',
    testProtocol: 'PEAK_POWER_6S',
    sport: null,
    gender: 'MALE',
    tier: 'BEGINNER',
    powerMin: 500,
    powerMax: 800,
    wattsPerKg: 7,
    description: 'Beginner - building base power',
    descriptionSwedish: 'Nyborjare - bygger baskraft',
    source: 'Wattbike Standards',
  },
  // Female
  {
    ergometerType: 'WATTBIKE',
    testProtocol: 'PEAK_POWER_6S',
    sport: null,
    gender: 'FEMALE',
    tier: 'ELITE',
    powerMin: 1000,
    wattsPerKg: 15,
    description: 'Elite - explosive power athletes',
    descriptionSwedish: 'Elit - explosiva kraftatleter',
    source: 'Wattbike Standards',
  },
  {
    ergometerType: 'WATTBIKE',
    testProtocol: 'PEAK_POWER_6S',
    sport: null,
    gender: 'FEMALE',
    tier: 'ADVANCED',
    powerMin: 750,
    powerMax: 1000,
    wattsPerKg: 12,
    description: 'Advanced - well-developed power',
    descriptionSwedish: 'Avancerad - valutvecklad kraft',
    source: 'Wattbike Standards',
  },
  {
    ergometerType: 'WATTBIKE',
    testProtocol: 'PEAK_POWER_6S',
    sport: null,
    gender: 'FEMALE',
    tier: 'INTERMEDIATE',
    powerMin: 500,
    powerMax: 750,
    wattsPerKg: 8,
    description: 'Intermediate - developing power',
    descriptionSwedish: 'Mellanliggande - utvecklar kraft',
    source: 'Wattbike Standards',
  },
  {
    ergometerType: 'WATTBIKE',
    testProtocol: 'PEAK_POWER_6S',
    sport: null,
    gender: 'FEMALE',
    tier: 'BEGINNER',
    powerMin: 300,
    powerMax: 500,
    wattsPerKg: 5,
    description: 'Beginner - building base power',
    descriptionSwedish: 'Nyborjare - bygger baskraft',
    source: 'Wattbike Standards',
  },
];

// ==================== SEED FUNCTION ====================

async function seedErgometerBenchmarks() {
  console.log('Seeding ergometer benchmarks...');

  const allBenchmarks: BenchmarkData[] = [
    ...rower2kBenchmarks,
    ...skiErg1kBenchmarks,
    ...wattbikeFtpBenchmarks,
    ...airBike10minBenchmarks,
    ...wattbike6sBenchmarks,
  ];

  let created = 0;
  let skipped = 0;

  for (const benchmark of allBenchmarks) {
    try {
      // Check if benchmark already exists
      const existing = await prisma.ergometerBenchmark.findFirst({
        where: {
          ergometerType: benchmark.ergometerType,
          testProtocol: benchmark.testProtocol,
          sport: benchmark.sport,
          gender: benchmark.gender,
          tier: benchmark.tier,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.ergometerBenchmark.create({
        data: {
          ergometerType: benchmark.ergometerType,
          testProtocol: benchmark.testProtocol,
          sport: benchmark.sport,
          gender: benchmark.gender,
          tier: benchmark.tier,
          powerMin: benchmark.powerMin,
          powerMax: benchmark.powerMax,
          paceMin: benchmark.paceMin,
          paceMax: benchmark.paceMax,
          timeMin: benchmark.timeMin,
          timeMax: benchmark.timeMax,
          caloriesMin: benchmark.caloriesMin,
          caloriesMax: benchmark.caloriesMax,
          wattsPerKg: benchmark.wattsPerKg,
          description: benchmark.description,
          descriptionSwedish: benchmark.descriptionSwedish,
          source: benchmark.source,
        },
      });
      created++;
    } catch (error) {
      console.error(`Failed to create benchmark: ${benchmark.ergometerType} ${benchmark.testProtocol} ${benchmark.gender} ${benchmark.tier}`, error);
    }
  }

  console.log(`Seeding complete: ${created} created, ${skipped} skipped (already exist)`);
}

// Main execution
seedErgometerBenchmarks()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export { seedErgometerBenchmarks };
