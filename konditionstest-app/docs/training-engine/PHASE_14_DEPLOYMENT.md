# Phase 14: Documentation & Deployment

**Duration:** Week 16 (6-8 hours)
**Prerequisites:** [Phase 13: Testing](./PHASE_13_TESTING.md)
**Status:** 📝 Not Started

---

## Overview

**Final documentation, production deployment, and launch preparation** including user guides, API documentation, deployment scripts, and monitoring setup.

### Deployment Checklist

1. ✅ **Final Documentation** - User guides, API docs, admin docs
2. ✅ **Environment Setup** - Production env vars, secrets
3. ✅ **Database Migration** - Production migration with rollback plan
4. ✅ **Deployment** - Vercel deployment with zero downtime
5. ✅ **Monitoring** - Sentry, logging, alerts
6. ✅ **User Training** - Coach onboarding, athlete tutorials

---

## Task 14.1: User Documentation

**File:** `docs/USER_GUIDE_COACH.md`

```markdown
# Coach User Guide

## Getting Started

### Creating Your First Training Program

1. **Navigate to Programs**
   - Click "Programs" in sidebar
   - Click "Create New Program"

2. **Select Athlete**
   - Choose athlete from dropdown
   - Ensure athlete has recent VO2max test

3. **Choose Methodology**
   - **Polarized (80/20)** - Recommended for most athletes
   - **Norwegian** - Elite athletes only (requires lactate testing)
   - **Canova** - Race-focused training
   - **Pyramidal** - Balanced distribution

4. **Set Parameters**
   - Goal type (Marathon, Half Marathon, 5K, etc.)
   - Target date (optional)
   - Target time (optional)
   - Weeks available (4-52)
   - Sessions per week (3-14)

5. **Generate Program**
   - Click "Generate Program"
   - Review generated program
   - Edit individual workouts if needed
   - Assign to athlete

### Monitoring Athlete Readiness

**Dashboard Overview:**
- Green badge: Excellent readiness
- Yellow badge: Moderate readiness
- Red badge: Poor readiness - action required

**Critical Flags:**
- 🔴 HRV <75% baseline → Mandatory rest
- 🔴 ACWR >1.5 → Reduce load 20-30%
- 🔴 Pain altering gait → Immediate cessation

**When to Override:**
- Competition proximity (within 7 days)
- Athlete feels excellent despite metrics
- Known HRV outlier (high variability)

**When NOT to Override:**
- Multiple red flags
- Consecutive declining HRV (3+ days)
- Pain present
- Illness suspected

### Entering Lactate Test Results

1. Navigate to athlete's test page
2. Click "New Lactate Test"
3. Enter stage-by-stage data:
   - Speed/Power/Pace
   - Heart rate
   - Lactate (mmol/L)
4. System calculates:
   - Aerobic threshold (LT1)
   - Anaerobic threshold (LT2)
   - Training zones
5. Zones automatically update in active programs

## Best Practices

### Program Generation
- Update VO2max test every 8-12 weeks
- Recalculate zones after significant fitness changes
- Allow 4+ weeks for marathon programs
- Start conservative, increase gradually

### Athlete Monitoring
- Encourage daily check-ins
- Review readiness trends weekly
- Don't override rest days lightly
- Document override reasoning

### Methodology Selection
- Start with Polarized for new athletes
- Norwegian requires 10+ sessions/week
- Canova best for goal-focused athletes
- Pyramidal for high-mileage marathoners
```

**File:** `docs/USER_GUIDE_ATHLETE.md`

