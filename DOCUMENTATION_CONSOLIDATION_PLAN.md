# Documentation Consolidation Plan

**Date**: 2025-11-22
**Purpose**: Organize 29 root-level markdown files into a coherent structure
**Goal**: Keep only active docs in root, archive historical docs, move implementation plans to docs/

---

## 📊 Current State

**29 markdown files** in root directory totaling **~400KB** of documentation

---

## 📁 Proposed Organization

### ✅ KEEP in Root (6 files)

**Active, user-facing documentation**:

1. **README.md** (12K) - ✅ Just updated
   - Main entry point for developers
   - Bilingual, comprehensive

2. **CLAUDE.md** (26K) - ✅ Main developer guide
   - Architecture, conventions, API reference
   - Recently updated with missing features

3. **CLAUDE_MD_CODE_REVIEW.md** (21K) - ✅ Recent code review
   - Gap analysis and recommendations
   - Created 2025-11-22

4. **INJURY_CROSS_TRAINING_IMPLEMENTATION.md** (37K) - ✅ Active implementation
   - In-progress feature checklist
   - Referenced in CLAUDE.md

5. **STRENGTH_TRAINING_IMPLEMENTATION_CHECKLIST.md** (16K) - ✅ Active implementation
   - Phase 1-8 implementation status
   - Referenced in CLAUDE.md

6. **.env.example** - ✅ Just created
   - Environment variable template

**Total to keep**: 6 files (~112KB + active checklists)

---

### 📦 MOVE to `docs/` (5 files)

**Implementation plans and specifications** (valuable but not root-level):

1. **TRAINING_ENGINE_IMPLEMENTATION_PLAN.md** (45K)
   - Move to: `docs/training-engine/TRAINING_ENGINE_IMPLEMENTATION_PLAN.md`
   - Reason: Belongs with other training engine docs

2. **TRAINING_PROGRAM_IMPLEMENTATION_PLAN.md** (36K)
   - Move to: `docs/TRAINING_PROGRAM_IMPLEMENTATION_PLAN.md`
   - Reason: Implementation plan, not user-facing

3. **STATUS.md** (15K)
   - Move to: `docs/STATUS.md`
   - Reason: Project status tracking

4. **calculations_spec.md** (14K)
   - Move to: `docs/specifications/calculations_spec.md`
   - Reason: Technical specification

5. **data_model.md** (11K)
   - Move to: `docs/specifications/data_model.md`
   - Reason: Technical specification

**Total to move**: 5 files (~121KB)

---

### 🗄️ ARCHIVE to `docs/archive/` (18 files)

**Historical documentation from early development phases**:

#### Outdated Architecture Docs
1. **ARCHITECTURE-TECHNICAL-DETAILS.md** (19K) - Superseded by CLAUDE.md
2. **KONDITIONSTEST-ARCHITECTURE-ANALYSIS.md** (28K) - Early analysis
3. **ANALYSIS-README.md** (7.5K) - Early analysis
4. **technical_spec.md** (8.3K) - Likely outdated
5. **ui_specification.md** (18K) - Early UI spec

#### Outdated Implementation Docs
6. **DEVELOPMENT_ROADMAP.md** (19K) - Last updated 2025-10-21
7. **CYCLING-IMPLEMENTATION-SUMMARY.md** (8.7K) - Phase 1 cycling
8. **CYCLING-SUPPORT.md** (5.0K) - Phase 1 cycling
9. **project_overview.md** (5.0K) - Early overview
10. **QUICKSTART.md** (2.7K) - Covered in README.md
11. **CODEBASE_REVIEW_IMPROVEMENTS.md** (3.3K) - Check date

#### Duplicate Files
12. **IMPLEMENTATION_SUMMARY.md** (7.0K) - Duplicate
13. **IMPLEMENTATION-SUMMARY.md** (7.9K) - Duplicate

#### Setup Guides (Check if Still Relevant)
14. **AUTH_SETUP_GUIDE.md** (8.5K) - Check if covered in CLAUDE.md
15. **README-DATABASE.md** (6.3K) - Check if covered in CLAUDE.md
16. **PDF_EXPORT_README.md** (7.0K) - Check if covered in CLAUDE.md

#### Test Reports & Documentation
17. **PROGRAM-GENERATION-TEST-REPORT.md** (61K) - Historical test report
18. **TESTING_ATHLETE_PORTAL.md** (1.5K) - Test documentation

**Total to archive**: 18 files (~233KB)

---

### ❓ REVIEW Before Decision (1 file)

**TESTINSTRUKTIONER-CYKEL.md** (5.6K) - Swedish cycling instructions
- **Decision needed**: Keep if this is user-facing test instructions, otherwise archive
- **Check**: Is this referenced anywhere? Are there athletes using this?

---

## 📋 Action Plan

### Phase 1: Create Directory Structure
```bash
mkdir -p docs/archive
mkdir -p docs/specifications
```

