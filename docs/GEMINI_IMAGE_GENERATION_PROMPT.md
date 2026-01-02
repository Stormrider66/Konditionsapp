# Exercise Image Generation Guide for Gemini 3 Pro

## Progress Status

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Completed | **82** | 45.3% |
| ❌ Remaining | **99** | 54.7% |
| **Total** | **181** | 100% |

**Last Updated**: 2 January 2026

### Recent Upload (2 Jan 2026)
- **94 images** uploaded to Supabase storage
- **82 exercises** synced to database
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

### What TO Include
- Clear demonstration of the exercise movement/position
- Glowing highlights on PRIMARY muscles being worked
- Subtle highlights on secondary/stabilizing muscles
- Anatomical labels pointing to key muscle groups
- Clean, professional appearance

### What NOT to Include
- ❌ NO exercise names burned into the image (we add these dynamically for translation)
- ❌ NO rep counts or set information
- ❌ NO branding or logos
- ❌ NO background distractions (gym equipment, other people)
- ❌ NO text except anatomical muscle labels

---

## Male/Female Variants

For exercises where body type matters for demonstration, generate BOTH male and female versions:

| Filename | Description |
|----------|-------------|
| `exercise-1.png` | Male version (primary) |
| `exercise-2.png` | Female version (alternate) |

**Priority exercises for dual variants:**
- Compound lifts (squat, deadlift, bench press)
- Hip-focused exercises (hip thrust, lunges)
- Upper body (pull-ups, push-ups, rows)

We already have dual variants for:
- ✅ Knäböj (Squat) - 2 images
- ✅ Marklyft (Deadlift) - 2 images

---

## Technical Specifications

| Property | Value |
|----------|-------|
| **Aspect Ratio** | 9:16 (vertical, mobile-first) |
| **Resolution** | 832 × 1472 pixels |
| **File Size** | ~700-800 KB per image |
| **Format** | PNG (preferred) or WebP |
| **Color Space** | sRGB |

---

## File Naming Convention

```
{exercise-slug}-{index}.png
```

- `exercise-slug`: Lowercase, hyphens for spaces, no special characters
- `index`: 1-based number (1, 2, 3...) for multiple images per exercise

**Examples:**
- `romanian-deadlift-1.png`
- `squat-1.png`, `squat-2.png` (male/female variants)
- `pull-up-1.png`

---

## Folder Structure

Organize images by biomechanical pillar:

```
public/images/
├── posterior-chain/     # Hip hinge, deadlifts, glute work
├── knee-dominance/      # Squats, lunges, leg press
├── unilateral/          # Single-leg work, balance
├── foot-ankle/          # Calf work, ankle stability, cardio machines
├── core/                # Anti-rotation, planks, carries
└── upper-body/          # Push, pull, press
```

---

## REMAINING EXERCISES (99 total)

### POSTERIOR_CHAIN - 30 remaining
**Folder: `posterior-chain/`**

| Swedish Name | English Name | Filename | Target Muscles |
|-------------|--------------|----------|----------------|
| Bar Facing Burpee | Bar Facing Burpee | bar-facing-burpee-1.png | Full Body |
| Clamshells med band | Clamshells with Band | clamshells-med-band-1.png | Gluteus Medius |
| Depth to Broad Jump | Depth to Broad Jump | depth-to-broad-jump-1.png | Legs |
| Enbensbrygga | Single-Leg Bridge | enbensbrygga-1.png | Gluteus, Hamstrings |
| Fire Hydrants | Fire Hydrants | fire-hydrants-1.png | Gluteus Medius |
| Hängande Power Frivändning | Hang Power Clean | hang-power-clean-1.png | Full Body |
| Hängande Power Ryck | Hang Power Snatch | hang-power-snatch-1.png | Full Body |
| Hip hikes | Hip Hikes | hip-hikes-1.png | Gluteus Medius |
| Höftbrygga | Hip Bridge | hoftbrygga-1.png | Gluteus, Hamstrings |
| KB Thruster | KB Thruster | kb-thruster-1.png | Full Body |
| Benlös Repklättring | Legless Rope Climb | legless-rope-climb-1.png | Upper Body |
| Man Maker | Man Maker | man-maker-1.png | Full Body |
| Medicinboll Frivändning | Med Ball Clean | med-ball-clean-1.png | Full Body |
| Pushstöt | Push Jerk | push-jerk-1.png | Full Body |
| Reverse Hyperextension | Reverse Hyperextension | reverse-hyperextension-1.png | Gluteus, Lower Back |
| Repklättring | Rope Climb | rope-climb-1.png | Upper Body |
| Sandsäck Frivändning | Sandbag Clean | sandbag-clean-1.png | Full Body |
| Sandsäck Frivändning | Sandbag Clean | sandbag-clean-1.png | Full Body |
| Slädtryckning (HYROX) | Sled Push (HYROX) | sled-push-hyrox-1.png | Legs |
| Sumo Marklyft Högt Drag | Sumo Deadlift High Pull | sumo-deadlift-high-pull-1.png | Full Body |
| Thruster | Thruster | thruster-1.png | Full Body |
| Wall Balls (HYROX) | Wall Balls (HYROX) | wall-balls-hyrox-1.png | Full Body |