```markdown
# Athlete User Guide

## Daily Check-In (2 minutes)

### When to Check In
- First thing in the morning
- Before breakfast
- After waking HRV measurement (if using device)

### How to Check In

1. **Optional: HRV & RHR**
   - Enter HRV (RMSSD) from your device
   - Enter resting heart rate

2. **Wellness Questions** (1-10 scale)
   - **Fatigue**: How tired do you feel?
   - **Muscle Soreness**: Any soreness?
   - **Mood**: How's your mood?
   - **Stress**: Stress level?
   - **Sleep**: Sleep quality?

3. **View Your Readiness**
   - Score 9-10: Excellent - full training
   - Score 7.5-9: Good - proceed normally
   - Score 6.5-7.5: Moderate - proceed cautiously
   - Score <6.5: Poor - modified or rest day

## Today's Workout

### Workout Details
- **Type**: Easy run, threshold intervals, long run, etc.
- **Duration**: Total time
- **Zones**: Heart rate or pace zones
- **Structure**: Warm-up, intervals, cool-down

### Modified Workouts
If you see "Workout Modified" banner:
- System adjusted based on your readiness
- Reasons listed (e.g., "HRV 15% below baseline")
- Follow modified version for safety
- Talk to coach if you disagree

### Logging Completion

1. Click "Log Workout"
2. Enter:
   - Did you complete it? (Yes/No/Partial)
   - RPE (1-10): How hard did it feel?
   - Notes: Any issues, feelings, etc.
   - Photos: Upload pictures if needed
3. Submit

## Understanding Your Program

### Program Calendar
- Full program visible from start
- Green checkmarks: Completed workouts
- Orange indicators: Modified workouts
- Workouts unlock day-by-day

### Phases
- **Base**: Building aerobic base
- **Build**: Adding intensity
- **Peak**: Race-specific work
- **Taper**: Recovery before goal race

## Self-Service Lactate Entry

If your coach allows, you can enter your own lactate test results:

1. Navigate to "Lactate Tests"
2. Click "New Test"
3. Enter stage-by-stage data:
   - Speed/Power/Pace
   - Heart rate
   - Lactate reading (mmol/L)
4. System calculates your zones
5. Coach reviews before zones update

## FAQ

**Q: My workout was modified but I feel great. Can I do the original?**
A: Talk to your coach. They can override if appropriate.

**Q: I forgot to check in today. What happens?**
A: Check in when you remember. System uses most recent data.

**Q: My HRV is always low. Is something wrong?**
A: Some athletes have naturally lower HRV. System learns your patterns over time.
```

---

## Task 14.2: API Documentation

**File:** `docs/API_DOCUMENTATION.md`

```markdown
# Training Engine API Documentation

Base URL: `https://your-domain.com/api`

## Authentication

All endpoints require authentication via Supabase JWT token.

```
Authorization: Bearer <your-jwt-token>
```

## Monitoring Endpoints

### POST /monitoring/hrv/daily
Submit daily HRV measurement

**Request:**
```json
{
  "athleteId": "uuid",
  "rmssd": 45.5,
  "heartRate": 52
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "measurement": { ... },
    "percentOfBaseline": 95.5,
    "interpretation": "Excellent"
  }
}
```

### POST /monitoring/readiness/assess
Assess current readiness

**Request:**
```json
{
  "athleteId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "assessment": {
      "compositeScore": 8.5,
      "category": "GOOD",
      "recommendation": "PROCEED_NORMAL",
      "factorScores": { ... },
      "redFlags": [],
      "yellowFlags": []
    }
  }
}
```

## Program Endpoints

### POST /programs/generate
Generate training program

**Request:**
```json
{
  "athleteId": "uuid",
  "goalType": "MARATHON",
  "methodology": "POLARIZED",
  "weeksAvailable": 12,
  "sessionsPerWeek": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "program": { ... },
    "validation": {
      "isValid": true,
      "warnings": []
    }
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": "ERROR_TYPE",
  "message": "Human-readable error message",
  "details": { ... }
}
```

**Error Types:**
- `BAD_REQUEST` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `VALIDATION_ERROR` (422)
- `INTERNAL_SERVER_ERROR` (500)
```

---

## Task 14.3: Production Deployment

**File:** `.env.production`

```bash
# Database
DATABASE_URL=postgresql://user:pass@prod-db.supabase.co:5432/postgres

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Email
RESEND_API_KEY=your-resend-key

# Environment
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to production
vercel --prod

# Set environment variables
vercel env add DATABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# ... add all env vars
```

### Database Migration Script

**File:** `scripts/migrate-production.sh`

```bash
#!/bin/bash

set -e

echo "🚀 Starting production migration..."

