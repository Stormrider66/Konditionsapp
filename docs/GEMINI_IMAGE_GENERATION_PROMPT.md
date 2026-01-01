# Exercise Image Generation Guide for Gemini 3 Pro

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

## Technical Specifications

| Property | Value |
|----------|-------|
| **Aspect Ratio** | 9:16 (vertical, mobile-first) |
| **Resolution** | 832 × 1472 pixels |
| **File Size** | ~700-800 KB per image |
| **Format** | WebP (preferred) or PNG |
| **Color Space** | sRGB |

---

## File Naming Convention

```
{exercise-slug}-{index}.webp
```

- `exercise-slug`: Lowercase, hyphens for spaces, no special characters
- `index`: 1-based number (1, 2, 3...) for multiple images per exercise

**Examples:**
- `romanian-deadlift-1.webp`
- `squat-1.webp`, `squat-2.webp` (multiple angles)
- `pull-up-1.webp`

---

## Folder Structure

Organize images by biomechanical pillar:

```
images/
├── posterior-chain/     # Hip hinge, deadlifts, glute work
│   ├── romanian-deadlift-1.webp
│   ├── kettlebell-swing-1.webp
│   └── ...
├── knee-dominance/      # Squats, lunges, leg press
│   ├── front-squat-1.webp
│   ├── lunge-1.webp
│   └── ...
├── unilateral/          # Single-leg work, balance
│   ├── pistol-squat-1.webp
│   ├── split-jumps-1.webp
│   └── ...
├── foot-ankle/          # Calf work, ankle stability, cardio machines
│   ├── pogo-jumps-1.webp
│   ├── double-under-1.webp
│   └── ...
├── core/                # Anti-rotation, planks, carries
│   ├── pallof-press-1.webp
│   ├── dead-bug-1.webp
│   └── ...
└── upper-body/          # Push, pull, press
    ├── pull-up-1.webp
    ├── strict-press-1.webp
    └── ...
```

---

## Complete Exercise List (181 exercises)

### POSTERIOR_CHAIN (56 exercises)
**Folder: `posterior-chain/`**
**Focus: Hip hinge movements, glute/hamstring dominant**