---

### KNEE_DOMINANCE - 19 remaining
**Folder: `knee-dominance/`**

| Swedish Name | English Name | Filename | Target Muscles |
|-------------|--------------|----------|----------------|
| Countermovement Jumps | Countermovement Jumps | countermovement-jumps-1.png | Legs |
| Cyclist Squat | Cyclist Squat | cyclist-squat-1.png | Quadriceps |
| Hantel Box Step-Over | DB Box Step-Over | db-box-step-over-1.png | Legs |
| Hantel Knäböj | DB Squat | db-squat-1.png | Legs |
| Depth Jumps (30cm) | Depth Jumps (30cm) | depth-jumps-30cm-1.png | Legs |
| Depth Jumps (40cm) | Depth Jumps (40cm) | depth-jumps-40cm-1.png | Legs |
| Drop Jumps | Drop Jumps | drop-jumps-1.png | Legs |
| Hurdle Hops | Hurdle Hops | hurdle-hops-1.png | Legs |
| Lådhopp (18-24") | Box Jump (18-24") | ladhopp-18-24-1.png | Legs |
| Låga lådhopp | Low Box Jumps | laga-ladhopp-1.png | Legs, Calves |
| Overhead Utfall | Overhead Lunge | overhead-lunge-1.png | Full Body |
| Sandsäck Utfall (HYROX) | Sandbag Lunges (HYROX) | sandbag-lunges-hyrox-1.png | Legs |
| Split Squat | Split Squat | split-squat-1.png | Quadriceps, Gluteus |
| Squat Frivändning | Squat Clean | squat-clean-1.png | Full Body |
| Squat Jumps | Squat Jumps | squat-jumps-1.png | Quadriceps, Gluteus |
| Squat Ryck | Squat Snatch | squat-snatch-1.png | Full Body |
| Tuck Jumps | Tuck Jumps | tuck-jumps-1.png | Legs, Core |
| Utfallssteg | Walking Lunge | walking-lunge-1.png | Legs |

---

### UNILATERAL - 13 remaining
**Folder: `unilateral/`**

| Swedish Name | English Name | Filename | Target Muscles |
|-------------|--------------|----------|----------------|
| Enbenhopp (Bounds) | Single-Leg Bounds | enbenhopp-bounds-1.png | Legs |
| Enbenig benpress | Single-Leg Press | enbenig-benpress-1.png | Quadriceps, Gluteus |
| Lateral Bounds | Lateral Bounds | lateral-bounds-1.png | Legs, Gluteus Medius |
| Lateral Lunges | Lateral Lunges | lateral-lunges-1.png | Adductors, Gluteus Medius |
| Pistol Squat Progression | Pistol Squat Progression | pistol-squat-progression-1.png | Quadriceps, Balance |
| Repeated Bounds | Repeated Bounds | repeated-bounds-1.png | Legs |
| Single Under | Single Under | single-under-1.png | Full Body |
| Skater Squats | Skater Squats | skater-squats-1.png | Quadriceps, Balance |
| Hoppande utfall | Split Jumps | split-jumps-1.png | Legs |
| Step-Ups (hög) | Step-Ups (high) | step-ups-hog-1.png | Quadriceps, Gluteus |
| Step-Ups (låg) | Step-Ups (low) | step-ups-lag-1.png | Quadriceps, Gluteus |
| Triple Jump | Triple Jump | triple-jump-1.png | Legs |

