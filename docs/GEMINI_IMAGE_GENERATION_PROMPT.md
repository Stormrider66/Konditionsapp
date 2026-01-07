# Exercise Image Generation Guide for Gemini 3 Pro

## Progress Status

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Completed | **209** | 100% |
| 🔄 Can Reuse | **0** | 0% |
| ❌ Need New | **0** | 0% |
| **Total** | **209** | - |

**Last Updated**: 7 January 2026 (Final Sync - Added 8 Missing Images)

### Final Sync (7 Jan 2026)
- **209 images** in local public/images folder
- **All 209 exercises** have corresponding images
- **New Directories Created**: `public/images/mobility`, `public/images/plyometrics`
- **Reuse Completed**: All 6 reusable images copied
- **Generation Completed**: All 25 new images generated
- **HeroWorkoutCard** updated with new categories (RUNNING, CARDIO, HYROX, SWIMMING, POWER, OLYMPIC)

### Previous Uploads
- 3 Jan 2026: 141 images uploaded, 131 exercises synced
- 2 Jan 2026: 94 images uploaded, 135 exercises synced

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

## EXERCISES THAT CAN REUSE EXISTING IMAGES (6)

These exercises have equivalent images already - just copy and rename:

| Exercise | Source Image | Target Image | Directory |
|----------|-------------|--------------|-----------|
| Utfallssteg | `lunge-1.png` | `utfallssteg-1.png` | knee-dominance |
| Rodd | `bent-over-row-1.png` | `rodd-1.png` | upper-body |
| Chins | `pull-up-1.png` | `chins-1.png` | upper-body |
| Crunches | `sit-up-1.png` | `crunches-1.png` | core |
| Armhävningar | `push-up-1.png` | `armhavningar-1.png` | upper-body |
| Dips | `bar-dip-1.png` | `dips-1.png` | upper-body |

---

## REMAINING EXERCISES - NEED NEW IMAGES (25 total)

### POSTERIOR_CHAIN - 4 remaining

| # | Exercise | Swedish | File Name | Muscles |
|---|----------|---------|-----------|---------|
| 1 | **Nordic Hamstring** | Nordisk hamstring | `nordic-hamstring-1.png` | BICEPS FEMORIS, SEMITENDINOSUS |
| 2 | **Glute Kickbacks** | Sparkbaksparkar | `glute-kickbacks-1.png` | GLUTEUS MAXIMUS |
| 3 | **Superman** | Superman | `superman-1.png` | ERECTOR SPINAE, GLUTEUS MAXIMUS |
| 4 | **Foam Rolling** | Foam Rolling | `foam-rolling-1.png` | Various (self-massage) |

**Prompt for Nordic Hamstring:**
```
Athletic person performing Nordic Hamstring Curl exercise. Kneeling position with ankles secured,
lowering torso forward with control. Highlight BICEPS FEMORIS and SEMITENDINOSUS muscles with
orange/red glow. Dark moody background (#1a1a2e gradient). 9:16 vertical aspect ratio.
Modern anatomical illustration style. Latin muscle labels only. No text or title.
```

---

### KNEE_DOMINANCE - 1 remaining

| # | Exercise | Swedish | File Name | Muscles |
|---|----------|---------|-----------|---------|
| 1 | **Sumo Squats** | Sumoknäböj | `sumo-squats-1.png` | ADDUCTORS, GLUTEUS, QUADRICEPS |

**Prompt for Sumo Squats:**
```
Athletic person performing Sumo Squat with wide stance and toes pointed outward. Deep squat position.
Highlight ADDUCTOR MAGNUS, GLUTEUS MAXIMUS, QUADRICEPS with orange/red glow.
Dark moody background (#1a1a2e gradient). 9:16 vertical aspect ratio.
Modern anatomical illustration style. Latin muscle labels only. No text or title.
```

---

### FOOT_ANKLE - 4 remaining

| # | Exercise | Swedish | File Name | Muscles |
|---|----------|---------|-----------|---------|
| 1 | **High Knees** | Höga knän | `high-knees-1.png` | ILIOPSOAS, RECTUS FEMORIS |
| 2 | **Butt Kicks** | Hälarmar | `butt-kicks-1.png` | BICEPS FEMORIS, GASTROCNEMIUS |
| 3 | **Jumping Jacks** | Hampelmannhopp | `jumping-jacks-1.png` | DELTOIDS, CALVES, ADDUCTORS |
| 4 | **Ankelrörlighet** | Ankelrörlighet | `ankelrorlighet-1.png` | GASTROCNEMIUS, SOLEUS |