# Backup database
echo "📦 Creating backup..."
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
echo "🔄 Running migrations..."
npx prisma migrate deploy

# Verify migration
echo "✅ Verifying migration..."
npx prisma db pull

# Seed exercise library
echo "🌱 Seeding data..."
npx ts-node prisma/seed-training-engine.ts

echo "✅ Migration complete!"
```

---

## Task 14.4: Specialized Infrastructure Considerations

### Complexity-Driven Infrastructure Needs

**Reference:** Production-Ready_Runner_Training_Engine document complexity

#### 1. Calculation Performance Optimization

**Challenge:** Complex calculations (D-max polynomial fitting, multi-race optimization) can be CPU-intensive

**Solution:** Edge function configuration and caching strategy

```typescript
// app/api/calculations/thresholds/route.ts
export const runtime = 'edge'; // Use edge runtime for global distribution
export const maxDuration = 30; // Allow 30s for complex polynomial calculations

// For very complex calculations, consider background jobs
import { Queue } from '@vercel/queue';

const calculationQueue = new Queue('complex-calculations', {
  maxConcurrency: 5,
  timeout: 60000 // 60 seconds for Norwegian method validation
});

export async function POST(request: NextRequest) {
  const { method, complexity } = await request.json();

  if (complexity === 'HIGH') {
    // Queue complex calculations
    const job = await calculationQueue.add({
      method,
      data: request.body
    });

    return Response.json({
      jobId: job.id,
      status: 'QUEUED',
      estimatedTime: '30-60 seconds'
    });
  }

  // Handle simple calculations synchronously
  // ...
}
```

#### 2. Database Query Optimization for Complex Joins

**Challenge:** Multi-system validation requires joining 6+ tables

```sql
-- Complex query for program generation validation
-- Joins: Client, Tests, TrainingLoads, InjuryAssessments, Programs, Races

-- Add composite indexes for common query patterns
CREATE INDEX idx_client_validation ON "Client"("id", "createdAt");
CREATE INDEX idx_test_recent ON "Test"("clientId", "testDate" DESC);
CREATE INDEX idx_injury_active ON "InjuryAssessment"("clientId", "resolved", "date" DESC);
CREATE INDEX idx_program_active_client ON "TrainingProgramEngine"("clientId", "status", "startDate" DESC);

-- Materialized view for readiness assessment (refreshed hourly)
CREATE MATERIALIZED VIEW athlete_readiness_summary AS
SELECT 
  c.id as athlete_id,
  h.rmssd as latest_hrv,
  r.value as latest_rhr,
  w.score as latest_wellness,
  a.value as latest_acwr,
  ra.compositeScore as readiness_score
FROM "Client" c
LEFT JOIN LATERAL (
  SELECT rmssd FROM "HRVMeasurement" 
  WHERE "athleteId" = c.id 
  ORDER BY "measuredAt" DESC LIMIT 1
) h ON true
LEFT JOIN LATERAL (
  SELECT value FROM "RHRMeasurement"
  WHERE "athleteId" = c.id
  ORDER BY "measuredAt" DESC LIMIT 1
) r ON true
-- ... additional joins
WITH DATA;

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_readiness_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY athlete_readiness_summary;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh every hour
SELECT cron.schedule('refresh-readiness', '0 * * * *', 'SELECT refresh_readiness_summary()');
```

#### 3. Caching Strategy for Expensive Calculations

```typescript
// lib/cache/calculation-cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

export async function getCachedCalculation<T>(
  key: string,
  calculator: () => Promise<T>,
  ttl: number = 3600 // 1 hour default
): Promise<T> {
  
  // Check cache
  const cached = await redis.get<T>(key);
  if (cached) {
    return cached;
  }

  // Calculate
  const result = await calculator();

  // Cache result
  await redis.setex(key, ttl, result);

  return result;
}

// Usage in D-max calculation
export async function calculateDmaxCached(
  testId: string,
  lactateData: LactatePoint[]
): Promise<DmaxResult> {
  
  const cacheKey = `dmax:${testId}:${hashLactateData(lactateData)}`;

  return getCachedCalculation(
    cacheKey,
    () => calculateDmax(lactateData),
    86400 // Cache for 24 hours
  );
}

