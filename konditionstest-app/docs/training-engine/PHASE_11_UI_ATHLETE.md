# Phase 11: UI Athlete Portal

**Duration:** Weeks 12-13 (12-15 hours)
**Prerequisites:** [Phase 9: API Layer](./PHASE_09_API.md)
**Status:** 📝 Not Started

---

## Overview

Build the **athlete-facing mobile-first UI** for viewing programs, logging workouts, submitting daily readiness, and tracking progress.

### What We're Building

**Core Athlete Features:**

1. **Daily Check-In** - Quick HRV/RHR/wellness submission (<2 min)
2. **Workout View** - Today's workout with modification indicators
3. **Workout Logging** - Log completion, RPE, notes, file uploads
4. **Program Calendar** - Full program view with progress
5. **Progress Dashboard** - Charts, statistics, test history
6. **Self-Service Lactate** - Submit lactate readings
7. **Program Report Viewer** - Access compiled program report, race protocols, and warnings
8. **Benchmark Schedule** - Upcoming field tests with validation requirements

---

## File Structure

```
app/athlete/
├── dashboard/page.tsx              # Athlete dashboard
├── check-in/page.tsx               # Daily readiness check-in
├── workouts/
│   ├── today/page.tsx              # Today's workout
│   ├── [workoutId]/page.tsx        # Workout details
│   └── [workoutId]/log/page.tsx    # Log completion
├── program/
│   ├── page.tsx                    # Program calendar view
│   ├── report/page.tsx             # Program report viewer
│   └── benchmarks/page.tsx         # Field-test schedule
├── progress/
│   └── page.tsx                    # Progress dashboard
└── lactate/
    └── new/page.tsx                # Self-reported lactate

components/athlete/
├── check-in/
│   ├── ReadinessCheckIn.tsx        # Daily check-in form
│   ├── HRVInput.tsx                # HRV entry
│   ├── WellnessQuestions.tsx       # Wellness form
│   └── CheckInSummary.tsx          # Readiness result
├── workouts/
│   ├── TodayWorkout.tsx            # Today's workout card
│   ├── WorkoutDetails.tsx          # Full workout display
│   ├── WorkoutLogger.tsx           # Completion logger
│   └── ModificationBanner.tsx      # Modification indicator
├── program/
│   ├── ProgramCalendar.tsx         # Calendar view
│   ├── WeekView.tsx                # Week structure
│   ├── ProgramReportViewer.tsx     # Report viewer/export
│   └── BenchmarkSchedule.tsx       # Upcoming tests list
└── progress/
    ├── ProgressCharts.tsx          # Performance charts
    └── StatsCards.tsx              # Summary statistics
```

---

## Task 11.1: Daily Check-In

**File:** `app/athlete/check-in/page.tsx`

```typescript
import { requireAthlete } from '@/lib/auth-utils';
import { ReadinessCheckIn } from '@/components/athlete/check-in/ReadinessCheckIn';

export default async function CheckInPage() {
  const user = await requireAthlete();

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Daily Check-In</h1>
      <ReadinessCheckIn userId={user.id} />
    </div>
  );
}
```