---

### FOOT_ANKLE - 17 remaining
**Folder: `foot-ankle/`**

| Swedish Name | English Name | Filename | Target Muscles |
|-------------|--------------|----------|----------------|
| Ankel dorsalflexion (band) | Ankle Dorsiflexion (band) | ankel-dorsalflexion-band-1.png | Tibialis Anterior |
| Ankelhopp | Ankle Hops | ankelhopp-1.png | Calves, Ankle |
| Cykel (Meter) | Bike (Meters) | bike-meters-1.png | Legs |
| Double Under | Double Under | double-under-1.png | Full Body |
| Enbenig tåhävning | Single-Leg Calf Raise | enbenig-tahavning-1.png | Gastrocnemius, Soleus |
| Hälgång | Heel Walk | halgang-1.png | Tibialis Anterior |
| Hopprep | Jump Rope | hopprep-1.png | Calves, Ankle |
| Lateral Hops | Lateral Hops | lateral-hops-1.png | Legs, Calves |
| Marmor-pickups | Marble Pickups | marmor-pickups-1.png | Intrinsic Foot Muscles |
| Löpning | Running | running-1.png | Cardio, Full Body |
| Ski Erg (Kalorier) | Ski Erg (Calories) | ski-erg-calories-1.png | Upper Body |
| Ski Erg (Meter) | Ski Erg (Meters) | ski-erg-meters-1.png | Upper Body |
| Skipping | Skipping | skipping-1.png | Legs, Calves |
| Simning | Swimming | swimming-1.png | Full Body |
| Toe Yoga | Toe Yoga | toe-yoga-1.png | Intrinsic Foot Muscles |
| Triple Under | Triple Under | triple-under-1.png | Full Body |

---

### ANTI_ROTATION_CORE - 16 remaining
**Folder: `core/`**

| Swedish Name | English Name | Filename | Target Muscles |
|-------------|--------------|----------|----------------|
| Höftextension | Hip Extension | hip-extension-1.png | Posterior Chain |
| KB Windmill | KB Windmill | kb-windmill-1.png | Core |
| Knees-to-Elbow | Knees-to-Elbow | knees-to-elbow-1.png | Core |
| Pallof Press (band) | Pallof Press (band) | pallof-press-band-1.png | Obliques, Core |
| Sandsäck Över Axeln | Sandbag Over Shoulder | sandbag-over-shoulder-1.png | Full Body |
| Sit-Up | Sit-Up | sit-up-1.png | Core |
| Stir the Pot | Stir the Pot | stir-the-pot-1.png | Core |
| Suitcase Carry | Suitcase Carry | suitcase-carry-1.png | Obliques, Core |
| Toes-to-Bar | Toes-to-Bar | toes-to-bar-1.png | Core |
| V-Up | V-Up | v-up-1.png | Core |
| Yoke Walk | Yoke Carry | yoke-carry-1.png | Full Body |

---

### UPPER_BODY - 21 remaining
**Folder: `upper-body/`**

| Swedish Name | English Name | Filename | Target Muscles |
|-------------|--------------|----------|----------------|
| Hantel Pushpress | DB Push Press | db-push-press-1.png | Shoulders |
| Hantel Rodd | DB Row | db-row-1.png | Back |
| Hantel Militärpress | DB Strict Press | db-strict-press-1.png | Shoulders |
| Devil Press | Devil Press | devil-press-1.png | Full Body |
| Handstående Gång | Handstand Walk | handstand-walk-1.png | Shoulders |
| Kipping Chins | Kipping Pull-Up | kipping-pull-up-1.png | Back |
| Pendlay Rodd | Pendlay Row | pendlay-row-1.png | Back |
| Pike Push-Up | Pike Push-Up | pike-push-up-1.png | Shoulders |
| Pushpress | Push Press | push-press-1.png | Shoulders |
| Ring Dips | Ring Dip | ring-dip-1.png | Triceps |
| Ring Rodd | Ring Row | ring-row-1.png | Back |
| Rodd (Meter) | Row (Meters) | row-meters-1.png | Full Body |
| Rodd (HYROX) | Rowing (HYROX) | rowing-hyrox-1.png | Full Body |
| Strikt Handstående Armhävning | Strict Handstand Push-Up | strict-handstand-push-up-1.png | Shoulders |
| Militärpress | Strict Press | strict-press-1.png | Shoulders |
| Strikt Ring Dips | Strict Ring Dip | strict-ring-dip-1.png | Triceps |
| Väggklättring | Wall Walk | wall-walk-1.png | Shoulders |