| Swedish Name | English Name | Filename | Target Muscles |
|-------------|--------------|----------|----------------|
| Amerikansk Kettlebell Swing | American Kettlebell Swing | american-kettlebell-swing-1.webp | Full Body |
| Bar Facing Burpee | Bar Facing Burpee | bar-facing-burpee-1.webp | Full Body |
| Lådhopp | Box Jump | box-jump-1.webp | Legs |
| Boxhopp Över | Box Jump Over | box-jump-over-1.webp | Legs |
| Bred hopp (max) | Bred hopp (max) | bred-hopp-max-1.webp | Ben |
| Burpee | Burpee | burpee-1.webp | Full Body |
| Burpee Boxhopp Över | Burpee Box Jump Over | burpee-box-jump-over-1.webp | Full Body |
| Burpee Längdhopp | Burpee Broad Jump | burpee-broad-jump-1.webp | Full Body |
| Cable Pull-Through | Cable Pull-Through | cable-pull-through-1.webp | Gluteus, Hamstrings |
| Clamshells med band | Clamshells med band | clamshells-med-band-1.webp | Gluteus Medius |
| Frivändning | Clean | clean-1.webp | Full Body |
| Stöt | Clean & Jerk | clean-jerk-1.webp | Full Body |
| Cluster | Cluster | cluster-1.webp | Full Body |
| Hantel Frivändning | DB Clean | db-clean-1.webp | Full Body |
| Hantel Marklyft | DB Deadlift | db-deadlift-1.webp | Posterior Chain |
| Hantel Ryck | DB Snatch | db-snatch-1.webp | Full Body |
| Hantel Thruster | DB Thruster | db-thruster-1.webp | Full Body |
| Depth to Broad Jump | Depth to Broad Jump | depth-to-broad-jump-1.webp | Legs |
| Enbensbrygga | Single-Leg Bridge | enbensbrygga-1.webp | Gluteus, Hamstrings |
| Fire Hydrants | Fire Hydrants | fire-hydrants-1.webp | Gluteus Medius |
| Good Mornings | Good Morning | good-morning-1.webp | Posterior Chain |
| Hängande Frivändning | Hang Clean | hang-clean-1.webp | Full Body |
| Hängande Power Frivändning | Hang Power Clean | hang-power-clean-1.webp | Full Body |
| Hängande Power Ryck | Hang Power Snatch | hang-power-snatch-1.webp | Full Body |
| Hängande Ryck | Hang Snatch | hang-snatch-1.webp | Full Body |
| Hip hikes | Hip hikes | hip-hikes-1.webp | Gluteus Medius |
| Hip Thrust med skivstång | Barbell Hip Thrust | hip-thrust-med-skivstang-1.webp | Gluteus, Hamstrings |
| Höftbrygga | Hip Bridge | hoftbrygga-1.webp | Gluteus, Hamstrings |
| KB Frivändning | KB Clean | kb-clean-1.webp | Full Body |
| KB Ryck | KB Snatch | kb-snatch-1.webp | Full Body |
| KB Thruster | KB Thruster | kb-thruster-1.webp | Full Body |
| Kettlebell Swing | Kettlebell Swing | kettlebell-swing-1.webp | Posterior Chain |
| Benlös Repklättring | Legless Rope Climb | legless-rope-climb-1.webp | Upper Body |
| Man Maker | Man Maker | man-maker-1.webp | Full Body |
| Marklyft | Deadlift | marklyft-1.webp | Legs |
| Medicinboll Frivändning | Med Ball Clean | med-ball-clean-1.webp | Full Body |
| Muscle-Up (Stång) | Muscle-Up (Bar) | muscle-up-bar-1.webp | Upper Body |
| Muscle-Up (Ringar) | Muscle-Up (Ring) | muscle-up-ring-1.webp | Upper Body |
| Power Frivändning | Power Clean | power-clean-1.webp | Full Body |
| Power Ryck | Power Snatch | power-snatch-1.webp | Full Body |
| Pushstöt | Push Jerk | push-jerk-1.webp | Full Body |
| Reverse Hyperextension | Reverse Hyperextension | reverse-hyperextension-1.webp | Gluteus, Hamstrings, Lower Back |
| Rumänsk marklyft | Romanian Deadlift | romanian-deadlift-1.webp | Posterior Chain |
| Repklättring | Rope Climb | rope-climb-1.webp | Upper Body |
| Sandsäck Frivändning | Sandbag Clean | sandbag-clean-1.webp | Full Body |
| SkiErg | SkiErg | skierg-1.webp | Upper Body |
| Slädragning (HYROX) | Sled Pull (HYROX) | sled-pull-hyrox-1.webp | Full Body |
| Slädtryckning (HYROX) | Sled Push (HYROX) | sled-push-hyrox-1.webp | Legs |
| Ryck | Snatch | snatch-1.webp | Full Body |
| Splitstöt | Split Jerk | split-jerk-1.webp | Full Body |
| Sumo Marklyft | Sumo Deadlift | sumo-deadlift-1.webp | Posterior Chain |
| Sumo Marklyft Högt Drag | Sumo Deadlift High Pull | sumo-deadlift-high-pull-1.webp | Full Body |
| Thruster | Thruster | thruster-1.webp | Full Body |
| Turkish Get-Up | Turkish Get-Up | turkish-get-up-1.webp | Full Body |
| Wall Ball | Wall Ball | wall-ball-1.webp | Full Body |
| Wall Balls (HYROX) | Wall Balls (HYROX) | wall-balls-hyrox-1.webp | Full Body |

---

### KNEE_DOMINANCE (29 exercises)
**Folder: `knee-dominance/`**
**Focus: Quad-dominant, squatting patterns**