// Invalidation strategy
export async function invalidateCalculationCache(testId: string) {
  const pattern = `dmax:${testId}:*`;
  const keys = await redis.keys(pattern);
  
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

#### 4. Rate Limiting for Calculation-Heavy Endpoints

```typescript
// middleware/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

// Different limits for different calculation complexities
export const calculationRateLimits = {
  simple: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 per minute
    analytics: true
  }),
  
  complex: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 per minute
    analytics: true
  }),
  
  veryComplex: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '5 m'), // 5 per 5 minutes
    analytics: true
  })
};

// Usage in API route
export async function POST(request: NextRequest) {
  const { method } = await request.json();
  
  // Determine complexity
  let limiter = calculationRateLimits.simple;
  if (method === 'MODIFIED_DMAX' || method === 'NORWEGIAN_VALIDATION') {
    limiter = calculationRateLimits.complex;
  } else if (method === 'MULTI_RACE_OPTIMIZATION') {
    limiter = calculationRateLimits.veryComplex;
  }

  // Check rate limit
  const identifier = request.headers.get('x-user-id') || 'anonymous';
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString()
      }
    });
  }

  // Proceed with calculation
  // ...
}
```

#### 5. Background Job Processing for Long-Running Tasks

```typescript
// lib/jobs/season-optimization.ts
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL!);

export const seasonOptimizationQueue = new Queue('season-optimization', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});

// Worker
import { Worker } from 'bullmq';

const worker = new Worker(
  'season-optimization',
  async (job) => {
    const { athleteId, races, constraints } = job.data;

    // Update progress
    await job.updateProgress(10);

    // Perform complex multi-race optimization
    const result = await generateMultiPeakSeason(races, constraints);

    await job.updateProgress(50);

    // Validate across all systems
    const validation = await validateProgramGeneration(result, prisma);

    await job.updateProgress(90);

    // Store result
    await prisma.seasonPlan.create({
      data: {
        athleteId,
        plan: result,
        validation
      }
    });

    await job.updateProgress(100);

    return { success: true, planId: result.id };
  },
  { connection }
);

// Monitor job status
worker.on('completed', (job) => {
  console.log(`✅ Season optimization completed for job ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Season optimization failed for job ${job?.id}:`, err);
});
```

#### 6. Database Connection Pooling

```typescript
// lib/prisma.ts (enhanced)
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

// Configure connection pool for production
if (process.env.NODE_ENV === 'production') {
  // Supabase connection pooler
  // Use transaction mode for short-lived connections
  // Use session mode for long-lived connections
  
  const poolConfig = {
    // For Supabase: Use connection pooler
    // DATABASE_URL should point to pooler endpoint
    // e.g., postgresql://user:pass@host:6543/db?pgbouncer=true
    
    // For complex calculations, use direct connection
    // DIRECT_URL for migrations and long transactions
  };
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

#### 7. Monitoring Complex Calculation Performance

```typescript
// lib/monitoring/calculation-metrics.ts
import * as Sentry from '@sentry/nextjs';

export async function monitorCalculation<T>(
  name: string,
  complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH',
  calculator: () => Promise<T>
): Promise<T> {
  
  const transaction = Sentry.startTransaction({
    op: 'calculation',
    name: `calculation.${name}`
  });

  const span = transaction.startChild({
    op: 'calculation',
    description: name,
    data: { complexity }
  });

  const startTime = Date.now();
  
  try {
    const result = await calculator();
    const duration = Date.now() - startTime;

    // Log slow calculations
    if (duration > 5000) {
      console.warn(`⚠️ Slow calculation: ${name} took ${duration}ms`);
      
      Sentry.captureMessage(`Slow calculation: ${name}`, {
        level: 'warning',
        extra: {
          duration,
          complexity,
          threshold: 5000
        }
      });
    }

    span.setStatus('ok');
    span.finish();
    transaction.finish();

    return result;
  } catch (error) {
    span.setStatus('internal_error');
    span.finish();
    transaction.finish();
    
    Sentry.captureException(error, {
      tags: {
        calculation: name,
        complexity
      }
    });

    throw error;
  }
}

// Usage
export async function calculateDmax(data: LactatePoint[]): Promise<DmaxResult> {
  return monitorCalculation(
    'dmax-polynomial-fit',
    'HIGH',
    async () => {
      // Actual calculation logic
      return performDmaxCalculation(data);
    }
  );
}
```

## Task 14.5: Monitoring Setup

### Sentry Alerts

```typescript
// sentry.server.config.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,

  integrations: [
    new Sentry.Integrations.Prisma({ client: prisma })
  ],

  tracesSampleRate: 0.1,

  beforeSend(event) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  }
});
```

### Uptime Monitoring

```bash
# Setup uptime monitoring (choose one)
# - Vercel Analytics
# - Sentry Uptime
# - UptimeRobot
# - Better Uptime