---

## COMPLETED EXERCISES (82 synced to database)

### ✅ Already Generated & Synced

**Posterior Chain (27 exercises, 28 images):**
Amerikansk Kettlebell Swing, Lådhopp, Boxhopp Över, Bred hopp (max), Burpee, Burpee Boxhopp Över, Stöt, Hantel Ryck, Hängande Frivändning, Hängande Ryck, Hip Thrust med skivstång (2), Kettlebell Swing, Marklyft (2), Power Frivändning, Power Ryck, Rumänsk marklyft, Good Morning, Turkish Get-Up, Burpee Broad Jump, Cluster, Cable Pull-Through, SkiErg, Sumo Deadlift, KB Clean, KB Snatch, Split Jerk, DB Clean, DB Deadlift, DB Thruster

**Knee Dominance (14 exercises, 19 images):**
Frontknäböj (2), Goblet Squat (2), Hoppsquat, Knäböj (2), Step-Up, Pistol Squat, Benpress, Luftknäböj, Bakåtlunges (2), Overhead Squat, Wall Sit, Wall Ball

**Unilateral (6 exercises, 6 images):**
Bulgarisk utfallsböj, Enbenig rumänsk marklyft, Step-Ups med knädrive, Curtsy Lunges, Box Pistol, Hantel Ryck (female)

**Foot/Ankle (5 exercises, 6 images):**
Assault Bike (Kalorier) (2), Pogo Jumps, Tåhävningar (böjda ben), Tåhävningar (raka ben), Cykel (Kalorier)

**Core (18 exercises, 18 images):**
Ab Wheel Rollouts, Bird Dog, Dead Bug, Farmers Walk, L-Sit, Pallof Press, Planka, Rysk Twist, Sidplank, Slädragning, Slädtryckning, Mountain Climber, Ryggextension, Copenhagen Plank, Farmers Carry (HYROX), GHD Sit-Up, Hängande Knälyft, Sandsäcksbärning

**Upper Body (12 exercises, 17 images):**
Bänkpress (2), Dips, Handstående Armhävning, Chins (2), Armhävning (2), Rodd (Kalorier), Böjd Rodd, Box Dips, Burpee Chins, Butterfly Chins, Chest-to-Bar, Muscle-Up (Stång), Muscle-Up (Ringar)

---

## Example Prompt for Gemini 3 Pro

```
Generate an anatomical exercise illustration for [EXERCISE NAME].

Style requirements:
- Dark moody background (gradient from #1a1a2e to #0f0f23)
- Orange/red glow highlighting the primary working muscles
- Anatomical labels in Latin (e.g., "GLUTEUS MAXIMUS", "QUADRICEPS")
- 9:16 vertical aspect ratio (832 x 1472 pixels)
- Professional, athletic, educational aesthetic
- Show the exercise in the key position that best demonstrates muscle engagement
- [MALE/FEMALE] athlete demonstrating the movement

Primary muscles to highlight:
[LIST PRIMARY MUSCLES]

Secondary muscles (subtle highlight):
[LIST SECONDARY MUSCLES]

Do NOT include:
- Exercise name text
- Rep/set information
- Gym equipment background
- Other people
```

---

## Batch Generation Prompt

For generating multiple exercises at once:

```
Generate anatomical exercise illustrations for the following exercises.
Each image should follow these specifications:

STYLE:
- Dark moody background (#1a1a2e to #0f0f23 gradient)
- Orange/red glow on active muscles
- Latin anatomical labels only
- 9:16 vertical (832 x 1472 px)
- Professional athletic aesthetic

EXERCISES TO GENERATE:

1. [Exercise Name] - Primary: [muscles], Secondary: [muscles]
2. [Exercise Name] - Primary: [muscles], Secondary: [muscles]
3. [Exercise Name] - Primary: [muscles], Secondary: [muscles]
...

Save each as: {exercise-slug}-1.png
```

