# Coach User Guide - Multi-Sport Platform

This guide covers the multi-sport features available to coaches in the Konditionstest platform.

## Table of Contents

1. [Overview](#overview)
2. [Supported Sports](#supported-sports)
3. [Setting Up New Athletes](#setting-up-new-athletes)
4. [Sport-Specific Dashboards](#sport-specific-dashboards)
5. [Managing Athlete Profiles](#managing-athlete-profiles)
6. [Program Generation](#program-generation)

---

## Overview

The platform supports **7 different sports**, each with customized:
- Onboarding flows with sport-specific questions
- Coach dashboards showing relevant metrics
- Training zone calculations
- Program generation templates

---

## Supported Sports

| Sport | Best For | Key Metrics |
|-------|----------|-------------|
| **Running** | Runners, marathoners | VDOT, pace zones, lactate thresholds |
| **Cycling** | Road/MTB cyclists | FTP, W/kg, power zones |
| **Swimming** | Pool/open water swimmers | CSS (Critical Swim Speed), pace/100m |
| **Triathlon** | Multi-sport athletes | Combined CSS, FTP, VDOT |
| **HYROX** | Hybrid fitness competitors | Station times, race predictions |
| **Skiing** | Cross-country skiers | LT, technique (classic/skate) |
| **General Fitness** | Beginners, health-focused | Goals, weight tracking, activities |

---

## Setting Up New Athletes

### Step 1: Create Client
1. Go to **Klienter** (Clients) in the sidebar
2. Click **Ny klient** (New Client)
3. Fill in basic info (name, email, etc.)
4. The athlete will receive login credentials

### Step 2: Athlete Completes Onboarding
When the athlete first logs in, they'll be guided through a **6-step onboarding wizard**:

1. **Sport Selection** - Primary sport (determines their dashboard)
2. **Experience Level** - Beginner → Elite
3. **Sport-Specific Setup** - Customized questions per sport
4. **Weekly Availability** - Which days they can train
5. **Equipment** - What they have access to
6. **Goals** - Their target goals and dates

### Step 3: Review Profile
After onboarding, you can view their sport profile at:
`/clients/[id]` → **Sportspecifik Data** section

---

## Sport-Specific Dashboards

### HYROX Athletes
Shows:
- **Station times** with progress bars comparing to Open/Pro benchmarks
- **Estimated race time** based on current benchmarks
- **Strongest/weakest stations** for targeted training
- **Running fitness** (5K/10K times)
- **Equipment access** (SkiErg, rower, sled, etc.)

### Cycling Athletes
Shows:
- **FTP** (Functional Threshold Power) in watts
- **W/kg** (watts per kilogram)
- **6-zone power distribution** with wattage ranges
- **Training split** (indoor vs outdoor, climbing focus)
- **Bike types** (road, MTB, gravel, etc.)

### Swimming Athletes
Shows:
- **CSS** (Critical Swim Speed) - pace per 100m
- **6-zone training zones** based on CSS
- **Stroke types** trained
- **Training environment** (pool length, open water)
- **Equipment** (paddles, fins, pull buoy, etc.)

### Triathlon Athletes
Shows:
- **Discipline balance** (swim/bike/run percentages)
- **Per-discipline metrics** (CSS, FTP, VDOT)
- **Target race distance** (Sprint → Ironman)
- **Weakness detection** with training recommendations
- **Weekly training hours** split

### Skiing Athletes
Shows:
- **Technique** (Classic, Skate, or Both)
- **Lactate threshold** heart rate
- **Weekly volume** (km and hours)
- **Equipment** (ski/pole lengths)
- **Preferred terrain** (flat, rolling, hilly, mountainous)

### General Fitness Athletes
Shows:
- **Primary goal** (weight loss, health, strength, etc.)
- **Weight progress** (current vs target)
- **BMI calculation**
- **Preferred activities** and dislikes
- **Training frequency** and preferences

---

## Managing Athlete Profiles

### Viewing Profile Data
1. Go to **Klienter** → Select athlete
2. Scroll to **Sportspecifik Data** section
3. View sport-relevant dashboard

### Athlete Self-Edit
Athletes can update their own profile at `/athlete/profile`:
- Change sport-specific settings
- Update equipment access
- Modify availability

### Profile Fields by Sport

#### Cycling Settings
```
- Bike types (road, MTB, gravel, track, indoor)
- Current FTP (watts)
- Weight (for W/kg)
- Primary discipline (road, MTB, track, triathlon)
- Indoor/outdoor preference (%)
- Climbing focus (%)
```

#### Swimming Settings
```
- Stroke types (freestyle, backstroke, breaststroke, butterfly)
- Primary stroke
- Primary discipline (sprint, middle, distance, open water)
- Pool length preference (25m, 50m, open)
- Current CSS (pace/100m)
- Equipment access
```

#### HYROX Settings
```
- Race category (Open, Pro, Doubles, Relay)
- Experience level
- Station benchmark times (all 8 stations)
- 5K/10K times
- Training split (running/strength/HYROX-specific)
- Equipment access
```

#### Triathlon Settings
```
- Target race distance
- Experience level
- Discipline balance (swim/bike/run %)
- Per-discipline metrics (CSS, FTP, VDOT)
- Weekly training hours
```

#### General Fitness Settings
```
- Primary goal
- Secondary goals
- Current/target weight
- Preferred activities
- Training preferences (indoor/outdoor, group/solo)
- Injuries or limitations
```

---

## Program Generation

### Sport-Specific Templates

Programs are generated based on the athlete's **primary sport**:

| Sport | Template Features |
|-------|-------------------|
| Running | Pace zones, long runs, intervals |
| Cycling | Power-based workouts, FTP tests |
| Swimming | CSS-based sets, drill work |
| Triathlon | Brick workouts, discipline rotation |
| HYROX | Station practice, running fitness |
| General Fitness | Goal-specific (weight loss, health, etc.) |

### Generating a Program
1. Go to **Program** → **Generera program**
2. Select the athlete
3. The form auto-populates based on their sport profile
4. Customize dates, intensity, etc.
5. Generate and review

### Cross-Training Integration
For athletes with **secondary sports**, the platform can:
- Generate cross-training sessions
- Calculate training load equivalents (TSS)
- Balance workload across disciplines

---

## Tips for Coaches

### New HYROX Athletes
- Start with station benchmarks - even rough estimates help
- Focus on their weakest station first
- Running fitness is critical (8km total in race)

### New Cyclists
- Get FTP early (ramp test or 20-min test)
- Understand their bike setup and training environment
- Indoor vs outdoor ratio affects workout design

### New Swimmers
- CSS test is essential (T400/T200)
- Pool length matters for interval design
- Equipment access shapes drill selection

### New Triathletes
- Identify weakest discipline first
- Balance volume across all three
- Consider brick workout frequency

### New General Fitness Athletes
- Set realistic, measurable goals
- Account for injuries/limitations
- Start conservative with frequency

---

## Quick Reference

### Key URLs
- Client list: `/clients`
- New client: `/clients/new`
- Client detail: `/clients/[id]`
- Program generation: `/coach/programs/generate`
- Athlete profile (athlete view): `/athlete/profile`

### Sport Profile API
```
GET  /api/sport-profile/[clientId]  - Get profile
PUT  /api/sport-profile/[clientId]  - Update profile
POST /api/sport-profile             - Create profile
```

---

## Need Help?

- **Technical issues**: Check `CLAUDE.md` for developer documentation
- **API reference**: See `docs/API_REFERENCE.md`
- **Feature requests**: Contact system administrator