### Phase 2: Move Implementation Plans
```bash
# Move to docs/
mv TRAINING_ENGINE_IMPLEMENTATION_PLAN.md docs/training-engine/
mv TRAINING_PROGRAM_IMPLEMENTATION_PLAN.md docs/
mv STATUS.md docs/
mv calculations_spec.md docs/specifications/
mv data_model.md docs/specifications/
```

### Phase 3: Archive Historical Docs
```bash
# Move to docs/archive/
mv ARCHITECTURE-TECHNICAL-DETAILS.md docs/archive/
mv KONDITIONSTEST-ARCHITECTURE-ANALYSIS.md docs/archive/
mv ANALYSIS-README.md docs/archive/
mv technical_spec.md docs/archive/
mv ui_specification.md docs/archive/
mv DEVELOPMENT_ROADMAP.md docs/archive/
mv CYCLING-IMPLEMENTATION-SUMMARY.md docs/archive/
mv CYCLING-SUPPORT.md docs/archive/
mv project_overview.md docs/archive/
mv QUICKSTART.md docs/archive/
mv CODEBASE_REVIEW_IMPROVEMENTS.md docs/archive/
mv IMPLEMENTATION_SUMMARY.md docs/archive/
mv IMPLEMENTATION-SUMMARY.md docs/archive/
mv AUTH_SETUP_GUIDE.md docs/archive/
mv README-DATABASE.md docs/archive/
mv PDF_EXPORT_README.md docs/archive/
mv PROGRAM-GENERATION-TEST-REPORT.md docs/archive/
mv TESTING_ATHLETE_PORTAL.md docs/archive/
```

### Phase 4: Review TESTINSTRUKTIONER-CYKEL.md
- Check if referenced anywhere
- Decide: Keep or archive

### Phase 5: Create Archive Index
Create `docs/archive/README.md` explaining what's archived and why:
```markdown
# Archived Documentation

This directory contains historical documentation from early development phases.
These files are kept for reference but are no longer actively maintained.

**Last consolidated**: 2025-11-22

## Contents

### Early Architecture & Analysis
- ARCHITECTURE-TECHNICAL-DETAILS.md - Superseded by CLAUDE.md
- KONDITIONSTEST-ARCHITECTURE-ANALYSIS.md - Early architecture analysis
- [etc...]

### Early Implementation Docs
- DEVELOPMENT_ROADMAP.md - Early roadmap (last updated 2025-10-21)
- [etc...]

### Test Reports
- PROGRAM-GENERATION-TEST-REPORT.md - Historical test report
- [etc...]

**For current documentation**, see:
- `/README.md` - Main entry point
- `/CLAUDE.md` - Developer guide
- `/docs/training-engine/` - Elite training engine docs
```

---

## 📈 Expected Results

### Before
```
konditionstest-app/
├── 29 markdown files in root (400KB, difficult to navigate)
├── docs/training-engine/ (36 files)
└── [other directories]
```

### After
```
konditionstest-app/
├── 6 markdown files in root (clean, active docs only)
├── .env.example
├── docs/
│   ├── training-engine/ (37 files - added TRAINING_ENGINE_IMPLEMENTATION_PLAN.md)
│   ├── specifications/ (2 files - calculations_spec.md, data_model.md)
│   ├── archive/ (18+ historical files with README.md explaining)
│   ├── TRAINING_PROGRAM_IMPLEMENTATION_PLAN.md
│   └── STATUS.md
└── [other directories]
```

**Benefits**:
- ✅ Clean root directory (6 files vs 29)
- ✅ Clear documentation hierarchy
- ✅ Historical docs preserved but organized
- ✅ Easy to find current vs archived information
- ✅ README.md points to correct current docs

---

## ⚠️ Risks & Mitigations

**Risk**: Archived docs might be referenced somewhere
**Mitigation**: Search codebase for references before archiving

**Risk**: Setup guides might still be useful
**Mitigation**: Review AUTH_SETUP_GUIDE.md, README-DATABASE.md, PDF_EXPORT_README.md before archiving - if content is unique and useful, integrate into CLAUDE.md

**Risk**: Breaking existing links
**Mitigation**: Update any internal documentation links after moving files

---

## 🔍 Pre-Archive Checklist

Before archiving each file, verify:
- [ ] Not referenced in package.json scripts
- [ ] Not referenced in CLAUDE.md or README.md
- [ ] Not referenced in active implementation checklists
- [ ] Content is either outdated or covered elsewhere
- [ ] If content is unique and valuable, extract to current docs first

---

## 📝 Verification Commands

```bash
# Check for references to a file before archiving
grep -r "ARCHITECTURE-TECHNICAL-DETAILS" . --exclude-dir=node_modules --exclude-dir=.git

# Check all markdown references
grep -r "\.md" *.md | grep -v "node_modules" | grep -v ".git"

# List all markdown files in root after cleanup
ls -lh *.md
```

---

## ✅ Success Criteria

1. Root directory has only 6 active markdown files
2. All files are correctly categorized (keep/move/archive)
3. docs/archive/README.md explains archived content
4. No broken internal documentation links
5. CLAUDE.md and README.md are the primary documentation entry points