| Swedish Name | English Name | Filename | Target Muscles |
|-------------|--------------|----------|----------------|
| Luftknäböj | Air Squat | air-squat-1.webp | Legs |
| Benpress | Leg Press | benpress-1.webp | Quadriceps, Gluteus |
| Countermovement Jumps | Countermovement Jumps | countermovement-jumps-1.webp | Legs |
| Cyclist Squat | Cyclist Squat | cyclist-squat-1.webp | Quadriceps |
| Hantel Box Step-Over | DB Box Step-Over | db-box-step-over-1.webp | Legs |
| Hantel Knäböj | DB Squat | db-squat-1.webp | Legs |
| Depth Jumps (30cm) | Depth Jumps (30cm) | depth-jumps-30cm-1.webp | Legs |
| Depth Jumps (40cm) | Depth Jumps (40cm) | depth-jumps-40cm-1.webp | Legs |
| Drop Jumps | Drop Jumps | drop-jumps-1.webp | Legs |
| Frontknäböj | Front Squat | front-squat-1.webp | Legs |
| Goblet Squat | Goblet Squat | goblet-squat-1.webp | Legs |
| Hoppsquat | Jump Squat | hoppsquat-1.webp | Quadriceps, Gluteus |
| Hurdle Hops | Hurdle Hops | hurdle-hops-1.webp | Legs |
| Knäböj | Back Squat | knaboj-1.webp | Legs |
| Lådhopp (18-24") | Box Jump (18-24") | ladhopp-18-24-1.webp | Legs |
| Låga lådhopp | Low Box Jumps | laga-ladhopp-1.webp | Legs, Calves |
| Utfall | Lunge | lunge-1.webp | Legs |
| Overhead Utfall | Overhead Lunge | overhead-lunge-1.webp | Full Body |
| Overhead Knäböj | Overhead Squat | overhead-squat-1.webp | Full Body |
| Pistol Squat | Pistol Squat | pistol-squat-1.webp | Legs |
| Sandsäck Utfall (HYROX) | Sandbag Lunges (HYROX) | sandbag-lunges-hyrox-1.webp | Legs |
| Split Squat | Split Squat | split-squat-1.webp | Quadriceps, Gluteus |
| Squat Frivändning | Squat Clean | squat-clean-1.webp | Full Body |
| Squat Jumps | Squat Jumps | squat-jumps-1.webp | Quadriceps, Gluteus |
| Squat Ryck | Squat Snatch | squat-snatch-1.webp | Full Body |
| Step-Up | Step-Up | step-up-1.webp | Legs |
| Tuck Jumps | Tuck Jumps | tuck-jumps-1.webp | Legs, Core |
| Utfallssteg | Walking Lunge | walking-lunge-1.webp | Legs |
| Väggstol | Wall Sit | wall-sit-1.webp | Quadriceps |

---

### UNILATERAL (18 exercises)
**Folder: `unilateral/`**
**Focus: Single-leg work, balance, asymmetry correction**

| Swedish Name | English Name | Filename | Target Muscles |
|-------------|--------------|----------|----------------|
| Bakåtlunges | Reverse Lunge | bakatlunges-1.webp | Quadriceps, Gluteus |
| Box Pistol | Box Pistol | box-pistol-1.webp | Legs |
| Bulgarisk utfallsböj | Bulgarian Split Squat | bulgarisk-utfallsboj-1.webp | Quadriceps, Gluteus |
| Curtsy Lunges | Curtsy Lunges | curtsy-lunges-1.webp | Gluteus Medius, Quadriceps |
| Enbenhopp (Bounds) | Single-Leg Bounds | enbenhopp-bounds-1.webp | Legs |
| Enbenig benpress | Single-Leg Press | enbenig-benpress-1.webp | Quadriceps, Gluteus |
| Enbenig rumänsk marklyft | Single-Leg RDL | enbenig-rumansk-marklyft-1.webp | Hamstrings, Gluteus, Balance |
| Lateral Bounds | Lateral Bounds | lateral-bounds-1.webp | Legs, Gluteus Medius |
| Lateral Lunges | Lateral Lunges | lateral-lunges-1.webp | Adductors, Gluteus Medius |
| Pistol Squat Progression | Pistol Squat Progression | pistol-squat-progression-1.webp | Quadriceps, Balance |
| Repeated Bounds | Repeated Bounds | repeated-bounds-1.webp | Legs |
| Single Under | Single Under | single-under-1.webp | Full Body |
| Skater Squats | Skater Squats | skater-squats-1.webp | Quadriceps, Balance |
| Hoppande utfall | Split Jumps | split-jumps-1.webp | Legs |
| Step-Ups (hög) | Step-Ups (high) | step-ups-hog-1.webp | Quadriceps, Gluteus |
| Step-Ups (låg) | Step-Ups (low) | step-ups-lag-1.webp | Quadriceps, Gluteus |
| Step-Ups med knädrive | Step-Ups with Knee Drive | step-ups-med-knadrive-1.webp | Quadriceps, Hip Flexors |
| Triple Jump | Triple Jump | triple-jump-1.webp | Legs |

---

### FOOT_ANKLE (21 exercises)
**Folder: `foot-ankle/`**
**Focus: Calf work, ankle stability, cardio machines**