---

## Upload Process

After generating images:

1. Organize into folders by pillar (see folder structure above)
2. Verify filenames match the convention: `{slug}-1.png`
3. Run upload script:
   ```bash
   # Preview (dry run)
   node scripts/test-upload.mjs --source ./public/images --dry-run

   # Upload for real
   node scripts/test-upload.mjs --source ./public/images
   ```

4. If slug doesn't match, add mapping to `scripts/test-upload.mjs`:
   ```javascript
   const SLUG_TO_EXERCISE = {
     'your-slug': 'Swedish Exercise Name',
   }
   ```

---

## Summary

- **Completed**: 82 exercises (45.3%) - 94 images synced
- **Remaining**: 99 exercises (54.7%)
- **Sport Hero Images**: 18 images across 7 sports (folders ready, images pending)
- **Image formats**:
  - Exercises: 832×1472px PNG (9:16 vertical)
  - Sport Heroes: 1920×1080px PNG (16:9 horizontal)
- **Style**: Dark background, orange muscle/athlete glow
- **No text**: Names/labels added dynamically by app
- **Organization**: 6 pillar folders + 7 sport folders
- **Variants**: 9 exercises have male + female versions

---

## SPORT HERO IMAGES (NEW - Dashboard Hero Cards)

These images are used on the **athlete dashboard hero card** to represent different sports/workout types. They appear as background images with 40% opacity and `mix-blend-screen` effect.

### Purpose
When an athlete has a cardio workout (running, cycling, swimming, etc.), the hero card displays an inspiring sport-specific image instead of an exercise illustration.

### Folder Structure
```
public/images/
├── sports/                    # NEW - Sport hero images
│   ├── running/
│   ├── cycling/
│   ├── swimming/
│   ├── skiing/
│   ├── triathlon/
│   ├── hyrox/
│   └── recovery/
```

### Style Requirements for Sport Images