**File:** `components/athlete/check-in/ReadinessCheckIn.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

const checkInSchema = z.object({
  hrv: z.number().min(0).max(200).optional(),
  rhr: z.number().min(30).max(120).optional(),
  fatigue: z.number().min(1).max(10),
  musclesoreness: z.number().min(1).max(10),
  mood: z.number().min(1).max(10),
  stress: z.number().min(1).max(10),
  sleep: z.number().min(1).max(10)
});

type CheckInData = z.infer<typeof checkInSchema>;

export function ReadinessCheckIn({ userId }: { userId: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { register, handleSubmit, setValue, watch } = useForm<CheckInData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      fatigue: 5,
      musclesoreness: 5,
      mood: 7,
      stress: 5,
      sleep: 7
    }
  });

  async function onSubmit(data: CheckInData) {
    // Submit HRV
    if (data.hrv) {
      await fetch('/api/monitoring/hrv/daily', {
        method: 'POST',
        body: JSON.stringify({
          athleteId: userId,
          rmssd: data.hrv
        })
      });
    }

    // Submit RHR
    if (data.rhr) {
      await fetch('/api/monitoring/rhr/daily', {
        method: 'POST',
        body: JSON.stringify({
          athleteId: userId,
          restingHR: data.rhr
        })
      });
    }

    // Submit wellness
    const wellnessRes = await fetch('/api/monitoring/wellness/submit', {
      method: 'POST',
      body: JSON.stringify({
        athleteId: userId,
        ...data
      })
    });

    const wellness = await wellnessRes.json();

    // Assess readiness
    const readinessRes = await fetch('/api/monitoring/readiness/assess', {
      method: 'POST',
      body: JSON.stringify({ athleteId: userId })
    });

    const assessment = await readinessRes.json();

    setResult(assessment.data);
    setSubmitted(true);
  }

  if (submitted && result) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Your Readiness</h2>
        <div className="space-y-4">
          <div>
            <p className="text-4xl font-bold">
              {result.assessment.compositeScore.toFixed(1)}/10
            </p>
            <p className="text-muted-foreground">{result.interpretation.overallStatus}</p>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Recommendation</h3>
            <p>{result.interpretation.recommendation}</p>
          </div>

          {result.interpretation.criticalFlags > 0 && (
            <div className="bg-destructive/10 border border-destructive p-4 rounded">
              <p className="font-semibold text-destructive">
                ⚠️ {result.interpretation.criticalFlags} critical flag(s) detected
              </p>
            </div>
          )}

          <Button onClick={() => setSubmitted(false)}>Submit Another Check-In</Button>
        </div>
      </Card>
    );
  }

  const watchedValues = watch();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Physiological Metrics</h2>

        <div className="space-y-4">
          <div>
            <Label htmlFor="hrv">HRV (RMSSD) - Optional</Label>
            <Input
              id="hrv"
              type="number"
              placeholder="e.g., 45"
              {...register('hrv', { valueAsNumber: true })}
            />
            <p className="text-sm text-muted-foreground">From your HRV device</p>
          </div>

          <div>
            <Label htmlFor="rhr">Resting Heart Rate - Optional</Label>
            <Input
              id="rhr"
              type="number"
              placeholder="e.g., 52"
              {...register('rhr', { valueAsNumber: true })}
            />
            <p className="text-sm text-muted-foreground">Measured upon waking</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Wellness Questions</h2>

        <div className="space-y-6">
          <SliderInput
            label="Fatigue"
            description="1 = Very tired, 10 = Very fresh"
            value={watchedValues.fatigue}
            onChange={(v) => setValue('fatigue', v)}
          />

          <SliderInput
            label="Muscle Soreness"
            description="1 = Very sore, 10 = No soreness"
            value={watchedValues.musclesoreness}
            onChange={(v) => setValue('musclesoreness', v)}
          />

          <SliderInput
            label="Mood"
            description="1 = Very poor, 10 = Excellent"
            value={watchedValues.mood}
            onChange={(v) => setValue('mood', v)}
          />

          <SliderInput
            label="Stress Level"
            description="1 = Very stressed, 10 = Very relaxed"
            value={watchedValues.stress}
            onChange={(v) => setValue('stress', v)}
          />

          <SliderInput
            label="Sleep Quality"
            description="1 = Very poor, 10 = Excellent"
            value={watchedValues.sleep}
            onChange={(v) => setValue('sleep', v)}
          />
        </div>
      </Card>

      <Button type="submit" size="lg" className="w-full">
        Submit Check-In
      </Button>
    </form>
  );
}

function SliderInput({
  label,
  description,
  value,
  onChange
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-bold">{value}/10</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={1}
        max={10}
        step={1}
        className="w-full"
      />
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
```

---

## Task 11.2: Today's Workout

**File:** `app/athlete/workouts/today/page.tsx`

```typescript
import { requireAthlete } from '@/lib/auth-utils';
import { TodayWorkout } from '@/components/athlete/workouts/TodayWorkout';

export default async function TodayWorkoutPage() {
  const user = await requireAthlete();

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <TodayWorkout athleteId={user.id} />
    </div>
  );
}
```