| Swedish Name | English Name | Filename | Target Muscles |
|-------------|--------------|----------|----------------|
| Ankel dorsalflexion (band) | Ankle Dorsiflexion (band) | ankel-dorsalflexion-band-1.webp | Tibialis Anterior |
| Ankelhopp | Ankle Hops | ankelhopp-1.webp | Calves, Ankle |
| Assault Bike (Kalorier) | Assault Bike (Calories) | assault-bike-calories-1.webp | Full Body |
| Cykel (Kalorier) | Bike (Calories) | bike-calories-1.webp | Legs |
| Cykel (Meter) | Bike (Meters) | bike-meters-1.webp | Legs |
| Double Under | Double Under | double-under-1.webp | Full Body |
| Enbenig tåhävning | Single-Leg Calf Raise | enbenig-tahavning-1.webp | Gastrocnemius, Soleus |
| Hälgång | Heel Walk | halgang-1.webp | Tibialis Anterior |
| Hopprep | Jump Rope | hopprep-1.webp | Calves, Ankle |
| Lateral Hops | Lateral Hops | lateral-hops-1.webp | Legs, Calves |
| Marmor-pickups | Marble Pickups | marmor-pickups-1.webp | Intrinsic Foot Muscles |
| Pogo Jumps | Pogo Jumps | pogo-jumps-1.webp | Calves, Ankle |
| Löpning | Run | run-1.webp | Cardio |
| Ski Erg (Kalorier) | Ski Erg (Calories) | ski-erg-calories-1.webp | Upper Body |
| Ski Erg (Meter) | Ski Erg (Meters) | ski-erg-meters-1.webp | Upper Body |
| Skipping | Skipping | skipping-1.webp | Legs, Calves |
| Simning | Swim | swim-1.webp | Full Body |
| Tåhävningar (böjda ben) | Calf Raise (bent knee) | tahavningar-bojda-ben-1.webp | Soleus |
| Tåhävningar (raka ben) | Calf Raise (straight leg) | tahavningar-raka-ben-1.webp | Gastrocnemius |
| Toe Yoga | Toe Yoga | toe-yoga-1.webp | Intrinsic Foot Muscles |
| Triple Under | Triple Under | triple-under-1.webp | Full Body |

---

### ANTI_ROTATION_CORE (29 exercises)
**Folder: `core/`**
**Focus: Anti-rotation, spinal stability, carries**

| Swedish Name | English Name | Filename | Target Muscles |
|-------------|--------------|----------|----------------|
| Ab Wheel Rollouts | Ab Wheel Rollouts | ab-wheel-rollouts-1.webp | Core |
| Ryggextension | Back Extension | back-extension-1.webp | Lower Back |
| Bird Dog | Bird Dog | bird-dog-1.webp | Core, Posterior Chain |
| Copenhagen Plank | Copenhagen Plank | copenhagen-plank-1.webp | Adductors, Obliques |
| Dead Bug | Dead Bug | dead-bug-1.webp | Core |
| Farmers Walk | Farmers Carry | farmers-carry-1.webp | Grip |
| Farmers Walk (HYROX) | Farmers Carry (HYROX) | farmers-carry-hyrox-1.webp | Grip |
| GHD Sit-Up | GHD Sit-Up | ghd-sit-up-1.webp | Core |
| Hängande Knälyft | Hanging Knee Raise | hanging-knee-raise-1.webp | Core |
| Höftextension | Hip Extension | hip-extension-1.webp | Posterior Chain |
| KB Windmill | KB Windmill | kb-windmill-1.webp | Core |
| Knees-to-Elbow | Knees-to-Elbow | knees-to-elbow-1.webp | Core |
| L-Sit | L-Sit | l-sit-1.webp | Core |
| Mountain Climbers | Mountain Climber | mountain-climber-1.webp | Core |
| Pallof Press | Pallof Press | pallof-press-1.webp | Obliques, Core |
| Pallof Press (band) | Pallof Press (band) | pallof-press-band-1.webp | Obliques, Core |
| Planka | Plank | plank-1.webp | Core |
| Rysk Twist | Russian Twist | russian-twist-1.webp | Core |
| Sandsäcksbärning | Sandbag Carry | sandbag-carry-1.webp | Full Body |
| Sandsäck Över Axeln | Sandbag Over Shoulder | sandbag-over-shoulder-1.webp | Full Body |
| Sidplank | Side Plank | sidplank-1.webp | Core |
| Sit-Up | Sit-Up | sit-up-1.webp | Core |
| Slädragning | Sled Pull | sled-pull-1.webp | Full Body |
| Slädtryckning | Sled Push | sled-push-1.webp | Legs |
| Stir the Pot | Stir the Pot | stir-the-pot-1.webp | Core |
| Suitcase Carry | Suitcase Carry | suitcase-carry-1.webp | Obliques, Quadratus Lumborum |
| Toes-to-Bar | Toes-to-Bar | toes-to-bar-1.webp | Core |
| V-Up | V-Up | v-up-1.webp | Core |
| Yoke Walk | Yoke Carry | yoke-carry-1.webp | Full Body |

---