**Visual Aesthetic:**
- **Background**: Same dark gradient (#1a1a2e to #0f0f23)
- **Athlete silhouette**: Dynamic action pose with subtle orange/red glow outline
- **Motion blur**: Slight motion effect to convey movement and energy
- **Lighting**: Dramatic side/back lighting with orange accent glow
- **Mood**: Inspiring, powerful, aspirational
- **NO muscle labels** - these are motivational, not educational

**What TO Include:**
- Athlete in peak action moment (mid-stride, cycling power phase, diving into water, etc.)
- Dramatic lighting with orange/red accent glow
- Sense of motion and energy
- Professional, cinematic quality

**What NOT to Include:**
- NO text of any kind
- NO branding or logos
- NO background distractions (crowds, buildings)
- NO faces (silhouette/back view preferred for universal appeal)
- NO specific equipment branding

### Technical Specifications

| Property | Value |
|----------|-------|
| **Aspect Ratio** | 16:9 (horizontal, for hero card background) |
| **Resolution** | 1920 x 1080 pixels |
| **File Size** | ~500-700 KB per image |
| **Format** | PNG (preferred) or WebP |
| **Color Space** | sRGB |

### Sport Hero Images to Generate

**Folder: `sports/running/`**

| Filename | Description | Key Elements |
|----------|-------------|--------------|
| `running-interval-1.png` | Runner at peak sprint | Track/road, explosive stride, orange glow on legs |
| `running-easy-1.png` | Relaxed distance run | Trail or path, smooth form, blue-green tones with orange accent |
| `running-threshold-1.png` | Focused tempo effort | Slight lean forward, determined posture, warm orange tones |

**Folder: `sports/cycling/`**

| Filename | Description | Key Elements |
|----------|-------------|--------------|
| `cycling-road-1.png` | Road cyclist climbing | Aerodynamic position, power through pedals, mountain backdrop silhouette |
| `cycling-interval-1.png` | Indoor/trainer intensity | Dramatic sweat droplets, visible effort, red/orange heat glow |
| `cycling-easy-1.png` | Cruising on flat road | Smooth cadence, relaxed position, softer blue/orange palette |

**Folder: `sports/swimming/`**

| Filename | Description | Key Elements |
|----------|-------------|--------------|
| `swimming-freestyle-1.png` | Freestyle stroke | Underwater/surface view, arm extension, water droplets with glow |
| `swimming-pool-1.png` | Lap swimming | Lane lines visible, streamlined position, blue tones with orange accent |
| `swimming-openwater-1.png` | Open water swimming | Sunrise/sunset tones, vast water, silhouette swimmer |

**Folder: `sports/skiing/`**

| Filename | Description | Key Elements |
|----------|-------------|--------------|
| `skiing-classic-1.png` | Classic technique | Diagonal stride, snowy trail, cold blue with warm orange athlete glow |
| `skiing-skate-1.png` | Skating technique | V-position, powerful push, dynamic angle |
| `skiing-downhill-1.png` | Downhill skiing | Speed tuck, motion blur, dramatic mountain backdrop |

**Folder: `sports/triathlon/`**

| Filename | Description | Key Elements |
|----------|-------------|--------------|
| `triathlon-transition-1.png` | T1 or T2 transition | Multiple sport equipment silhouettes, athlete in motion |
| `triathlon-combined-1.png` | Split composition | Three panels showing swim/bike/run, unified by orange glow |

**Folder: `sports/hyrox/`**

| Filename | Description | Key Elements |
|----------|-------------|--------------|
| `hyrox-station-1.png` | Functional fitness station | Sled/SkiErg/burpees implied, intense effort, industrial vibe |
| `hyrox-run-1.png` | HYROX running segment | Track running with competition energy, race atmosphere |

**Folder: `sports/recovery/`**

| Filename | Description | Key Elements |
|----------|-------------|--------------|
| `recovery-rest-1.png` | Peaceful recovery | Stretching or meditation pose, calming blue/teal tones, soft glow |
| `recovery-active-1.png` | Active recovery | Light movement like walking/yoga, gentle energy, balanced palette |

---

### Example Prompt for Sport Hero Images

```
Generate a cinematic sport hero image for [SPORT] [INTENSITY].

Style requirements:
- Dark moody background (gradient from #1a1a2e to #0f0f23)
- Athlete silhouette with orange/red edge glow
- 16:9 horizontal aspect ratio (1920 x 1080 pixels)
- Dynamic action pose showing peak moment of the movement
- Dramatic side or back lighting with orange accent
- Slight motion blur to convey energy and movement
- Professional, cinematic, inspirational aesthetic
- Show athlete from behind or side (no face)

Sport: [RUNNING/CYCLING/SWIMMING/SKIING/TRIATHLON/HYROX]
Intensity: [EASY/THRESHOLD/INTERVAL]
Setting: [trail/track/road/pool/mountain/indoor]

Do NOT include:
- Any text
- Branding or logos
- Other people or crowds
- Distracting background elements
```

---

### Integration with Hero Card

After generating images, update the `CATEGORY_IMAGES` mapping in `components/athlete/dashboard/HeroWorkoutCard.tsx`:

```typescript
const CATEGORY_IMAGES: Record<string, string[]> = {
  // Existing strength exercise images...

  // NEW: Sport-specific hero images
  'LÖPNING': [
    '/images/sports/running/running-easy-1.png',
    '/images/sports/running/running-interval-1.png',
    '/images/sports/running/running-threshold-1.png',
  ],
  'CYKLING': [
    '/images/sports/cycling/cycling-road-1.png',
    '/images/sports/cycling/cycling-interval-1.png',
    '/images/sports/cycling/cycling-easy-1.png',
  ],
  'SIMNING': [
    '/images/sports/swimming/swimming-freestyle-1.png',
    '/images/sports/swimming/swimming-pool-1.png',
    '/images/sports/swimming/swimming-openwater-1.png',
  ],
  'SKIDÅKNING': [
    '/images/sports/skiing/skiing-classic-1.png',
    '/images/sports/skiing/skiing-skate-1.png',
  ],
  'TRIATHLON': [
    '/images/sports/triathlon/triathlon-combined-1.png',
    '/images/sports/triathlon/triathlon-transition-1.png',
  ],
  'HYROX': [
    '/images/sports/hyrox/hyrox-station-1.png',
    '/images/sports/hyrox/hyrox-run-1.png',
  ],
  'ÅTERHÄMTNING': [
    '/images/sports/recovery/recovery-rest-1.png',
    '/images/sports/recovery/recovery-active-1.png',
  ],
}
```