**Prompt for High Knees:**
```
Athletic person performing High Knees running drill, one knee raised high to hip level.
Dynamic running position. Highlight ILIOPSOAS and RECTUS FEMORIS with orange/red glow.
Dark moody background (#1a1a2e gradient). 9:16 vertical aspect ratio.
Modern anatomical illustration style. Latin muscle labels only. No text or title.
```

---

### ANTI_ROTATION_CORE - 6 remaining

| # | Exercise | Swedish | File Name | Muscles |
|---|----------|---------|-----------|---------|
| 1 | **Bicycle Crunches** | Cykelcrunches | `bicycle-crunches-1.png` | OBLIQUES, RECTUS ABDOMINIS |
| 2 | **Leg Raises** | Benlyft | `leg-raises-1.png` | RECTUS ABDOMINIS, ILIOPSOAS |
| 3 | **Hollow Hold** | Hollow Hold | `hollow-hold-1.png` | RECTUS ABDOMINIS, TRANSVERSUS |
| 4 | **Katt-Ko** | Katt-Ko | `katt-ko-1.png` | ERECTOR SPINAE, RECTUS ABDOMINIS |
| 5 | **Inchworm** | Inchworm | `inchworm-1.png` | CORE, SHOULDERS, HAMSTRINGS |
| 6 | **Höftcirklar** | Höftcirklar | `hoftcirklar-1.png` | HIP FLEXORS, GLUTEUS MEDIUS |

**Prompt for Hollow Hold:**
```
Athletic person performing Hollow Body Hold. Lying supine with arms extended overhead,
legs straight and lifted, lower back pressed to floor creating banana shape.
Highlight RECTUS ABDOMINIS and TRANSVERSUS ABDOMINIS with orange/red glow.
Dark moody background (#1a1a2e gradient). 9:16 vertical aspect ratio.
Modern anatomical illustration style. Latin muscle labels only. No text or title.
```

---

### UPPER_BODY - 7 remaining

| # | Exercise | Swedish | File Name | Muscles |
|---|----------|---------|-----------|---------|
| 1 | **Axelpress** | Axelpress | `axelpress-1.png` | DELTOIDS, TRICEPS |
| 2 | **Inverterad rodd** | Inverterad rodd | `inverterad-rodd-1.png` | LATISSIMUS DORSI, RHOMBOIDS |
| 3 | **Face Pulls** | Face Pulls | `face-pulls-1.png` | POSTERIOR DELTOID, RHOMBOIDS |
| 4 | **Latsdrag** | Latsdrag | `latsdrag-1.png` | LATISSIMUS DORSI, BICEPS |
| 5 | **Wall Angels** | Väggänglar | `wall-angels-1.png` | LOWER TRAPEZIUS, SERRATUS |
| 6 | **Prone Y-raise** | Y-lyft liggande | `prone-y-raise-1.png` | LOWER TRAPEZIUS, POSTERIOR DELTOID |
| 7 | **Bensving** | Bensving | `bensving-1.png` | HIP FLEXORS, HAMSTRINGS |

**Prompt for Face Pulls:**
```
Athletic person performing Face Pulls with cable or resistance band. Pulling towards face
with elbows high, external rotation at shoulders. Highlight POSTERIOR DELTOID and RHOMBOIDS
with orange/red glow. Dark moody background (#1a1a2e gradient). 9:16 vertical aspect ratio.
Modern anatomical illustration style. Latin muscle labels only. No text or title.
```

---

### MOBILITY/PLYOMETRIC - 3 remaining

| # | Exercise | Swedish | File Name | Muscles |
|---|----------|---------|-----------|---------|
| 1 | **Världens bästa stretch** | Världens bästa stretch | `varldens-basta-stretch-1.png` | HIP FLEXORS, THORACIC SPINE |
| 2 | **Hurdle Hops** | Hurdle Hops | `hurdle-hops-1.png` | QUADRICEPS, CALVES |
| 3 | **Drop Jumps** | Drop Jumps | `drop-jumps-1.png` | QUADRICEPS, CALVES, GLUTES |