# Monitor endpoints:
# - /api/health
# - /api/monitoring/readiness/assess
# - /coach/dashboard
# - /athlete/dashboard
```

---

## Task 14.5: Launch Checklist

### Pre-Launch

- [ ] All tests passing (Phase 13)
- [ ] Database migrated to production
- [ ] Environment variables configured
- [ ] Sentry configured and tested
- [ ] Uptime monitoring active
- [ ] Error tracking verified
- [ ] Performance benchmarks met
- [ ] User documentation complete
- [ ] Coach training scheduled
- [ ] Rollback plan documented

### Launch Day

- [ ] Deploy to production
- [ ] Run smoke tests
- [ ] Verify all APIs responding
- [ ] Check database connections
- [ ] Test authentication
- [ ] Test critical workflows
- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Announce to users
- [ ] Monitor for 24 hours

### Post-Launch

- [ ] Review error logs daily (week 1)
- [ ] Monitor performance metrics
- [ ] Collect user feedback
- [ ] Address critical bugs immediately
- [ ] Plan next iteration
- [ ] Document lessons learned

---

## Acceptance Criteria

### Phase 14 Complete When:

#### Documentation
- [ ] Coach user guide complete
- [ ] Athlete user guide complete
- [ ] API documentation complete
- [ ] Admin documentation complete
- [ ] Troubleshooting guides written

#### Production Setup
- [ ] Environment variables configured
- [ ] Database migrated successfully
- [ ] Sentry configured
- [ ] Uptime monitoring active
- [ ] Backup strategy in place

#### Specialized Infrastructure
- [ ] Edge function configuration for complex calculations
- [ ] Background job queue for long-running tasks (Norwegian validation, season optimization)
- [ ] Redis caching layer for expensive calculations
- [ ] Rate limiting configured by calculation complexity
- [ ] Database connection pooling optimized
- [ ] Materialized views created for complex joins
- [ ] Composite indexes for multi-table queries
- [ ] Calculation performance monitoring active
- [ ] Slow calculation alerts configured (>5s threshold)

#### Deployment
- [ ] Deployed to production
- [ ] All smoke tests passing
- [ ] Zero downtime achieved
- [ ] Rollback plan tested
- [ ] Monitoring active

#### Training
- [ ] Coach training completed
- [ ] Athlete onboarding materials ready
- [ ] Video tutorials recorded (optional)
- [ ] FAQ documented

#### Launch
- [ ] Soft launch successful
- [ ] User feedback collected
- [ ] No critical bugs
- [ ] Performance metrics met
- [ ] Full launch announced

---

## Related Phases

**Depends on:**
- All Phases 1-13

**Completes:**
- Training Engine Implementation

---

**Phase 14 Status:** Ready for implementation
**Estimated Effort:** 6-8 hours
**Priority:** HIGH - Production launch

---

## 🎉 Training Engine Complete!

Congratulations! You've completed all 14 phases of the training engine implementation.

**Next Steps:**
1. Review STATUS.md for implementation order
2. Start with Phase 1: Database Foundation
3. Follow dependencies strictly
4. Reference phase docs as you implement
5. Update STATUS.md after each phase

**Remember:**
- Pure functions for calculations
- Server Components by default
- Strict TypeScript mode
- Test as you build
- Safety first, performance second

**Good luck!** 🚀
