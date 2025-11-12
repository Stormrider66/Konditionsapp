# How to Continue This Project in New Chat Sessions

**Purpose:** Ensure seamless continuation when starting fresh Claude Code sessions

---

## Quick Start Template

Copy and paste this at the start of your next Claude Code session:

```
I'm continuing the Konditionstest training engine implementation.

Please read these files to get context:
1. /mnt/d/VO2 max report/konditionstest-app/docs/training-engine/STATUS.md
2. /mnt/d/VO2 max report/konditionstest-app/docs/training-engine/MASTER_PLAN.md

Current status: [Specify phase you're on]
What I need: [What you want to do next]
```

---

## Three Continuation Scenarios

### Scenario 1: Continuing Documentation (Phases 6-14)

**Prompt:**
```
I'm continuing the training engine documentation. We've completed detailed docs for Phases 1-5.

Please read:
- /mnt/d/VO2 max report/konditionstest-app/docs/training-engine/STATUS.md
- /mnt/d/VO2 max report/konditionstest-app/docs/training-engine/MASTER_PLAN.md

I need you to create detailed documentation for Phase 6: Training Methodologies.

Use the same format as Phase 2 (PHASE_02_CALCULATIONS.md) - include:
- Overview
- File structure
- Implementation tasks with full code examples
- Test files
- Acceptance criteria
- Cross-references to other phases

Reference the original research in: /mnt/d/VO2 max report/konditionstest-app/New engine dev files/
```

### Scenario 2: Starting Implementation

**Prompt:**
```
I'm ready to start implementing the training engine. All planning documentation is complete.

Please read:
- /mnt/d/VO2 max report/konditionstest-app/docs/training-engine/STATUS.md
- /mnt/d/VO2 max report/konditionstest-app/docs/training-engine/PHASE_01_DATABASE.md

Let's implement Phase 1: Database Foundation.

Follow the tasks in the phase document exactly:
1. Create database backup
2. Update Prisma schema
3. Run migration
4. Update TypeScript types
5. Verify with Prisma Studio

Work through each task step-by-step, showing me the commands to run and files to create.
```

### Scenario 3: Troubleshooting or Review

**Prompt:**
```
I need help with the training engine implementation.

Context files:
- /mnt/d/VO2 max report/konditionstest-app/docs/training-engine/STATUS.md
- /mnt/d/VO2 max report/konditionstest-app/docs/training-engine/MASTER_PLAN.md

Current issue: [Describe problem]
Current phase: [Phase number]
What I've tried: [What you did]

Please help me resolve this and update STATUS.md with the resolution.
```

---

## Maintaining Quality Across Sessions

### 1. Always Update STATUS.md

After **every** work session:

```markdown
## Current Session Summary

✅ **Completed:**
- [What was finished]

🏗️ **In Progress:**
- [What's partially done]

⬜ **Blocked:**
- [Any blockers]

**Next Session:** [What to do next]
```

### 2. Use Phase Documents as Source of Truth

Each phase doc contains:
- ✅ Complete implementation instructions
- ✅ Full code examples
- ✅ Test requirements
- ✅ Acceptance criteria

**Don't re-invent** - follow the phase doc exactly.

### 3. Cross-Reference Everything

When implementing Phase X:
- Read Phase X document thoroughly
- Check dependencies (which phases must be done first)
- Reference original research docs when needed
- Update STATUS.md after completion

### 4. Test As You Go

**After each phase:**
```bash
# Run tests
npm test

# Check types
npm run build

# Verify in Prisma Studio (for database phases)
npx prisma studio
```

Update STATUS.md with test results.

---

## File Navigation

### Documentation Structure

```
docs/training-engine/
├── MASTER_PLAN.md              ← Overall architecture & roadmap
├── STATUS.md                   ← Current progress tracking
├── CONTINUATION_GUIDE.md       ← This file
├── PHASE_01_DATABASE.md        ← Detailed implementation guide
├── PHASE_02_CALCULATIONS.md    ← Detailed implementation guide
├── PHASE_03_MONITORING.md      ← Detailed implementation guide
├── PHASE_04_FIELD_TESTS.md     ← Detailed implementation guide
├── PHASE_05_SELF_SERVICE_LACTATE.md  ← Detailed implementation guide
└── PHASE_06-14_*.md            ← To be created
```

### Reading Priority

**New session? Read in this order:**

1. **STATUS.md** (2 min) - Current state
2. **MASTER_PLAN.md** (5 min) - Overall architecture
3. **Phase document for current phase** (10 min) - Implementation details
4. **Original research** (as needed) - Algorithm details

---

## Common Pitfalls to Avoid

### ❌ DON'T:

1. **Skip reading STATUS.md** - You'll repeat work or miss context
2. **Implement phases out of order** - Dependencies will break
3. **Modify database schema without backup** - Data loss risk
4. **Use %HRmax formulas** - Must be individualized zones
5. **Forget to update STATUS.md** - Next session will be confused