**File:** `components/athlete/workouts/TodayWorkout.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export function TodayWorkout({ athleteId }: { athleteId: string }) {
  const [workout, setWorkout] = useState<any>(null);
  const [modification, setModification] = useState<any>(null);

  useEffect(() => {
    // Fetch today's workout
    // API call would go here
  }, [athleteId]);

  if (!workout) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No workout scheduled for today</p>
        <p className="text-sm mt-2">Enjoy your rest day!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Today's Workout</h1>

      {modification && modification.decision !== 'PROCEED_NORMAL' && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Workout Modified</p>
              <p className="text-sm text-amber-700 mt-1">
                Based on your readiness, this workout has been adjusted:
              </p>
              <ul className="text-sm text-amber-700 mt-2 space-y-1">
                {modification.reasoning.map((reason: string, i: number) => (
                  <li key={i}>• {reason}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold">{workout.type}</h2>
            <p className="text-muted-foreground">{workout.description}</p>
          </div>
          <Badge>{workout.targetIntensity}</Badge>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="text-lg font-semibold">{workout.durationMinutes} minutes</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Structure</p>
            <div className="mt-2 space-y-2">
              {workout.segments?.map((segment: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <span className="text-sm">{segment.type}</span>
                  <span className="text-sm text-muted-foreground">
                    {segment.duration} min @ {segment.targetZone}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button asChild className="flex-1">
            <Link href={`/athlete/workouts/${workout.id}/log`}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Log Workout
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/athlete/workouts/${workout.id}`}>
              View Details
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

---

## Acceptance Criteria

### Phase 11 Complete When:

#### Daily Check-In
- [ ] Quick check-in form (<2 min to complete)
- [ ] HRV input optional
- [ ] RHR input optional
- [ ] Wellness sliders (1-10 scale)
- [ ] Submit triggers readiness assessment
- [ ] Result displayed immediately
- [ ] Mobile-optimized UI

#### Workout View
- [ ] Today's workout displayed
- [ ] Modification banner when applicable
- [ ] Modification reasoning shown
- [ ] Workout structure clear
- [ ] Duration and zones visible
- [ ] Log workout button accessible

#### Workout Logging
- [ ] Log completion form
- [ ] RPE entry (1-10)
- [ ] Notes textarea
- [ ] File upload (optional)
- [ ] Submit saves to database
- [ ] Success feedback
- [ ] Returns to dashboard

#### Program Calendar
- [ ] Full program view
- [ ] Week-by-week navigation
- [ ] Completed workouts marked
- [ ] Upcoming workouts visible
- [ ] Mobile-friendly calendar
- [ ] Field-test schedule integrated with calendar entries

#### Program Report Viewer
- [ ] Displays compiled program report (thresholds, zones, race protocols, warnings)
- [ ] Supports PDF/JSON download for offline review
- [ ] Highlights outstanding validation tasks for the athlete

#### Benchmark Schedule
- [ ] Upcoming field tests listed with due dates and purposes
- [ ] Critical tests flagged when deadline approaches (<7 days)
- [ ] Completed tests show results and status

### Next Steps for Implementation
- [ ] Implement `ProgramReportViewer.tsx` and associated `app/athlete/program/report/page.tsx` to display the compiled report and enable downloads
- [ ] Build `BenchmarkSchedule.tsx` with reminders for critical validation tests, backed by the new field-test schedule API
- [ ] Ensure program calendar view highlights benchmark events and links to detailed test instructions
- [ ] Add integration tests covering report viewing, downloads, and benchmark reminders on mobile

#### Progress Dashboard
- [ ] Performance charts (Recharts)
- [ ] Test history timeline
- [ ] Statistics cards
- [ ] Personal records
- [ ] Export data option

#### Self-Service Lactate
- [ ] Lactate entry form
- [ ] Speed/power/pace input
- [ ] Heart rate input
- [ ] Stage-by-stage entry
- [ ] Validation on submit
- [ ] Success confirmation

---

## Related Phases

**Depends on:**
- [Phase 9: API Layer](./PHASE_09_API.md) - Athlete endpoints

**Feeds into:**
- [Phase 12: Integration](./PHASE_12_INTEGRATION.md) - Complete athlete workflows

---

**Phase 11 Status:** Ready for implementation
**Estimated Effort:** 12-15 hours
**Priority:** HIGH - Core athlete experience
