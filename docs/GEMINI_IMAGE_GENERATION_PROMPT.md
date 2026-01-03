# Exercise Image Generation Guide for Gemini 3 Pro

## Progress Status

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Completed | **135** | 74.6% |
| ❌ Remaining | **46** | 25.4% |
| **Total** | **181** | 100% |

**Last Updated**: 2 January 2026

### Recent Upload (2 Jan 2026)
- **94 images** uploaded to Supabase storage
- **135 exercises** synced to database
- **9 exercises** with male/female variants (2 images each)
- **0 errors**

---

## Project Context

We're building a fitness/training application called **Konditionstest** - a professional platform for coaches and athletes focusing on endurance training, strength training, and physiological testing. The app includes:

- **181 exercises** organized by biomechanical function
- **Focus Mode** - full-screen mobile workout execution where athletes see one exercise at a time
- **Coach Exercise Library** - browse and manage exercises with thumbnails
- **Multi-language support** - Swedish primary, English secondary

We need AI-generated images for each exercise to display during workouts. These images will be the primary visual guide for athletes performing exercises.

---

## Image Style Requirements

### Visual Aesthetic
- **Background**: Dark, moody (#1a1a2e to #0f0f23 gradient)
- **Muscle highlighting**: Orange/red glow effect on active muscle groups
- **Anatomical labels**: Latin terminology only (universal across languages)
  - Examples: "TRICEPS", "PECTORALIS", "GLUTEUS MAXIMUS", "QUADRICEPS"
- **Style**: Modern, professional, slightly stylized anatomical illustration
- **Mood**: Athletic, powerful, educational
- **Aspect Ratio**: 9:16 (vertical, mobile-first)
- **CRITICAL**: Absolutely NO text, titles, or exercise names burned into the image. Only anatomical labels.

---

## REMAINING EXERCISES (46 total)

### POSTERIOR_CHAIN - 11 remaining
**Folder: `posterior-chain/`**

| Swedish Name | English Name | Filename | Target Muscles |
|-------------|--------------|----------|----------------|
| Pushstöt | Push Jerk | push-jerk-1.png | Full Body |
| Sandsäck Frivändning | Sandbag Clean | sandbag-clean-1.png | Full Body |
| Sandsäck Frivändning | Sandbag Clean | sandbag-clean-1.png | Full Body |
| Slädtryckning (HYROX) | Sled Push (HYROX) | sled-push-hyrox-1.png | Legs |
| Sumo Marklyft Högt Drag | Sumo Deadlift High Pull | sumo-deadlift-high-pull-1.png | Full Body |
| Thruster | Thruster | thruster-1.png | Full Body |
| Wall Balls (HYROX) | Wall Balls (HYROX) | wall-balls-hyrox-1.png | Full Body |
| Bar Facing Burpee | Bar Facing Burpee | bar-facing-burpee-1.png | Full Body |
| Depth to Broad Jump | Depth to Broad Jump | depth-to-broad-jump-1.png | Legs |
| Hängande Power Ryck | Hang Power Snatch | hang-power-snatch-1.png | Full Body |
| Hip hikes | Hip Hikes | hip-hikes-1.png | Gluteus Medius |
| Höftbrygga | Hip Bridge | hoftbrygga-1.png | Gluteus, Hamstrings |

---

### KNEE_DOMINANCE - 6 remaining
**Folder: `knee-dominance/`**

| Swedish Name | English Name | Filename | Target Muscles |
|-------------|--------------|----------|----------------|
| Squat Ryck | Squat Snatch | squat-snatch-1.png | Full Body |
| Tuck Jumps | Tuck Jumps | tuck-jumps-1.png | Legs, Core |
| Depth Jumps (30cm) | Depth Jumps (30cm) | depth-jumps-30cm-1.png | Legs |
| Depth Jumps (40cm) | Depth Jumps (40cm) | depth-jumps-40cm-1.png | Legs |

---

### UNILATERAL - 4 remaining
**Folder: `unilateral/`**

| Swedish Name | English Name | Filename | Target Muscles |
|-------------|--------------|----------|----------------|
| Enbenhopp (Bounds) | Single-Leg Bounds | enbenhopp-bounds-1.png | Legs |
| Pistol Squat Progression | Pistol Squat Progression | pistol-squat-progression-1.png | Quadriceps, Balance |

---

### FOOT_ANKLE - 9 remaining
**Folder: `foot-ankle/`**

| Swedish Name | English Name | Filename | Target Muscles |
|-------------|--------------|----------|----------------|
| Lateral Hops | Lateral Hops | lateral-hops-1.png | Legs, Calves |
| Marmor-pickups | Marble Pickups | marmor-pickups-1.png | Intrinsic Foot Muscles |
| Simning | Swimming | swimming-1.png | Full Body |
| Toe Yoga | Toe Yoga | toe-yoga-1.png | Intrinsic Foot Muscles |
| Ankelhopp | Ankle Hops | ankelhopp-1.png | Calves, Ankle |
| Löpning | Running | running-1.png | Cardio, Full Body |
| Double Under | Double Under | double-under-1.png | Full Body |
| Skipping | Skipping | skipping-1.png | Legs, Calves |

---

### ANTI_ROTATION_CORE - 8 remaining
**Folder: `core/`**

| Swedish Name | English Name | Filename | Target Muscles |
|-------------|--------------|----------|----------------|
| Sandsäck Över Axeln | Sandbag Over Shoulder | sandbag-over-shoulder-1.png | Full Body |
| Yoke Walk | Yoke Carry | yoke-carry-1.png | Full Body |
| KB Windmill | KB Windmill | kb-windmill-1.png | Core |
| Suitcase Carry | Suitcase Carry | suitcase-carry-1.png | Obliques, Core |
| Toes-to-Bar | Toes-to-Bar | toes-to-bar-1.png | Core |
| V-Up | V-Up | v-up-1.png | Core |

---

### UPPER_BODY - 8 remaining
**Folder: `upper-body/`**

| Swedish Name | English Name | Filename | Target Muscles |
|-------------|--------------|----------|----------------|
| Ring Rodd | Ring Row | ring-row-1.png | Back |
| Rodd (Meter) | Row (Meters) | row-meters-1.png | Full Body |
| Rodd (HYROX) | Rowing (HYROX) | rowing-hyrox-1.png | Full Body |
| Strikt Handstående Armhävning | Strict Handstand Push-Up | strict-handstand-push-up-1.png | Shoulders |
| DB Row | DB Row | db-row-1.png | Back |

---

## COMPLETED EXERCISES (135)

### ✅ Already Generated & Synced

**Posterior Chain (40):**
Amerikansk Kettlebell Swing, Lådhopp, Boxhopp Över, Bred hopp (max), Burpee, Burpee Boxhopp Över, Frivändning, Stöt, Hantel Ryck, Hängande Frivändning, Hängande Ryck, Hip Thrust med skivstång (2), Kettlebell Swing, Marklyft (2), Muscle-Up (Stång), Muscle-Up (Ringar), Power Frivändning, Power Ryck, Rumänsk marklyft, Ryck, Wall Ball, Good Morning, Turkish Get-Up, Burpee Broad Jump, Cluster, Cable Pull-Through, SkiErg, Sumo Deadlift, KB Clean, KB Snatch, Split Jerk, DB Clean, DB Deadlift, DB Thruster, Clamshells with Band, Reverse Hyperextension, Hang Power Clean, Single-Leg Bridge, Fire Hydrants, KB Thruster, Man Maker, Med Ball Clean, Legless Rope Climb, Push Jerk, Rope Climb

**Knee Dominance (15):**
Frontknäböj (2), Goblet Squat (2), Hoppsquat, Knäböj (2), Step-Up, Pistol Squat, Benpress, Air Squat, Utfall (2), Overhead Squat, Wall Sit, Countermovement Jumps, Cyclist Squat, DB Box Step-Over, Box Jump (18-24"), Low Box Jumps, Overhead Lunge, Sandbag Lunges (HYROX), Split Squat, Squat Clean, Squat Jumps

**Unilateral (11):**
Bakåtlunges (2), Bulgarisk utfallsböj, Enbenig rumänsk marklyft, Step-Ups med knädrive, Curtsy Lunges, Box Pistol, Lateral Bounds, Enbenig benpress, Lateral Lunges, Single-Leg Bounds, Pistol Squat Progression, Step-Ups (high), Single Under, Repeated Bounds, Skater Squats, Split Jumps, Triple Jump

**Foot/Ankle (9):**
Assault Bike (Kalorier), Pogo Jumps, Tåhävningar (böjda ben), Tåhävningar (raka ben), Bike (Calories), Running, Double Under, Skipping, Ankle Hops, Jump Rope, Ankle Dorsiflexion (band), Bike (Meters), Enbenig tåhävning, Hälgång

**Core (23):**
Ab Wheel Rollouts, Bird Dog, Dead Bug, Farmers Walk, L-Sit, Pallof Press, Planka, Rysk Twist, Sidplank, Slädragning, Slädtryckning, Mountain Climber, Back Extension, Copenhagen Plank, Farmers Carry (HYROX), GHD Sit-Up, Hanging Knee Raise, Sandbag Carry, Stir the Pot, Toes-to-Bar, V-Up, Suitcase Carry, KB Windmill, Sit-Up, Hip Extension, Pallof Press (band), Knees-to-Elbow

**Upper Body (16):**
Bänkpress (2), Dips, Handstående Armhävning, Chins (2), Armhävning (2), Rodd (Kalorier), Bent Over Row, Box Dips, Burpee Pull-Up, Butterfly Pull-Up, Chest-to-Bar Pull-Up, Devil Press (Stång), Muscle-Up (Ringar), Pendlay Row, DB Push Press, DB Row, DB Strict Press, Kipping Pull-Up, Handstand Walk, Ring Dip