### ✅ DO:

1. **Read STATUS.md first** - Always know where you are
2. **Follow phase order** - Respect dependencies
3. **Backup before migrations** - Safety first
4. **Use phase docs as reference** - They're comprehensive
5. **Update STATUS.md after work** - Help future you

---

## Code Quality Standards

### TypeScript

```typescript
// ✅ GOOD: Strict typing
interface LactateTestData {
  intensity: number[];
  lactate: number[];
  heartRate: number[];
}

// ❌ BAD: Using any
function analyze(data: any) { ... }
```

### Testing

```typescript
// ✅ GOOD: Descriptive test names
test('D-max achieves R² ≥ 0.90 on valid lactate curve', () => {
  // ...
});

// ❌ BAD: Vague test names
test('it works', () => {
  // ...
});
```

### Documentation

```typescript
/**
 * Calculate D-max threshold using polynomial regression
 *
 * Algorithm:
 * 1. Fit 3rd degree polynomial
 * 2. Calculate baseline slope
 * 3. Find point where tangent = baseline slope
 *
 * @param data - Lactate test data with ≥4 points
 * @returns Threshold with confidence score
 * @throws Error if insufficient data
 */
export function calculateDmax(data: LactateTestData): DmaxResult {
  // Implementation
}
```

---

## When Things Go Wrong

### Build Errors

```bash
# 1. Check for type errors
npm run build

# 2. Regenerate Prisma client
npx prisma generate

# 3. Clear Next.js cache
rm -rf .next
npm run dev
```

### Database Issues

```bash
# 1. Check current schema
npx prisma studio

# 2. View migration history
npx prisma migrate status

# 3. If stuck, reset (⚠️ DELETES DATA)
npx prisma migrate reset
```

### Test Failures

```bash
# 1. Run specific test file
npm test -- path/to/test.ts

# 2. Run in watch mode
npm test -- --watch

# 3. View coverage
npm test -- --coverage
```

**Update STATUS.md** with issue and resolution!

---

## Phase Completion Checklist

Use this after finishing each phase:

```markdown
## Phase X: [Name] - Completion Checklist

### Implementation
- [ ] All tasks completed
- [ ] Code follows TypeScript strict mode
- [ ] No ESLint errors
- [ ] Builds successfully

### Testing
- [ ] Unit tests written
- [ ] All tests pass
- [ ] Coverage meets target
- [ ] Edge cases tested

### Documentation
- [ ] Code comments added
- [ ] README updated (if applicable)
- [ ] STATUS.md updated
- [ ] Phase marked complete in MASTER_PLAN.md

### Integration
- [ ] Works with existing code
- [ ] No breaking changes
- [ ] Database migrations applied
- [ ] Tested end-to-end

**Next Phase:** [Phase Y: Name]
```

---

## Emergency Recovery

### If You're Completely Lost

1. **Open STATUS.md** - See what was last done
2. **Open MASTER_PLAN.md** - Understand big picture
3. **Ask Claude Code:**

```
I'm lost in the training engine implementation.

Please read /mnt/d/VO2 max report/konditionstest-app/docs/training-engine/STATUS.md
and help me understand:

1. What phase am I on?
2. What's been completed?
3. What should I do next?
4. Are there any blockers?

Give me a clear next action to take.
```

### If Implementation Fails

1. **Document the issue** in STATUS.md
2. **Check phase document** - Did you follow it exactly?
3. **Review dependencies** - Are prerequisite phases done?
4. **Ask for help:**

```
Implementation of Phase X failed.

Read: /mnt/d/VO2 max report/konditionstest-app/docs/training-engine/PHASE_0X_NAME.md

Error: [paste error message]

What I did: [steps you took]

Please help debug and suggest solution.
```

---

## Success Indicators

**You're on track if:**
- ✅ STATUS.md is up to date
- ✅ Tests are passing
- ✅ No TypeScript errors
- ✅ Following phase order
- ✅ Database migrations working
- ✅ Documentation is clear

**Warning signs:**
- ⚠️ Skipping phases
- ⚠️ STATUS.md outdated
- ⚠️ Tests failing
- ⚠️ Using `any` types
- ⚠️ No database backups

---

## Final Tips

### Before Each Session

1. ✅ Read STATUS.md
2. ✅ Know which phase you're on
3. ✅ Have phase document open
4. ✅ Database backed up (if doing Phase 1)

### During Session

1. ✅ Follow phase doc exactly
2. ✅ Test as you go
3. ✅ Commit frequently (git)
4. ✅ Update STATUS.md notes

### After Session

1. ✅ Update STATUS.md completion
2. ✅ Mark phase status
3. ✅ Note next steps
4. ✅ Document any issues

---

**Remember:** This is a 16-week project. Consistency across sessions is more important than speed. Take it phase by phase, document everything, and you'll succeed!

**Good luck! 🚀**