**Prompt for World's Greatest Stretch:**
```
Athletic person performing World's Greatest Stretch. Deep lunge position with one hand on ground,
other arm reaching toward ceiling in thoracic rotation. Highlight HIP FLEXORS and THORACIC SPINE
with orange/red glow. Dark moody background (#1a1a2e gradient). 9:16 vertical aspect ratio.
Modern anatomical illustration style. Latin muscle labels only. No text or title.
```

---

## COMPLETED EXERCISES (157)

### ✅ Already Generated & Synced

**Posterior Chain (45):**
Amerikansk Kettlebell Swing, Lådhopp, Boxhopp Över, Bred hopp (max), Burpee, Burpee Boxhopp Över, Frivändning, Stöt, Hantel Ryck, Hängande Frivändning, Hängande Ryck, Hip Thrust med skivstång (2), Kettlebell Swing, Marklyft (2), Muscle-Up (Stång), Muscle-Up (Ringar), Power Frivändning, Power Ryck, Rumänsk marklyft, Ryck, Wall Ball, Good Morning, Turkish Get-Up, Burpee Broad Jump, Cluster, Cable Pull-Through, SkiErg, Sumo Deadlift, KB Clean, KB Snatch, Split Jerk, DB Clean, DB Deadlift, DB Thruster, Clamshells with Band, Reverse Hyperextension, Hang Power Clean, Single-Leg Bridge, Fire Hydrants, KB Thruster, Man Maker, Med Ball Clean, Legless Rope Climb, Push Jerk, Rope Climb, Sandbag Clean, Sled Push (HYROX), Sumo Deadlift High Pull, Thruster, Wall Balls (HYROX), Bar Facing Burpee, Depth to Broad Jump, Hang Power Snatch, Hip Hikes, Hip Bridge

**Knee Dominance (21):**
Frontknäböj (2), Goblet Squat (2), Hoppsquat, Knäböj (2), Step-Up, Pistol Squat, Benpress, Air Squat, Utfall (2), Overhead Squat, Wall Sit, Countermovement Jumps, Cyclist Squat, DB Box Step-Over, Box Jump (18-24"), Low Box Jumps, Overhead Lunge, Sandbag Lunges (HYROX), Split Squat, Squat Clean, Squat Jumps, Squat Snatch, Tuck Jumps, Depth Jumps (30cm), Depth Jumps (40cm)

**Unilateral (17) ✅ COMPLETE:**
Bakåtlunges (2), Bulgarisk utfallsböj, Enbenig rumänsk marklyft, Step-Ups med knädrive, Curtsy Lunges, Box Pistol, Lateral Bounds, Enbenig benpress, Lateral Lunges, Single-Leg Bounds, Pistol Squat Progression, Step-Ups (high), Single Under, Repeated Bounds, Skater Squats, Split Jumps, Triple Jump

**Foot/Ankle (14):**
Assault Bike (Kalorier), Pogo Jumps, Tåhävningar (böjda ben), Tåhävningar (raka ben), Bike (Calories), Running, Double Under, Skipping, Ankle Hops, Jump Rope, Ankle Dorsiflexion (band), Bike (Meters), Enbenig tåhävning, Hälgång, Lateral Hops, Marble Pickups, Swimming, Toe Yoga

**Core (27):**
Ab Wheel Rollouts, Bird Dog, Dead Bug, Farmers Walk, L-Sit, Pallof Press, Planka, Rysk Twist, Sidplank, Slädragning, Slädtryckning, Mountain Climber, Back Extension, Copenhagen Plank, Farmers Carry (HYROX), GHD Sit-Up, Hanging Knee Raise, Sandbag Carry, Stir the Pot, Toes-to-Bar, V-Up, Suitcase Carry, KB Windmill, Sit-Up, Hip Extension, Pallof Press (band), Knees-to-Elbow, Sandbag Over Shoulder, Yoke Carry

**Upper Body (23):**
Bänkpress (2), Dips, Handstående Armhävning, Chins (2), Armhävning (2), Rodd (Kalorier), Bent Over Row, Box Dips, Burpee Pull-Up, Butterfly Pull-Up, Chest-to-Bar Pull-Up, Devil Press, Muscle-Up (Ringar), Muscle-Up (Stång), Pendlay Row, DB Push Press, DB Row, DB Strict Press, Kipping Pull-Up, Handstand Walk, Ring Dip, Ring Row, Row (Meters), Rowing (HYROX), Strict Handstand Push-Up