### UPPER_BODY (28 exercises)
**Folder: `upper-body/`**
**Focus: Push, pull, press movements**

| Swedish Name | English Name | Filename | Target Muscles |
|-------------|--------------|----------|----------------|
| Bänkpress | Bench Press | bankpress-1.webp | Chest |
| Dips | Bar Dip | bar-dip-1.webp | Triceps |
| Böjd Rodd | Bent Over Row | bent-over-row-1.webp | Back |
| Box Dips | Box Dip | box-dip-1.webp | Triceps |
| Burpee Chins | Burpee Pull-Up | burpee-pull-up-1.webp | Full Body |
| Butterfly Chins | Butterfly Pull-Up | butterfly-pull-up-1.webp | Back |
| Chest-to-Bar | Chest-to-Bar Pull-Up | chest-to-bar-pull-up-1.webp | Back |
| Hantel Pushpress | DB Push Press | db-push-press-1.webp | Shoulders |
| Hantel Rodd | DB Row | db-row-1.webp | Back |
| Hantel Militärpress | DB Strict Press | db-strict-press-1.webp | Shoulders |
| Devil Press | Devil Press | devil-press-1.webp | Full Body |
| Handstående Armhävning | Handstand Push-Up | handstand-push-up-1.webp | Shoulders |
| Handstående Gång | Handstand Walk | handstand-walk-1.webp | Shoulders |
| Kipping Chins | Kipping Pull-Up | kipping-pull-up-1.webp | Back |
| Pendlay Rodd | Pendlay Row | pendlay-row-1.webp | Back |
| Pike Push-Up | Pike Push-Up | pike-push-up-1.webp | Shoulders |
| Chins | Pull-Up | pull-up-1.webp | Back |
| Pushpress | Push Press | push-press-1.webp | Shoulders |
| Armhävning | Push-Up | push-up-1.webp | Chest |
| Ring Dips | Ring Dip | ring-dip-1.webp | Triceps |
| Ring Rodd | Ring Row | ring-row-1.webp | Back |
| Rodd (Kalorier) | Row (Calories) | row-calories-1.webp | Full Body |
| Rodd (Meter) | Row (Meters) | row-meters-1.webp | Full Body |
| Rodd (HYROX) | Rowing (HYROX) | rowing-hyrox-1.webp | Full Body |
| Strikt Handstående Armhävning | Strict Handstand Push-Up | strict-handstand-push-up-1.webp | Shoulders |
| Militärpress | Strict Press | strict-press-1.webp | Shoulders |
| Strikt Ring Dips | Strict Ring Dip | strict-ring-dip-1.webp | Triceps |
| Väggklättring | Wall Walk | wall-walk-1.webp | Shoulders |

---

## Priority Order for Generation

### Phase 1: Most Common Exercises (High Priority)
Generate these first as they appear in most workouts:

1. **Compound Lifts**: Deadlift, Squat, Bench Press, Romanian Deadlift, Front Squat
2. **Olympic Lifts**: Clean, Snatch, Clean & Jerk, Power Clean
3. **Bodyweight**: Pull-Up, Push-Up, Dips, Plank, Lunges
4. **Core**: Dead Bug, Pallof Press, Bird Dog, Side Plank
5. **Plyometrics**: Box Jump, Jump Squat, Pogo Jumps

### Phase 2: Common Accessory Work
6. Kettlebell Swing, Goblet Squat, Hip Thrust
7. Step-Ups, Bulgarian Split Squat, Single-Leg RDL
8. Farmers Carry, Sled Push/Pull
9. Calf Raises, Ab Wheel, Russian Twist

### Phase 3: Specialized Movements
10. Olympic lift variations (Hang Clean, Power Snatch, etc.)
11. Gymnastics (Muscle-Up, Handstand Push-Up, L-Sit)
12. HYROX-specific exercises
13. Cardio machines (Rower, Bike, SkiErg)

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

## Upload Process

After generating images:

1. Organize into folders by pillar (see folder structure above)
2. Verify filenames match the convention: `{slug}-1.webp`
3. Run upload script:
   ```bash
   # Preview (dry run)
   npx ts-node scripts/upload-exercise-images.ts --source ./images --dry-run

   # Upload for real
   npx ts-node scripts/upload-exercise-images.ts --source ./images
   ```

---

## Summary

- **Total exercises**: 181
- **Image format**: 832×1472px WebP (9:16 vertical)
- **Style**: Dark background, orange muscle glow, Latin anatomical labels
- **No text**: Exercise names added dynamically by app
- **Organization**: 6 folders by biomechanical pillar
