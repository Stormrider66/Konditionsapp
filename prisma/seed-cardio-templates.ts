// prisma/seed-cardio-templates.ts
// Cardio session templates for running, cycling, and swimming
// Run with: npx ts-node prisma/seed-cardio-templates.ts

import { PrismaClient, SportType, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

// Segment type for templates
type SegmentType = 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS'

interface CardioSegment {
  type: SegmentType
  duration?: number      // seconds
  distance?: number      // meters
  pace?: number          // sec/km
  zone?: number          // 1-5
  notes?: string
  repeats?: number       // For interval segments
}

interface CardioTemplate {
  name: string
  nameSv: string
  description: string
  descriptionSv: string
  sport: SportType
  segments: CardioSegment[]
  totalDuration: number  // seconds
  totalDistance?: number // meters
  avgZone: number
  tags: string[]
}

const cardioTemplates: CardioTemplate[] = [
  // ========================================
  // RUNNING - Easy / Recovery
  // ========================================
  {
    name: 'Easy Run 30min',
    nameSv: 'Lugnt löppass 30 min',
    description: 'Easy-paced aerobic run in Zone 2. Perfect for recovery days or building base.',
    descriptionSv: 'Lugnt aerobiskt löppass i zon 2. Perfekt för återhämtningsdagar eller basbygge.',
    sport: 'RUNNING',
    segments: [
      { type: 'WARMUP', duration: 300, zone: 1, notes: 'Lätt jogg, börja försiktigt' },
      { type: 'STEADY', duration: 1200, zone: 2, notes: 'Håll konversationstempo' },
      { type: 'COOLDOWN', duration: 300, zone: 1, notes: 'Lugn avslutning' },
    ],
    totalDuration: 1800,
    avgZone: 2,
    tags: ['easy', 'recovery', 'base', 'zone2', 'beginner'],
  },
  {
    name: 'Easy Run 45min',
    nameSv: 'Lugnt löppass 45 min',
    description: 'Moderate duration easy run. Stay in Zone 2 throughout.',
    descriptionSv: 'Medellångt lugnt löppass. Håll dig i zon 2 hela tiden.',
    sport: 'RUNNING',
    segments: [
      { type: 'WARMUP', duration: 420, zone: 1, notes: 'Gradvis uppvärmning' },
      { type: 'STEADY', duration: 1980, zone: 2, notes: 'Håll jämnt konversationstempo' },
      { type: 'COOLDOWN', duration: 300, zone: 1, notes: 'Lugn nedtrappning' },
    ],
    totalDuration: 2700,
    avgZone: 2,
    tags: ['easy', 'base', 'zone2', 'aerobic'],
  },
  {
    name: 'Recovery Run 20min',
    nameSv: 'Återhämtningspass 20 min',
    description: 'Very easy recovery run. Focus on blood flow, not training stimulus.',
    descriptionSv: 'Mycket lugnt återhämtningspass. Fokus på blodcirkulation, inte träningseffekt.',
    sport: 'RUNNING',
    segments: [
      { type: 'WARMUP', duration: 180, zone: 1, notes: 'Börja mycket lugnt' },
      { type: 'STEADY', duration: 840, zone: 1, notes: 'Håll bekvämt lågt tempo' },
      { type: 'COOLDOWN', duration: 180, zone: 1, notes: 'Mjuk avslutning' },
    ],
    totalDuration: 1200,
    avgZone: 1,
    tags: ['recovery', 'easy', 'zone1', 'beginner'],
  },

  // ========================================
  // RUNNING - Long Runs
  // ========================================
  {
    name: 'Long Run 60min',
    nameSv: 'Långpass 60 min',
    description: 'Standard long run building endurance. Stay primarily in Zone 2.',
    descriptionSv: 'Standard långpass som bygger uthållighet. Håll dig primärt i zon 2.',
    sport: 'RUNNING',
    segments: [
      { type: 'WARMUP', duration: 600, zone: 1, notes: '10 min gradvis uppvärmning' },
      { type: 'STEADY', duration: 2700, zone: 2, notes: '45 min zon 2' },
      { type: 'COOLDOWN', duration: 300, zone: 1, notes: '5 min nedvarvning' },
    ],
    totalDuration: 3600,
    avgZone: 2,
    tags: ['long', 'endurance', 'zone2', 'base'],
  },
  {
    name: 'Long Run 90min',
    nameSv: 'Långpass 90 min',
    description: 'Extended long run for marathon preparation. Focus on fueling strategy.',
    descriptionSv: 'Förlängt långpass för maratonförberedelse. Fokus på energistrategi.',
    sport: 'RUNNING',
    segments: [
      { type: 'WARMUP', duration: 600, zone: 1, notes: '10 min lugn start' },
      { type: 'STEADY', duration: 4200, zone: 2, notes: '70 min zon 2 - tänk på vätskeintag' },
      { type: 'COOLDOWN', duration: 600, zone: 1, notes: '10 min mjuk nedvarvning' },
    ],
    totalDuration: 5400,
    avgZone: 2,
    tags: ['long', 'marathon', 'endurance', 'advanced'],
  },
  {
    name: 'Progressive Long Run 75min',
    nameSv: 'Progressivt långpass 75 min',
    description: 'Long run with negative splits. Start easy, finish stronger.',
    descriptionSv: 'Långpass med negativa splits. Börja lugnt, avsluta starkt.',
    sport: 'RUNNING',
    segments: [
      { type: 'WARMUP', duration: 600, zone: 1, notes: '10 min lugn start' },
      { type: 'STEADY', duration: 1500, zone: 2, notes: '25 min bekvämt tempo' },
      { type: 'STEADY', duration: 1200, zone: 3, notes: '20 min höjt tempo' },
      { type: 'STEADY', duration: 900, zone: 3, notes: '15 min progressivt snabbare' },
      { type: 'COOLDOWN', duration: 300, zone: 1, notes: '5 min nedvarvning' },
    ],
    totalDuration: 4500,
    avgZone: 2.5,
    tags: ['progressive', 'long', 'marathon', 'intermediate'],
  },

  // ========================================
  // RUNNING - Tempo / Threshold
  // ========================================
  {
    name: 'Tempo Run 20min',
    nameSv: 'Tempopass 20 min',
    description: 'Classic threshold workout at lactate threshold pace (Zone 4).',
    descriptionSv: 'Klassiskt tröskellopp vid mjölksyratröskeltempo (zon 4).',
    sport: 'RUNNING',
    segments: [
      { type: 'WARMUP', duration: 900, zone: 2, notes: '15 min gradvis uppvärmning' },
      { type: 'DRILLS', duration: 300, notes: 'Dynamiska övningar, stegringar' },
      { type: 'STEADY', duration: 1200, zone: 4, notes: '20 min tröskeltempo - komfortabelt hårt' },
      { type: 'COOLDOWN', duration: 600, zone: 1, notes: '10 min lugn nedvarvning' },
    ],
    totalDuration: 3000,
    avgZone: 3,
    tags: ['tempo', 'threshold', 'zone4', 'lactate', 'intermediate'],
  },
  {
    name: 'Tempo Run 30min',
    nameSv: 'Tempopass 30 min',
    description: 'Extended tempo run for advanced runners. Strong aerobic stimulus.',
    descriptionSv: 'Förlängt tempopass för avancerade löpare. Stark aerob träningseffekt.',
    sport: 'RUNNING',
    segments: [
      { type: 'WARMUP', duration: 900, zone: 2, notes: '15 min uppvärmning' },
      { type: 'DRILLS', duration: 300, notes: 'Stegringar och dynamik' },
      { type: 'STEADY', duration: 1800, zone: 4, notes: '30 min tröskeltempo' },
      { type: 'COOLDOWN', duration: 600, zone: 1, notes: '10 min nedvarvning' },
    ],
    totalDuration: 3600,
    avgZone: 3.5,
    tags: ['tempo', 'threshold', 'zone4', 'advanced'],
  },
  {
    name: 'Cruise Intervals 4x8min',
    nameSv: 'Tröskelintervaller 4x8 min',
    description: 'Tempo intervals with short rest. Accumulate time at threshold.',
    descriptionSv: 'Tempointervaller med kort vila. Ackumulera tid vid tröskeln.',
    sport: 'RUNNING',
    segments: [
      { type: 'WARMUP', duration: 900, zone: 2, notes: '15 min uppvärmning' },
      { type: 'INTERVAL', duration: 480, zone: 4, notes: 'Intervall 1: Tröskeltempo', repeats: 1 },
      { type: 'RECOVERY', duration: 60, zone: 1, notes: '1 min lätt jogg' },
      { type: 'INTERVAL', duration: 480, zone: 4, notes: 'Intervall 2: Tröskeltempo', repeats: 1 },
      { type: 'RECOVERY', duration: 60, zone: 1, notes: '1 min lätt jogg' },
      { type: 'INTERVAL', duration: 480, zone: 4, notes: 'Intervall 3: Tröskeltempo', repeats: 1 },
      { type: 'RECOVERY', duration: 60, zone: 1, notes: '1 min lätt jogg' },
      { type: 'INTERVAL', duration: 480, zone: 4, notes: 'Intervall 4: Tröskeltempo', repeats: 1 },
      { type: 'COOLDOWN', duration: 600, zone: 1, notes: '10 min nedvarvning' },
    ],
    totalDuration: 3600,
    avgZone: 3.5,
    tags: ['tempo', 'threshold', 'intervals', 'cruise', 'intermediate'],
  },

  // ========================================
  // RUNNING - VO2max Intervals
  // ========================================
  {
    name: 'VO2max Intervals 5x3min',
    nameSv: 'VO2max intervaller 5x3 min',
    description: 'Classic VO2max workout. Run at 95-100% of max aerobic capacity.',
    descriptionSv: 'Klassiskt VO2max-pass. Löp på 95-100% av maximal aerob kapacitet.',
    sport: 'RUNNING',
    segments: [
      { type: 'WARMUP', duration: 900, zone: 2, notes: '15 min inkl. stegringar' },
      { type: 'INTERVAL', duration: 180, zone: 5, notes: 'Intervall 1: 3 min @ VO2max', repeats: 1 },
      { type: 'RECOVERY', duration: 180, zone: 1, notes: '3 min jogg' },
      { type: 'INTERVAL', duration: 180, zone: 5, notes: 'Intervall 2', repeats: 1 },
      { type: 'RECOVERY', duration: 180, zone: 1, notes: '3 min jogg' },
      { type: 'INTERVAL', duration: 180, zone: 5, notes: 'Intervall 3', repeats: 1 },
      { type: 'RECOVERY', duration: 180, zone: 1, notes: '3 min jogg' },
      { type: 'INTERVAL', duration: 180, zone: 5, notes: 'Intervall 4', repeats: 1 },
      { type: 'RECOVERY', duration: 180, zone: 1, notes: '3 min jogg' },
      { type: 'INTERVAL', duration: 180, zone: 5, notes: 'Intervall 5', repeats: 1 },
      { type: 'COOLDOWN', duration: 600, zone: 1, notes: '10 min nedvarvning' },
    ],
    totalDuration: 3300,
    avgZone: 3.5,
    tags: ['vo2max', 'intervals', 'zone5', 'speed', 'advanced'],
  },
  {
    name: 'VO2max Intervals 6x4min',
    nameSv: 'VO2max intervaller 6x4 min',
    description: 'Norwegian-style 4-minute intervals. Maximize time at VO2max.',
    descriptionSv: 'Norsk stil 4-minuters intervaller. Maximera tid vid VO2max.',
    sport: 'RUNNING',
    segments: [
      { type: 'WARMUP', duration: 900, zone: 2, notes: '15 min med stegringar' },
      { type: 'INTERVAL', duration: 240, zone: 5, notes: '4 min @ 95% max', repeats: 1 },
      { type: 'RECOVERY', duration: 180, zone: 1, notes: '3 min aktiv vila' },
      { type: 'INTERVAL', duration: 240, zone: 5, notes: '4 min @ 95% max', repeats: 1 },
      { type: 'RECOVERY', duration: 180, zone: 1, notes: '3 min aktiv vila' },
      { type: 'INTERVAL', duration: 240, zone: 5, notes: '4 min @ 95% max', repeats: 1 },
      { type: 'RECOVERY', duration: 180, zone: 1, notes: '3 min aktiv vila' },
      { type: 'INTERVAL', duration: 240, zone: 5, notes: '4 min @ 95% max', repeats: 1 },
      { type: 'RECOVERY', duration: 180, zone: 1, notes: '3 min aktiv vila' },
      { type: 'INTERVAL', duration: 240, zone: 5, notes: '4 min @ 95% max', repeats: 1 },
      { type: 'RECOVERY', duration: 180, zone: 1, notes: '3 min aktiv vila' },
      { type: 'INTERVAL', duration: 240, zone: 5, notes: '4 min @ 95% max', repeats: 1 },
      { type: 'COOLDOWN', duration: 600, zone: 1, notes: '10 min nedvarvning' },
    ],
    totalDuration: 4020,
    avgZone: 3.5,
    tags: ['vo2max', 'intervals', 'norwegian', 'advanced', 'elite'],
  },
  {
    name: 'Short VO2max 8x2min',
    nameSv: 'Korta VO2max 8x2 min',
    description: 'Shorter intervals at slightly faster pace. Good for speed development.',
    descriptionSv: 'Kortare intervaller i något snabbare tempo. Bra för fartighetsuppbyggnad.',
    sport: 'RUNNING',
    segments: [
      { type: 'WARMUP', duration: 900, zone: 2, notes: '15 min uppvärmning' },
      { type: 'INTERVAL', duration: 120, zone: 5, notes: '2 min hård', repeats: 1 },
      { type: 'RECOVERY', duration: 120, zone: 1, notes: '2 min jogg' },
      { type: 'INTERVAL', duration: 120, zone: 5, notes: '2 min hård', repeats: 1 },
      { type: 'RECOVERY', duration: 120, zone: 1, notes: '2 min jogg' },
      { type: 'INTERVAL', duration: 120, zone: 5, notes: '2 min hård', repeats: 1 },
      { type: 'RECOVERY', duration: 120, zone: 1, notes: '2 min jogg' },
      { type: 'INTERVAL', duration: 120, zone: 5, notes: '2 min hård', repeats: 1 },
      { type: 'RECOVERY', duration: 120, zone: 1, notes: '2 min jogg' },
      { type: 'INTERVAL', duration: 120, zone: 5, notes: '2 min hård', repeats: 1 },
      { type: 'RECOVERY', duration: 120, zone: 1, notes: '2 min jogg' },
      { type: 'INTERVAL', duration: 120, zone: 5, notes: '2 min hård', repeats: 1 },
      { type: 'RECOVERY', duration: 120, zone: 1, notes: '2 min jogg' },
      { type: 'INTERVAL', duration: 120, zone: 5, notes: '2 min hård', repeats: 1 },
      { type: 'RECOVERY', duration: 120, zone: 1, notes: '2 min jogg' },
      { type: 'INTERVAL', duration: 120, zone: 5, notes: '2 min hård', repeats: 1 },
      { type: 'COOLDOWN', duration: 600, zone: 1, notes: '10 min nedvarvning' },
    ],
    totalDuration: 3420,
    avgZone: 3.5,
    tags: ['vo2max', 'intervals', 'short', 'intermediate'],
  },

  // ========================================
  // RUNNING - Fartlek
  // ========================================
  {
    name: 'Fartlek 45min',
    nameSv: 'Fartlek 45 min',
    description: 'Swedish "speed play" with varied intensities. Fun and effective.',
    descriptionSv: 'Klassisk fartlek med varierat tempo. Roligt och effektivt.',
    sport: 'RUNNING',
    segments: [
      { type: 'WARMUP', duration: 600, zone: 2, notes: '10 min lugn start' },
      { type: 'INTERVAL', duration: 60, zone: 4, notes: '1 min fart' },
      { type: 'RECOVERY', duration: 90, zone: 2, notes: '1.5 min jogg' },
      { type: 'INTERVAL', duration: 120, zone: 4, notes: '2 min fart' },
      { type: 'RECOVERY', duration: 90, zone: 2, notes: '1.5 min jogg' },
      { type: 'INTERVAL', duration: 30, zone: 5, notes: '30 sek sprint' },
      { type: 'RECOVERY', duration: 60, zone: 2, notes: '1 min jogg' },
      { type: 'INTERVAL', duration: 180, zone: 3, notes: '3 min mellantempo' },
      { type: 'RECOVERY', duration: 90, zone: 2, notes: '1.5 min jogg' },
      { type: 'INTERVAL', duration: 60, zone: 4, notes: '1 min fart' },
      { type: 'RECOVERY', duration: 60, zone: 2, notes: '1 min jogg' },
      { type: 'INTERVAL', duration: 30, zone: 5, notes: '30 sek sprint' },
      { type: 'RECOVERY', duration: 90, zone: 2, notes: '1.5 min jogg' },
      { type: 'INTERVAL', duration: 120, zone: 4, notes: '2 min fart' },
      { type: 'COOLDOWN', duration: 480, zone: 1, notes: '8 min nedvarvning' },
    ],
    totalDuration: 2100,
    avgZone: 2.8,
    tags: ['fartlek', 'varied', 'fun', 'intermediate'],
  },

  // ========================================
  // RUNNING - Hill Training
  // ========================================
  {
    name: 'Hill Repeats 8x45sec',
    nameSv: 'Backintervaller 8x45 sek',
    description: 'Short hill repeats for power and running economy.',
    descriptionSv: 'Korta backintervaller för kraft och löpekonomi.',
    sport: 'RUNNING',
    segments: [
      { type: 'WARMUP', duration: 900, zone: 2, notes: '15 min inkl. stegringar' },
      { type: 'HILL', duration: 45, zone: 5, notes: 'Uppför: kraftfullt men kontrollerat' },
      { type: 'RECOVERY', duration: 90, zone: 1, notes: 'Jogg ner' },
      { type: 'HILL', duration: 45, zone: 5, notes: 'Uppför: lyft knäna högt' },
      { type: 'RECOVERY', duration: 90, zone: 1, notes: 'Jogg ner' },
      { type: 'HILL', duration: 45, zone: 5, notes: 'Uppför' },
      { type: 'RECOVERY', duration: 90, zone: 1, notes: 'Jogg ner' },
      { type: 'HILL', duration: 45, zone: 5, notes: 'Uppför' },
      { type: 'RECOVERY', duration: 90, zone: 1, notes: 'Jogg ner' },
      { type: 'HILL', duration: 45, zone: 5, notes: 'Uppför' },
      { type: 'RECOVERY', duration: 90, zone: 1, notes: 'Jogg ner' },
      { type: 'HILL', duration: 45, zone: 5, notes: 'Uppför' },
      { type: 'RECOVERY', duration: 90, zone: 1, notes: 'Jogg ner' },
      { type: 'HILL', duration: 45, zone: 5, notes: 'Uppför' },
      { type: 'RECOVERY', duration: 90, zone: 1, notes: 'Jogg ner' },
      { type: 'HILL', duration: 45, zone: 5, notes: 'Sista! Ge allt!' },
      { type: 'COOLDOWN', duration: 600, zone: 1, notes: '10 min lugn nedvarvning' },
    ],
    totalDuration: 2580,
    avgZone: 3,
    tags: ['hills', 'power', 'strength', 'intermediate'],
  },
  {
    name: 'Long Hill Repeats 5x90sec',
    nameSv: 'Långa backintervaller 5x90 sek',
    description: 'Longer hill repeats for lactate threshold development.',
    descriptionSv: 'Längre backintervaller för laktattröskelutveckling.',
    sport: 'RUNNING',
    segments: [
      { type: 'WARMUP', duration: 900, zone: 2, notes: '15 min uppvärmning' },
      { type: 'HILL', duration: 90, zone: 4, notes: 'Uppför: jämn ansträngning' },
      { type: 'RECOVERY', duration: 180, zone: 1, notes: 'Jogg ner, återhämta' },
      { type: 'HILL', duration: 90, zone: 4, notes: 'Uppför: bibehåll form' },
      { type: 'RECOVERY', duration: 180, zone: 1, notes: 'Jogg ner' },
      { type: 'HILL', duration: 90, zone: 4, notes: 'Uppför' },
      { type: 'RECOVERY', duration: 180, zone: 1, notes: 'Jogg ner' },
      { type: 'HILL', duration: 90, zone: 4, notes: 'Uppför' },
      { type: 'RECOVERY', duration: 180, zone: 1, notes: 'Jogg ner' },
      { type: 'HILL', duration: 90, zone: 4, notes: 'Sista! Fokus på teknik' },
      { type: 'COOLDOWN', duration: 600, zone: 1, notes: '10 min nedvarvning' },
    ],
    totalDuration: 2850,
    avgZone: 2.8,
    tags: ['hills', 'threshold', 'strength', 'advanced'],
  },

  // ========================================
  // CYCLING - Easy / Recovery
  // ========================================
  {
    name: 'Easy Ride 45min',
    nameSv: 'Lugnt cykelpass 45 min',
    description: 'Easy-paced recovery ride. Keep power below 55% FTP.',
    descriptionSv: 'Lugnt återhämtningscykelpass. Håll effekt under 55% FTP.',
    sport: 'CYCLING',
    segments: [
      { type: 'WARMUP', duration: 600, zone: 1, notes: 'Gradvis uppvärmning' },
      { type: 'STEADY', duration: 2100, zone: 2, notes: 'Håll bekväm kadans 85-95 rpm' },
      { type: 'COOLDOWN', duration: 300, zone: 1, notes: 'Lugn avslutning' },
    ],
    totalDuration: 2700,
    avgZone: 2,
    tags: ['easy', 'recovery', 'cycling', 'zone2'],
  },
  {
    name: 'Endurance Ride 60min',
    nameSv: 'Uthållighetspass 60 min',
    description: 'Steady endurance ride at 56-75% FTP. Build aerobic base.',
    descriptionSv: 'Stadigt uthållighetspass på 56-75% FTP. Bygg aerob bas.',
    sport: 'CYCLING',
    segments: [
      { type: 'WARMUP', duration: 600, zone: 1, notes: '10 min gradvis ökning' },
      { type: 'STEADY', duration: 2700, zone: 2, notes: '45 min zon 2' },
      { type: 'COOLDOWN', duration: 300, zone: 1, notes: '5 min nedvarvning' },
    ],
    totalDuration: 3600,
    avgZone: 2,
    tags: ['endurance', 'cycling', 'zone2', 'base'],
  },

  // ========================================
  // CYCLING - Sweet Spot / Tempo
  // ========================================
  {
    name: 'Sweet Spot 2x20min',
    nameSv: 'Sweet Spot 2x20 min',
    description: 'Sweet spot training at 88-93% FTP. Maximum training effect per time invested.',
    descriptionSv: 'Sweet spot-träning på 88-93% FTP. Maximal träningseffekt per tidsenhet.',
    sport: 'CYCLING',
    segments: [
      { type: 'WARMUP', duration: 600, zone: 2, notes: '10 min uppvärmning' },
      { type: 'STEADY', duration: 1200, zone: 4, notes: '20 min @ 88-93% FTP' },
      { type: 'RECOVERY', duration: 300, zone: 1, notes: '5 min lätt' },
      { type: 'STEADY', duration: 1200, zone: 4, notes: '20 min @ 88-93% FTP' },
      { type: 'COOLDOWN', duration: 300, zone: 1, notes: '5 min nedvarvning' },
    ],
    totalDuration: 3600,
    avgZone: 3.2,
    tags: ['sweetspot', 'cycling', 'tempo', 'threshold', 'intermediate'],
  },
  {
    name: 'Sweet Spot 3x15min',
    nameSv: 'Sweet Spot 3x15 min',
    description: 'Three blocks of sweet spot work with recovery between.',
    descriptionSv: 'Tre block sweet spot med återhämtning mellan.',
    sport: 'CYCLING',
    segments: [
      { type: 'WARMUP', duration: 600, zone: 2, notes: '10 min uppvärmning' },
      { type: 'STEADY', duration: 900, zone: 4, notes: '15 min @ 88-93% FTP' },
      { type: 'RECOVERY', duration: 300, zone: 1, notes: '5 min lätt' },
      { type: 'STEADY', duration: 900, zone: 4, notes: '15 min @ 88-93% FTP' },
      { type: 'RECOVERY', duration: 300, zone: 1, notes: '5 min lätt' },
      { type: 'STEADY', duration: 900, zone: 4, notes: '15 min @ 88-93% FTP' },
      { type: 'COOLDOWN', duration: 300, zone: 1, notes: '5 min nedvarvning' },
    ],
    totalDuration: 4200,
    avgZone: 3.2,
    tags: ['sweetspot', 'cycling', 'tempo', 'intermediate'],
  },

  // ========================================
  // CYCLING - VO2max Intervals
  // ========================================
  {
    name: 'Cycling VO2max 5x5min',
    nameSv: 'Cykel VO2max 5x5 min',
    description: 'VO2max intervals at 106-120% FTP. Improve maximum oxygen uptake.',
    descriptionSv: 'VO2max-intervaller på 106-120% FTP. Förbättra maximal syreupptagning.',
    sport: 'CYCLING',
    segments: [
      { type: 'WARMUP', duration: 900, zone: 2, notes: '15 min inkl. några stegringar' },
      { type: 'INTERVAL', duration: 300, zone: 5, notes: '5 min @ 106-120% FTP' },
      { type: 'RECOVERY', duration: 300, zone: 1, notes: '5 min lätt tramp' },
      { type: 'INTERVAL', duration: 300, zone: 5, notes: '5 min @ 106-120% FTP' },
      { type: 'RECOVERY', duration: 300, zone: 1, notes: '5 min lätt' },
      { type: 'INTERVAL', duration: 300, zone: 5, notes: '5 min @ 106-120% FTP' },
      { type: 'RECOVERY', duration: 300, zone: 1, notes: '5 min lätt' },
      { type: 'INTERVAL', duration: 300, zone: 5, notes: '5 min @ 106-120% FTP' },
      { type: 'RECOVERY', duration: 300, zone: 1, notes: '5 min lätt' },
      { type: 'INTERVAL', duration: 300, zone: 5, notes: '5 min @ 106-120% FTP' },
      { type: 'COOLDOWN', duration: 600, zone: 1, notes: '10 min nedvarvning' },
    ],
    totalDuration: 4500,
    avgZone: 3.2,
    tags: ['vo2max', 'cycling', 'intervals', 'advanced'],
  },

  // ========================================
  // SWIMMING - Easy / Technique
  // ========================================
  {
    name: 'Technique Swim 30min',
    nameSv: 'Teknikpass 30 min',
    description: 'Drill-focused session for improving swim technique.',
    descriptionSv: 'Övningsfokuserat pass för att förbättra simteknik.',
    sport: 'SWIMMING',
    segments: [
      { type: 'WARMUP', duration: 600, zone: 1, notes: '200m blandad sim' },
      { type: 'DRILLS', duration: 600, notes: '4x50m drill: fingertip drag' },
      { type: 'DRILLS', duration: 600, notes: '4x50m drill: catch-up' },
      { type: 'STEADY', duration: 600, zone: 2, notes: '200m fokus på teknik' },
      { type: 'COOLDOWN', duration: 300, zone: 1, notes: '100m lugn sim' },
    ],
    totalDuration: 1800,
    totalDistance: 1100, // meters
    avgZone: 1.5,
    tags: ['technique', 'swimming', 'drills', 'beginner'],
  },
  {
    name: 'Easy Swim 45min',
    nameSv: 'Lugnt simpass 45 min',
    description: 'Low-intensity swim focusing on feel for water and form.',
    descriptionSv: 'Lågintensivt simpass med fokus på vattenkänsla och form.',
    sport: 'SWIMMING',
    segments: [
      { type: 'WARMUP', duration: 600, zone: 1, notes: '300m blandad' },
      { type: 'STEADY', duration: 1200, zone: 2, notes: '600m lugn frisim' },
      { type: 'DRILLS', duration: 600, notes: '4x50m övningar' },
      { type: 'STEADY', duration: 600, zone: 2, notes: '300m valfritt simsätt' },
      { type: 'COOLDOWN', duration: 300, zone: 1, notes: '150m lugn sim' },
    ],
    totalDuration: 2700,
    totalDistance: 1650, // meters
    avgZone: 2,
    tags: ['easy', 'swimming', 'aerobic', 'technique'],
  },

  // ========================================
  // SWIMMING - Threshold / CSS
  // ========================================
  {
    name: 'CSS Test Set',
    nameSv: 'CSS Testpass',
    description: 'Critical Swim Speed test: 400m time trial followed by 200m. Calculate CSS.',
    descriptionSv: 'Critical Swim Speed test: 400m tidslopp följt av 200m. Beräkna CSS.',
    sport: 'SWIMMING',
    segments: [
      { type: 'WARMUP', duration: 900, zone: 1, notes: '400m blandad uppvärmning' },
      { type: 'DRILLS', duration: 300, notes: '4x50m stegringar' },
      { type: 'INTERVAL', duration: 420, zone: 5, notes: '400m maxtempo - notera tid!' },
      { type: 'RECOVERY', duration: 300, zone: 1, notes: '5 min aktiv vila' },
      { type: 'INTERVAL', duration: 180, zone: 5, notes: '200m maxtempo - notera tid!' },
      { type: 'COOLDOWN', duration: 600, zone: 1, notes: '300m nedvarvning' },
    ],
    totalDuration: 2700,
    totalDistance: 1300, // meters (excluding rest)
    avgZone: 3,
    tags: ['test', 'css', 'swimming', 'threshold'],
  },
  {
    name: 'Threshold Swim 10x100m',
    nameSv: 'Tröskelpass 10x100m',
    description: 'Threshold intervals at CSS pace. Build sustainable speed.',
    descriptionSv: 'Tröskelintervaller på CSS-tempo. Bygg uthållig fart.',
    sport: 'SWIMMING',
    segments: [
      { type: 'WARMUP', duration: 600, zone: 1, notes: '300m blandad' },
      { type: 'DRILLS', duration: 300, notes: '4x25m drill' },
      { type: 'INTERVAL', duration: 120, zone: 4, notes: '100m @ CSS', repeats: 10 },
      { type: 'RECOVERY', duration: 15, zone: 1, notes: '15 sek vila mellan varje' },
      { type: 'COOLDOWN', duration: 300, zone: 1, notes: '200m nedvarvning' },
    ],
    totalDuration: 2400,
    totalDistance: 1500, // meters
    avgZone: 3.5,
    tags: ['threshold', 'css', 'swimming', 'intervals', 'intermediate'],
  },

  // ========================================
  // SKIING (Cross-Country) - Double Pole
  // ========================================
  {
    name: 'Double Pole Intervals',
    nameSv: 'Stakningsteknik intervaller',
    description: 'Focused double poling work for skiing-specific power.',
    descriptionSv: 'Fokuserat stakningsarbete för skidspecifik kraft.',
    sport: 'SKIING',
    segments: [
      { type: 'WARMUP', duration: 900, zone: 2, notes: '15 min blandad teknik' },
      { type: 'INTERVAL', duration: 60, zone: 4, notes: '1 min hård stakning' },
      { type: 'RECOVERY', duration: 60, zone: 2, notes: '1 min lätt' },
      { type: 'INTERVAL', duration: 60, zone: 4, notes: '1 min hård stakning' },
      { type: 'RECOVERY', duration: 60, zone: 2, notes: '1 min lätt' },
      { type: 'INTERVAL', duration: 60, zone: 4, notes: '1 min hård stakning' },
      { type: 'RECOVERY', duration: 60, zone: 2, notes: '1 min lätt' },
      { type: 'INTERVAL', duration: 60, zone: 4, notes: '1 min hård stakning' },
      { type: 'RECOVERY', duration: 60, zone: 2, notes: '1 min lätt' },
      { type: 'INTERVAL', duration: 60, zone: 4, notes: '1 min hård stakning' },
      { type: 'RECOVERY', duration: 60, zone: 2, notes: '1 min lätt' },
      { type: 'INTERVAL', duration: 60, zone: 4, notes: '1 min hård stakning' },
      { type: 'COOLDOWN', duration: 600, zone: 1, notes: '10 min nedvarvning' },
    ],
    totalDuration: 2220,
    avgZone: 3,
    tags: ['skiing', 'double-pole', 'intervals', 'technique'],
  },
]

async function seedCardioTemplates() {
  console.log('🏃 Seeding cardio templates...')

  // Get or create a system user for templates
  let systemUser = await prisma.user.findFirst({
    where: { email: 'system@starbythomson.se' },
  })

  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        email: 'system@starbythomson.se',
        name: 'System Templates',
        role: 'ADMIN',
      },
    })
    console.log('Created system user for templates')
  }

  let created = 0
  let updated = 0

  for (const template of cardioTemplates) {
    const existingSession = await prisma.cardioSession.findFirst({
      where: {
        name: template.name,
        coachId: systemUser.id,
        isPublic: true,
      },
    })

    const sessionData = {
      name: template.name,
      description: `${template.descriptionSv}\n\n${template.description}`,
      sport: template.sport,
      segments: template.segments as unknown as Prisma.InputJsonValue,
      totalDuration: template.totalDuration,
      totalDistance: template.totalDistance,
      avgZone: template.avgZone,
      coachId: systemUser.id,
      isPublic: true,
      tags: template.tags,
    }

    if (existingSession) {
      await prisma.cardioSession.update({
        where: { id: existingSession.id },
        data: sessionData,
      })
      updated++
    } else {
      await prisma.cardioSession.create({
        data: sessionData,
      })
      created++
    }
  }

  console.log(`✅ Created ${created} new cardio templates`)
  console.log(`📝 Updated ${updated} existing templates`)
  console.log(`📊 Total: ${cardioTemplates.length} cardio templates`)
}

async function main() {
  try {
    await seedCardioTemplates()
  } catch (error) {
    console.error('Error seeding cardio templates:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
