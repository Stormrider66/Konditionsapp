-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('RUNNING', 'CYCLING', 'SKIING');

-- CreateEnum
CREATE TYPE "SportType" AS ENUM ('RUNNING', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON', 'HYROX', 'GENERAL_FITNESS', 'FUNCTIONAL_FITNESS', 'STRENGTH', 'TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL', 'TEAM_BASKETBALL', 'TEAM_VOLLEYBALL', 'TENNIS', 'PADEL');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('DRAFT', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InclineUnit" AS ENUM ('PERCENT', 'DEGREES');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COACH', 'ATHLETE', 'PHYSIO');

-- CreateEnum
CREATE TYPE "WorkoutType" AS ENUM ('RUNNING', 'STRENGTH', 'PLYOMETRIC', 'CORE', 'RECOVERY', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON', 'HYROX', 'ALTERNATIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkoutIntensity" AS ENUM ('RECOVERY', 'EASY', 'MODERATE', 'THRESHOLD', 'INTERVAL', 'MAX');

-- CreateEnum
CREATE TYPE "PeriodPhase" AS ENUM ('BASE', 'BUILD', 'PEAK', 'TAPER', 'RECOVERY', 'TRANSITION');

-- CreateEnum
CREATE TYPE "WorkoutSectionType" AS ENUM ('WARMUP', 'MAIN', 'CORE', 'COOLDOWN');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'TRIAL');

-- CreateEnum
CREATE TYPE "AthleteSubscriptionTier" AS ENUM ('FREE', 'STANDARD', 'PRO');

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('DIRECT', 'BUSINESS');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('STRAVA', 'GARMIN', 'CONCEPT2');

-- CreateEnum
CREATE TYPE "InvitationType" AS ENUM ('ATHLETE_SIGNUP', 'REPORT_VIEW', 'REFERRAL');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "CoachRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CoachAgreementStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "ReferralRewardType" AS ENUM ('FREE_MONTH', 'DISCOUNT_PERCENT', 'EXTENDED_TRIAL', 'ATHLETE_SLOTS');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "EnterpriseContractStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('ALTITUDE_CAMP', 'TRAINING_CAMP', 'TRAVEL', 'ILLNESS', 'VACATION', 'WORK_BLOCKER', 'PERSONAL_BLOCKER', 'EXTERNAL_EVENT', 'SCHEDULED_WORKOUT');

-- CreateEnum
CREATE TYPE "CalendarEventStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventImpact" AS ENUM ('NO_TRAINING', 'REDUCED', 'MODIFIED', 'NORMAL');

-- CreateEnum
CREATE TYPE "AltitudeAdaptationPhase" AS ENUM ('ACUTE', 'ADAPTATION', 'OPTIMAL', 'POST_CAMP');

-- CreateEnum
CREATE TYPE "BiomechanicalPillar" AS ENUM ('POSTERIOR_CHAIN', 'KNEE_DOMINANCE', 'UNILATERAL', 'FOOT_ANKLE', 'ANTI_ROTATION_CORE', 'UPPER_BODY');

-- CreateEnum
CREATE TYPE "ProgressionLevel" AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3');

-- CreateEnum
CREATE TYPE "PlyometricIntensity" AS ENUM ('LOW', 'MODERATE', 'HIGH');

-- CreateEnum
CREATE TYPE "ProgressionStatus" AS ENUM ('ON_TRACK', 'PLATEAU', 'REGRESSING', 'DELOAD_NEEDED');

-- CreateEnum
CREATE TYPE "StrengthPhase" AS ENUM ('ANATOMICAL_ADAPTATION', 'MAXIMUM_STRENGTH', 'POWER', 'MAINTENANCE', 'TAPER');

-- CreateEnum
CREATE TYPE "HabitCategory" AS ENUM ('NUTRITION', 'SLEEP', 'MOVEMENT', 'MINDFULNESS', 'TRAINING', 'RECOVERY');

-- CreateEnum
CREATE TYPE "HabitFrequency" AS ENUM ('DAILY', 'WEEKDAYS', 'SPECIFIC_DAYS', 'X_TIMES_WEEK');

-- CreateEnum
CREATE TYPE "ErgometerType" AS ENUM ('WATTBIKE', 'CONCEPT2_ROW', 'CONCEPT2_SKIERG', 'CONCEPT2_BIKEERG', 'ASSAULT_BIKE');

-- CreateEnum
CREATE TYPE "ErgometerTestProtocol" AS ENUM ('PEAK_POWER_6S', 'PEAK_POWER_7_STROKE', 'PEAK_POWER_30S', 'TT_1K', 'TT_2K', 'TT_10MIN', 'TT_20MIN', 'MAP_RAMP', 'CP_3MIN_ALL_OUT', 'CP_MULTI_TRIAL', 'INTERVAL_4X4');

-- CreateEnum
CREATE TYPE "SportTestCategory" AS ENUM ('POWER', 'SPEED', 'AGILITY', 'STRENGTH', 'ENDURANCE_FIELD', 'SPORT_SPECIFIC');

-- CreateEnum
CREATE TYPE "SportTestProtocol" AS ENUM ('VERTICAL_JUMP_CMJ', 'VERTICAL_JUMP_SJ', 'VERTICAL_JUMP_DJ', 'STANDING_LONG_JUMP', 'SPIKE_JUMP', 'BLOCK_JUMP', 'MEDICINE_BALL_THROW', 'SPRINT_5M', 'SPRINT_10M', 'SPRINT_20M', 'SPRINT_30M', 'SPRINT_40M', 'FLYING_10M', 'RSA_6X30M', 'T_TEST', 'ILLINOIS_AGILITY', 'PRO_AGILITY_5_10_5', 'LANE_AGILITY', 'ARROWHEAD_AGILITY', 'YOYO_IR1', 'YOYO_IR2', 'BEEP_TEST', 'COOPER_TEST', 'TIME_TRIAL_5K', 'TIME_TRIAL_10K', 'BENCH_PRESS_1RM', 'SQUAT_1RM', 'DEADLIFT_1RM', 'LEG_PRESS_1RM', 'OVERHEAD_PRESS_1RM', 'CSS_TEST', 'SWOLF_TEST', 'SWIM_TIME_TRIAL_100M', 'SWIM_TIME_TRIAL_400M', 'HYROX_SKIERG_1K', 'HYROX_ROW_1K', 'HYROX_SLED_PUSH', 'HYROX_SLED_PULL', 'HYROX_BURPEE_BROAD_JUMP', 'HYROX_FARMERS_CARRY', 'HYROX_SANDBAG_LUNGE', 'HYROX_WALL_BALLS', 'SERVE_SPEED', 'SHOT_SPEED');

-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('CARDIO_MACHINE', 'STRENGTH_MACHINE', 'FREE_WEIGHTS', 'RACKS', 'TESTING', 'ACCESSORIES', 'RECOVERY', 'AGILITY', 'TIMING_SYSTEMS');

-- CreateEnum
CREATE TYPE "AgilityDrillCategory" AS ENUM ('COD', 'REACTIVE_AGILITY', 'SPEED_ACCELERATION', 'PLYOMETRICS', 'FOOTWORK', 'BALANCE');

-- CreateEnum
CREATE TYPE "AgilityWorkoutFormat" AS ENUM ('CIRCUIT', 'STATION_ROTATION', 'INTERVAL', 'PROGRESSIVE', 'REACTIVE', 'TESTING');

-- CreateEnum
CREATE TYPE "DevelopmentStage" AS ENUM ('FUNDAMENTALS', 'LEARNING_TO_TRAIN', 'TRAINING_TO_TRAIN', 'TRAINING_TO_COMPETE', 'TRAINING_TO_WIN', 'ELITE');

-- CreateEnum
CREATE TYPE "TimingGateSource" AS ENUM ('CSV_IMPORT', 'VALD_API', 'BROWER', 'FREELAP', 'WITTY', 'MANUAL');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('LACTATE_TESTING', 'VO2MAX_TESTING', 'BODY_COMPOSITION', 'STRENGTH_TRAINING', 'CARDIO_TRAINING', 'GROUP_CLASSES', 'PERSONAL_TRAINING', 'REHABILITATION', 'NUTRITION_COACHING', 'VIDEO_ANALYSIS', 'REMOTE_COACHING');

-- CreateEnum
CREATE TYPE "FeatureFlag" AS ENUM ('LACTATE_TESTING', 'ERGOMETER_TESTING', 'TRAINING_PROGRAMS', 'AI_STUDIO', 'VIDEO_ANALYSIS', 'HYBRID_WORKOUTS', 'VBT_TRACKING', 'NUTRITION_TRACKING', 'MENSTRUAL_TRACKING', 'STRAVA_SYNC', 'GARMIN_SYNC', 'CONCEPT2_SYNC', 'MULTI_LOCATION', 'API_ACCESS', 'WHITE_LABEL', 'CUSTOM_BRANDING', 'SSO_LOGIN', 'UNLIMITED_ATHLETES', 'UNLIMITED_COACHES');

-- CreateEnum
CREATE TYPE "PartnerReferralStatus" AS ENUM ('PENDING', 'ACTIVE', 'CHURNED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TreatmentType" AS ENUM ('ASSESSMENT', 'MANUAL_THERAPY', 'DRY_NEEDLING', 'EXERCISE_THERAPY', 'ELECTROTHERAPY', 'TAPING', 'EDUCATION', 'DISCHARGE', 'OTHER');

-- CreateEnum
CREATE TYPE "PhysioAssignmentRole" AS ENUM ('PRIMARY', 'SECONDARY', 'CONSULTANT');

-- CreateEnum
CREATE TYPE "RehabPhase" AS ENUM ('ACUTE', 'SUBACUTE', 'REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT');

-- CreateEnum
CREATE TYPE "RestrictionType" AS ENUM ('NO_RUNNING', 'NO_JUMPING', 'NO_IMPACT', 'NO_UPPER_BODY', 'NO_LOWER_BODY', 'REDUCED_VOLUME', 'REDUCED_INTENSITY', 'MODIFIED_ONLY', 'SPECIFIC_EXERCISES', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RestrictionSeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'COMPLETE');

-- CreateEnum
CREATE TYPE "RestrictionSource" AS ENUM ('INJURY_CASCADE', 'PHYSIO_MANUAL', 'COACH_MANUAL', 'SYSTEM_AUTO');

-- CreateEnum
CREATE TYPE "InjuryMechanism" AS ENUM ('CONTACT', 'NON_CONTACT', 'OVERUSE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "InjuryUrgency" AS ENUM ('EMERGENCY', 'URGENT', 'MODERATE', 'LOW');

-- CreateEnum
CREATE TYPE "CareTeamThreadStatus" AS ENUM ('OPEN', 'RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CareTeamThreadPriority" AS ENUM ('URGENT', 'HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "MovementScreenType" AS ENUM ('FMS', 'SFMA', 'Y_BALANCE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AIProvider" AS ENUM ('ANTHROPIC', 'GOOGLE', 'OPENAI');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PDF', 'EXCEL', 'MARKDOWN', 'VIDEO', 'TEXT', 'RESEARCH_REPORT');

-- CreateEnum
CREATE TYPE "WODMode" AS ENUM ('STRUCTURED', 'CASUAL', 'FUN');

-- CreateEnum
CREATE TYPE "WODStatus" AS ENUM ('GENERATED', 'STARTED', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "HybridFormat" AS ENUM ('AMRAP', 'FOR_TIME', 'EMOM', 'TABATA', 'CHIPPER', 'LADDER', 'INTERVALS', 'HYROX_SIM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ScalingLevel" AS ENUM ('RX', 'SCALED', 'FOUNDATIONS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "HybridScoreType" AS ENUM ('TIME', 'ROUNDS_REPS', 'LOAD', 'REPS', 'CALORIES', 'COMPLETION');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('BARBELL', 'KETTLEBELL', 'DUMBBELL', 'BODYWEIGHT', 'PULL_UP_BAR', 'RINGS', 'BOX', 'ROPE', 'GHD', 'MACHINE_ROW', 'MACHINE_BIKE', 'MACHINE_SKI', 'ASSAULT_BIKE', 'WALL_BALL', 'MEDICINE_BALL', 'SANDBAG', 'SLED', 'RUNNING', 'JUMP_ROPE', 'YOKE', 'SWIMMING', 'PARALLETTES');

-- CreateEnum
CREATE TYPE "MovementCategory" AS ENUM ('OLYMPIC_LIFT', 'POWERLIFTING', 'GYMNASTICS', 'MONOSTRUCTURAL', 'KETTLEBELL_WORK', 'STRONGMAN', 'CORE_WORK', 'ACCESSORY', 'HYROX_STATION');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'SCHEDULED', 'COMPLETED', 'SKIPPED', 'MODIFIED');

-- CreateEnum
CREATE TYPE "CardioSegmentType" AS ENUM ('WARMUP', 'COOLDOWN', 'INTERVAL', 'STEADY', 'RECOVERY', 'HILL', 'DRILLS');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'PRE_WORKOUT', 'POST_WORKOUT', 'DINNER', 'EVENING_SNACK');

-- CreateEnum
CREATE TYPE "VBTDeviceType" AS ENUM ('VMAXPRO', 'VITRUVE', 'GYMAWARE', 'PUSH', 'PERCH', 'TENDO', 'GENERIC');

-- CreateEnum
CREATE TYPE "DeepResearchProvider" AS ENUM ('GEMINI', 'OPENAI_QUICK', 'OPENAI_STANDARD', 'OPENAI_DEEP', 'OPENAI_EXPERT', 'LANGCHAIN');

-- CreateEnum
CREATE TYPE "DeepResearchStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "ProgramGenerationStatus" AS ENUM ('PENDING', 'GENERATING_OUTLINE', 'GENERATING_PHASE', 'MERGING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AdHocInputType" AS ENUM ('PHOTO', 'SCREENSHOT', 'VOICE', 'TEXT', 'STRAVA_IMPORT', 'GARMIN_IMPORT', 'CONCEPT2_IMPORT', 'MANUAL_FORM');

-- CreateEnum
CREATE TYPE "AdHocWorkoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY_FOR_REVIEW', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "AISuggestionType" AS ENUM ('WORKOUT', 'ZONE_CALCULATION', 'PROGRAM_PERIODIZATION', 'RECOVERY_RECOMMENDATION', 'LOAD_ADJUSTMENT', 'EXERCISE_SELECTION', 'INTENSITY_PRESCRIPTION', 'VOLUME_PRESCRIPTION', 'TAPER_PLAN', 'OTHER');

-- CreateEnum
CREATE TYPE "DecisionReason" AS ENUM ('ATHLETE_FEEDBACK', 'FATIGUE_OBSERVED', 'HRV_LOW', 'SLEEP_POOR', 'INJURY_CONCERN', 'SCHEDULE_CONFLICT', 'PROGRESSION_ADJUSTMENT', 'WEATHER_CONDITIONS', 'EQUIPMENT_UNAVAILABLE', 'COACH_INTUITION', 'ATHLETE_PREFERENCE', 'TECHNIQUE_FOCUS', 'MENTAL_FRESHNESS', 'TRAVEL_FATIGUE', 'ILLNESS_RECOVERY', 'COMPETITION_PROXIMITY', 'OTHER');

-- CreateEnum
CREATE TYPE "OutcomeAssessment" AS ENUM ('BETTER_THAN_AI', 'SAME_AS_AI', 'WORSE_THAN_AI', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PredictionType" AS ENUM ('RACE_TIME', 'THRESHOLD_POWER', 'THRESHOLD_PACE', 'THRESHOLD_HEART_RATE', 'VO2MAX_ESTIMATE', 'INJURY_RISK', 'READINESS_SCORE', 'RECOVERY_TIME', 'IMPROVEMENT_RATE', 'PEAK_TIMING', 'OPTIMAL_TAPER', 'FTP_ESTIMATE', 'CRITICAL_POWER', 'WEIGHT_PREDICTION', 'BODY_COMPOSITION');

-- CreateEnum
CREATE TYPE "PredictionUserAction" AS ENUM ('ACCEPTED', 'IGNORED', 'MODIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ValidationSource" AS ENUM ('AUTO_STRAVA_IMPORT', 'AUTO_GARMIN_IMPORT', 'AUTO_RACE_RESULT', 'AUTO_TEST_RESULT', 'MANUAL_ENTRY', 'DEVICE_SYNC');

-- CreateEnum
CREATE TYPE "TrainingOutcome" AS ENUM ('EXCEEDED_GOALS', 'MET_GOALS', 'PARTIALLY_MET', 'MISSED_GOALS', 'ABANDONED', 'INJURED');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('GENERAL_FITNESS', 'WEIGHT_LOSS', 'ENDURANCE_PERFORMANCE', 'STRENGTH_GAIN', 'SPORT_SPECIFIC', 'COMPETITION', 'HEALTH_MAINTENANCE');

-- CreateEnum
CREATE TYPE "PatternConfidence" AS ENUM ('PRELIMINARY', 'MODERATE', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM ('PREDICTION_ERROR', 'DECISION_OVERRIDE', 'PATTERN_DISCOVERED', 'ACCURACY_IMPROVEMENT', 'USER_FEEDBACK', 'OUTCOME_MISMATCH');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('IDENTIFIED', 'VALIDATED', 'APPLIED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "ModelStatus" AS ENUM ('DEVELOPMENT', 'TESTING', 'ACTIVE', 'DEPRECATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AgentAutonomyLevel" AS ENUM ('ADVISORY', 'LIMITED', 'SUPERVISED', 'AUTONOMOUS');

-- CreateEnum
CREATE TYPE "AgentActionType" AS ENUM ('WORKOUT_INTENSITY_REDUCTION', 'WORKOUT_DURATION_REDUCTION', 'WORKOUT_SUBSTITUTION', 'WORKOUT_SKIP_RECOMMENDATION', 'REST_DAY_INJECTION', 'RECOVERY_ACTIVITY_SUGGESTION', 'PROGRAM_ADJUSTMENT', 'ESCALATE_TO_COACH', 'ESCALATE_TO_SUPPORT', 'MOTIVATIONAL_NUDGE', 'CHECK_IN_REQUEST');

-- CreateEnum
CREATE TYPE "AgentActionStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'REJECTED', 'AUTO_APPLIED', 'COACH_OVERRIDDEN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AgentConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "KnowledgeCategory" AS ENUM ('METHODOLOGY', 'PHYSIOLOGY', 'TESTING', 'STRENGTH', 'INJURY_PREVENTION', 'NUTRITION', 'SPORT_SPECIFIC', 'PROGRAMMING', 'RECOVERY', 'PERFORMANCE', 'MONITORING', 'YOUTH', 'MASTERS', 'PSYCHOLOGY', 'MOBILITY', 'TEAM_SPORTS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'COACH',
    "adminRole" "AdminRole",
    "language" TEXT NOT NULL DEFAULT 'sv',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "referredByBusinessId" TEXT,
    "selfAthleteClientId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sportType" "SportType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT,
    "sportType" "SportType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamWorkoutBroadcast" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "strengthSessionId" TEXT,
    "cardioSessionId" TEXT,
    "hybridWorkoutId" TEXT,
    "agilityWorkoutId" TEXT,
    "assignedDate" DATE NOT NULL,
    "notes" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "locationId" TEXT,
    "locationName" TEXT,
    "totalAssigned" INTEGER NOT NULL DEFAULT 0,
    "totalCompleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamWorkoutBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "gender" "Gender" NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "isDirect" BOOLEAN NOT NULL DEFAULT false,
    "isAICoached" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bestCheckInStreak" INTEGER DEFAULT 0,
    "bestStreakAchievedAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Test" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testDate" TIMESTAMP(3) NOT NULL,
    "testType" "TestType" NOT NULL,
    "status" "TestStatus" NOT NULL DEFAULT 'DRAFT',
    "location" TEXT,
    "testLeader" TEXT,
    "inclineUnit" "InclineUnit" NOT NULL DEFAULT 'PERCENT',
    "testerId" TEXT,
    "locationId" TEXT,
    "publicToken" TEXT,
    "publicExpiresAt" TIMESTAMP(3),
    "restingLactate" DOUBLE PRECISION,
    "restingHeartRate" INTEGER,
    "postTestMeasurements" JSONB,
    "recommendedNextTestDate" TIMESTAMP(3),
    "maxHR" INTEGER,
    "maxLactate" DOUBLE PRECISION,
    "vo2max" DOUBLE PRECISION,
    "aerobicThreshold" JSONB,
    "anaerobicThreshold" JSONB,
    "manualLT1Lactate" DOUBLE PRECISION,
    "manualLT1Intensity" DOUBLE PRECISION,
    "manualLT2Lactate" DOUBLE PRECISION,
    "manualLT2Intensity" DOUBLE PRECISION,
    "trainingZones" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestStage" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "heartRate" INTEGER NOT NULL,
    "lactate" DOUBLE PRECISION NOT NULL,
    "vo2" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "incline" DOUBLE PRECISION,
    "power" DOUBLE PRECISION,
    "cadence" INTEGER,
    "pace" DOUBLE PRECISION,
    "economy" DOUBLE PRECISION,
    "wattsPerKg" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,
    "customNotes" TEXT,
    "recommendations" TEXT,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "testType" "TestType" NOT NULL,
    "description" TEXT,
    "stages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "maxAthletes" INTEGER NOT NULL DEFAULT 0,
    "currentAthletes" INTEGER NOT NULL DEFAULT 0,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "stripeCurrentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "cancelAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalUses" INTEGER NOT NULL DEFAULT 0,
    "successfulReferrals" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referralCodeId" TEXT NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "referredUserId" TEXT,
    "referredEmail" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "referrerRewardGranted" BOOLEAN NOT NULL DEFAULT false,
    "referredRewardGranted" BOOLEAN NOT NULL DEFAULT false,
    "signupAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralReward" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardType" "ReferralRewardType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "stripeDiscountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteSubscription" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tier" "AthleteSubscriptionTier" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "paymentSource" "PaymentSource" NOT NULL DEFAULT 'DIRECT',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "billingCycle" TEXT,
    "businessId" TEXT,
    "revenueSharePercent" DOUBLE PRECISION,
    "assignedCoachId" TEXT,
    "coachRevenueSharePercent" DOUBLE PRECISION,
    "coachRevenueShareStartDate" TIMESTAMP(3),
    "aiChatEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiChatMessagesUsed" INTEGER NOT NULL DEFAULT 0,
    "aiChatMessagesLimit" INTEGER NOT NULL DEFAULT 0,
    "videoAnalysisEnabled" BOOLEAN NOT NULL DEFAULT false,
    "garminEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stravaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "workoutLoggingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyCheckInEnabled" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'SE',
    "stripeConnectAccountId" TEXT,
    "stripeConnectStatus" TEXT,
    "defaultRevenueShare" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "logoUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#3b82f6',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessMember" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "permissions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessApiKey" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "requestsPerMinute" INTEGER NOT NULL DEFAULT 60,
    "requestsPerDay" INTEGER NOT NULL DEFAULT 10000,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerReferral" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "referralCode" TEXT,
    "referralSource" TEXT,
    "landingPage" TEXT,
    "status" "PartnerReferralStatus" NOT NULL DEFAULT 'PENDING',
    "revenueSharePercent" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "platformSharePercent" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "subscriptionTier" TEXT,
    "monthlyAmount" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'SEK',
    "firstSubscriptionAt" TIMESTAMP(3),
    "lastPaymentAt" TIMESTAMP(3),
    "totalRevenue" INTEGER NOT NULL DEFAULT 0,
    "totalBusinessShare" INTEGER NOT NULL DEFAULT 0,
    "totalPlatformShare" INTEGER NOT NULL DEFAULT 0,
    "paymentCount" INTEGER NOT NULL DEFAULT 0,
    "pendingPayout" INTEGER NOT NULL DEFAULT 0,
    "lastPayoutAt" TIMESTAMP(3),
    "lastPayoutAmount" INTEGER,
    "signedUpAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "churnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tester" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "totalTests" INTEGER NOT NULL DEFAULT 0,
    "lastTestAt" TIMESTAMP(3),
    "phone" TEXT,
    "title" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "city" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "openingHours" JSONB,
    "capabilities" TEXT[],
    "totalTests" INTEGER NOT NULL DEFAULT 0,
    "lastTestAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameSv" TEXT,
    "category" "EquipmentCategory" NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "enablesTests" TEXT[],
    "enablesExercises" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationEquipment" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "condition" TEXT,
    "notes" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "availableFrom" TIMESTAMP(3),
    "availableTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationService" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requiredEquipment" TEXT[],
    "requiredStaff" TEXT[],
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'SEK',
    "pricingModel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationStaff" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "schedule" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessFeature" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "feature" "FeatureFlag" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "usageLimit" INTEGER NOT NULL DEFAULT -1,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "enabledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationToken" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "externalUserId" TEXT,
    "scope" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthRequestToken" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "requestToken" TEXT NOT NULL,
    "tokenSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthRequestToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StravaActivity" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "stravaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sportType" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "distance" DOUBLE PRECISION,
    "movingTime" INTEGER,
    "elapsedTime" INTEGER,
    "elevationGain" DOUBLE PRECISION,
    "averageSpeed" DOUBLE PRECISION,
    "maxSpeed" DOUBLE PRECISION,
    "averageHeartrate" DOUBLE PRECISION,
    "maxHeartrate" DOUBLE PRECISION,
    "averageCadence" DOUBLE PRECISION,
    "averageWatts" DOUBLE PRECISION,
    "weightedAverageWatts" DOUBLE PRECISION,
    "kilojoules" DOUBLE PRECISION,
    "sufferScore" INTEGER,
    "calories" DOUBLE PRECISION,
    "trainer" BOOLEAN NOT NULL DEFAULT false,
    "manual" BOOLEAN NOT NULL DEFAULT false,
    "mapPolyline" TEXT,
    "tss" DOUBLE PRECISION,
    "trimp" DOUBLE PRECISION,
    "mappedType" TEXT,
    "mappedIntensity" TEXT,
    "splitsMetric" JSONB,
    "laps" JSONB,
    "hrStream" JSONB,
    "hrStreamFetched" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StravaActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarminActivity" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "garminActivityId" BIGINT NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "distance" DOUBLE PRECISION,
    "duration" INTEGER,
    "elapsedTime" INTEGER,
    "elevationGain" DOUBLE PRECISION,
    "averageSpeed" DOUBLE PRECISION,
    "maxSpeed" DOUBLE PRECISION,
    "averageHeartrate" DOUBLE PRECISION,
    "maxHeartrate" DOUBLE PRECISION,
    "averageCadence" DOUBLE PRECISION,
    "averageWatts" DOUBLE PRECISION,
    "normalizedPower" DOUBLE PRECISION,
    "maxWatts" DOUBLE PRECISION,
    "trainingEffect" DOUBLE PRECISION,
    "anaerobicEffect" DOUBLE PRECISION,
    "calories" DOUBLE PRECISION,
    "indoor" BOOLEAN NOT NULL DEFAULT false,
    "manual" BOOLEAN NOT NULL DEFAULT false,
    "tss" DOUBLE PRECISION,
    "trimp" DOUBLE PRECISION,
    "mappedType" TEXT,
    "mappedIntensity" TEXT,
    "laps" JSONB,
    "splits" JSONB,
    "hrZoneSeconds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarminActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concept2Result" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "concept2Id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "workoutType" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT,
    "comments" TEXT,
    "distance" INTEGER NOT NULL,
    "time" INTEGER NOT NULL,
    "calories" INTEGER,
    "strokeRate" DOUBLE PRECISION,
    "dragFactor" INTEGER,
    "avgHeartRate" DOUBLE PRECISION,
    "maxHeartRate" DOUBLE PRECISION,
    "minHeartRate" DOUBLE PRECISION,
    "pace" DOUBLE PRECISION,
    "splits" JSONB,
    "intervals" JSONB,
    "hasStrokeData" BOOLEAN NOT NULL DEFAULT false,
    "tss" DOUBLE PRECISION,
    "trimp" DOUBLE PRECISION,
    "mappedType" TEXT,
    "mappedIntensity" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Concept2Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "InvitationType" NOT NULL,
    "senderId" TEXT,
    "businessId" TEXT,
    "recipientEmail" TEXT,
    "recipientName" TEXT,
    "usedAt" TIMESTAMP(3),
    "usedByClientId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "bonusAwarded" BOOLEAN NOT NULL DEFAULT false,
    "bonusAmount" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteAccount" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationPrefs" JSONB,
    "preferredLocationId" TEXT,
    "trainingBackground" TEXT,
    "longTermAmbitions" TEXT,
    "seasonalFocus" TEXT,
    "personalMotivations" TEXT,
    "trainingPreferences" TEXT,
    "constraints" TEXT,
    "dietaryNotes" TEXT,
    "profileLastUpdated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingProgram" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "testId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "goalRace" TEXT,
    "goalDate" TIMESTAMP(3),
    "goalType" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "generatedFromTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingWeek" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "phase" "PeriodPhase" NOT NULL,
    "focus" TEXT,
    "weeklyVolume" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "TrainingWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingDay" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "TrainingDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "type" "WorkoutType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "intensity" "WorkoutIntensity" NOT NULL,
    "duration" INTEGER,
    "distance" DOUBLE PRECISION,
    "instructions" TEXT,
    "coachNotes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 1,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "isAdHoc" BOOLEAN NOT NULL DEFAULT false,
    "heroTitle" TEXT,
    "heroDescription" TEXT,
    "heroCategory" TEXT,
    "heroImageKey" TEXT,
    "focusGeneratedAt" TIMESTAMP(3),
    "focusGeneratedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSegment" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "duration" INTEGER,
    "distance" DOUBLE PRECISION,
    "pace" TEXT,
    "zone" INTEGER,
    "heartRate" TEXT,
    "power" INTEGER,
    "reps" INTEGER,
    "exerciseId" TEXT,
    "sets" INTEGER,
    "repsCount" TEXT,
    "weight" TEXT,
    "tempo" TEXT,
    "rest" INTEGER,
    "section" "WorkoutSectionType" NOT NULL DEFAULT 'MAIN',
    "description" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "coachId" TEXT,
    "name" TEXT NOT NULL,
    "category" "WorkoutType" NOT NULL,
    "muscleGroup" TEXT,
    "description" TEXT,
    "instructions" TEXT,
    "videoUrl" TEXT,
    "equipment" TEXT,
    "difficulty" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "nameSv" TEXT,
    "nameEn" TEXT,
    "biomechanicalPillar" "BiomechanicalPillar",
    "progressionLevel" "ProgressionLevel",
    "plyometricIntensity" "PlyometricIntensity",
    "contactsPerRep" INTEGER,
    "substitutes" TEXT,
    "progressionPath" TEXT,
    "isHybridMovement" BOOLEAN NOT NULL DEFAULT false,
    "movementCategory" "MovementCategory",
    "equipmentTypes" "EquipmentType"[] DEFAULT ARRAY[]::"EquipmentType"[],
    "defaultReps" INTEGER,
    "defaultWeightMale" DOUBLE PRECISION,
    "defaultWeightFemale" DOUBLE PRECISION,
    "scaledWeightMale" DOUBLE PRECISION,
    "scaledWeightFemale" DOUBLE PRECISION,
    "foundationMovement" TEXT,
    "standardAbbreviation" TEXT,
    "iconUrl" TEXT,
    "iconCategory" TEXT,
    "imageUrls" JSONB,
    "primaryImageIndex" INTEGER DEFAULT 0,
    "isRehabExercise" BOOLEAN NOT NULL DEFAULT false,
    "rehabPhases" "RehabPhase"[] DEFAULT ARRAY[]::"RehabPhase"[],
    "targetBodyParts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contraindications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "progressionExerciseId" TEXT,
    "regressionExerciseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutLog" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "distance" DOUBLE PRECISION,
    "avgPace" TEXT,
    "avgHR" INTEGER,
    "maxHR" INTEGER,
    "avgPower" INTEGER,
    "normalizedPower" INTEGER,
    "maxPower" INTEGER,
    "avgCadence" INTEGER,
    "elevation" INTEGER,
    "tss" DOUBLE PRECISION,
    "intensityFactor" DOUBLE PRECISION,
    "powerZone" INTEGER,
    "perceivedEffort" INTEGER,
    "difficulty" INTEGER,
    "feeling" TEXT,
    "notes" TEXT,
    "dataFileUrl" TEXT,
    "stravaUrl" TEXT,
    "coachFeedback" TEXT,
    "coachViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetLog" (
    "id" TEXT NOT NULL,
    "workoutLogId" TEXT,
    "segmentId" TEXT,
    "assignmentId" TEXT,
    "exerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "repsCompleted" INTEGER NOT NULL,
    "repsTarget" INTEGER,
    "rpe" INTEGER,
    "meanVelocity" DOUBLE PRECISION,
    "peakVelocity" DOUBLE PRECISION,
    "meanPower" DOUBLE PRECISION,
    "peakPower" DOUBLE PRECISION,
    "restTaken" INTEGER,
    "estimated1RM" DOUBLE PRECISION,
    "velocityZone" TEXT,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "workoutId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThresholdCalculation" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "polynomialCoeffs" JSONB,
    "r2" DOUBLE PRECISION,
    "dmaxIntensity" DOUBLE PRECISION,
    "dmaxLactate" DOUBLE PRECISION,
    "dmaxHr" DOUBLE PRECISION,
    "lt1Intensity" DOUBLE PRECISION NOT NULL,
    "lt1Lactate" DOUBLE PRECISION NOT NULL,
    "lt1Hr" DOUBLE PRECISION NOT NULL,
    "lt1Method" TEXT NOT NULL,
    "lt2Intensity" DOUBLE PRECISION NOT NULL,
    "lt2Lactate" DOUBLE PRECISION NOT NULL,
    "lt2Hr" DOUBLE PRECISION NOT NULL,
    "lt2PercentVO2max" DOUBLE PRECISION,
    "testDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "warnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThresholdCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "vo2maxPercentile" DOUBLE PRECISION,
    "lt2AsPercentVO2max" DOUBLE PRECISION,
    "currentVDOT" DOUBLE PRECISION,
    "vdotSource" TEXT,
    "vdotConfidence" TEXT,
    "vdotLastUpdated" TIMESTAMP(3),
    "vdotAgeAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "vdotGenderAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "maxLactate" DOUBLE PRECISION,
    "lt2LactateRatio" DOUBLE PRECISION,
    "lt2Speed" DOUBLE PRECISION,
    "lt2HeartRate" INTEGER,
    "lactateTestDate" TIMESTAMP(3),
    "lactateConfidence" TEXT,
    "metabolicType" TEXT,
    "metabolicTypeSource" TEXT,
    "compressionFactor" DOUBLE PRECISION,
    "compressionSource" TEXT,
    "danielsZones" JSONB,
    "canovaZones" JSONB,
    "norwegianZones" JSONB,
    "hrZones" JSONB,
    "zonesLastUpdated" TIMESTAMP(3),
    "zonesPrimarySource" TEXT,
    "hrvBaseline" DOUBLE PRECISION,
    "hrvStdDev" DOUBLE PRECISION,
    "hrvLastUpdated" TIMESTAMP(3),
    "rhrBaseline" DOUBLE PRECISION,
    "rhrLastUpdated" TIMESTAMP(3),
    "trainingZones" JSONB,
    "hasLactateMeter" BOOLEAN NOT NULL DEFAULT false,
    "hasHRVMonitor" BOOLEAN NOT NULL DEFAULT false,
    "hasPowerMeter" BOOLEAN NOT NULL DEFAULT false,
    "crossTrainingPreferences" JSONB,
    "yearsRunning" INTEGER,
    "typicalWeeklyKm" DOUBLE PRECISION,
    "longestLongRun" DOUBLE PRECISION,
    "norwegianPhase" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCheckIn" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hrv" DOUBLE PRECISION,
    "restingHR" DOUBLE PRECISION,
    "sleepQuality" INTEGER NOT NULL,
    "sleepHours" DOUBLE PRECISION,
    "soreness" INTEGER NOT NULL,
    "fatigue" INTEGER NOT NULL,
    "stress" INTEGER NOT NULL,
    "mood" INTEGER NOT NULL,
    "motivation" INTEGER NOT NULL,
    "readinessScore" INTEGER,
    "readinessDecision" TEXT,
    "notes" TEXT,
    "rehabExercisesDone" BOOLEAN NOT NULL DEFAULT false,
    "rehabPainDuring" INTEGER,
    "rehabPainAfter" INTEGER,
    "rehabNotes" TEXT,
    "requestPhysioContact" BOOLEAN NOT NULL DEFAULT false,
    "physioContactReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldTestSchedule" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedDate" TIMESTAMP(3),
    "fieldTestId" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldTestSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetrics" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hrvRMSSD" DOUBLE PRECISION,
    "hrvQuality" TEXT,
    "hrvArtifactPercent" DOUBLE PRECISION,
    "hrvDuration" DOUBLE PRECISION,
    "hrvPosition" TEXT,
    "hrvStatus" TEXT,
    "hrvPercent" DOUBLE PRECISION,
    "hrvTrend" TEXT,
    "restingHR" DOUBLE PRECISION,
    "restingHRDev" DOUBLE PRECISION,
    "restingHRStatus" TEXT,
    "sleepQuality" INTEGER,
    "sleepHours" DOUBLE PRECISION,
    "muscleSoreness" INTEGER,
    "energyLevel" INTEGER,
    "mood" INTEGER,
    "stress" INTEGER,
    "injuryPain" INTEGER,
    "wellnessScore" DOUBLE PRECISION,
    "wellnessStatus" TEXT,
    "readinessScore" DOUBLE PRECISION,
    "readinessLevel" TEXT,
    "recommendedAction" TEXT,
    "factorScores" JSONB,
    "redFlags" JSONB,
    "yellowFlags" JSONB,
    "athleteNotes" TEXT,
    "coachNotes" TEXT,
    "injuryBodyPart" TEXT,
    "injurySpecificType" TEXT,
    "injurySide" TEXT,
    "isIllness" BOOLEAN NOT NULL DEFAULT false,
    "illnessType" TEXT,
    "detectedKeywords" JSONB,
    "keywordBodyPart" TEXT,
    "keywordSeverity" TEXT,
    "keywordSummary" TEXT,
    "rehabExercisesDone" BOOLEAN NOT NULL DEFAULT false,
    "rehabPainDuring" INTEGER,
    "rehabPainAfter" INTEGER,
    "rehabNotes" TEXT,
    "requestPhysioContact" BOOLEAN NOT NULL DEFAULT false,
    "physioContactReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingLoad" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dailyLoad" DOUBLE PRECISION NOT NULL,
    "loadType" TEXT NOT NULL,
    "acuteLoad" DOUBLE PRECISION,
    "chronicLoad" DOUBLE PRECISION,
    "acwr" DOUBLE PRECISION,
    "acwrZone" TEXT,
    "injuryRisk" TEXT,
    "duration" DOUBLE PRECISION NOT NULL,
    "distance" DOUBLE PRECISION,
    "avgHR" DOUBLE PRECISION,
    "maxHR" DOUBLE PRECISION,
    "avgPace" DOUBLE PRECISION,
    "intensity" TEXT NOT NULL,
    "workoutType" TEXT,
    "workoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingLoad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyTrainingSummary" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "weekEnd" DATE NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalTSS" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDistance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "totalCalories" INTEGER,
    "workoutCount" INTEGER NOT NULL DEFAULT 0,
    "plannedWorkoutCount" INTEGER,
    "completedWorkoutCount" INTEGER,
    "compliancePercent" DOUBLE PRECISION,
    "workoutsByType" JSONB NOT NULL DEFAULT '{}',
    "tssByType" JSONB NOT NULL DEFAULT '{}',
    "distanceByType" JSONB NOT NULL DEFAULT '{}',
    "durationByType" JSONB NOT NULL DEFAULT '{}',
    "easyMinutes" INTEGER NOT NULL DEFAULT 0,
    "moderateMinutes" INTEGER NOT NULL DEFAULT 0,
    "hardMinutes" INTEGER NOT NULL DEFAULT 0,
    "polarizationRatio" DOUBLE PRECISION,
    "zone1Minutes" INTEGER NOT NULL DEFAULT 0,
    "zone2Minutes" INTEGER NOT NULL DEFAULT 0,
    "zone3Minutes" INTEGER NOT NULL DEFAULT 0,
    "zone4Minutes" INTEGER NOT NULL DEFAULT 0,
    "zone5Minutes" INTEGER NOT NULL DEFAULT 0,
    "avgDailyTSS" DOUBLE PRECISION,
    "peakDailyTSS" DOUBLE PRECISION,
    "acwrAtWeekEnd" DOUBLE PRECISION,
    "acwrZone" TEXT,
    "avgReadiness" DOUBLE PRECISION,
    "avgSleepHours" DOUBLE PRECISION,
    "avgSleepQuality" DOUBLE PRECISION,
    "avgFatigue" DOUBLE PRECISION,
    "avgSoreness" DOUBLE PRECISION,
    "strengthSets" INTEGER,
    "strengthVolume" DOUBLE PRECISION,
    "stravaActivities" INTEGER NOT NULL DEFAULT 0,
    "garminActivities" INTEGER NOT NULL DEFAULT 0,
    "manualActivities" INTEGER NOT NULL DEFAULT 0,
    "programWorkouts" INTEGER NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyTrainingSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyTrainingSummary" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "monthStart" DATE NOT NULL,
    "monthEnd" DATE NOT NULL,
    "totalTSS" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDistance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "totalCalories" INTEGER,
    "workoutCount" INTEGER NOT NULL DEFAULT 0,
    "avgWeeklyTSS" DOUBLE PRECISION,
    "avgWeeklyDistance" DOUBLE PRECISION,
    "avgWeeklyDuration" DOUBLE PRECISION,
    "avgWeeklyWorkouts" DOUBLE PRECISION,
    "workoutsByType" JSONB NOT NULL DEFAULT '{}',
    "tssByType" JSONB NOT NULL DEFAULT '{}',
    "avgPolarizationRatio" DOUBLE PRECISION,
    "totalEasyMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalHardMinutes" INTEGER NOT NULL DEFAULT 0,
    "avgACWR" DOUBLE PRECISION,
    "peakACWR" DOUBLE PRECISION,
    "daysInDangerZone" INTEGER NOT NULL DEFAULT 0,
    "avgCompliancePercent" DOUBLE PRECISION,
    "avgReadiness" DOUBLE PRECISION,
    "readinessTrend" TEXT,
    "tssChangePercent" DOUBLE PRECISION,
    "distanceChangePercent" DOUBLE PRECISION,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyTrainingSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityHRZoneDistribution" (
    "id" TEXT NOT NULL,
    "stravaActivityId" TEXT,
    "garminActivityId" TEXT,
    "zone1Seconds" INTEGER NOT NULL DEFAULT 0,
    "zone2Seconds" INTEGER NOT NULL DEFAULT 0,
    "zone3Seconds" INTEGER NOT NULL DEFAULT 0,
    "zone4Seconds" INTEGER NOT NULL DEFAULT 0,
    "zone5Seconds" INTEGER NOT NULL DEFAULT 0,
    "totalTrackedSeconds" INTEGER NOT NULL DEFAULT 0,
    "zoneSource" TEXT NOT NULL,
    "zoneConfig" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityHRZoneDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YearlySummary" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalTSS" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDistance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "totalCalories" INTEGER,
    "workoutCount" INTEGER NOT NULL DEFAULT 0,
    "zone1Minutes" INTEGER NOT NULL DEFAULT 0,
    "zone2Minutes" INTEGER NOT NULL DEFAULT 0,
    "zone3Minutes" INTEGER NOT NULL DEFAULT 0,
    "zone4Minutes" INTEGER NOT NULL DEFAULT 0,
    "zone5Minutes" INTEGER NOT NULL DEFAULT 0,
    "monthlyHours" JSONB NOT NULL DEFAULT '[]',
    "monthlyZoneDistribution" JSONB NOT NULL DEFAULT '[]',
    "workoutsByType" JSONB NOT NULL DEFAULT '{}',
    "hoursByType" JSONB NOT NULL DEFAULT '{}',
    "avgPolarizationRatio" DOUBLE PRECISION,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YearlySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingProgramEngine" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "methodology" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalWeeks" INTEGER NOT NULL,
    "currentWeek" INTEGER NOT NULL DEFAULT 1,
    "currentPhase" TEXT,
    "targetRaceDate" TIMESTAMP(3),
    "targetDistance" TEXT,
    "targetTime" TEXT,
    "periodization" JSONB NOT NULL,
    "weeklyPlans" JSONB NOT NULL,
    "methodologyConfig" JSONB,
    "generatedBy" TEXT NOT NULL,
    "generatedFrom" JSONB,
    "completedWeeks" INTEGER NOT NULL DEFAULT 0,
    "missedWorkouts" INTEGER NOT NULL DEFAULT 0,
    "modifiedWorkouts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingProgramEngine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutModification" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decision" TEXT NOT NULL,
    "autoGenerated" BOOLEAN NOT NULL DEFAULT true,
    "plannedType" TEXT NOT NULL,
    "plannedDuration" DOUBLE PRECISION NOT NULL,
    "plannedDistance" DOUBLE PRECISION,
    "plannedIntensity" TEXT NOT NULL,
    "plannedDetails" JSONB,
    "modifiedType" TEXT,
    "modifiedDuration" DOUBLE PRECISION,
    "modifiedDistance" DOUBLE PRECISION,
    "modifiedIntensity" TEXT,
    "modifiedDetails" JSONB,
    "readinessScore" DOUBLE PRECISION,
    "factors" JSONB NOT NULL,
    "reasoning" TEXT NOT NULL,
    "methodology" TEXT,
    "dailyMetricsId" TEXT,
    "acwr" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutModification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldTest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "conditions" JSONB,
    "results" JSONB NOT NULL,
    "lt1Pace" DOUBLE PRECISION,
    "lt1HR" DOUBLE PRECISION,
    "lt2Pace" DOUBLE PRECISION,
    "lt2HR" DOUBLE PRECISION,
    "confidence" TEXT,
    "valid" BOOLEAN NOT NULL DEFAULT true,
    "warnings" JSONB,
    "errors" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelfReportedLactate" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "measurementType" TEXT NOT NULL,
    "workoutType" TEXT,
    "intensity" DOUBLE PRECISION,
    "lactate" DOUBLE PRECISION,
    "heartRate" DOUBLE PRECISION,
    "rpe" INTEGER,
    "measurements" JSONB,
    "meterBrand" TEXT,
    "calibrated" BOOLEAN NOT NULL DEFAULT false,
    "qualityRating" TEXT,
    "estimatedLT1" DOUBLE PRECISION,
    "estimatedLT2" DOUBLE PRECISION,
    "confidence" TEXT,
    "workoutId" TEXT,
    "notes" TEXT,
    "photos" JSONB,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SelfReportedLactate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceCalendar" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "seasonName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaceCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Race" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "distance" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "targetTime" TEXT,
    "targetPace" DOUBLE PRECISION,
    "taperWeeks" INTEGER,
    "lastQualityDate" TIMESTAMP(3),
    "actualTime" TEXT,
    "actualPace" DOUBLE PRECISION,
    "place" INTEGER,
    "avgHR" DOUBLE PRECISION,
    "maxHR" DOUBLE PRECISION,
    "splits" JSONB,
    "conditions" JSONB,
    "vdot" DOUBLE PRECISION,
    "equivalents" JSONB,
    "assessment" TEXT,
    "notes" TEXT,
    "photos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Race_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InjuryAssessment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "assessedById" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bodyPart" TEXT,
    "side" TEXT,
    "mechanism" TEXT,
    "description" TEXT,
    "painLevel" INTEGER NOT NULL,
    "painLocation" TEXT,
    "painTiming" TEXT,
    "gaitAffected" BOOLEAN NOT NULL DEFAULT false,
    "painDuringWarmup" BOOLEAN NOT NULL DEFAULT false,
    "painContinuesThroughout" BOOLEAN NOT NULL DEFAULT false,
    "painDisappearsAfterWarmup" BOOLEAN NOT NULL DEFAULT false,
    "painRedevelopsLater" BOOLEAN NOT NULL DEFAULT false,
    "painPersists1HourPost" BOOLEAN NOT NULL DEFAULT false,
    "delawarePainRuleTriggered" BOOLEAN NOT NULL DEFAULT false,
    "delawareRule" TEXT,
    "rangeOfMotion" TEXT,
    "swelling" BOOLEAN NOT NULL DEFAULT false,
    "discoloration" BOOLEAN NOT NULL DEFAULT false,
    "weightBearing" TEXT,
    "functionalLimitations" JSONB,
    "redFlags" JSONB,
    "assessment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "injuryType" TEXT,
    "phase" TEXT,
    "recommendedProtocol" JSONB,
    "estimatedTimeOff" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InjuryAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysioAssignment" (
    "id" TEXT NOT NULL,
    "physioUserId" TEXT NOT NULL,
    "clientId" TEXT,
    "teamId" TEXT,
    "organizationId" TEXT,
    "businessId" TEXT,
    "locationId" TEXT,
    "role" "PhysioAssignmentRole" NOT NULL DEFAULT 'PRIMARY',
    "canModifyPrograms" BOOLEAN NOT NULL DEFAULT false,
    "canCreateRestrictions" BOOLEAN NOT NULL DEFAULT true,
    "canViewFullHistory" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysioAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentSession" (
    "id" TEXT NOT NULL,
    "physioUserId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "injuryId" TEXT,
    "sessionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "treatmentType" "TreatmentType" NOT NULL,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "painBefore" INTEGER,
    "painAfter" INTEGER,
    "romMeasurements" JSONB,
    "modalitiesUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" TIMESTAMP(3),
    "followUpNotes" TEXT,
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "billingCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RehabProgram" (
    "id" TEXT NOT NULL,
    "physioUserId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "injuryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currentPhase" "RehabPhase" NOT NULL DEFAULT 'ACUTE',
    "phaseStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimatedEndDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "shortTermGoals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "longTermGoals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contraindications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "precautions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "acceptablePainDuring" INTEGER NOT NULL DEFAULT 3,
    "acceptablePainAfter" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RehabProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RehabExercise" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sets" INTEGER,
    "reps" TEXT,
    "duration" INTEGER,
    "frequency" TEXT,
    "intensity" TEXT,
    "progressionCriteria" TEXT,
    "regressionCriteria" TEXT,
    "phases" "RehabPhase"[] DEFAULT ARRAY[]::"RehabPhase"[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "cuePoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RehabExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RehabMilestone" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criteria" TEXT,
    "criteriaJson" JSONB,
    "phase" "RehabPhase" NOT NULL,
    "targetDate" TIMESTAMP(3),
    "achievedDate" TIMESTAMP(3),
    "isAchieved" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RehabMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RehabProgressLog" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exercisesCompleted" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "completionPercent" DOUBLE PRECISION,
    "painDuring" INTEGER,
    "painAfter" INTEGER,
    "difficultyRating" INTEGER,
    "notes" TEXT,
    "physioReviewed" BOOLEAN NOT NULL DEFAULT false,
    "physioNotes" TEXT,
    "physioReviewedAt" TIMESTAMP(3),
    "physioReviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RehabProgressLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRestriction" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "injuryId" TEXT,
    "type" "RestrictionType" NOT NULL,
    "severity" "RestrictionSeverity" NOT NULL DEFAULT 'MODERATE',
    "source" "RestrictionSource" NOT NULL DEFAULT 'PHYSIO_MANUAL',
    "bodyParts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "affectedWorkoutTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "affectedExerciseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "volumeReductionPercent" INTEGER,
    "maxIntensityZone" INTEGER,
    "description" TEXT,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clearedAt" TIMESTAMP(3),
    "clearedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovementScreen" (
    "id" TEXT NOT NULL,
    "physioUserId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "screenDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "screenType" "MovementScreenType" NOT NULL,
    "results" JSONB NOT NULL,
    "totalScore" INTEGER,
    "asymmetryFlag" BOOLEAN NOT NULL DEFAULT false,
    "previousScreenId" TEXT,
    "improvement" TEXT,
    "recommendations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priorityAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovementScreen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcuteInjuryReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "injuryId" TEXT,
    "reportDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "incidentTime" TEXT,
    "mechanism" "InjuryMechanism" NOT NULL,
    "bodyPart" TEXT NOT NULL,
    "side" TEXT,
    "description" TEXT,
    "urgency" "InjuryUrgency" NOT NULL DEFAULT 'MODERATE',
    "initialSeverity" INTEGER NOT NULL DEFAULT 5,
    "activityType" TEXT,
    "surfaceType" TEXT,
    "equipmentInvolved" TEXT,
    "immediateCareGiven" TEXT,
    "iceApplied" BOOLEAN NOT NULL DEFAULT false,
    "removedFromPlay" BOOLEAN NOT NULL DEFAULT false,
    "ambulanceCalled" BOOLEAN NOT NULL DEFAULT false,
    "referralNeeded" BOOLEAN NOT NULL DEFAULT false,
    "referralType" TEXT,
    "referralUrgency" TEXT,
    "physioNotified" BOOLEAN NOT NULL DEFAULT false,
    "physioNotifiedAt" TIMESTAMP(3),
    "coachNotified" BOOLEAN NOT NULL DEFAULT false,
    "coachNotifiedAt" TIMESTAMP(3),
    "followUpScheduled" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcuteInjuryReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareTeamThread" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "injuryId" TEXT,
    "rehabProgramId" TEXT,
    "restrictionId" TEXT,
    "status" "CareTeamThreadStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "CareTeamThreadPriority" NOT NULL DEFAULT 'NORMAL',
    "lastMessageAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareTeamThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareTeamMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mentionedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attachments" JSONB,
    "readByUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareTeamMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareTeamParticipant" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PARTICIPANT',
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyPush" BOOLEAN NOT NULL DEFAULT true,
    "lastReadAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mutedUntil" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareTeamParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrossTrainingSession" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "workoutId" TEXT,
    "modality" TEXT NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "distance" DOUBLE PRECISION,
    "avgHR" DOUBLE PRECISION,
    "maxHR" DOUBLE PRECISION,
    "avgPower" DOUBLE PRECISION,
    "rpe" INTEGER,
    "intensity" TEXT NOT NULL,
    "structure" JSONB,
    "bodyWeightSupport" DOUBLE PRECISION,
    "resistance" TEXT,
    "strokeRate" DOUBLE PRECISION,
    "runningEquivalent" JSONB NOT NULL,
    "tssEquivalent" DOUBLE PRECISION,
    "reason" TEXT,
    "injuryType" TEXT,
    "effectiveness" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrossTrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrengthTrainingSession" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "phase" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "timingRelativeToRun" TEXT,
    "runningWorkoutId" TEXT,
    "strengthExercises" JSONB,
    "plyometricExercises" JSONB,
    "runningDrills" JSONB,
    "totalSets" INTEGER,
    "totalContacts" INTEGER,
    "duration" DOUBLE PRECISION NOT NULL,
    "rpe" INTEGER,
    "strengthLoad" DOUBLE PRECISION,
    "plyometricLoad" DOUBLE PRECISION,
    "runningPhase" TEXT,
    "priorityLevel" TEXT NOT NULL,
    "completionRate" DOUBLE PRECISION,
    "qualityRating" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrengthTrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressionTracking" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sets" INTEGER NOT NULL,
    "repsCompleted" INTEGER NOT NULL,
    "repsTarget" INTEGER NOT NULL,
    "actualLoad" DOUBLE PRECISION NOT NULL,
    "rpe" INTEGER,
    "estimated1RM" DOUBLE PRECISION NOT NULL,
    "estimationMethod" TEXT NOT NULL,
    "progressionStatus" "ProgressionStatus" NOT NULL DEFAULT 'ON_TRACK',
    "weeksAtCurrentLoad" INTEGER NOT NULL DEFAULT 0,
    "lastIncrease" TIMESTAMP(3),
    "nextRecommendedLoad" DOUBLE PRECISION,
    "strengthPhase" "StrengthPhase",
    "consecutiveSessionsWithExtraReps" INTEGER NOT NULL DEFAULT 0,
    "readyForIncrease" BOOLEAN NOT NULL DEFAULT false,
    "plateauWeeks" INTEGER NOT NULL DEFAULT 0,
    "deloadRecommended" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressionTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneRepMaxHistory" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "oneRepMax" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "bodyWeight" DOUBLE PRECISION,
    "strengthPhase" "StrengthPhase",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OneRepMaxHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceResult" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "raceName" TEXT,
    "raceDate" TIMESTAMP(3) NOT NULL,
    "distance" TEXT NOT NULL,
    "customDistanceKm" DOUBLE PRECISION,
    "timeMinutes" DOUBLE PRECISION NOT NULL,
    "timeFormatted" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "windSpeed" DOUBLE PRECISION,
    "elevation" DOUBLE PRECISION,
    "terrain" TEXT,
    "vdot" DOUBLE PRECISION,
    "vdotAdjusted" DOUBLE PRECISION,
    "confidence" TEXT,
    "ageInDays" INTEGER,
    "trainingPaces" JSONB,
    "equivalentTimes" JSONB,
    "goalTime" TEXT,
    "goalAchieved" BOOLEAN NOT NULL DEFAULT false,
    "raceType" TEXT,
    "avgHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "avgPace" TEXT,
    "splits" JSONB,
    "conditions" TEXT,
    "athleteNotes" TEXT,
    "coachNotes" TEXT,
    "usedForZones" BOOLEAN NOT NULL DEFAULT false,
    "trainingProgramId" TEXT,
    "linkedPredictionId" TEXT,
    "satisfactionScore" INTEGER,
    "conditionFactors" JSONB,
    "coachAnalysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaceResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportPerformance" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sport" "SportType" NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventName" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "timeSeconds" DOUBLE PRECISION,
    "timeFormatted" TEXT,
    "distanceMeters" DOUBLE PRECISION,
    "powerWatts" DOUBLE PRECISION,
    "powerMax" DOUBLE PRECISION,
    "ftp" DOUBLE PRECISION,
    "wattsPerKg" DOUBLE PRECISION,
    "normalizedPower" DOUBLE PRECISION,
    "pacePerHundred" DOUBLE PRECISION,
    "css" DOUBLE PRECISION,
    "strokeRate" DOUBLE PRECISION,
    "strokeType" TEXT,
    "poolLength" INTEGER,
    "hyroxDivision" TEXT,
    "hyroxStations" JSONB,
    "hyroxRunSplits" JSONB,
    "hyroxTotalTime" DOUBLE PRECISION,
    "swimTime" DOUBLE PRECISION,
    "bikeTime" DOUBLE PRECISION,
    "runTime" DOUBLE PRECISION,
    "t1Time" DOUBLE PRECISION,
    "t2Time" DOUBLE PRECISION,
    "triathlonDistance" TEXT,
    "skiingTechnique" TEXT,
    "skiingTerrain" TEXT,
    "snowConditions" TEXT,
    "avgHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "temperature" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "conditions" TEXT,
    "athleteNotes" TEXT,
    "coachNotes" TEXT,
    "isPR" BOOLEAN NOT NULL DEFAULT false,
    "usedForZones" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "primarySport" "SportType" NOT NULL DEFAULT 'RUNNING',
    "secondarySports" "SportType"[] DEFAULT ARRAY[]::"SportType"[],
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "developmentStage" "DevelopmentStage",
    "peakHeightVelocity" TIMESTAMP(3),
    "biologicalAge" DOUBLE PRECISION,
    "runningSettings" JSONB,
    "cyclingSettings" JSONB,
    "skiingSettings" JSONB,
    "triathlonSettings" JSONB,
    "hyroxSettings" JSONB,
    "generalFitnessSettings" JSONB,
    "functionalFitnessSettings" JSONB,
    "swimmingSettings" JSONB,
    "ergometerSettings" JSONB,
    "hockeySettings" JSONB,
    "footballSettings" JSONB,
    "handballSettings" JSONB,
    "floorballSettings" JSONB,
    "basketballSettings" JSONB,
    "volleyballSettings" JSONB,
    "tennisSettings" JSONB,
    "padelSettings" JSONB,
    "equipment" JSONB,
    "weeklyAvailability" JSONB,
    "preferredSessionLength" INTEGER,
    "currentGoal" TEXT,
    "targetDate" TIMESTAMP(3),
    "targetMetric" JSONB,
    "themePreferences" JSONB,
    "biometrics" JSONB,
    "recentRaceTime" JSONB,
    "fitnessEstimate" JSONB,
    "runningExperience" TEXT,
    "cyclingExperience" TEXT,
    "swimmingExperience" TEXT,
    "strengthExperience" TEXT,
    "functionalFitnessExperience" TEXT,
    "activeStandardProgram" TEXT,
    "hasCustomProgram" BOOLEAN NOT NULL DEFAULT false,
    "preferredAIModelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachDocument" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileType" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "processingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "processingError" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "embeddingModel" TEXT,
    "metadata" JSONB,
    "tokenCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "athleteId" TEXT,
    "title" TEXT,
    "modelUsed" TEXT NOT NULL,
    "provider" "AIProvider" NOT NULL DEFAULT 'ANTHROPIC',
    "contextDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "athleteDataIncluded" JSONB,
    "webSearchEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totalTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "toolCalls" JSONB,
    "toolResults" JSONB,
    "modelUsed" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIGeneratedProgram" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "programId" TEXT,
    "programJson" JSONB NOT NULL,
    "prompt" TEXT,
    "reasoning" TEXT,
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIGeneratedProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIGeneratedWOD" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "mode" "WODMode" NOT NULL DEFAULT 'STRUCTURED',
    "requestedDuration" INTEGER NOT NULL DEFAULT 45,
    "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "focusArea" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "workoutJson" JSONB NOT NULL,
    "coachNotes" TEXT,
    "readinessAtGeneration" DOUBLE PRECISION,
    "intensityAdjusted" TEXT,
    "guardrailsApplied" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primarySport" TEXT,
    "status" "WODStatus" NOT NULL DEFAULT 'GENERATED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "actualDuration" INTEGER,
    "sessionRPE" INTEGER,
    "exerciseLogs" JSONB,
    "tokensUsed" INTEGER,
    "generationTimeMs" INTEGER,
    "modelUsed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIGeneratedWOD_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoAnalysis" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "athleteId" TEXT,
    "exerciseId" TEXT,
    "videoUrl" TEXT NOT NULL,
    "videoType" TEXT NOT NULL,
    "hyroxStation" TEXT,
    "cameraAngle" TEXT,
    "duration" INTEGER,
    "landmarksData" JSONB,
    "aiAnalysis" TEXT,
    "aiPoseAnalysis" JSONB,
    "aiProvider" "AIProvider" NOT NULL DEFAULT 'GOOGLE',
    "modelUsed" TEXT,
    "formScore" INTEGER,
    "issuesDetected" JSONB,
    "recommendations" JSONB,
    "comparisonData" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyComposition" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "measurementDate" DATE NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "bodyFatPercent" DOUBLE PRECISION,
    "muscleMassKg" DOUBLE PRECISION,
    "visceralFat" INTEGER,
    "boneMassKg" DOUBLE PRECISION,
    "waterPercent" DOUBLE PRECISION,
    "intracellularWaterPercent" DOUBLE PRECISION,
    "extracellularWaterPercent" DOUBLE PRECISION,
    "bmrKcal" INTEGER,
    "metabolicAge" INTEGER,
    "bmi" DOUBLE PRECISION,
    "ffmi" DOUBLE PRECISION,
    "deviceBrand" TEXT,
    "measurementTime" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyComposition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "anthropicKeyEncrypted" TEXT,
    "googleKeyEncrypted" TEXT,
    "openaiKeyEncrypted" TEXT,
    "anthropicKeyValid" BOOLEAN NOT NULL DEFAULT false,
    "googleKeyValid" BOOLEAN NOT NULL DEFAULT false,
    "openaiKeyValid" BOOLEAN NOT NULL DEFAULT false,
    "anthropicKeyLastValidated" TIMESTAMP(3),
    "googleKeyLastValidated" TIMESTAMP(3),
    "openaiKeyLastValidated" TIMESTAMP(3),
    "defaultModelId" TEXT,
    "allowedAthleteModelIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "athleteDefaultModelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIModel" (
    "id" TEXT NOT NULL,
    "provider" "AIProvider" NOT NULL,
    "modelId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxTokens" INTEGER,
    "maxOutputTokens" INTEGER,
    "inputCostPer1k" DOUBLE PRECISION,
    "outputCostPer1k" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "releasedAt" TIMESTAMP(3),
    "deprecatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunningGaitAnalysis" (
    "id" TEXT NOT NULL,
    "videoAnalysisId" TEXT NOT NULL,
    "cadence" INTEGER,
    "groundContactTime" DOUBLE PRECISION,
    "verticalOscillation" DOUBLE PRECISION,
    "strideLength" DOUBLE PRECISION,
    "footStrikePattern" TEXT,
    "asymmetryPercent" DOUBLE PRECISION,
    "leftContactTime" DOUBLE PRECISION,
    "rightContactTime" DOUBLE PRECISION,
    "leftStrideLength" DOUBLE PRECISION,
    "rightStrideLength" DOUBLE PRECISION,
    "injuryRiskLevel" TEXT,
    "injuryRiskScore" INTEGER,
    "injuryRiskFactors" JSONB,
    "runningEfficiency" TEXT,
    "energyLeakages" JSONB,
    "stancePhaseData" JSONB,
    "swingPhaseData" JSONB,
    "coachingCues" JSONB,
    "drillRecommendations" JSONB,
    "previousComparison" JSONB,
    "overallScore" INTEGER,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunningGaitAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkiingTechniqueAnalysis" (
    "id" TEXT NOT NULL,
    "videoAnalysisId" TEXT NOT NULL,
    "techniqueType" TEXT NOT NULL,
    "skatingVariant" TEXT,
    "terrainType" TEXT,
    "overallScore" DOUBLE PRECISION,
    "balanceScore" DOUBLE PRECISION,
    "timingScore" DOUBLE PRECISION,
    "efficiencyScore" DOUBLE PRECISION,
    "powerScore" DOUBLE PRECISION,
    "rhythmScore" DOUBLE PRECISION,
    "poleAngleAtPlant" DOUBLE PRECISION,
    "poleAngleAtRelease" DOUBLE PRECISION,
    "polePlantTiming" TEXT,
    "poleForceApplication" TEXT,
    "armSwingSymmetry" DOUBLE PRECISION,
    "hipPositionScore" DOUBLE PRECISION,
    "hipHeightConsistency" DOUBLE PRECISION,
    "coreEngagement" TEXT,
    "forwardLean" DOUBLE PRECISION,
    "weightTransferScore" DOUBLE PRECISION,
    "weightShiftTiming" TEXT,
    "lateralStability" DOUBLE PRECISION,
    "kickTimingScore" DOUBLE PRECISION,
    "kickExtension" TEXT,
    "glidePhaseDuration" DOUBLE PRECISION,
    "legRecoveryPattern" TEXT,
    "waxPocketEngagement" TEXT,
    "edgeAngleLeft" DOUBLE PRECISION,
    "edgeAngleRight" DOUBLE PRECISION,
    "edgeAngleSymmetry" DOUBLE PRECISION,
    "pushOffAngle" DOUBLE PRECISION,
    "vPatternWidth" DOUBLE PRECISION,
    "skateFrequency" DOUBLE PRECISION,
    "recoveryLegPath" TEXT,
    "trunkFlexionRange" DOUBLE PRECISION,
    "compressionDepth" TEXT,
    "returnPhaseSpeed" TEXT,
    "legDriveContribution" TEXT,
    "rhythmConsistency" DOUBLE PRECISION,
    "primaryStrengths" JSONB,
    "primaryWeaknesses" JSONB,
    "techniqueDrills" JSONB,
    "comparisonToElite" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkiingTechniqueAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HyroxStationAnalysis" (
    "id" TEXT NOT NULL,
    "videoAnalysisId" TEXT NOT NULL,
    "stationType" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION,
    "efficiencyScore" DOUBLE PRECISION,
    "formScore" DOUBLE PRECISION,
    "paceConsistency" DOUBLE PRECISION,
    "coreStability" DOUBLE PRECISION,
    "breathingPattern" TEXT,
    "movementEconomy" DOUBLE PRECISION,
    "movementCadence" DOUBLE PRECISION,
    "cadenceVariation" DOUBLE PRECISION,
    "restPauses" INTEGER,
    "fatigueIndicators" JSONB,
    "formDegradation" DOUBLE PRECISION,
    "stationMetrics" JSONB,
    "pullLength" TEXT,
    "hipHingeDepth" TEXT,
    "armExtension" TEXT,
    "legDriveContribution" TEXT,
    "bodyAngle" DOUBLE PRECISION,
    "armLockout" TEXT,
    "strideLength" TEXT,
    "drivePhase" TEXT,
    "pullTechnique" TEXT,
    "ropePath" TEXT,
    "anchorStability" TEXT,
    "burpeeDepth" TEXT,
    "jumpDistance" TEXT,
    "transitionSpeed" TEXT,
    "landingMechanics" TEXT,
    "driveSequence" TEXT,
    "laybackAngle" DOUBLE PRECISION,
    "catchPosition" TEXT,
    "strokeRate" DOUBLE PRECISION,
    "powerApplication" TEXT,
    "shoulderPack" TEXT,
    "trunkPosture" TEXT,
    "stridePattern" TEXT,
    "gripFatigue" TEXT,
    "bagPosition" TEXT,
    "kneeTracking" TEXT,
    "stepLength" TEXT,
    "torsoPosition" TEXT,
    "squatDepth" TEXT,
    "throwMechanics" TEXT,
    "wallBallCatchHeight" TEXT,
    "rhythmConsistency" DOUBLE PRECISION,
    "benchmarkLevel" TEXT,
    "estimatedStationTime" INTEGER,
    "isWeakStation" BOOLEAN NOT NULL DEFAULT false,
    "isStrongStation" BOOLEAN NOT NULL DEFAULT false,
    "primaryStrengths" JSONB,
    "primaryWeaknesses" JSONB,
    "improvementDrills" JSONB,
    "raceStrategyTips" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HyroxStationAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioJournal" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "transcription" TEXT,
    "transcriptionModel" TEXT,
    "transcriptionConfidence" DOUBLE PRECISION,
    "extractedData" JSONB,
    "extractionConfidence" DOUBLE PRECISION,
    "aiInterpretation" JSONB,
    "dailyCheckInId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processingError" TEXT,
    "processingTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenstrualCycle" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "cycleNumber" INTEGER,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "cycleLength" INTEGER,
    "currentPhase" TEXT,
    "ovulationDate" DATE,
    "phaseRecommendations" JSONB,
    "aiInsights" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenstrualCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenstrualDailyLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "cycleId" TEXT,
    "date" DATE NOT NULL,
    "cycleDay" INTEGER,
    "phase" TEXT,
    "flowIntensity" INTEGER,
    "cramps" INTEGER,
    "bloating" INTEGER,
    "breastTenderness" INTEGER,
    "headache" INTEGER,
    "fatigue" INTEGER,
    "moodScore" INTEGER,
    "cravings" INTEGER,
    "perceivedEffort" INTEGER,
    "actualVsPlanned" TEXT,
    "notes" TEXT,
    "aiWarnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenstrualDailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HybridWorkout" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "format" "HybridFormat" NOT NULL,
    "timeCap" INTEGER,
    "workTime" INTEGER,
    "restTime" INTEGER,
    "totalRounds" INTEGER,
    "totalMinutes" INTEGER,
    "repScheme" TEXT,
    "scalingLevel" "ScalingLevel" NOT NULL DEFAULT 'RX',
    "rxVersionId" TEXT,
    "isBenchmark" BOOLEAN NOT NULL DEFAULT false,
    "benchmarkSource" TEXT,
    "benchmarkYear" INTEGER,
    "coachId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "warmupData" JSONB,
    "strengthData" JSONB,
    "cooldownData" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "versionNotes" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HybridWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HybridWorkoutVersion" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeType" TEXT NOT NULL,
    "changeNotes" TEXT,
    "changedBy" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HybridWorkoutVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HybridMovement" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "roundNumber" INTEGER,
    "setNumber" INTEGER,
    "reps" INTEGER,
    "calories" INTEGER,
    "distance" DOUBLE PRECISION,
    "duration" INTEGER,
    "weightMale" DOUBLE PRECISION,
    "weightFemale" DOUBLE PRECISION,
    "weightUnit" TEXT DEFAULT 'kg',
    "percentOfMax" DOUBLE PRECISION,
    "isUnbroken" BOOLEAN NOT NULL DEFAULT false,
    "alternateSides" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "HybridMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HybridWorkoutResult" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "scoreType" "HybridScoreType" NOT NULL,
    "timeScore" INTEGER,
    "roundsCompleted" INTEGER,
    "repsCompleted" INTEGER,
    "loadUsed" DOUBLE PRECISION,
    "caloriesScore" INTEGER,
    "scalingLevel" "ScalingLevel" NOT NULL,
    "scalingNotes" TEXT,
    "customModifications" JSONB,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workoutDate" DATE,
    "isPR" BOOLEAN NOT NULL DEFAULT false,
    "previousBestId" TEXT,
    "notes" TEXT,
    "coachFeedback" TEXT,
    "perceivedEffort" INTEGER,
    "difficulty" INTEGER,
    "movementSplits" JSONB,
    "videoUrl" TEXT,

    CONSTRAINT "HybridWorkoutResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HybridWorkoutAssignment" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "assignedDate" DATE NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "notes" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "resultId" TEXT,
    "customScaling" TEXT,
    "scalingNotes" TEXT,
    "teamBroadcastId" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "locationId" TEXT,
    "locationName" TEXT,
    "scheduledBy" TEXT,
    "responsibleCoachId" TEXT,
    "calendarEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HybridWorkoutAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HybridWorkoutLog" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "totalTime" INTEGER,
    "totalRounds" INTEGER,
    "extraReps" INTEGER,
    "scalingLevel" "ScalingLevel" NOT NULL DEFAULT 'RX',
    "scalingNotes" TEXT,
    "sessionRPE" INTEGER,
    "notes" TEXT,
    "focusModeUsed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HybridWorkoutLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HybridRoundLog" (
    "id" TEXT NOT NULL,
    "hybridWorkoutLogId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "movements" JSONB NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HybridRoundLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrengthSession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "phase" "StrengthPhase" NOT NULL DEFAULT 'ANATOMICAL_ADAPTATION',
    "timingRelativeToRun" TEXT,
    "estimatedDuration" INTEGER,
    "exercises" JSONB NOT NULL,
    "warmupData" JSONB,
    "coreData" JSONB,
    "cooldownData" JSONB,
    "totalSets" INTEGER,
    "totalExercises" INTEGER,
    "volumeLoad" DOUBLE PRECISION,
    "coachId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrengthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrengthSessionAssignment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "assignedDate" DATE NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "notes" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "locationId" TEXT,
    "locationName" TEXT,
    "scheduledBy" TEXT,
    "responsibleCoachId" TEXT,
    "calendarEventId" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "actualExercises" JSONB,
    "rpe" INTEGER,
    "duration" INTEGER,
    "teamBroadcastId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrengthSessionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrengthTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "phase" "StrengthPhase" NOT NULL DEFAULT 'ANATOMICAL_ADAPTATION',
    "durationWeeks" INTEGER NOT NULL DEFAULT 4,
    "sessionsPerWeek" INTEGER NOT NULL DEFAULT 2,
    "level" "ProgressionLevel" NOT NULL DEFAULT 'LEVEL_1',
    "targetSport" "SportType",
    "targetGoal" TEXT,
    "sessions" JSONB NOT NULL,
    "progressionRules" JSONB,
    "coachId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isSystemTemplate" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrengthTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardioSession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sport" "SportType" NOT NULL DEFAULT 'RUNNING',
    "segments" JSONB NOT NULL,
    "totalDuration" INTEGER,
    "totalDistance" DOUBLE PRECISION,
    "avgZone" DOUBLE PRECISION,
    "coachId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardioSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardioSessionAssignment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "assignedDate" DATE NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "notes" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "locationId" TEXT,
    "locationName" TEXT,
    "scheduledBy" TEXT,
    "responsibleCoachId" TEXT,
    "calendarEventId" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "actualDuration" INTEGER,
    "actualDistance" DOUBLE PRECISION,
    "avgHeartRate" INTEGER,
    "actualSegments" JSONB,
    "teamBroadcastId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardioSessionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardioSessionLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "actualDuration" INTEGER,
    "actualDistance" DOUBLE PRECISION,
    "avgHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "sessionRPE" INTEGER,
    "notes" TEXT,
    "focusModeUsed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardioSessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardioSegmentLog" (
    "id" TEXT NOT NULL,
    "cardioSessionLogId" TEXT NOT NULL,
    "segmentIndex" INTEGER NOT NULL,
    "segmentType" "CardioSegmentType" NOT NULL,
    "plannedDuration" INTEGER,
    "plannedDistance" DOUBLE PRECISION,
    "plannedPace" INTEGER,
    "plannedZone" INTEGER,
    "actualDuration" INTEGER,
    "actualDistance" DOUBLE PRECISION,
    "actualPace" INTEGER,
    "actualAvgHR" INTEGER,
    "actualMaxHR" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardioSegmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietaryPreferences" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "dietaryStyle" TEXT,
    "allergies" JSONB,
    "intolerances" JSONB,
    "dislikedFoods" JSONB,
    "preferLowFODMAP" BOOLEAN NOT NULL DEFAULT false,
    "preferWholeGrain" BOOLEAN NOT NULL DEFAULT true,
    "preferSwedishFoods" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DietaryPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionGoal" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "goalType" TEXT NOT NULL,
    "targetWeightKg" DOUBLE PRECISION,
    "weeklyChangeKg" DOUBLE PRECISION,
    "targetDate" TIMESTAMP(3),
    "targetBodyFatPercent" DOUBLE PRECISION,
    "macroProfile" TEXT,
    "activityLevel" TEXT NOT NULL DEFAULT 'ACTIVE',
    "customProteinPerKg" DOUBLE PRECISION,
    "showMacroTargets" BOOLEAN NOT NULL DEFAULT true,
    "showHydration" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mealType" "MealType" NOT NULL,
    "time" TEXT,
    "description" TEXT NOT NULL,
    "calories" INTEGER,
    "proteinGrams" DOUBLE PRECISION,
    "carbsGrams" DOUBLE PRECISION,
    "fatGrams" DOUBLE PRECISION,
    "fiberGrams" DOUBLE PRECISION,
    "waterMl" INTEGER,
    "isHighProtein" BOOLEAN NOT NULL DEFAULT false,
    "isPreWorkout" BOOLEAN NOT NULL DEFAULT false,
    "isPostWorkout" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VBTSession" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "coachId" TEXT,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "deviceType" "VBTDeviceType" NOT NULL DEFAULT 'GENERIC',
    "deviceName" TEXT,
    "fileName" TEXT,
    "totalSets" INTEGER NOT NULL DEFAULT 0,
    "totalReps" INTEGER NOT NULL DEFAULT 0,
    "exerciseCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "sessionRPE" INTEGER,
    "bodyWeight" DOUBLE PRECISION,
    "rawData" JSONB,
    "parseErrors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VBTSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VBTMeasurement" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT,
    "exerciseName" TEXT NOT NULL,
    "exerciseMatched" BOOLEAN NOT NULL DEFAULT false,
    "setNumber" INTEGER NOT NULL,
    "repNumber" INTEGER NOT NULL,
    "meanVelocity" DOUBLE PRECISION,
    "peakVelocity" DOUBLE PRECISION,
    "meanVelocityDown" DOUBLE PRECISION,
    "peakVelocityDown" DOUBLE PRECISION,
    "meanPower" DOUBLE PRECISION,
    "peakPower" DOUBLE PRECISION,
    "meanPowerDown" DOUBLE PRECISION,
    "peakPowerDown" DOUBLE PRECISION,
    "load" DOUBLE PRECISION,
    "rom" DOUBLE PRECISION,
    "romPercentage" DOUBLE PRECISION,
    "concentricTime" DOUBLE PRECISION,
    "eccentricTime" DOUBLE PRECISION,
    "totalRepTime" DOUBLE PRECISION,
    "timeToPeakVel" DOUBLE PRECISION,
    "velocityLoss" DOUBLE PRECISION,
    "velocityLossSet" DOUBLE PRECISION,
    "estimatedE1RM" DOUBLE PRECISION,
    "velocityZone" TEXT,
    "repQuality" TEXT,
    "rawMetrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VBTMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadVelocityProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "dataPoints" JSONB NOT NULL,
    "slope" DOUBLE PRECISION,
    "intercept" DOUBLE PRECISION,
    "rSquared" DOUBLE PRECISION,
    "e1RM_0_3" DOUBLE PRECISION,
    "e1RM_0_2" DOUBLE PRECISION,
    "e1RM_0_15" DOUBLE PRECISION,
    "mvt" DOUBLE PRECISION,
    "minLoad" DOUBLE PRECISION,
    "maxLoad" DOUBLE PRECISION,
    "loadRange" DOUBLE PRECISION,
    "dataPointCount" INTEGER NOT NULL DEFAULT 0,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "lastMeasurementAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoadVelocityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "CalendarEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "CalendarEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT,
    "endTime" TEXT,
    "trainingImpact" "EventImpact" NOT NULL DEFAULT 'NO_TRAINING',
    "impactNotes" TEXT,
    "altitude" INTEGER,
    "adaptationPhase" "AltitudeAdaptationPhase",
    "seaLevelReturnDate" TIMESTAMP(3),
    "illnessType" TEXT,
    "returnToTrainingDate" TIMESTAMP(3),
    "medicalClearance" BOOLEAN NOT NULL DEFAULT false,
    "externalCalendarId" TEXT,
    "externalCalendarType" TEXT,
    "externalCalendarName" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "recurrenceParentId" TEXT,
    "createdById" TEXT NOT NULL,
    "lastModifiedById" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEventChange" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "clientId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "previousData" JSONB,
    "newData" JSONB,
    "notificationRead" BOOLEAN NOT NULL DEFAULT false,
    "notificationReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEventChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCalendarConnection" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "userId" TEXT,
    "provider" TEXT NOT NULL,
    "calendarName" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "icalUrl" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "importAsType" "CalendarEventType" NOT NULL DEFAULT 'EXTERNAL_EVENT',
    "defaultImpact" "EventImpact" NOT NULL DEFAULT 'NORMAL',
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErgometerFieldTest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ergometerType" "ErgometerType" NOT NULL,
    "testProtocol" "ErgometerTestProtocol" NOT NULL,
    "testDate" TIMESTAMP(3) NOT NULL,
    "dragFactor" INTEGER,
    "damperSetting" INTEGER,
    "airResistance" INTEGER,
    "magnetResistance" INTEGER,
    "bikeBrand" TEXT,
    "conditions" JSONB,
    "rawData" JSONB NOT NULL,
    "peakPower" DOUBLE PRECISION,
    "avgPower" DOUBLE PRECISION,
    "endPower" DOUBLE PRECISION,
    "normalizedPower" DOUBLE PRECISION,
    "avgPace" DOUBLE PRECISION,
    "bestPace" DOUBLE PRECISION,
    "criticalPower" DOUBLE PRECISION,
    "wPrime" DOUBLE PRECISION,
    "wPrimeKJ" DOUBLE PRECISION,
    "totalDistance" DOUBLE PRECISION,
    "totalTime" DOUBLE PRECISION,
    "totalCalories" DOUBLE PRECISION,
    "strokeRate" DOUBLE PRECISION,
    "avgHR" DOUBLE PRECISION,
    "maxHR" DOUBLE PRECISION,
    "hrAtEnd" DOUBLE PRECISION,
    "intervalData" JSONB,
    "r2" DOUBLE PRECISION,
    "confidence" TEXT,
    "modelFit" TEXT,
    "valid" BOOLEAN NOT NULL DEFAULT true,
    "warnings" JSONB,
    "errors" JSONB,
    "notes" TEXT,
    "rpe" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ErgometerFieldTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErgometerThreshold" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ergometerType" "ErgometerType" NOT NULL,
    "sourceTestId" TEXT,
    "sourceMethod" TEXT NOT NULL,
    "criticalPower" DOUBLE PRECISION,
    "wPrime" DOUBLE PRECISION,
    "wPrimeKJ" DOUBLE PRECISION,
    "ftp" DOUBLE PRECISION,
    "ftpCorrectionFactor" DOUBLE PRECISION,
    "mapWatts" DOUBLE PRECISION,
    "peakPower" DOUBLE PRECISION,
    "peakPowerDuration" TEXT,
    "thresholdHR" DOUBLE PRECISION,
    "thresholdPace" DOUBLE PRECISION,
    "testDate" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "confidence" TEXT,
    "valid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ErgometerThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErgometerZone" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ergometerType" "ErgometerType" NOT NULL,
    "zone" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameSwedish" TEXT NOT NULL,
    "powerMin" DOUBLE PRECISION NOT NULL,
    "powerMax" DOUBLE PRECISION NOT NULL,
    "percentMin" DOUBLE PRECISION NOT NULL,
    "percentMax" DOUBLE PRECISION NOT NULL,
    "paceMin" DOUBLE PRECISION,
    "paceMax" DOUBLE PRECISION,
    "hrMin" DOUBLE PRECISION,
    "hrMax" DOUBLE PRECISION,
    "description" TEXT NOT NULL,
    "descriptionSwedish" TEXT,
    "typicalDuration" TEXT,
    "sourceThresholdId" TEXT NOT NULL,
    "calculationMethod" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErgometerZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErgometerBenchmark" (
    "id" TEXT NOT NULL,
    "ergometerType" "ErgometerType" NOT NULL,
    "testProtocol" "ErgometerTestProtocol" NOT NULL,
    "sport" "SportType",
    "gender" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "powerMin" DOUBLE PRECISION,
    "powerMax" DOUBLE PRECISION,
    "paceMin" DOUBLE PRECISION,
    "paceMax" DOUBLE PRECISION,
    "timeMin" DOUBLE PRECISION,
    "timeMax" DOUBLE PRECISION,
    "caloriesMin" DOUBLE PRECISION,
    "caloriesMax" DOUBLE PRECISION,
    "wattsPerKg" DOUBLE PRECISION,
    "description" TEXT,
    "descriptionSwedish" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErgometerBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeepResearchSession" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "athleteId" TEXT,
    "provider" "DeepResearchProvider" NOT NULL,
    "query" TEXT NOT NULL,
    "systemPrompt" TEXT,
    "contextDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "athleteContext" JSONB,
    "status" "DeepResearchStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "progressPercent" INTEGER,
    "progressMessage" TEXT,
    "currentStep" TEXT,
    "externalJobId" TEXT,
    "report" TEXT,
    "sources" JSONB,
    "reasoning" TEXT,
    "savedDocumentId" TEXT,
    "sharedWithAthletes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublicToAthlete" BOOLEAN NOT NULL DEFAULT false,
    "tokensUsed" INTEGER,
    "estimatedCost" DOUBLE PRECISION,
    "searchQueries" INTEGER,
    "sourcesAnalyzed" INTEGER,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeepResearchSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeepResearchProgress" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "step" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "percent" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "DeepResearchProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedResearchAccess" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SharedResearchAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageBudget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthlyBudget" DOUBLE PRECISION,
    "periodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "alertThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "alertSent" BOOLEAN NOT NULL DEFAULT false,
    "researchBudget" DOUBLE PRECISION,
    "chatBudget" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIUsageBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "estimatedCost" DOUBLE PRECISION NOT NULL,
    "researchSessionId" TEXT,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramGenerationSession" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "conversationId" TEXT,
    "query" TEXT NOT NULL,
    "totalWeeks" INTEGER NOT NULL,
    "sport" TEXT NOT NULL,
    "methodology" TEXT,
    "athleteContext" JSONB,
    "athleteId" TEXT,
    "status" "ProgramGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "currentPhase" INTEGER NOT NULL DEFAULT 0,
    "totalPhases" INTEGER NOT NULL DEFAULT 1,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "progressMessage" TEXT,
    "programOutline" JSONB,
    "phases" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "mergedProgram" JSONB,
    "modelUsed" TEXT,
    "provider" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "totalTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramGenerationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramGenerationProgress" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "step" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "percent" INTEGER,
    "phaseNumber" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "ProgramGenerationProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMemory" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "memoryType" TEXT NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "context" TEXT,
    "importance" INTEGER NOT NULL DEFAULT 3,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "sourceMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationSummary" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "weekEnd" DATE NOT NULL,
    "summary" TEXT NOT NULL,
    "keyTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sentiment" TEXT,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "concerns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIBriefing" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "briefingType" TEXT NOT NULL DEFAULT 'MORNING',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "readinessScore" DOUBLE PRECISION,
    "todaysWorkout" TEXT,
    "alerts" JSONB,
    "quickActions" JSONB,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "modelUsed" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIBriefing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AINotification" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "icon" TEXT,
    "actionUrl" TEXT,
    "actionLabel" TEXT,
    "contextData" JSONB,
    "triggeredBy" TEXT,
    "triggerReason" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "actionTakenAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AINotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AINotificationPreferences" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "morningBriefingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "preWorkoutNudgeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "postWorkoutCheckEnabled" BOOLEAN NOT NULL DEFAULT true,
    "patternAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "milestoneAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weatherAlertsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "morningBriefingTime" TEXT NOT NULL DEFAULT '07:00',
    "preWorkoutLeadTime" INTEGER NOT NULL DEFAULT 120,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Stockholm',
    "verbosityLevel" TEXT NOT NULL DEFAULT 'NORMAL',
    "motivationStyle" TEXT NOT NULL DEFAULT 'BALANCED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AINotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachAlert" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "contextData" JSONB,
    "sourceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "dismissedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "actionedAt" TIMESTAMP(3),
    "actionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "CoachAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveHRSession" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT,
    "teamId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "LiveHRSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveHRParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReading" TIMESTAMP(3),

    CONSTRAINT "LiveHRParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveHRReading" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "heartRate" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zone" INTEGER,
    "deviceId" TEXT,

    CONSTRAINT "LiveHRReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "HabitCategory" NOT NULL,
    "frequency" "HabitFrequency" NOT NULL,
    "targetDays" INTEGER[],
    "targetTime" TEXT,
    "trigger" TEXT,
    "routine" TEXT,
    "reward" TEXT,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "totalCompletions" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitLog" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "completed" BOOLEAN NOT NULL,
    "note" TEXT,
    "value" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalMatchSchedule" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "externalMatchId" TEXT NOT NULL,
    "opponent" TEXT NOT NULL,
    "isHome" BOOLEAN NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "competition" TEXT,
    "matchday" INTEGER,
    "result" TEXT,
    "minutesPlayed" DOUBLE PRECISION,
    "goals" INTEGER,
    "assists" INTEGER,
    "plusMinus" INTEGER,
    "penaltyMinutes" INTEGER,
    "distanceKm" DOUBLE PRECISION,
    "sprintDistance" DOUBLE PRECISION,
    "maxSpeed" DOUBLE PRECISION,
    "calendarEventId" TEXT,
    "externalSource" TEXT NOT NULL DEFAULT 'manual',
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalMatchSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportTest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testDate" TIMESTAMP(3) NOT NULL,
    "category" "SportTestCategory" NOT NULL,
    "protocol" "SportTestProtocol" NOT NULL,
    "sport" "SportType",
    "conditions" JSONB,
    "rawData" JSONB NOT NULL,
    "primaryResult" DOUBLE PRECISION,
    "primaryUnit" TEXT,
    "secondaryResult" DOUBLE PRECISION,
    "secondaryUnit" TEXT,
    "peakPower" DOUBLE PRECISION,
    "avgPower" DOUBLE PRECISION,
    "relativePower" DOUBLE PRECISION,
    "splits" JSONB,
    "acceleration" DOUBLE PRECISION,
    "maxVelocity" DOUBLE PRECISION,
    "estimatedVO2max" DOUBLE PRECISION,
    "distance" DOUBLE PRECISION,
    "level" DOUBLE PRECISION,
    "benchmarkTier" TEXT,
    "percentile" DOUBLE PRECISION,
    "positionRank" TEXT,
    "valid" BOOLEAN NOT NULL DEFAULT true,
    "warnings" JSONB,
    "notes" TEXT,
    "attemptNumber" INTEGER,
    "bestAttempt" BOOLEAN NOT NULL DEFAULT false,
    "ergometerTestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportTestBenchmark" (
    "id" TEXT NOT NULL,
    "protocol" "SportTestProtocol" NOT NULL,
    "sport" "SportType",
    "gender" TEXT NOT NULL,
    "position" TEXT,
    "ageGroupMin" INTEGER,
    "ageGroupMax" INTEGER,
    "tier" TEXT NOT NULL,
    "valueMin" DOUBLE PRECISION,
    "valueMax" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "description" TEXT,
    "descriptionSwedish" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SportTestBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdHocWorkout" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "inputType" "AdHocInputType" NOT NULL,
    "inputDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workoutDate" TIMESTAMP(3) NOT NULL,
    "workoutName" TEXT,
    "rawInputUrl" TEXT,
    "rawInputText" TEXT,
    "rawInputMetadata" JSONB,
    "parsedType" "WorkoutType",
    "parsedStructure" JSONB,
    "parsingModel" TEXT,
    "parsingConfidence" DOUBLE PRECISION,
    "parsingError" TEXT,
    "status" "AdHocWorkoutStatus" NOT NULL DEFAULT 'PENDING',
    "athleteReviewed" BOOLEAN NOT NULL DEFAULT false,
    "athleteEdits" JSONB,
    "createdWorkoutId" TEXT,
    "trainingLoadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdHocWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseContract" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "contractName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "monthlyFee" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SEK',
    "revenueSharePercent" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "athleteLimit" INTEGER NOT NULL DEFAULT -1,
    "coachLimit" INTEGER NOT NULL DEFAULT -1,
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "paymentTermDays" INTEGER NOT NULL DEFAULT 30,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "noticePeriodDays" INTEGER NOT NULL DEFAULT 90,
    "status" "EnterpriseContractStatus" NOT NULL DEFAULT 'DRAFT',
    "customFeatures" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "EnterpriseContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseContractChange" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "previousData" JSONB,
    "newData" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseContractChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingTier" (
    "id" TEXT NOT NULL,
    "tierType" TEXT NOT NULL,
    "tierName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "features" JSONB NOT NULL,
    "monthlyPriceCents" INTEGER NOT NULL,
    "yearlyPriceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'SEK',
    "stripeProductId" TEXT,
    "stripePriceIdMonthly" TEXT,
    "stripePriceIdYearly" TEXT,
    "maxAthletes" INTEGER NOT NULL DEFAULT 0,
    "aiChatLimit" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingOverride" (
    "id" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "monthlyPriceCents" INTEGER,
    "yearlyPriceCents" INTEGER,
    "maxAthletes" INTEGER,
    "aiChatLimit" INTEGER,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemError" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'ERROR',
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "userId" TEXT,
    "route" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "userAgent" TEXT,
    "sentryEventId" TEXT,
    "metadata" JSONB,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemMetric" (
    "id" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "dimensions" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachDecision" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "coachId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "aiSuggestionType" "AISuggestionType" NOT NULL,
    "aiSuggestionData" JSONB NOT NULL,
    "aiConfidence" DOUBLE PRECISION,
    "modificationData" JSONB NOT NULL,
    "modificationMagnitude" DOUBLE PRECISION,
    "reasonCategory" "DecisionReason" NOT NULL,
    "reasonNotes" TEXT,
    "coachConfidence" DOUBLE PRECISION,
    "athleteContext" JSONB,
    "outcomeAssessment" "OutcomeAssessment",
    "outcomeNotes" TEXT,
    "outcomeValidatedAt" TIMESTAMP(3),
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "usedForAITraining" BOOLEAN NOT NULL DEFAULT false,
    "workoutId" TEXT,
    "programId" TEXT,

    CONSTRAINT "CoachDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIPrediction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "predictionType" "PredictionType" NOT NULL,
    "predictedValue" JSONB NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "confidenceLower" DOUBLE PRECISION,
    "confidenceUpper" DOUBLE PRECISION,
    "modelVersion" TEXT NOT NULL,
    "modelParameters" JSONB,
    "inputDataSnapshot" JSONB NOT NULL,
    "athleteId" TEXT NOT NULL,
    "coachId" TEXT,
    "validUntil" TIMESTAMP(3),
    "displayedToUser" BOOLEAN NOT NULL DEFAULT false,
    "userAction" "PredictionUserAction",
    "validated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AIPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionValidation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "predictionId" TEXT NOT NULL,
    "actualValue" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "absoluteError" DOUBLE PRECISION NOT NULL,
    "percentageError" DOUBLE PRECISION NOT NULL,
    "withinConfidenceInterval" BOOLEAN NOT NULL,
    "environmentalFactors" JSONB,
    "validationSource" "ValidationSource" NOT NULL,
    "validationQuality" DOUBLE PRECISION NOT NULL,
    "errorExplanation" TEXT,
    "usedForRetraining" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PredictionValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataMoatConsent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "athleteId" TEXT NOT NULL,
    "anonymizedBenchmarking" BOOLEAN NOT NULL DEFAULT true,
    "patternContribution" BOOLEAN NOT NULL DEFAULT true,
    "predictionValidation" BOOLEAN NOT NULL DEFAULT true,
    "coachDecisionSharing" BOOLEAN NOT NULL DEFAULT true,
    "excludeFromResearch" BOOLEAN NOT NULL DEFAULT false,
    "excludeFromPublicStats" BOOLEAN NOT NULL DEFAULT false,
    "consentVersion" TEXT NOT NULL DEFAULT '1.0',
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataMoatConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPeriodOutcome" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "athleteId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "programId" TEXT,
    "periodName" TEXT NOT NULL,
    "periodType" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "durationWeeks" INTEGER NOT NULL,
    "goalMetrics" JSONB NOT NULL,
    "goalDescription" TEXT,
    "actualMetrics" JSONB,
    "outcomeClass" "TrainingOutcome" NOT NULL,
    "totalVolume" DOUBLE PRECISION,
    "avgWeeklyVolume" DOUBLE PRECISION,
    "compliance" DOUBLE PRECISION,
    "missedSessions" INTEGER,
    "contributingFactors" JSONB,
    "coachAssessment" TEXT,
    "athleteFeedback" TEXT,
    "lessonsLearned" TEXT,

    CONSTRAINT "TrainingPeriodOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingFingerprint" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodOutcomeId" TEXT NOT NULL,
    "zone1Percent" DOUBLE PRECISION NOT NULL,
    "zone2Percent" DOUBLE PRECISION NOT NULL,
    "zone3Percent" DOUBLE PRECISION NOT NULL,
    "zone4Percent" DOUBLE PRECISION NOT NULL,
    "zone5Percent" DOUBLE PRECISION NOT NULL,
    "avgWeeklyHours" DOUBLE PRECISION NOT NULL,
    "weeklyVolumeVariation" DOUBLE PRECISION NOT NULL,
    "longSessionRatio" DOUBLE PRECISION NOT NULL,
    "intensityDistribution" JSONB NOT NULL,
    "avgSessionIntensity" DOUBLE PRECISION NOT NULL,
    "hardDayFrequency" DOUBLE PRECISION NOT NULL,
    "strengthSessionsPerWeek" DOUBLE PRECISION NOT NULL,
    "crossTrainingPercent" DOUBLE PRECISION NOT NULL,
    "restDaysPerWeek" DOUBLE PRECISION NOT NULL,
    "periodizationType" TEXT,
    "progressionRate" DOUBLE PRECISION,
    "keyWorkoutTypes" JSONB NOT NULL,

    CONSTRAINT "TrainingFingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseEffectiveness" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exerciseId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "targetMetric" TEXT NOT NULL,
    "baselineMeasure" DOUBLE PRECISION NOT NULL,
    "baselineDate" TIMESTAMP(3) NOT NULL,
    "trainingWeeks" INTEGER NOT NULL,
    "volumeDescription" TEXT,
    "avgIntensity" DOUBLE PRECISION,
    "postMeasure" DOUBLE PRECISION,
    "postDate" TIMESTAMP(3),
    "absoluteImprovement" DOUBLE PRECISION,
    "percentImprovement" DOUBLE PRECISION,
    "effectivenessScore" DOUBLE PRECISION,
    "confoundingFactors" JSONB,
    "notes" TEXT,

    CONSTRAINT "ExerciseEffectiveness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseOutcomePattern" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "targetMetric" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "avgImprovement" DOUBLE PRECISION NOT NULL,
    "stdDeviation" DOUBLE PRECISION NOT NULL,
    "confidenceLevel" DOUBLE PRECISION NOT NULL,
    "confidenceInterval" JSONB NOT NULL,
    "athleteTypeModifiers" JSONB,
    "lastCalculated" TIMESTAMP(3) NOT NULL,
    "isSignificant" BOOLEAN NOT NULL,

    CONSTRAINT "ExerciseOutcomePattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestPredictiveValidation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "testType" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "testDate" TIMESTAMP(3) NOT NULL,
    "predictedMetric" TEXT NOT NULL,
    "predictedValue" DOUBLE PRECISION NOT NULL,
    "predictionDate" TIMESTAMP(3) NOT NULL,
    "athleteId" TEXT NOT NULL,
    "validationEventType" TEXT,
    "validationEventId" TEXT,
    "validationDate" TIMESTAMP(3),
    "actualValue" DOUBLE PRECISION,
    "absoluteError" DOUBLE PRECISION,
    "percentageError" DOUBLE PRECISION,
    "environmentalFactors" JSONB,
    "validationQuality" DOUBLE PRECISION,

    CONSTRAINT "TestPredictiveValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteCohort" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sport" TEXT NOT NULL,
    "ageRangeLower" INTEGER NOT NULL,
    "ageRangeUpper" INTEGER NOT NULL,
    "experienceLevel" "ExperienceLevel" NOT NULL,
    "weeklyVolumeMin" DOUBLE PRECISION,
    "weeklyVolumeMax" DOUBLE PRECISION,
    "primaryGoal" "GoalType",
    "gender" TEXT,
    "sampleSize" INTEGER NOT NULL,
    "lastCalculated" TIMESTAMP(3) NOT NULL,
    "avgWeeklyHours" DOUBLE PRECISION,
    "avgZone2Percent" DOUBLE PRECISION,
    "avgHighIntensityPercent" DOUBLE PRECISION,
    "avgStrengthSessionsPerWeek" DOUBLE PRECISION,
    "avgRestDaysPerWeek" DOUBLE PRECISION,
    "benchmarks" JSONB NOT NULL,
    "avgSuccessRate" DOUBLE PRECISION,
    "avgInjuryRate" DOUBLE PRECISION,
    "avgImprovement" DOUBLE PRECISION,
    "confidenceLevel" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AthleteCohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenchmarkComparison" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "athleteId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "athleteValue" DOUBLE PRECISION NOT NULL,
    "cohortPercentile" DOUBLE PRECISION NOT NULL,
    "cohortP25" DOUBLE PRECISION,
    "cohortP50" DOUBLE PRECISION,
    "cohortP75" DOUBLE PRECISION,
    "interpretation" TEXT,
    "recommendation" TEXT,

    CONSTRAINT "BenchmarkComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformancePattern" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "patternName" TEXT NOT NULL,
    "patternDescription" TEXT,
    "criteria" JSONB NOT NULL,
    "outcomeType" TEXT NOT NULL,
    "outcomeCorrelation" DOUBLE PRECISION NOT NULL,
    "outcomeDescription" TEXT,
    "sampleSize" INTEGER NOT NULL,
    "pValue" DOUBLE PRECISION,
    "effectSize" DOUBLE PRECISION,
    "confidenceLevel" "PatternConfidence" NOT NULL,
    "applicableSports" TEXT[],
    "applicableAgeMin" INTEGER,
    "applicableAgeMax" INTEGER,
    "applicableExperience" "ExperienceLevel"[],
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastValidated" TIMESTAMP(3),
    "validationCount" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PerformancePattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthletePatternMatch" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "athleteId" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "matchedCriteria" JSONB NOT NULL,
    "recommendation" TEXT,
    "recommendationAccepted" BOOLEAN,
    "appliedAt" TIMESTAMP(3),
    "outcomeTracked" BOOLEAN NOT NULL DEFAULT false,
    "outcomeResult" TEXT,
    "outcomeNotes" TEXT,

    CONSTRAINT "AthletePatternMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIFeedbackLoop" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "feedbackCategory" "FeedbackCategory" NOT NULL,
    "coachDecisionId" TEXT,
    "predictionId" TEXT,
    "trainingOutcomeId" TEXT,
    "patternId" TEXT,
    "lessonTitle" TEXT NOT NULL,
    "lessonDescription" TEXT NOT NULL,
    "lessonCategory" TEXT NOT NULL,
    "lessonConfidence" DOUBLE PRECISION NOT NULL,
    "evidenceCount" INTEGER NOT NULL DEFAULT 1,
    "evidenceData" JSONB,
    "contradictions" INTEGER NOT NULL DEFAULT 0,
    "promptAdjustment" TEXT,
    "affectedPrompts" TEXT[],
    "lessonStatus" "LessonStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "validatedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "modelVersionId" TEXT,
    "impactMeasured" BOOLEAN NOT NULL DEFAULT false,
    "impactDescription" TEXT,
    "accuracyBefore" DOUBLE PRECISION,
    "accuracyAfter" DOUBLE PRECISION,
    "improvementPercent" DOUBLE PRECISION,

    CONSTRAINT "AIFeedbackLoop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIModelVersion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "versionName" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "modelType" TEXT NOT NULL,
    "description" TEXT,
    "changelog" TEXT,
    "trainingDataStart" TIMESTAMP(3),
    "trainingDataEnd" TIMESTAMP(3),
    "trainingDataSize" INTEGER,
    "trainingDataHash" TEXT,
    "promptTemplate" TEXT,
    "parameters" JSONB,
    "status" "ModelStatus" NOT NULL DEFAULT 'DEVELOPMENT',
    "deployedAt" TIMESTAMP(3),
    "deprecatedAt" TIMESTAMP(3),
    "overallAccuracy" DOUBLE PRECISION,
    "accuracyByType" JSONB,
    "meanAbsoluteError" DOUBLE PRECISION,
    "meanSquaredError" DOUBLE PRECISION,
    "rSquared" DOUBLE PRECISION,
    "within5Percent" DOUBLE PRECISION,
    "within10Percent" DOUBLE PRECISION,
    "predictionCount" INTEGER NOT NULL DEFAULT 0,
    "validatedCount" INTEGER NOT NULL DEFAULT 0,
    "abTestId" TEXT,
    "abTestVariant" TEXT,
    "abTestResult" JSONB,
    "previousVersionId" TEXT,

    CONSTRAINT "AIModelVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccuracySnapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "snapshotType" TEXT NOT NULL,
    "racePredictions" JSONB,
    "thresholdPredictions" JSONB,
    "injuryPredictions" JSONB,
    "readinessPredictions" JSONB,
    "programOutcomes" JSONB,
    "overallSampleSize" INTEGER NOT NULL,
    "overallAccuracy" DOUBLE PRECISION,
    "confidenceLevel" DOUBLE PRECISION,
    "previousSnapshotId" TEXT,
    "changeFromPrevious" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AccuracySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIPromptTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "promptName" TEXT NOT NULL,
    "promptCategory" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "systemPrompt" TEXT NOT NULL,
    "userPromptTemplate" TEXT,
    "outputFormat" JSONB,
    "description" TEXT,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activatedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "avgResponseQuality" DOUBLE PRECISION,
    "avgLatencyMs" INTEGER,
    "abTestGroup" TEXT,
    "abTestWeight" DOUBLE PRECISION,
    "previousVersionId" TEXT,
    "basedOnFeedback" TEXT[],

    CONSTRAINT "AIPromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgilityDrill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameSv" TEXT,
    "description" TEXT,
    "descriptionSv" TEXT,
    "category" "AgilityDrillCategory" NOT NULL,
    "requiredEquipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "optionalEquipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "distanceMeters" DOUBLE PRECISION,
    "durationSeconds" INTEGER,
    "defaultReps" INTEGER,
    "defaultSets" INTEGER,
    "restSeconds" INTEGER,
    "minDevelopmentStage" "DevelopmentStage" NOT NULL DEFAULT 'FUNDAMENTALS',
    "maxDevelopmentStage" "DevelopmentStage" NOT NULL DEFAULT 'ELITE',
    "primarySports" "SportType"[] DEFAULT ARRAY[]::"SportType"[],
    "difficultyLevel" INTEGER NOT NULL DEFAULT 3,
    "videoUrl" TEXT,
    "animationUrl" TEXT,
    "diagramUrl" TEXT,
    "setupInstructions" TEXT,
    "executionCues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "progressionDrillId" TEXT,
    "regressionDrillId" TEXT,
    "coachId" TEXT,
    "isSystemDrill" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgilityDrill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgilityWorkout" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "format" "AgilityWorkoutFormat" NOT NULL,
    "totalDuration" INTEGER,
    "restBetweenDrills" INTEGER,
    "developmentStage" "DevelopmentStage",
    "targetSports" "SportType"[] DEFAULT ARRAY[]::"SportType"[],
    "primaryFocus" "AgilityDrillCategory",
    "coachId" TEXT NOT NULL,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgilityWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgilityWorkoutDrill" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "drillId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "sectionType" "WorkoutSectionType" NOT NULL DEFAULT 'MAIN',
    "sets" INTEGER,
    "reps" INTEGER,
    "duration" INTEGER,
    "restSeconds" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgilityWorkoutDrill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgilityWorkoutAssignment" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "assignedDate" DATE NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "notes" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "locationId" TEXT,
    "locationName" TEXT,
    "scheduledBy" TEXT,
    "responsibleCoachId" TEXT,
    "calendarEventId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "teamBroadcastId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgilityWorkoutAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgilityWorkoutResult" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "totalDuration" INTEGER,
    "perceivedEffort" INTEGER,
    "notes" TEXT,
    "drillResults" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgilityWorkoutResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimingGateSession" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "sessionDate" DATE NOT NULL,
    "sessionName" TEXT,
    "importSource" "TimingGateSource" NOT NULL,
    "importedAt" TIMESTAMP(3),
    "rawDataUrl" TEXT,
    "gateCount" INTEGER,
    "intervalDistances" DOUBLE PRECISION[],
    "locationId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimingGateSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimingGateResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "athleteId" TEXT,
    "unmatchedAthleteName" TEXT,
    "unmatchedAthleteId" TEXT,
    "testProtocol" "SportTestProtocol",
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "splitTimes" DOUBLE PRECISION[],
    "totalTime" DOUBLE PRECISION NOT NULL,
    "acceleration" DOUBLE PRECISION,
    "maxVelocity" DOUBLE PRECISION,
    "codDeficit" DOUBLE PRECISION,
    "valid" BOOLEAN NOT NULL DEFAULT true,
    "invalidReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimingGateResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceWorkoutSession" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "mimeType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "transcription" TEXT,
    "parsedIntent" JSONB,
    "workoutType" TEXT,
    "strengthSessionId" TEXT,
    "cardioSessionId" TEXT,
    "hybridWorkoutId" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "assignedDate" DATE,
    "processingTimeMs" INTEGER,
    "modelUsed" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceWorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentPreferences" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "autonomyLevel" "AgentAutonomyLevel" NOT NULL DEFAULT 'ADVISORY',
    "allowWorkoutModification" BOOLEAN NOT NULL DEFAULT false,
    "allowRestDayInjection" BOOLEAN NOT NULL DEFAULT false,
    "maxIntensityReduction" INTEGER NOT NULL DEFAULT 20,
    "dailyBriefingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "proactiveNudgesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "preferredContactMethod" TEXT NOT NULL DEFAULT 'IN_APP',
    "minRestDaysPerWeek" INTEGER NOT NULL DEFAULT 1,
    "maxConsecutiveHardDays" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentConsent" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "dataProcessingConsent" BOOLEAN NOT NULL DEFAULT false,
    "automatedDecisionConsent" BOOLEAN NOT NULL DEFAULT false,
    "healthDataProcessingConsent" BOOLEAN NOT NULL DEFAULT false,
    "learningContributionConsent" BOOLEAN NOT NULL DEFAULT true,
    "anonymizedResearchConsent" BOOLEAN NOT NULL DEFAULT true,
    "consentVersion" TEXT NOT NULL DEFAULT '1.0',
    "consentGivenAt" TIMESTAMP(3),
    "consentWithdrawnAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentPerception" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "perceivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readinessScore" DOUBLE PRECISION,
    "fatigueScore" DOUBLE PRECISION,
    "sleepScore" DOUBLE PRECISION,
    "stressScore" DOUBLE PRECISION,
    "acuteLoad" DOUBLE PRECISION,
    "chronicLoad" DOUBLE PRECISION,
    "acwr" DOUBLE PRECISION,
    "acwrZone" TEXT,
    "hasActiveInjury" BOOLEAN NOT NULL DEFAULT false,
    "hasRestrictions" BOOLEAN NOT NULL DEFAULT false,
    "checkInStreak" INTEGER NOT NULL DEFAULT 0,
    "missedWorkouts7d" INTEGER NOT NULL DEFAULT 0,
    "detectedPatterns" JSONB,
    "patternSeverity" TEXT,
    "contextSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentPerception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentAction" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "perceptionId" TEXT,
    "actionType" "AgentActionType" NOT NULL,
    "actionData" JSONB NOT NULL,
    "reasoning" TEXT NOT NULL,
    "confidence" "AgentConfidence" NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "targetWorkoutId" TEXT,
    "targetDate" TIMESTAMP(3),
    "status" "AgentActionStatus" NOT NULL DEFAULT 'PROPOSED',
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "athleteFeedback" TEXT,
    "coachOverride" BOOLEAN NOT NULL DEFAULT false,
    "coachOverrideReason" TEXT,
    "outcomeTracked" BOOLEAN NOT NULL DEFAULT false,
    "outcomeSuccess" BOOLEAN,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentOversightItem" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentOversightItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentLearningEvent" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "actionId" TEXT,
    "eventType" TEXT NOT NULL,
    "agentDecision" JSONB NOT NULL,
    "actualOutcome" JSONB NOT NULL,
    "contextAtDecision" JSONB NOT NULL,
    "processedForTraining" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentLearningEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentAuditLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetId" TEXT,
    "targetType" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "imageUrl" TEXT,
    "coverImageUrl" TEXT,
    "specialties" "SportType"[],
    "methodologies" TEXT[],
    "experienceYears" INTEGER,
    "credentials" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isAcceptingClients" BOOLEAN NOT NULL DEFAULT true,
    "location" TEXT,
    "timezone" TEXT,
    "languages" TEXT[] DEFAULT ARRAY['sv', 'en']::TEXT[],
    "totalClients" INTEGER NOT NULL DEFAULT 0,
    "activeClients" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachRequest" (
    "id" TEXT NOT NULL,
    "athleteClientId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "status" "CoachRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "coachResponse" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachAgreement" (
    "id" TEXT NOT NULL,
    "athleteClientId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "status" "CoachAgreementStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,
    "revenueSharePercent" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "revenueShareStartDate" TIMESTAMP(3),
    "programAction" TEXT,

    CONSTRAINT "CoachAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachReview" (
    "id" TEXT NOT NULL,
    "coachProfileId" TEXT NOT NULL,
    "athleteClientId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachEarnings" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "athleteClientId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "coachAmount" INTEGER NOT NULL,
    "platformAmount" INTEGER NOT NULL,
    "sharePercent" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachEarnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeSkill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT NOT NULL,
    "category" "KnowledgeCategory" NOT NULL,
    "keywords" TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "documentIds" TEXT[],
    "maxChunks" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "handled" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_selfAthleteClientId_key" ON "User"("selfAthleteClientId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_referredByBusinessId_idx" ON "User"("referredByBusinessId");

-- CreateIndex
CREATE INDEX "User_selfAthleteClientId_idx" ON "User"("selfAthleteClientId");

-- CreateIndex
CREATE INDEX "Organization_userId_idx" ON "Organization"("userId");

-- CreateIndex
CREATE INDEX "Organization_name_idx" ON "Organization"("name");

-- CreateIndex
CREATE INDEX "Team_userId_idx" ON "Team"("userId");

-- CreateIndex
CREATE INDEX "Team_name_idx" ON "Team"("name");

-- CreateIndex
CREATE INDEX "Team_organizationId_idx" ON "Team"("organizationId");

-- CreateIndex
CREATE INDEX "TeamWorkoutBroadcast_teamId_idx" ON "TeamWorkoutBroadcast"("teamId");

-- CreateIndex
CREATE INDEX "TeamWorkoutBroadcast_coachId_idx" ON "TeamWorkoutBroadcast"("coachId");

-- CreateIndex
CREATE INDEX "TeamWorkoutBroadcast_assignedDate_idx" ON "TeamWorkoutBroadcast"("assignedDate");

-- CreateIndex
CREATE INDEX "TeamWorkoutBroadcast_locationId_idx" ON "TeamWorkoutBroadcast"("locationId");

-- CreateIndex
CREATE INDEX "TeamWorkoutBroadcast_strengthSessionId_idx" ON "TeamWorkoutBroadcast"("strengthSessionId");

-- CreateIndex
CREATE INDEX "TeamWorkoutBroadcast_cardioSessionId_idx" ON "TeamWorkoutBroadcast"("cardioSessionId");

-- CreateIndex
CREATE INDEX "TeamWorkoutBroadcast_hybridWorkoutId_idx" ON "TeamWorkoutBroadcast"("hybridWorkoutId");

-- CreateIndex
CREATE INDEX "TeamWorkoutBroadcast_agilityWorkoutId_idx" ON "TeamWorkoutBroadcast"("agilityWorkoutId");

-- CreateIndex
CREATE INDEX "Client_userId_idx" ON "Client"("userId");

-- CreateIndex
CREATE INDEX "Client_teamId_idx" ON "Client"("teamId");

-- CreateIndex
CREATE INDEX "Client_name_idx" ON "Client"("name");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_isDirect_idx" ON "Client"("isDirect");

-- CreateIndex
CREATE UNIQUE INDEX "Test_publicToken_key" ON "Test"("publicToken");

-- CreateIndex
CREATE INDEX "Test_clientId_idx" ON "Test"("clientId");

-- CreateIndex
CREATE INDEX "Test_userId_idx" ON "Test"("userId");

-- CreateIndex
CREATE INDEX "Test_testDate_idx" ON "Test"("testDate");

-- CreateIndex
CREATE INDEX "Test_location_idx" ON "Test"("location");

-- CreateIndex
CREATE INDEX "Test_testerId_idx" ON "Test"("testerId");

-- CreateIndex
CREATE INDEX "Test_locationId_idx" ON "Test"("locationId");

-- CreateIndex
CREATE INDEX "Test_publicToken_idx" ON "Test"("publicToken");

-- CreateIndex
CREATE INDEX "TestStage_testId_idx" ON "TestStage"("testId");

-- CreateIndex
CREATE INDEX "TestStage_sequence_idx" ON "TestStage"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "Report_testId_key" ON "Report"("testId");

-- CreateIndex
CREATE INDEX "TestTemplate_userId_idx" ON "TestTemplate"("userId");

-- CreateIndex
CREATE INDEX "TestTemplate_testType_idx" ON "TestTemplate"("testType");

-- CreateIndex
CREATE INDEX "TestTemplate_name_idx" ON "TestTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_tier_idx" ON "Subscription"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_userId_key" ON "ReferralCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");

-- CreateIndex
CREATE INDEX "ReferralCode_code_idx" ON "ReferralCode"("code");

-- CreateIndex
CREATE INDEX "ReferralCode_userId_idx" ON "ReferralCode"("userId");

-- CreateIndex
CREATE INDEX "ReferralCode_isActive_idx" ON "ReferralCode"("isActive");

-- CreateIndex
CREATE INDEX "Referral_referrerUserId_idx" ON "Referral"("referrerUserId");

-- CreateIndex
CREATE INDEX "Referral_referredUserId_idx" ON "Referral"("referredUserId");

-- CreateIndex
CREATE INDEX "Referral_referredEmail_idx" ON "Referral"("referredEmail");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "Referral_referralCodeId_idx" ON "Referral"("referralCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referralCodeId_referredEmail_key" ON "Referral"("referralCodeId", "referredEmail");

-- CreateIndex
CREATE INDEX "ReferralReward_referralId_idx" ON "ReferralReward"("referralId");

-- CreateIndex
CREATE INDEX "ReferralReward_userId_idx" ON "ReferralReward"("userId");

-- CreateIndex
CREATE INDEX "ReferralReward_applied_idx" ON "ReferralReward"("applied");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteSubscription_clientId_key" ON "AthleteSubscription"("clientId");

-- CreateIndex
CREATE INDEX "AthleteSubscription_clientId_idx" ON "AthleteSubscription"("clientId");

-- CreateIndex
CREATE INDEX "AthleteSubscription_tier_idx" ON "AthleteSubscription"("tier");

-- CreateIndex
CREATE INDEX "AthleteSubscription_status_idx" ON "AthleteSubscription"("status");

-- CreateIndex
CREATE INDEX "AthleteSubscription_businessId_idx" ON "AthleteSubscription"("businessId");

-- CreateIndex
CREATE INDEX "AthleteSubscription_paymentSource_idx" ON "AthleteSubscription"("paymentSource");

-- CreateIndex
CREATE INDEX "AthleteSubscription_assignedCoachId_idx" ON "AthleteSubscription"("assignedCoachId");

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

-- CreateIndex
CREATE INDEX "Business_slug_idx" ON "Business"("slug");

-- CreateIndex
CREATE INDEX "Business_isActive_idx" ON "Business"("isActive");

-- CreateIndex
CREATE INDEX "BusinessMember_businessId_idx" ON "BusinessMember"("businessId");

-- CreateIndex
CREATE INDEX "BusinessMember_userId_idx" ON "BusinessMember"("userId");

-- CreateIndex
CREATE INDEX "BusinessMember_role_idx" ON "BusinessMember"("role");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMember_businessId_userId_key" ON "BusinessMember"("businessId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessApiKey_keyHash_key" ON "BusinessApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "BusinessApiKey_businessId_idx" ON "BusinessApiKey"("businessId");

-- CreateIndex
CREATE INDEX "BusinessApiKey_keyHash_idx" ON "BusinessApiKey"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerReferral_userId_key" ON "PartnerReferral"("userId");

-- CreateIndex
CREATE INDEX "PartnerReferral_businessId_idx" ON "PartnerReferral"("businessId");

-- CreateIndex
CREATE INDEX "PartnerReferral_status_idx" ON "PartnerReferral"("status");

-- CreateIndex
CREATE INDEX "PartnerReferral_signedUpAt_idx" ON "PartnerReferral"("signedUpAt");

-- CreateIndex
CREATE INDEX "PartnerReferral_activatedAt_idx" ON "PartnerReferral"("activatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tester_userId_key" ON "Tester"("userId");

-- CreateIndex
CREATE INDEX "Tester_businessId_idx" ON "Tester"("businessId");

-- CreateIndex
CREATE INDEX "Tester_userId_idx" ON "Tester"("userId");

-- CreateIndex
CREATE INDEX "Tester_isActive_idx" ON "Tester"("isActive");

-- CreateIndex
CREATE INDEX "Location_businessId_idx" ON "Location"("businessId");

-- CreateIndex
CREATE INDEX "Location_city_idx" ON "Location"("city");

-- CreateIndex
CREATE INDEX "Location_isActive_idx" ON "Location"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Location_businessId_slug_key" ON "Location"("businessId", "slug");

-- CreateIndex
CREATE INDEX "Equipment_category_idx" ON "Equipment"("category");

-- CreateIndex
CREATE INDEX "Equipment_isActive_idx" ON "Equipment"("isActive");

-- CreateIndex
CREATE INDEX "LocationEquipment_locationId_idx" ON "LocationEquipment"("locationId");

-- CreateIndex
CREATE INDEX "LocationEquipment_equipmentId_idx" ON "LocationEquipment"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationEquipment_locationId_equipmentId_key" ON "LocationEquipment"("locationId", "equipmentId");

-- CreateIndex
CREATE INDEX "LocationService_locationId_idx" ON "LocationService"("locationId");

-- CreateIndex
CREATE INDEX "LocationService_serviceType_idx" ON "LocationService"("serviceType");

-- CreateIndex
CREATE INDEX "LocationStaff_locationId_idx" ON "LocationStaff"("locationId");

-- CreateIndex
CREATE INDEX "LocationStaff_userId_idx" ON "LocationStaff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationStaff_locationId_userId_key" ON "LocationStaff"("locationId", "userId");

-- CreateIndex
CREATE INDEX "BusinessFeature_businessId_idx" ON "BusinessFeature"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessFeature_businessId_feature_key" ON "BusinessFeature"("businessId", "feature");

-- CreateIndex
CREATE INDEX "IntegrationToken_clientId_idx" ON "IntegrationToken"("clientId");

-- CreateIndex
CREATE INDEX "IntegrationToken_type_idx" ON "IntegrationToken"("type");

-- CreateIndex
CREATE INDEX "IntegrationToken_lastSyncAt_idx" ON "IntegrationToken"("lastSyncAt");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationToken_clientId_type_key" ON "IntegrationToken"("clientId", "type");

-- CreateIndex
CREATE INDEX "OAuthRequestToken_expiresAt_idx" ON "OAuthRequestToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthRequestToken_clientId_provider_key" ON "OAuthRequestToken"("clientId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "StravaActivity_stravaId_key" ON "StravaActivity"("stravaId");

-- CreateIndex
CREATE INDEX "StravaActivity_clientId_idx" ON "StravaActivity"("clientId");

-- CreateIndex
CREATE INDEX "StravaActivity_startDate_idx" ON "StravaActivity"("startDate");

-- CreateIndex
CREATE INDEX "StravaActivity_type_idx" ON "StravaActivity"("type");

-- CreateIndex
CREATE INDEX "StravaActivity_mappedType_idx" ON "StravaActivity"("mappedType");

-- CreateIndex
CREATE UNIQUE INDEX "GarminActivity_garminActivityId_key" ON "GarminActivity"("garminActivityId");

-- CreateIndex
CREATE INDEX "GarminActivity_clientId_idx" ON "GarminActivity"("clientId");

-- CreateIndex
CREATE INDEX "GarminActivity_startDate_idx" ON "GarminActivity"("startDate");

-- CreateIndex
CREATE INDEX "GarminActivity_type_idx" ON "GarminActivity"("type");

-- CreateIndex
CREATE INDEX "GarminActivity_mappedType_idx" ON "GarminActivity"("mappedType");

-- CreateIndex
CREATE UNIQUE INDEX "Concept2Result_concept2Id_key" ON "Concept2Result"("concept2Id");

-- CreateIndex
CREATE INDEX "Concept2Result_clientId_idx" ON "Concept2Result"("clientId");

-- CreateIndex
CREATE INDEX "Concept2Result_date_idx" ON "Concept2Result"("date");

-- CreateIndex
CREATE INDEX "Concept2Result_type_idx" ON "Concept2Result"("type");

-- CreateIndex
CREATE INDEX "Concept2Result_mappedType_idx" ON "Concept2Result"("mappedType");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_code_key" ON "Invitation"("code");

-- CreateIndex
CREATE INDEX "Invitation_code_idx" ON "Invitation"("code");

-- CreateIndex
CREATE INDEX "Invitation_type_idx" ON "Invitation"("type");

-- CreateIndex
CREATE INDEX "Invitation_senderId_idx" ON "Invitation"("senderId");

-- CreateIndex
CREATE INDEX "Invitation_businessId_idx" ON "Invitation"("businessId");

-- CreateIndex
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteAccount_clientId_key" ON "AthleteAccount"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteAccount_userId_key" ON "AthleteAccount"("userId");

-- CreateIndex
CREATE INDEX "AthleteAccount_clientId_idx" ON "AthleteAccount"("clientId");

-- CreateIndex
CREATE INDEX "AthleteAccount_userId_idx" ON "AthleteAccount"("userId");

-- CreateIndex
CREATE INDEX "AthleteAccount_preferredLocationId_idx" ON "AthleteAccount"("preferredLocationId");

-- CreateIndex
CREATE INDEX "TrainingProgram_clientId_idx" ON "TrainingProgram"("clientId");

-- CreateIndex
CREATE INDEX "TrainingProgram_coachId_idx" ON "TrainingProgram"("coachId");

-- CreateIndex
CREATE INDEX "TrainingProgram_testId_idx" ON "TrainingProgram"("testId");

-- CreateIndex
CREATE INDEX "TrainingProgram_startDate_endDate_idx" ON "TrainingProgram"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "TrainingProgram_isActive_idx" ON "TrainingProgram"("isActive");

-- CreateIndex
CREATE INDEX "TrainingWeek_programId_idx" ON "TrainingWeek"("programId");

-- CreateIndex
CREATE INDEX "TrainingWeek_startDate_endDate_idx" ON "TrainingWeek"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingWeek_programId_weekNumber_key" ON "TrainingWeek"("programId", "weekNumber");

-- CreateIndex
CREATE INDEX "TrainingDay_weekId_idx" ON "TrainingDay"("weekId");

-- CreateIndex
CREATE INDEX "TrainingDay_date_idx" ON "TrainingDay"("date");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingDay_weekId_dayNumber_key" ON "TrainingDay"("weekId", "dayNumber");

-- CreateIndex
CREATE INDEX "Workout_dayId_order_idx" ON "Workout"("dayId", "order");

-- CreateIndex
CREATE INDEX "Workout_type_idx" ON "Workout"("type");

-- CreateIndex
CREATE INDEX "Workout_isCustom_idx" ON "Workout"("isCustom");

-- CreateIndex
CREATE INDEX "Workout_isAdHoc_idx" ON "Workout"("isAdHoc");

-- CreateIndex
CREATE INDEX "Workout_status_idx" ON "Workout"("status");

-- CreateIndex
CREATE INDEX "WorkoutSegment_workoutId_order_idx" ON "WorkoutSegment"("workoutId", "order");

-- CreateIndex
CREATE INDEX "WorkoutSegment_exerciseId_idx" ON "WorkoutSegment"("exerciseId");

-- CreateIndex
CREATE INDEX "Exercise_coachId_idx" ON "Exercise"("coachId");

-- CreateIndex
CREATE INDEX "Exercise_category_idx" ON "Exercise"("category");

-- CreateIndex
CREATE INDEX "Exercise_name_idx" ON "Exercise"("name");

-- CreateIndex
CREATE INDEX "Exercise_isPublic_idx" ON "Exercise"("isPublic");

-- CreateIndex
CREATE INDEX "Exercise_biomechanicalPillar_idx" ON "Exercise"("biomechanicalPillar");

-- CreateIndex
CREATE INDEX "Exercise_progressionLevel_idx" ON "Exercise"("progressionLevel");

-- CreateIndex
CREATE INDEX "Exercise_isHybridMovement_idx" ON "Exercise"("isHybridMovement");

-- CreateIndex
CREATE INDEX "Exercise_movementCategory_idx" ON "Exercise"("movementCategory");

-- CreateIndex
CREATE INDEX "Exercise_isRehabExercise_idx" ON "Exercise"("isRehabExercise");

-- CreateIndex
CREATE INDEX "Exercise_progressionExerciseId_idx" ON "Exercise"("progressionExerciseId");

-- CreateIndex
CREATE INDEX "Exercise_regressionExerciseId_idx" ON "Exercise"("regressionExerciseId");

-- CreateIndex
CREATE INDEX "WorkoutLog_workoutId_idx" ON "WorkoutLog"("workoutId");

-- CreateIndex
CREATE INDEX "WorkoutLog_athleteId_idx" ON "WorkoutLog"("athleteId");

-- CreateIndex
CREATE INDEX "WorkoutLog_completedAt_idx" ON "WorkoutLog"("completedAt");

-- CreateIndex
CREATE INDEX "WorkoutLog_completed_idx" ON "WorkoutLog"("completed");

-- CreateIndex
CREATE INDEX "SetLog_workoutLogId_idx" ON "SetLog"("workoutLogId");

-- CreateIndex
CREATE INDEX "SetLog_segmentId_idx" ON "SetLog"("segmentId");

-- CreateIndex
CREATE INDEX "SetLog_assignmentId_idx" ON "SetLog"("assignmentId");

-- CreateIndex
CREATE INDEX "SetLog_exerciseId_idx" ON "SetLog"("exerciseId");

-- CreateIndex
CREATE INDEX "SetLog_completedAt_idx" ON "SetLog"("completedAt");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_receiverId_idx" ON "Message"("receiverId");

-- CreateIndex
CREATE INDEX "Message_workoutId_idx" ON "Message"("workoutId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Message_isRead_idx" ON "Message"("isRead");

-- CreateIndex
CREATE UNIQUE INDEX "ThresholdCalculation_testId_key" ON "ThresholdCalculation"("testId");

-- CreateIndex
CREATE INDEX "ThresholdCalculation_testId_idx" ON "ThresholdCalculation"("testId");

-- CreateIndex
CREATE INDEX "ThresholdCalculation_method_confidence_idx" ON "ThresholdCalculation"("method", "confidence");

-- CreateIndex
CREATE INDEX "ThresholdCalculation_testDate_idx" ON "ThresholdCalculation"("testDate");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteProfile_clientId_key" ON "AthleteProfile"("clientId");

-- CreateIndex
CREATE INDEX "AthleteProfile_clientId_idx" ON "AthleteProfile"("clientId");

-- CreateIndex
CREATE INDEX "AthleteProfile_category_idx" ON "AthleteProfile"("category");

-- CreateIndex
CREATE INDEX "AthleteProfile_hasLactateMeter_hasHRVMonitor_idx" ON "AthleteProfile"("hasLactateMeter", "hasHRVMonitor");

-- CreateIndex
CREATE INDEX "AthleteProfile_vo2maxPercentile_idx" ON "AthleteProfile"("vo2maxPercentile");

-- CreateIndex
CREATE INDEX "AthleteProfile_norwegianPhase_idx" ON "AthleteProfile"("norwegianPhase");

-- CreateIndex
CREATE INDEX "AthleteProfile_currentVDOT_idx" ON "AthleteProfile"("currentVDOT");

-- CreateIndex
CREATE INDEX "AthleteProfile_metabolicType_idx" ON "AthleteProfile"("metabolicType");

-- CreateIndex
CREATE INDEX "AthleteProfile_vdotLastUpdated_idx" ON "AthleteProfile"("vdotLastUpdated");

-- CreateIndex
CREATE INDEX "DailyCheckIn_clientId_date_idx" ON "DailyCheckIn"("clientId", "date");

-- CreateIndex
CREATE INDEX "DailyCheckIn_readinessScore_idx" ON "DailyCheckIn"("readinessScore");

-- CreateIndex
CREATE INDEX "DailyCheckIn_readinessDecision_idx" ON "DailyCheckIn"("readinessDecision");

-- CreateIndex
CREATE INDEX "DailyCheckIn_requestPhysioContact_idx" ON "DailyCheckIn"("requestPhysioContact");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCheckIn_clientId_date_key" ON "DailyCheckIn"("clientId", "date");

-- CreateIndex
CREATE INDEX "FieldTestSchedule_clientId_scheduledDate_idx" ON "FieldTestSchedule"("clientId", "scheduledDate");

-- CreateIndex
CREATE INDEX "FieldTestSchedule_completed_scheduledDate_idx" ON "FieldTestSchedule"("completed", "scheduledDate");

-- CreateIndex
CREATE INDEX "FieldTestSchedule_clientId_completed_idx" ON "FieldTestSchedule"("clientId", "completed");

-- CreateIndex
CREATE INDEX "DailyMetrics_clientId_date_idx" ON "DailyMetrics"("clientId", "date");

-- CreateIndex
CREATE INDEX "DailyMetrics_clientId_readinessScore_idx" ON "DailyMetrics"("clientId", "readinessScore");

-- CreateIndex
CREATE INDEX "DailyMetrics_clientId_readinessLevel_idx" ON "DailyMetrics"("clientId", "readinessLevel");

-- CreateIndex
CREATE INDEX "DailyMetrics_date_readinessLevel_idx" ON "DailyMetrics"("date", "readinessLevel");

-- CreateIndex
CREATE INDEX "DailyMetrics_requestPhysioContact_idx" ON "DailyMetrics"("requestPhysioContact");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetrics_clientId_date_key" ON "DailyMetrics"("clientId", "date");

-- CreateIndex
CREATE INDEX "TrainingLoad_clientId_date_idx" ON "TrainingLoad"("clientId", "date");

-- CreateIndex
CREATE INDEX "TrainingLoad_clientId_acwrZone_idx" ON "TrainingLoad"("clientId", "acwrZone");

-- CreateIndex
CREATE INDEX "TrainingLoad_clientId_injuryRisk_idx" ON "TrainingLoad"("clientId", "injuryRisk");

-- CreateIndex
CREATE INDEX "WeeklyTrainingSummary_clientId_year_idx" ON "WeeklyTrainingSummary"("clientId", "year");

-- CreateIndex
CREATE INDEX "WeeklyTrainingSummary_weekStart_idx" ON "WeeklyTrainingSummary"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyTrainingSummary_clientId_weekStart_key" ON "WeeklyTrainingSummary"("clientId", "weekStart");

-- CreateIndex
CREATE INDEX "MonthlyTrainingSummary_clientId_year_idx" ON "MonthlyTrainingSummary"("clientId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyTrainingSummary_clientId_month_year_key" ON "MonthlyTrainingSummary"("clientId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityHRZoneDistribution_stravaActivityId_key" ON "ActivityHRZoneDistribution"("stravaActivityId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityHRZoneDistribution_garminActivityId_key" ON "ActivityHRZoneDistribution"("garminActivityId");

-- CreateIndex
CREATE INDEX "YearlySummary_clientId_idx" ON "YearlySummary"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "YearlySummary_clientId_year_key" ON "YearlySummary"("clientId", "year");

-- CreateIndex
CREATE INDEX "TrainingProgramEngine_clientId_status_idx" ON "TrainingProgramEngine"("clientId", "status");

-- CreateIndex
CREATE INDEX "TrainingProgramEngine_clientId_startDate_endDate_idx" ON "TrainingProgramEngine"("clientId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "TrainingProgramEngine_methodology_status_idx" ON "TrainingProgramEngine"("methodology", "status");

-- CreateIndex
CREATE INDEX "TrainingProgramEngine_currentPhase_idx" ON "TrainingProgramEngine"("currentPhase");

-- CreateIndex
CREATE INDEX "WorkoutModification_workoutId_idx" ON "WorkoutModification"("workoutId");

-- CreateIndex
CREATE INDEX "WorkoutModification_date_idx" ON "WorkoutModification"("date");

-- CreateIndex
CREATE INDEX "WorkoutModification_decision_idx" ON "WorkoutModification"("decision");

-- CreateIndex
CREATE INDEX "WorkoutModification_workoutId_date_idx" ON "WorkoutModification"("workoutId", "date");

-- CreateIndex
CREATE INDEX "WorkoutModification_autoGenerated_decision_idx" ON "WorkoutModification"("autoGenerated", "decision");

-- CreateIndex
CREATE INDEX "FieldTest_clientId_date_idx" ON "FieldTest"("clientId", "date");

-- CreateIndex
CREATE INDEX "FieldTest_testType_date_idx" ON "FieldTest"("testType", "date");

-- CreateIndex
CREATE INDEX "FieldTest_clientId_testType_date_idx" ON "FieldTest"("clientId", "testType", "date");

-- CreateIndex
CREATE INDEX "FieldTest_confidence_valid_idx" ON "FieldTest"("confidence", "valid");

-- CreateIndex
CREATE INDEX "SelfReportedLactate_clientId_date_idx" ON "SelfReportedLactate"("clientId", "date");

-- CreateIndex
CREATE INDEX "SelfReportedLactate_clientId_measurementType_idx" ON "SelfReportedLactate"("clientId", "measurementType");

-- CreateIndex
CREATE INDEX "SelfReportedLactate_validated_idx" ON "SelfReportedLactate"("validated");

-- CreateIndex
CREATE INDEX "SelfReportedLactate_validated_clientId_idx" ON "SelfReportedLactate"("validated", "clientId");

-- CreateIndex
CREATE INDEX "SelfReportedLactate_validatedBy_validatedAt_idx" ON "SelfReportedLactate"("validatedBy", "validatedAt");

-- CreateIndex
CREATE INDEX "RaceCalendar_clientId_idx" ON "RaceCalendar"("clientId");

-- CreateIndex
CREATE INDEX "Race_clientId_date_idx" ON "Race"("clientId", "date");

-- CreateIndex
CREATE INDEX "Race_classification_date_idx" ON "Race"("classification", "date");

-- CreateIndex
CREATE INDEX "Race_calendarId_idx" ON "Race"("calendarId");

-- CreateIndex
CREATE INDEX "InjuryAssessment_clientId_date_idx" ON "InjuryAssessment"("clientId", "date");

-- CreateIndex
CREATE INDEX "InjuryAssessment_painLevel_gaitAffected_idx" ON "InjuryAssessment"("painLevel", "gaitAffected");

-- CreateIndex
CREATE INDEX "InjuryAssessment_clientId_resolved_idx" ON "InjuryAssessment"("clientId", "resolved");

-- CreateIndex
CREATE INDEX "InjuryAssessment_injuryType_phase_idx" ON "InjuryAssessment"("injuryType", "phase");

-- CreateIndex
CREATE INDEX "InjuryAssessment_clientId_injuryType_resolved_idx" ON "InjuryAssessment"("clientId", "injuryType", "resolved");

-- CreateIndex
CREATE INDEX "InjuryAssessment_assessedById_idx" ON "InjuryAssessment"("assessedById");

-- CreateIndex
CREATE INDEX "PhysioAssignment_physioUserId_idx" ON "PhysioAssignment"("physioUserId");

-- CreateIndex
CREATE INDEX "PhysioAssignment_clientId_idx" ON "PhysioAssignment"("clientId");

-- CreateIndex
CREATE INDEX "PhysioAssignment_teamId_idx" ON "PhysioAssignment"("teamId");

-- CreateIndex
CREATE INDEX "PhysioAssignment_organizationId_idx" ON "PhysioAssignment"("organizationId");

-- CreateIndex
CREATE INDEX "PhysioAssignment_businessId_idx" ON "PhysioAssignment"("businessId");

-- CreateIndex
CREATE INDEX "PhysioAssignment_locationId_idx" ON "PhysioAssignment"("locationId");

-- CreateIndex
CREATE INDEX "PhysioAssignment_isActive_idx" ON "PhysioAssignment"("isActive");

-- CreateIndex
CREATE INDEX "TreatmentSession_physioUserId_idx" ON "TreatmentSession"("physioUserId");

-- CreateIndex
CREATE INDEX "TreatmentSession_clientId_idx" ON "TreatmentSession"("clientId");

-- CreateIndex
CREATE INDEX "TreatmentSession_injuryId_idx" ON "TreatmentSession"("injuryId");

-- CreateIndex
CREATE INDEX "TreatmentSession_sessionDate_idx" ON "TreatmentSession"("sessionDate");

-- CreateIndex
CREATE INDEX "TreatmentSession_treatmentType_idx" ON "TreatmentSession"("treatmentType");

-- CreateIndex
CREATE INDEX "RehabProgram_physioUserId_idx" ON "RehabProgram"("physioUserId");

-- CreateIndex
CREATE INDEX "RehabProgram_clientId_idx" ON "RehabProgram"("clientId");

-- CreateIndex
CREATE INDEX "RehabProgram_injuryId_idx" ON "RehabProgram"("injuryId");

-- CreateIndex
CREATE INDEX "RehabProgram_status_idx" ON "RehabProgram"("status");

-- CreateIndex
CREATE INDEX "RehabProgram_currentPhase_idx" ON "RehabProgram"("currentPhase");

-- CreateIndex
CREATE INDEX "RehabExercise_programId_idx" ON "RehabExercise"("programId");

-- CreateIndex
CREATE INDEX "RehabExercise_exerciseId_idx" ON "RehabExercise"("exerciseId");

-- CreateIndex
CREATE INDEX "RehabExercise_isActive_idx" ON "RehabExercise"("isActive");

-- CreateIndex
CREATE INDEX "RehabMilestone_programId_idx" ON "RehabMilestone"("programId");

-- CreateIndex
CREATE INDEX "RehabMilestone_phase_idx" ON "RehabMilestone"("phase");

-- CreateIndex
CREATE INDEX "RehabMilestone_isAchieved_idx" ON "RehabMilestone"("isAchieved");

-- CreateIndex
CREATE INDEX "RehabProgressLog_programId_idx" ON "RehabProgressLog"("programId");

-- CreateIndex
CREATE INDEX "RehabProgressLog_clientId_idx" ON "RehabProgressLog"("clientId");

-- CreateIndex
CREATE INDEX "RehabProgressLog_date_idx" ON "RehabProgressLog"("date");

-- CreateIndex
CREATE INDEX "RehabProgressLog_physioReviewed_idx" ON "RehabProgressLog"("physioReviewed");

-- CreateIndex
CREATE INDEX "TrainingRestriction_clientId_idx" ON "TrainingRestriction"("clientId");

-- CreateIndex
CREATE INDEX "TrainingRestriction_createdById_idx" ON "TrainingRestriction"("createdById");

-- CreateIndex
CREATE INDEX "TrainingRestriction_injuryId_idx" ON "TrainingRestriction"("injuryId");

-- CreateIndex
CREATE INDEX "TrainingRestriction_isActive_idx" ON "TrainingRestriction"("isActive");

-- CreateIndex
CREATE INDEX "TrainingRestriction_type_idx" ON "TrainingRestriction"("type");

-- CreateIndex
CREATE INDEX "TrainingRestriction_endDate_idx" ON "TrainingRestriction"("endDate");

-- CreateIndex
CREATE INDEX "MovementScreen_physioUserId_idx" ON "MovementScreen"("physioUserId");

-- CreateIndex
CREATE INDEX "MovementScreen_clientId_idx" ON "MovementScreen"("clientId");

-- CreateIndex
CREATE INDEX "MovementScreen_screenDate_idx" ON "MovementScreen"("screenDate");

-- CreateIndex
CREATE INDEX "MovementScreen_screenType_idx" ON "MovementScreen"("screenType");

-- CreateIndex
CREATE INDEX "AcuteInjuryReport_reporterId_idx" ON "AcuteInjuryReport"("reporterId");

-- CreateIndex
CREATE INDEX "AcuteInjuryReport_clientId_idx" ON "AcuteInjuryReport"("clientId");

-- CreateIndex
CREATE INDEX "AcuteInjuryReport_injuryId_idx" ON "AcuteInjuryReport"("injuryId");

-- CreateIndex
CREATE INDEX "AcuteInjuryReport_reportDate_idx" ON "AcuteInjuryReport"("reportDate");

-- CreateIndex
CREATE INDEX "AcuteInjuryReport_urgency_idx" ON "AcuteInjuryReport"("urgency");

-- CreateIndex
CREATE INDEX "AcuteInjuryReport_status_idx" ON "AcuteInjuryReport"("status");

-- CreateIndex
CREATE INDEX "CareTeamThread_clientId_idx" ON "CareTeamThread"("clientId");

-- CreateIndex
CREATE INDEX "CareTeamThread_createdById_idx" ON "CareTeamThread"("createdById");

-- CreateIndex
CREATE INDEX "CareTeamThread_injuryId_idx" ON "CareTeamThread"("injuryId");

-- CreateIndex
CREATE INDEX "CareTeamThread_rehabProgramId_idx" ON "CareTeamThread"("rehabProgramId");

-- CreateIndex
CREATE INDEX "CareTeamThread_restrictionId_idx" ON "CareTeamThread"("restrictionId");

-- CreateIndex
CREATE INDEX "CareTeamThread_status_idx" ON "CareTeamThread"("status");

-- CreateIndex
CREATE INDEX "CareTeamThread_priority_idx" ON "CareTeamThread"("priority");

-- CreateIndex
CREATE INDEX "CareTeamThread_lastMessageAt_idx" ON "CareTeamThread"("lastMessageAt");

-- CreateIndex
CREATE INDEX "CareTeamMessage_threadId_idx" ON "CareTeamMessage"("threadId");

-- CreateIndex
CREATE INDEX "CareTeamMessage_senderId_idx" ON "CareTeamMessage"("senderId");

-- CreateIndex
CREATE INDEX "CareTeamMessage_createdAt_idx" ON "CareTeamMessage"("createdAt");

-- CreateIndex
CREATE INDEX "CareTeamParticipant_threadId_idx" ON "CareTeamParticipant"("threadId");

-- CreateIndex
CREATE INDEX "CareTeamParticipant_userId_idx" ON "CareTeamParticipant"("userId");

-- CreateIndex
CREATE INDEX "CareTeamParticipant_isActive_idx" ON "CareTeamParticipant"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CareTeamParticipant_threadId_userId_key" ON "CareTeamParticipant"("threadId", "userId");

-- CreateIndex
CREATE INDEX "CrossTrainingSession_clientId_date_idx" ON "CrossTrainingSession"("clientId", "date");

-- CreateIndex
CREATE INDEX "CrossTrainingSession_modality_date_idx" ON "CrossTrainingSession"("modality", "date");

-- CreateIndex
CREATE INDEX "CrossTrainingSession_clientId_modality_idx" ON "CrossTrainingSession"("clientId", "modality");

-- CreateIndex
CREATE INDEX "CrossTrainingSession_reason_injuryType_idx" ON "CrossTrainingSession"("reason", "injuryType");

-- CreateIndex
CREATE INDEX "StrengthTrainingSession_clientId_date_idx" ON "StrengthTrainingSession"("clientId", "date");

-- CreateIndex
CREATE INDEX "StrengthTrainingSession_phase_date_idx" ON "StrengthTrainingSession"("phase", "date");

-- CreateIndex
CREATE INDEX "StrengthTrainingSession_clientId_phase_idx" ON "StrengthTrainingSession"("clientId", "phase");

-- CreateIndex
CREATE INDEX "StrengthTrainingSession_runningPhase_priorityLevel_idx" ON "StrengthTrainingSession"("runningPhase", "priorityLevel");

-- CreateIndex
CREATE INDEX "ProgressionTracking_clientId_exerciseId_date_idx" ON "ProgressionTracking"("clientId", "exerciseId", "date");

-- CreateIndex
CREATE INDEX "ProgressionTracking_clientId_progressionStatus_idx" ON "ProgressionTracking"("clientId", "progressionStatus");

-- CreateIndex
CREATE INDEX "ProgressionTracking_exerciseId_date_idx" ON "ProgressionTracking"("exerciseId", "date");

-- CreateIndex
CREATE INDEX "ProgressionTracking_readyForIncrease_idx" ON "ProgressionTracking"("readyForIncrease");

-- CreateIndex
CREATE INDEX "ProgressionTracking_plateauWeeks_idx" ON "ProgressionTracking"("plateauWeeks");

-- CreateIndex
CREATE INDEX "ProgressionTracking_clientId_strengthPhase_idx" ON "ProgressionTracking"("clientId", "strengthPhase");

-- CreateIndex
CREATE INDEX "OneRepMaxHistory_clientId_exerciseId_date_idx" ON "OneRepMaxHistory"("clientId", "exerciseId", "date");

-- CreateIndex
CREATE INDEX "OneRepMaxHistory_clientId_date_idx" ON "OneRepMaxHistory"("clientId", "date");

-- CreateIndex
CREATE INDEX "RaceResult_clientId_raceDate_idx" ON "RaceResult"("clientId", "raceDate");

-- CreateIndex
CREATE INDEX "RaceResult_clientId_usedForZones_idx" ON "RaceResult"("clientId", "usedForZones");

-- CreateIndex
CREATE INDEX "RaceResult_distance_raceDate_idx" ON "RaceResult"("distance", "raceDate");

-- CreateIndex
CREATE INDEX "RaceResult_vdot_idx" ON "RaceResult"("vdot");

-- CreateIndex
CREATE INDEX "RaceResult_confidence_idx" ON "RaceResult"("confidence");

-- CreateIndex
CREATE INDEX "RaceResult_linkedPredictionId_idx" ON "RaceResult"("linkedPredictionId");

-- CreateIndex
CREATE INDEX "SportPerformance_clientId_sport_idx" ON "SportPerformance"("clientId", "sport");

-- CreateIndex
CREATE INDEX "SportPerformance_clientId_eventType_idx" ON "SportPerformance"("clientId", "eventType");

-- CreateIndex
CREATE INDEX "SportPerformance_sport_eventDate_idx" ON "SportPerformance"("sport", "eventDate");

-- CreateIndex
CREATE INDEX "SportPerformance_clientId_isPR_idx" ON "SportPerformance"("clientId", "isPR");

-- CreateIndex
CREATE UNIQUE INDEX "SportProfile_clientId_key" ON "SportProfile"("clientId");

-- CreateIndex
CREATE INDEX "SportProfile_clientId_idx" ON "SportProfile"("clientId");

-- CreateIndex
CREATE INDEX "SportProfile_primarySport_idx" ON "SportProfile"("primarySport");

-- CreateIndex
CREATE INDEX "SportProfile_onboardingCompleted_idx" ON "SportProfile"("onboardingCompleted");

-- CreateIndex
CREATE INDEX "CoachDocument_coachId_idx" ON "CoachDocument"("coachId");

-- CreateIndex
CREATE INDEX "CoachDocument_fileType_idx" ON "CoachDocument"("fileType");

-- CreateIndex
CREATE INDEX "CoachDocument_isSystem_idx" ON "CoachDocument"("isSystem");

-- CreateIndex
CREATE INDEX "CoachDocument_processingStatus_idx" ON "CoachDocument"("processingStatus");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_documentId_idx" ON "KnowledgeChunk"("documentId");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_coachId_idx" ON "KnowledgeChunk"("coachId");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_chunkIndex_idx" ON "KnowledgeChunk"("chunkIndex");

-- CreateIndex
CREATE INDEX "AIConversation_coachId_idx" ON "AIConversation"("coachId");

-- CreateIndex
CREATE INDEX "AIConversation_athleteId_idx" ON "AIConversation"("athleteId");

-- CreateIndex
CREATE INDEX "AIConversation_status_idx" ON "AIConversation"("status");

-- CreateIndex
CREATE INDEX "AIConversation_createdAt_idx" ON "AIConversation"("createdAt");

-- CreateIndex
CREATE INDEX "AIMessage_conversationId_idx" ON "AIMessage"("conversationId");

-- CreateIndex
CREATE INDEX "AIMessage_role_idx" ON "AIMessage"("role");

-- CreateIndex
CREATE INDEX "AIMessage_createdAt_idx" ON "AIMessage"("createdAt");

-- CreateIndex
CREATE INDEX "AIGeneratedProgram_conversationId_idx" ON "AIGeneratedProgram"("conversationId");

-- CreateIndex
CREATE INDEX "AIGeneratedProgram_programId_idx" ON "AIGeneratedProgram"("programId");

-- CreateIndex
CREATE INDEX "AIGeneratedProgram_isSaved_idx" ON "AIGeneratedProgram"("isSaved");

-- CreateIndex
CREATE INDEX "AIGeneratedWOD_clientId_idx" ON "AIGeneratedWOD"("clientId");

-- CreateIndex
CREATE INDEX "AIGeneratedWOD_status_idx" ON "AIGeneratedWOD"("status");

-- CreateIndex
CREATE INDEX "AIGeneratedWOD_createdAt_idx" ON "AIGeneratedWOD"("createdAt");

-- CreateIndex
CREATE INDEX "AIGeneratedWOD_mode_idx" ON "AIGeneratedWOD"("mode");

-- CreateIndex
CREATE INDEX "VideoAnalysis_coachId_idx" ON "VideoAnalysis"("coachId");

-- CreateIndex
CREATE INDEX "VideoAnalysis_athleteId_idx" ON "VideoAnalysis"("athleteId");

-- CreateIndex
CREATE INDEX "VideoAnalysis_exerciseId_idx" ON "VideoAnalysis"("exerciseId");

-- CreateIndex
CREATE INDEX "VideoAnalysis_status_idx" ON "VideoAnalysis"("status");

-- CreateIndex
CREATE INDEX "BodyComposition_clientId_idx" ON "BodyComposition"("clientId");

-- CreateIndex
CREATE INDEX "BodyComposition_measurementDate_idx" ON "BodyComposition"("measurementDate");

-- CreateIndex
CREATE UNIQUE INDEX "BodyComposition_clientId_measurementDate_key" ON "BodyComposition"("clientId", "measurementDate");

-- CreateIndex
CREATE UNIQUE INDEX "UserApiKey_userId_key" ON "UserApiKey"("userId");

-- CreateIndex
CREATE INDEX "UserApiKey_userId_idx" ON "UserApiKey"("userId");

-- CreateIndex
CREATE INDEX "UserApiKey_defaultModelId_idx" ON "UserApiKey"("defaultModelId");

-- CreateIndex
CREATE UNIQUE INDEX "AIModel_modelId_key" ON "AIModel"("modelId");

-- CreateIndex
CREATE INDEX "AIModel_provider_idx" ON "AIModel"("provider");

-- CreateIndex
CREATE INDEX "AIModel_isActive_idx" ON "AIModel"("isActive");

-- CreateIndex
CREATE INDEX "AIModel_isDefault_idx" ON "AIModel"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "RunningGaitAnalysis_videoAnalysisId_key" ON "RunningGaitAnalysis"("videoAnalysisId");

-- CreateIndex
CREATE INDEX "RunningGaitAnalysis_videoAnalysisId_idx" ON "RunningGaitAnalysis"("videoAnalysisId");

-- CreateIndex
CREATE INDEX "RunningGaitAnalysis_injuryRiskLevel_idx" ON "RunningGaitAnalysis"("injuryRiskLevel");

-- CreateIndex
CREATE INDEX "RunningGaitAnalysis_cadence_idx" ON "RunningGaitAnalysis"("cadence");

-- CreateIndex
CREATE UNIQUE INDEX "SkiingTechniqueAnalysis_videoAnalysisId_key" ON "SkiingTechniqueAnalysis"("videoAnalysisId");

-- CreateIndex
CREATE INDEX "SkiingTechniqueAnalysis_videoAnalysisId_idx" ON "SkiingTechniqueAnalysis"("videoAnalysisId");

-- CreateIndex
CREATE INDEX "SkiingTechniqueAnalysis_techniqueType_idx" ON "SkiingTechniqueAnalysis"("techniqueType");

-- CreateIndex
CREATE INDEX "SkiingTechniqueAnalysis_overallScore_idx" ON "SkiingTechniqueAnalysis"("overallScore");

-- CreateIndex
CREATE UNIQUE INDEX "HyroxStationAnalysis_videoAnalysisId_key" ON "HyroxStationAnalysis"("videoAnalysisId");

-- CreateIndex
CREATE INDEX "HyroxStationAnalysis_videoAnalysisId_idx" ON "HyroxStationAnalysis"("videoAnalysisId");

-- CreateIndex
CREATE INDEX "HyroxStationAnalysis_stationType_idx" ON "HyroxStationAnalysis"("stationType");

-- CreateIndex
CREATE INDEX "HyroxStationAnalysis_overallScore_idx" ON "HyroxStationAnalysis"("overallScore");

-- CreateIndex
CREATE UNIQUE INDEX "AudioJournal_dailyCheckInId_key" ON "AudioJournal"("dailyCheckInId");

-- CreateIndex
CREATE INDEX "AudioJournal_clientId_date_idx" ON "AudioJournal"("clientId", "date");

-- CreateIndex
CREATE INDEX "AudioJournal_status_idx" ON "AudioJournal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AudioJournal_clientId_date_key" ON "AudioJournal"("clientId", "date");

-- CreateIndex
CREATE INDEX "MenstrualCycle_clientId_startDate_idx" ON "MenstrualCycle"("clientId", "startDate");

-- CreateIndex
CREATE INDEX "MenstrualCycle_currentPhase_idx" ON "MenstrualCycle"("currentPhase");

-- CreateIndex
CREATE INDEX "MenstrualDailyLog_clientId_date_idx" ON "MenstrualDailyLog"("clientId", "date");

-- CreateIndex
CREATE INDEX "MenstrualDailyLog_phase_idx" ON "MenstrualDailyLog"("phase");

-- CreateIndex
CREATE INDEX "MenstrualDailyLog_cycleId_idx" ON "MenstrualDailyLog"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "MenstrualDailyLog_clientId_date_key" ON "MenstrualDailyLog"("clientId", "date");

-- CreateIndex
CREATE INDEX "HybridWorkout_coachId_idx" ON "HybridWorkout"("coachId");

-- CreateIndex
CREATE INDEX "HybridWorkout_isBenchmark_idx" ON "HybridWorkout"("isBenchmark");

-- CreateIndex
CREATE INDEX "HybridWorkout_benchmarkSource_idx" ON "HybridWorkout"("benchmarkSource");

-- CreateIndex
CREATE INDEX "HybridWorkout_format_idx" ON "HybridWorkout"("format");

-- CreateIndex
CREATE INDEX "HybridWorkout_scalingLevel_idx" ON "HybridWorkout"("scalingLevel");

-- CreateIndex
CREATE INDEX "HybridWorkout_parentId_idx" ON "HybridWorkout"("parentId");

-- CreateIndex
CREATE INDEX "HybridWorkout_rxVersionId_idx" ON "HybridWorkout"("rxVersionId");

-- CreateIndex
CREATE INDEX "HybridWorkoutVersion_workoutId_idx" ON "HybridWorkoutVersion"("workoutId");

-- CreateIndex
CREATE INDEX "HybridWorkoutVersion_versionNumber_idx" ON "HybridWorkoutVersion"("versionNumber");

-- CreateIndex
CREATE INDEX "HybridMovement_workoutId_idx" ON "HybridMovement"("workoutId");

-- CreateIndex
CREATE INDEX "HybridMovement_exerciseId_idx" ON "HybridMovement"("exerciseId");

-- CreateIndex
CREATE INDEX "HybridWorkoutResult_workoutId_idx" ON "HybridWorkoutResult"("workoutId");

-- CreateIndex
CREATE INDEX "HybridWorkoutResult_athleteId_idx" ON "HybridWorkoutResult"("athleteId");

-- CreateIndex
CREATE INDEX "HybridWorkoutResult_completedAt_idx" ON "HybridWorkoutResult"("completedAt");

-- CreateIndex
CREATE INDEX "HybridWorkoutResult_isPR_idx" ON "HybridWorkoutResult"("isPR");

-- CreateIndex
CREATE UNIQUE INDEX "HybridWorkoutResult_workoutId_athleteId_completedAt_key" ON "HybridWorkoutResult"("workoutId", "athleteId", "completedAt");

-- CreateIndex
CREATE INDEX "HybridWorkoutAssignment_workoutId_idx" ON "HybridWorkoutAssignment"("workoutId");

-- CreateIndex
CREATE INDEX "HybridWorkoutAssignment_athleteId_idx" ON "HybridWorkoutAssignment"("athleteId");

-- CreateIndex
CREATE INDEX "HybridWorkoutAssignment_assignedDate_idx" ON "HybridWorkoutAssignment"("assignedDate");

-- CreateIndex
CREATE INDEX "HybridWorkoutAssignment_status_idx" ON "HybridWorkoutAssignment"("status");

-- CreateIndex
CREATE INDEX "HybridWorkoutAssignment_teamBroadcastId_idx" ON "HybridWorkoutAssignment"("teamBroadcastId");

-- CreateIndex
CREATE INDEX "HybridWorkoutAssignment_locationId_idx" ON "HybridWorkoutAssignment"("locationId");

-- CreateIndex
CREATE INDEX "HybridWorkoutAssignment_calendarEventId_idx" ON "HybridWorkoutAssignment"("calendarEventId");

-- CreateIndex
CREATE INDEX "HybridWorkoutAssignment_responsibleCoachId_idx" ON "HybridWorkoutAssignment"("responsibleCoachId");

-- CreateIndex
CREATE UNIQUE INDEX "HybridWorkoutAssignment_workoutId_athleteId_assignedDate_key" ON "HybridWorkoutAssignment"("workoutId", "athleteId", "assignedDate");

-- CreateIndex
CREATE INDEX "HybridWorkoutLog_workoutId_idx" ON "HybridWorkoutLog"("workoutId");

-- CreateIndex
CREATE INDEX "HybridWorkoutLog_athleteId_idx" ON "HybridWorkoutLog"("athleteId");

-- CreateIndex
CREATE INDEX "HybridWorkoutLog_startedAt_idx" ON "HybridWorkoutLog"("startedAt");

-- CreateIndex
CREATE INDEX "HybridWorkoutLog_status_idx" ON "HybridWorkoutLog"("status");

-- CreateIndex
CREATE INDEX "HybridRoundLog_hybridWorkoutLogId_idx" ON "HybridRoundLog"("hybridWorkoutLogId");

-- CreateIndex
CREATE INDEX "HybridRoundLog_roundNumber_idx" ON "HybridRoundLog"("roundNumber");

-- CreateIndex
CREATE INDEX "StrengthSession_coachId_idx" ON "StrengthSession"("coachId");

-- CreateIndex
CREATE INDEX "StrengthSession_phase_idx" ON "StrengthSession"("phase");

-- CreateIndex
CREATE INDEX "StrengthSession_isPublic_idx" ON "StrengthSession"("isPublic");

-- CreateIndex
CREATE INDEX "StrengthSessionAssignment_sessionId_idx" ON "StrengthSessionAssignment"("sessionId");

-- CreateIndex
CREATE INDEX "StrengthSessionAssignment_athleteId_idx" ON "StrengthSessionAssignment"("athleteId");

-- CreateIndex
CREATE INDEX "StrengthSessionAssignment_assignedDate_idx" ON "StrengthSessionAssignment"("assignedDate");

-- CreateIndex
CREATE INDEX "StrengthSessionAssignment_status_idx" ON "StrengthSessionAssignment"("status");

-- CreateIndex
CREATE INDEX "StrengthSessionAssignment_teamBroadcastId_idx" ON "StrengthSessionAssignment"("teamBroadcastId");

-- CreateIndex
CREATE INDEX "StrengthSessionAssignment_locationId_idx" ON "StrengthSessionAssignment"("locationId");

-- CreateIndex
CREATE INDEX "StrengthSessionAssignment_startTime_idx" ON "StrengthSessionAssignment"("startTime");

-- CreateIndex
CREATE INDEX "StrengthSessionAssignment_calendarEventId_idx" ON "StrengthSessionAssignment"("calendarEventId");

-- CreateIndex
CREATE INDEX "StrengthSessionAssignment_responsibleCoachId_idx" ON "StrengthSessionAssignment"("responsibleCoachId");

-- CreateIndex
CREATE UNIQUE INDEX "StrengthSessionAssignment_sessionId_athleteId_assignedDate_key" ON "StrengthSessionAssignment"("sessionId", "athleteId", "assignedDate");

-- CreateIndex
CREATE INDEX "StrengthTemplate_coachId_idx" ON "StrengthTemplate"("coachId");

-- CreateIndex
CREATE INDEX "StrengthTemplate_phase_idx" ON "StrengthTemplate"("phase");

-- CreateIndex
CREATE INDEX "StrengthTemplate_targetSport_idx" ON "StrengthTemplate"("targetSport");

-- CreateIndex
CREATE INDEX "StrengthTemplate_isPublic_idx" ON "StrengthTemplate"("isPublic");

-- CreateIndex
CREATE INDEX "StrengthTemplate_isSystemTemplate_idx" ON "StrengthTemplate"("isSystemTemplate");

-- CreateIndex
CREATE INDEX "CardioSession_coachId_idx" ON "CardioSession"("coachId");

-- CreateIndex
CREATE INDEX "CardioSession_sport_idx" ON "CardioSession"("sport");

-- CreateIndex
CREATE INDEX "CardioSession_isPublic_idx" ON "CardioSession"("isPublic");

-- CreateIndex
CREATE INDEX "CardioSessionAssignment_sessionId_idx" ON "CardioSessionAssignment"("sessionId");

-- CreateIndex
CREATE INDEX "CardioSessionAssignment_athleteId_idx" ON "CardioSessionAssignment"("athleteId");

-- CreateIndex
CREATE INDEX "CardioSessionAssignment_assignedDate_idx" ON "CardioSessionAssignment"("assignedDate");

-- CreateIndex
CREATE INDEX "CardioSessionAssignment_status_idx" ON "CardioSessionAssignment"("status");

-- CreateIndex
CREATE INDEX "CardioSessionAssignment_teamBroadcastId_idx" ON "CardioSessionAssignment"("teamBroadcastId");

-- CreateIndex
CREATE INDEX "CardioSessionAssignment_locationId_idx" ON "CardioSessionAssignment"("locationId");

-- CreateIndex
CREATE INDEX "CardioSessionAssignment_startTime_idx" ON "CardioSessionAssignment"("startTime");

-- CreateIndex
CREATE INDEX "CardioSessionAssignment_calendarEventId_idx" ON "CardioSessionAssignment"("calendarEventId");

-- CreateIndex
CREATE INDEX "CardioSessionAssignment_responsibleCoachId_idx" ON "CardioSessionAssignment"("responsibleCoachId");

-- CreateIndex
CREATE UNIQUE INDEX "CardioSessionAssignment_sessionId_athleteId_assignedDate_key" ON "CardioSessionAssignment"("sessionId", "athleteId", "assignedDate");

-- CreateIndex
CREATE INDEX "CardioSessionLog_sessionId_idx" ON "CardioSessionLog"("sessionId");

-- CreateIndex
CREATE INDEX "CardioSessionLog_athleteId_idx" ON "CardioSessionLog"("athleteId");

-- CreateIndex
CREATE INDEX "CardioSessionLog_startedAt_idx" ON "CardioSessionLog"("startedAt");

-- CreateIndex
CREATE INDEX "CardioSessionLog_status_idx" ON "CardioSessionLog"("status");

-- CreateIndex
CREATE INDEX "CardioSegmentLog_cardioSessionLogId_idx" ON "CardioSegmentLog"("cardioSessionLogId");

-- CreateIndex
CREATE INDEX "CardioSegmentLog_segmentIndex_idx" ON "CardioSegmentLog"("segmentIndex");

-- CreateIndex
CREATE UNIQUE INDEX "DietaryPreferences_clientId_key" ON "DietaryPreferences"("clientId");

-- CreateIndex
CREATE INDEX "DietaryPreferences_clientId_idx" ON "DietaryPreferences"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionGoal_clientId_key" ON "NutritionGoal"("clientId");

-- CreateIndex
CREATE INDEX "NutritionGoal_clientId_idx" ON "NutritionGoal"("clientId");

-- CreateIndex
CREATE INDEX "MealLog_clientId_date_idx" ON "MealLog"("clientId", "date");

-- CreateIndex
CREATE INDEX "MealLog_date_idx" ON "MealLog"("date");

-- CreateIndex
CREATE INDEX "VBTSession_clientId_idx" ON "VBTSession"("clientId");

-- CreateIndex
CREATE INDEX "VBTSession_sessionDate_idx" ON "VBTSession"("sessionDate");

-- CreateIndex
CREATE INDEX "VBTSession_deviceType_idx" ON "VBTSession"("deviceType");

-- CreateIndex
CREATE INDEX "VBTSession_clientId_sessionDate_idx" ON "VBTSession"("clientId", "sessionDate");

-- CreateIndex
CREATE INDEX "VBTMeasurement_sessionId_idx" ON "VBTMeasurement"("sessionId");

-- CreateIndex
CREATE INDEX "VBTMeasurement_exerciseId_idx" ON "VBTMeasurement"("exerciseId");

-- CreateIndex
CREATE INDEX "VBTMeasurement_exerciseName_idx" ON "VBTMeasurement"("exerciseName");

-- CreateIndex
CREATE INDEX "VBTMeasurement_sessionId_setNumber_repNumber_idx" ON "VBTMeasurement"("sessionId", "setNumber", "repNumber");

-- CreateIndex
CREATE INDEX "VBTMeasurement_exerciseId_load_idx" ON "VBTMeasurement"("exerciseId", "load");

-- CreateIndex
CREATE INDEX "LoadVelocityProfile_clientId_idx" ON "LoadVelocityProfile"("clientId");

-- CreateIndex
CREATE INDEX "LoadVelocityProfile_exerciseId_idx" ON "LoadVelocityProfile"("exerciseId");

-- CreateIndex
CREATE INDEX "LoadVelocityProfile_isValid_idx" ON "LoadVelocityProfile"("isValid");

-- CreateIndex
CREATE UNIQUE INDEX "LoadVelocityProfile_clientId_exerciseId_key" ON "LoadVelocityProfile"("clientId", "exerciseId");

-- CreateIndex
CREATE INDEX "CalendarEvent_clientId_startDate_endDate_idx" ON "CalendarEvent"("clientId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "CalendarEvent_clientId_type_idx" ON "CalendarEvent"("clientId", "type");

-- CreateIndex
CREATE INDEX "CalendarEvent_externalCalendarId_externalCalendarType_idx" ON "CalendarEvent"("externalCalendarId", "externalCalendarType");

-- CreateIndex
CREATE INDEX "CalendarEvent_createdById_idx" ON "CalendarEvent"("createdById");

-- CreateIndex
CREATE INDEX "CalendarEvent_status_idx" ON "CalendarEvent"("status");

-- CreateIndex
CREATE INDEX "CalendarEvent_lastModifiedById_idx" ON "CalendarEvent"("lastModifiedById");

-- CreateIndex
CREATE INDEX "CalendarEventChange_clientId_notificationRead_createdAt_idx" ON "CalendarEventChange"("clientId", "notificationRead", "createdAt");

-- CreateIndex
CREATE INDEX "CalendarEventChange_eventId_idx" ON "CalendarEventChange"("eventId");

-- CreateIndex
CREATE INDEX "CalendarEventChange_changedById_idx" ON "CalendarEventChange"("changedById");

-- CreateIndex
CREATE INDEX "ExternalCalendarConnection_clientId_idx" ON "ExternalCalendarConnection"("clientId");

-- CreateIndex
CREATE INDEX "ExternalCalendarConnection_userId_idx" ON "ExternalCalendarConnection"("userId");

-- CreateIndex
CREATE INDEX "ExternalCalendarConnection_provider_idx" ON "ExternalCalendarConnection"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCalendarConnection_clientId_provider_calendarId_key" ON "ExternalCalendarConnection"("clientId", "provider", "calendarId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCalendarConnection_userId_provider_calendarId_key" ON "ExternalCalendarConnection"("userId", "provider", "calendarId");

-- CreateIndex
CREATE INDEX "ErgometerFieldTest_clientId_ergometerType_idx" ON "ErgometerFieldTest"("clientId", "ergometerType");

-- CreateIndex
CREATE INDEX "ErgometerFieldTest_clientId_testDate_idx" ON "ErgometerFieldTest"("clientId", "testDate");

-- CreateIndex
CREATE INDEX "ErgometerFieldTest_ergometerType_testProtocol_idx" ON "ErgometerFieldTest"("ergometerType", "testProtocol");

-- CreateIndex
CREATE INDEX "ErgometerFieldTest_confidence_valid_idx" ON "ErgometerFieldTest"("confidence", "valid");

-- CreateIndex
CREATE INDEX "ErgometerThreshold_clientId_ergometerType_idx" ON "ErgometerThreshold"("clientId", "ergometerType");

-- CreateIndex
CREATE INDEX "ErgometerThreshold_testDate_idx" ON "ErgometerThreshold"("testDate");

-- CreateIndex
CREATE UNIQUE INDEX "ErgometerThreshold_clientId_ergometerType_key" ON "ErgometerThreshold"("clientId", "ergometerType");

-- CreateIndex
CREATE INDEX "ErgometerZone_clientId_ergometerType_idx" ON "ErgometerZone"("clientId", "ergometerType");

-- CreateIndex
CREATE INDEX "ErgometerZone_zone_idx" ON "ErgometerZone"("zone");

-- CreateIndex
CREATE INDEX "ErgometerZone_sourceThresholdId_idx" ON "ErgometerZone"("sourceThresholdId");

-- CreateIndex
CREATE INDEX "ErgometerBenchmark_ergometerType_gender_tier_idx" ON "ErgometerBenchmark"("ergometerType", "gender", "tier");

-- CreateIndex
CREATE INDEX "ErgometerBenchmark_sport_gender_idx" ON "ErgometerBenchmark"("sport", "gender");

-- CreateIndex
CREATE UNIQUE INDEX "ErgometerBenchmark_ergometerType_testProtocol_sport_gender__key" ON "ErgometerBenchmark"("ergometerType", "testProtocol", "sport", "gender", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "DeepResearchSession_savedDocumentId_key" ON "DeepResearchSession"("savedDocumentId");

-- CreateIndex
CREATE INDEX "DeepResearchSession_coachId_idx" ON "DeepResearchSession"("coachId");

-- CreateIndex
CREATE INDEX "DeepResearchSession_athleteId_idx" ON "DeepResearchSession"("athleteId");

-- CreateIndex
CREATE INDEX "DeepResearchSession_status_idx" ON "DeepResearchSession"("status");

-- CreateIndex
CREATE INDEX "DeepResearchSession_provider_idx" ON "DeepResearchSession"("provider");

-- CreateIndex
CREATE INDEX "DeepResearchSession_externalJobId_idx" ON "DeepResearchSession"("externalJobId");

-- CreateIndex
CREATE INDEX "DeepResearchSession_createdAt_idx" ON "DeepResearchSession"("createdAt");

-- CreateIndex
CREATE INDEX "DeepResearchProgress_sessionId_idx" ON "DeepResearchProgress"("sessionId");

-- CreateIndex
CREATE INDEX "DeepResearchProgress_timestamp_idx" ON "DeepResearchProgress"("timestamp");

-- CreateIndex
CREATE INDEX "SharedResearchAccess_clientId_idx" ON "SharedResearchAccess"("clientId");

-- CreateIndex
CREATE INDEX "SharedResearchAccess_sharedAt_idx" ON "SharedResearchAccess"("sharedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SharedResearchAccess_sessionId_clientId_key" ON "SharedResearchAccess"("sessionId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "AIUsageBudget_userId_key" ON "AIUsageBudget"("userId");

-- CreateIndex
CREATE INDEX "AIUsageBudget_userId_idx" ON "AIUsageBudget"("userId");

-- CreateIndex
CREATE INDEX "AIUsageBudget_periodStart_idx" ON "AIUsageBudget"("periodStart");

-- CreateIndex
CREATE INDEX "AIUsageLog_userId_idx" ON "AIUsageLog"("userId");

-- CreateIndex
CREATE INDEX "AIUsageLog_category_idx" ON "AIUsageLog"("category");

-- CreateIndex
CREATE INDEX "AIUsageLog_provider_idx" ON "AIUsageLog"("provider");

-- CreateIndex
CREATE INDEX "AIUsageLog_createdAt_idx" ON "AIUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "ProgramGenerationSession_coachId_idx" ON "ProgramGenerationSession"("coachId");

-- CreateIndex
CREATE INDEX "ProgramGenerationSession_conversationId_idx" ON "ProgramGenerationSession"("conversationId");

-- CreateIndex
CREATE INDEX "ProgramGenerationSession_status_idx" ON "ProgramGenerationSession"("status");

-- CreateIndex
CREATE INDEX "ProgramGenerationSession_createdAt_idx" ON "ProgramGenerationSession"("createdAt");

-- CreateIndex
CREATE INDEX "ProgramGenerationProgress_sessionId_idx" ON "ProgramGenerationProgress"("sessionId");

-- CreateIndex
CREATE INDEX "ProgramGenerationProgress_timestamp_idx" ON "ProgramGenerationProgress"("timestamp");

-- CreateIndex
CREATE INDEX "ConversationMemory_clientId_memoryType_idx" ON "ConversationMemory"("clientId", "memoryType");

-- CreateIndex
CREATE INDEX "ConversationMemory_clientId_importance_idx" ON "ConversationMemory"("clientId", "importance");

-- CreateIndex
CREATE INDEX "ConversationMemory_clientId_expiresAt_idx" ON "ConversationMemory"("clientId", "expiresAt");

-- CreateIndex
CREATE INDEX "ConversationSummary_clientId_weekStart_idx" ON "ConversationSummary"("clientId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationSummary_clientId_weekStart_key" ON "ConversationSummary"("clientId", "weekStart");

-- CreateIndex
CREATE INDEX "AIBriefing_clientId_scheduledFor_idx" ON "AIBriefing"("clientId", "scheduledFor");

-- CreateIndex
CREATE INDEX "AIBriefing_clientId_briefingType_scheduledFor_idx" ON "AIBriefing"("clientId", "briefingType", "scheduledFor");

-- CreateIndex
CREATE INDEX "AIBriefing_clientId_readAt_idx" ON "AIBriefing"("clientId", "readAt");

-- CreateIndex
CREATE INDEX "AINotification_clientId_createdAt_idx" ON "AINotification"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "AINotification_clientId_notificationType_idx" ON "AINotification"("clientId", "notificationType");

-- CreateIndex
CREATE INDEX "AINotification_clientId_readAt_idx" ON "AINotification"("clientId", "readAt");

-- CreateIndex
CREATE INDEX "AINotification_clientId_expiresAt_idx" ON "AINotification"("clientId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AINotificationPreferences_clientId_key" ON "AINotificationPreferences"("clientId");

-- CreateIndex
CREATE INDEX "CoachAlert_coachId_status_idx" ON "CoachAlert"("coachId", "status");

-- CreateIndex
CREATE INDEX "CoachAlert_coachId_createdAt_idx" ON "CoachAlert"("coachId", "createdAt");

-- CreateIndex
CREATE INDEX "CoachAlert_clientId_idx" ON "CoachAlert"("clientId");

-- CreateIndex
CREATE INDEX "CoachAlert_alertType_idx" ON "CoachAlert"("alertType");

-- CreateIndex
CREATE INDEX "CoachAlert_severity_idx" ON "CoachAlert"("severity");

-- CreateIndex
CREATE INDEX "LiveHRSession_coachId_idx" ON "LiveHRSession"("coachId");

-- CreateIndex
CREATE INDEX "LiveHRSession_teamId_idx" ON "LiveHRSession"("teamId");

-- CreateIndex
CREATE INDEX "LiveHRSession_status_idx" ON "LiveHRSession"("status");

-- CreateIndex
CREATE INDEX "LiveHRParticipant_sessionId_idx" ON "LiveHRParticipant"("sessionId");

-- CreateIndex
CREATE INDEX "LiveHRParticipant_clientId_idx" ON "LiveHRParticipant"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveHRParticipant_sessionId_clientId_key" ON "LiveHRParticipant"("sessionId", "clientId");

-- CreateIndex
CREATE INDEX "LiveHRReading_participantId_timestamp_idx" ON "LiveHRReading"("participantId", "timestamp");

-- CreateIndex
CREATE INDEX "Habit_clientId_isActive_idx" ON "Habit"("clientId", "isActive");

-- CreateIndex
CREATE INDEX "Habit_category_idx" ON "Habit"("category");

-- CreateIndex
CREATE INDEX "HabitLog_date_idx" ON "HabitLog"("date");

-- CreateIndex
CREATE INDEX "HabitLog_habitId_idx" ON "HabitLog"("habitId");

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_habitId_date_key" ON "HabitLog"("habitId", "date");

-- CreateIndex
CREATE INDEX "ExternalMatchSchedule_clientId_scheduledDate_idx" ON "ExternalMatchSchedule"("clientId", "scheduledDate");

-- CreateIndex
CREATE INDEX "ExternalMatchSchedule_externalSource_idx" ON "ExternalMatchSchedule"("externalSource");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalMatchSchedule_clientId_externalMatchId_externalSour_key" ON "ExternalMatchSchedule"("clientId", "externalMatchId", "externalSource");

-- CreateIndex
CREATE UNIQUE INDEX "SportTest_ergometerTestId_key" ON "SportTest"("ergometerTestId");

-- CreateIndex
CREATE INDEX "SportTest_clientId_testDate_idx" ON "SportTest"("clientId", "testDate");

-- CreateIndex
CREATE INDEX "SportTest_category_protocol_idx" ON "SportTest"("category", "protocol");

-- CreateIndex
CREATE INDEX "SportTest_sport_category_idx" ON "SportTest"("sport", "category");

-- CreateIndex
CREATE INDEX "SportTest_clientId_protocol_idx" ON "SportTest"("clientId", "protocol");

-- CreateIndex
CREATE INDEX "SportTest_benchmarkTier_idx" ON "SportTest"("benchmarkTier");

-- CreateIndex
CREATE INDEX "SportTest_userId_idx" ON "SportTest"("userId");

-- CreateIndex
CREATE INDEX "SportTestBenchmark_protocol_gender_tier_idx" ON "SportTestBenchmark"("protocol", "gender", "tier");

-- CreateIndex
CREATE INDEX "SportTestBenchmark_sport_protocol_idx" ON "SportTestBenchmark"("sport", "protocol");

-- CreateIndex
CREATE UNIQUE INDEX "SportTestBenchmark_protocol_sport_gender_position_tier_ageG_key" ON "SportTestBenchmark"("protocol", "sport", "gender", "position", "tier", "ageGroupMin");

-- CreateIndex
CREATE UNIQUE INDEX "AdHocWorkout_createdWorkoutId_key" ON "AdHocWorkout"("createdWorkoutId");

-- CreateIndex
CREATE INDEX "AdHocWorkout_athleteId_idx" ON "AdHocWorkout"("athleteId");

-- CreateIndex
CREATE INDEX "AdHocWorkout_workoutDate_idx" ON "AdHocWorkout"("workoutDate");

-- CreateIndex
CREATE INDEX "AdHocWorkout_status_idx" ON "AdHocWorkout"("status");

-- CreateIndex
CREATE INDEX "AdHocWorkout_athleteId_status_idx" ON "AdHocWorkout"("athleteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseContract_businessId_key" ON "EnterpriseContract"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseContract_contractNumber_key" ON "EnterpriseContract"("contractNumber");

-- CreateIndex
CREATE INDEX "EnterpriseContract_status_idx" ON "EnterpriseContract"("status");

-- CreateIndex
CREATE INDEX "EnterpriseContract_endDate_idx" ON "EnterpriseContract"("endDate");

-- CreateIndex
CREATE INDEX "EnterpriseContractChange_contractId_createdAt_idx" ON "EnterpriseContractChange"("contractId", "createdAt");

-- CreateIndex
CREATE INDEX "EnterpriseContractChange_changedById_idx" ON "EnterpriseContractChange"("changedById");

-- CreateIndex
CREATE INDEX "PricingTier_tierType_isActive_idx" ON "PricingTier"("tierType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PricingTier_tierType_tierName_key" ON "PricingTier"("tierType", "tierName");

-- CreateIndex
CREATE INDEX "PricingOverride_tierId_idx" ON "PricingOverride"("tierId");

-- CreateIndex
CREATE INDEX "PricingOverride_businessId_idx" ON "PricingOverride"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingOverride_tierId_businessId_key" ON "PricingOverride"("tierId", "businessId");

-- CreateIndex
CREATE INDEX "SystemError_level_createdAt_idx" ON "SystemError"("level", "createdAt");

-- CreateIndex
CREATE INDEX "SystemError_isResolved_createdAt_idx" ON "SystemError"("isResolved", "createdAt");

-- CreateIndex
CREATE INDEX "SystemError_route_idx" ON "SystemError"("route");

-- CreateIndex
CREATE INDEX "SystemError_resolvedById_idx" ON "SystemError"("resolvedById");

-- CreateIndex
CREATE INDEX "SystemMetric_metricName_timestamp_idx" ON "SystemMetric"("metricName", "timestamp");

-- CreateIndex
CREATE INDEX "CoachDecision_coachId_idx" ON "CoachDecision"("coachId");

-- CreateIndex
CREATE INDEX "CoachDecision_athleteId_idx" ON "CoachDecision"("athleteId");

-- CreateIndex
CREATE INDEX "CoachDecision_reasonCategory_idx" ON "CoachDecision"("reasonCategory");

-- CreateIndex
CREATE INDEX "CoachDecision_createdAt_idx" ON "CoachDecision"("createdAt");

-- CreateIndex
CREATE INDEX "CoachDecision_aiSuggestionType_idx" ON "CoachDecision"("aiSuggestionType");

-- CreateIndex
CREATE INDEX "CoachDecision_validated_idx" ON "CoachDecision"("validated");

-- CreateIndex
CREATE INDEX "CoachDecision_workoutId_idx" ON "CoachDecision"("workoutId");

-- CreateIndex
CREATE INDEX "CoachDecision_programId_idx" ON "CoachDecision"("programId");

-- CreateIndex
CREATE INDEX "AIPrediction_athleteId_idx" ON "AIPrediction"("athleteId");

-- CreateIndex
CREATE INDEX "AIPrediction_coachId_idx" ON "AIPrediction"("coachId");

-- CreateIndex
CREATE INDEX "AIPrediction_predictionType_idx" ON "AIPrediction"("predictionType");

-- CreateIndex
CREATE INDEX "AIPrediction_createdAt_idx" ON "AIPrediction"("createdAt");

-- CreateIndex
CREATE INDEX "AIPrediction_validated_idx" ON "AIPrediction"("validated");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionValidation_predictionId_key" ON "PredictionValidation"("predictionId");

-- CreateIndex
CREATE INDEX "PredictionValidation_predictionId_idx" ON "PredictionValidation"("predictionId");

-- CreateIndex
CREATE INDEX "PredictionValidation_occurredAt_idx" ON "PredictionValidation"("occurredAt");

-- CreateIndex
CREATE INDEX "PredictionValidation_validationSource_idx" ON "PredictionValidation"("validationSource");

-- CreateIndex
CREATE UNIQUE INDEX "DataMoatConsent_athleteId_key" ON "DataMoatConsent"("athleteId");

-- CreateIndex
CREATE INDEX "DataMoatConsent_athleteId_idx" ON "DataMoatConsent"("athleteId");

-- CreateIndex
CREATE INDEX "TrainingPeriodOutcome_athleteId_idx" ON "TrainingPeriodOutcome"("athleteId");

-- CreateIndex
CREATE INDEX "TrainingPeriodOutcome_coachId_idx" ON "TrainingPeriodOutcome"("coachId");

-- CreateIndex
CREATE INDEX "TrainingPeriodOutcome_programId_idx" ON "TrainingPeriodOutcome"("programId");

-- CreateIndex
CREATE INDEX "TrainingPeriodOutcome_startDate_endDate_idx" ON "TrainingPeriodOutcome"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "TrainingPeriodOutcome_outcomeClass_idx" ON "TrainingPeriodOutcome"("outcomeClass");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingFingerprint_periodOutcomeId_key" ON "TrainingFingerprint"("periodOutcomeId");

-- CreateIndex
CREATE INDEX "TrainingFingerprint_periodOutcomeId_idx" ON "TrainingFingerprint"("periodOutcomeId");

-- CreateIndex
CREATE INDEX "TrainingFingerprint_zone2Percent_idx" ON "TrainingFingerprint"("zone2Percent");

-- CreateIndex
CREATE INDEX "TrainingFingerprint_avgWeeklyHours_idx" ON "TrainingFingerprint"("avgWeeklyHours");

-- CreateIndex
CREATE INDEX "ExerciseEffectiveness_exerciseId_idx" ON "ExerciseEffectiveness"("exerciseId");

-- CreateIndex
CREATE INDEX "ExerciseEffectiveness_athleteId_idx" ON "ExerciseEffectiveness"("athleteId");

-- CreateIndex
CREATE INDEX "ExerciseEffectiveness_targetMetric_idx" ON "ExerciseEffectiveness"("targetMetric");

-- CreateIndex
CREATE INDEX "ExerciseEffectiveness_effectivenessScore_idx" ON "ExerciseEffectiveness"("effectivenessScore");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseEffectiveness_exerciseId_athleteId_targetMetric_bas_key" ON "ExerciseEffectiveness"("exerciseId", "athleteId", "targetMetric", "baselineDate");

-- CreateIndex
CREATE INDEX "ExerciseOutcomePattern_exerciseId_idx" ON "ExerciseOutcomePattern"("exerciseId");

-- CreateIndex
CREATE INDEX "ExerciseOutcomePattern_targetMetric_idx" ON "ExerciseOutcomePattern"("targetMetric");

-- CreateIndex
CREATE INDEX "ExerciseOutcomePattern_avgImprovement_idx" ON "ExerciseOutcomePattern"("avgImprovement");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseOutcomePattern_exerciseId_targetMetric_key" ON "ExerciseOutcomePattern"("exerciseId", "targetMetric");

-- CreateIndex
CREATE INDEX "TestPredictiveValidation_athleteId_idx" ON "TestPredictiveValidation"("athleteId");

-- CreateIndex
CREATE INDEX "TestPredictiveValidation_testType_idx" ON "TestPredictiveValidation"("testType");

-- CreateIndex
CREATE INDEX "TestPredictiveValidation_predictedMetric_idx" ON "TestPredictiveValidation"("predictedMetric");

-- CreateIndex
CREATE INDEX "TestPredictiveValidation_validationDate_idx" ON "TestPredictiveValidation"("validationDate");

-- CreateIndex
CREATE INDEX "AthleteCohort_sport_idx" ON "AthleteCohort"("sport");

-- CreateIndex
CREATE INDEX "AthleteCohort_experienceLevel_idx" ON "AthleteCohort"("experienceLevel");

-- CreateIndex
CREATE INDEX "AthleteCohort_sampleSize_idx" ON "AthleteCohort"("sampleSize");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteCohort_sport_ageRangeLower_ageRangeUpper_experienceL_key" ON "AthleteCohort"("sport", "ageRangeLower", "ageRangeUpper", "experienceLevel", "gender");

-- CreateIndex
CREATE INDEX "BenchmarkComparison_athleteId_idx" ON "BenchmarkComparison"("athleteId");

-- CreateIndex
CREATE INDEX "BenchmarkComparison_cohortId_idx" ON "BenchmarkComparison"("cohortId");

-- CreateIndex
CREATE INDEX "BenchmarkComparison_metricName_idx" ON "BenchmarkComparison"("metricName");

-- CreateIndex
CREATE INDEX "BenchmarkComparison_cohortPercentile_idx" ON "BenchmarkComparison"("cohortPercentile");

-- CreateIndex
CREATE INDEX "PerformancePattern_patternName_idx" ON "PerformancePattern"("patternName");

-- CreateIndex
CREATE INDEX "PerformancePattern_outcomeType_idx" ON "PerformancePattern"("outcomeType");

-- CreateIndex
CREATE INDEX "PerformancePattern_confidenceLevel_idx" ON "PerformancePattern"("confidenceLevel");

-- CreateIndex
CREATE INDEX "PerformancePattern_isActive_isPublished_idx" ON "PerformancePattern"("isActive", "isPublished");

-- CreateIndex
CREATE INDEX "AthletePatternMatch_athleteId_idx" ON "AthletePatternMatch"("athleteId");

-- CreateIndex
CREATE INDEX "AthletePatternMatch_patternId_idx" ON "AthletePatternMatch"("patternId");

-- CreateIndex
CREATE INDEX "AthletePatternMatch_matchScore_idx" ON "AthletePatternMatch"("matchScore");

-- CreateIndex
CREATE INDEX "AthletePatternMatch_outcomeTracked_idx" ON "AthletePatternMatch"("outcomeTracked");

-- CreateIndex
CREATE UNIQUE INDEX "AthletePatternMatch_athleteId_patternId_key" ON "AthletePatternMatch"("athleteId", "patternId");

-- CreateIndex
CREATE INDEX "AIFeedbackLoop_feedbackCategory_idx" ON "AIFeedbackLoop"("feedbackCategory");

-- CreateIndex
CREATE INDEX "AIFeedbackLoop_lessonStatus_idx" ON "AIFeedbackLoop"("lessonStatus");

-- CreateIndex
CREATE INDEX "AIFeedbackLoop_lessonCategory_idx" ON "AIFeedbackLoop"("lessonCategory");

-- CreateIndex
CREATE INDEX "AIFeedbackLoop_createdAt_idx" ON "AIFeedbackLoop"("createdAt");

-- CreateIndex
CREATE INDEX "AIFeedbackLoop_coachDecisionId_idx" ON "AIFeedbackLoop"("coachDecisionId");

-- CreateIndex
CREATE INDEX "AIFeedbackLoop_predictionId_idx" ON "AIFeedbackLoop"("predictionId");

-- CreateIndex
CREATE INDEX "AIFeedbackLoop_modelVersionId_idx" ON "AIFeedbackLoop"("modelVersionId");

-- CreateIndex
CREATE INDEX "AIFeedbackLoop_trainingOutcomeId_idx" ON "AIFeedbackLoop"("trainingOutcomeId");

-- CreateIndex
CREATE INDEX "AIFeedbackLoop_patternId_idx" ON "AIFeedbackLoop"("patternId");

-- CreateIndex
CREATE INDEX "AIModelVersion_modelType_idx" ON "AIModelVersion"("modelType");

-- CreateIndex
CREATE INDEX "AIModelVersion_status_idx" ON "AIModelVersion"("status");

-- CreateIndex
CREATE INDEX "AIModelVersion_deployedAt_idx" ON "AIModelVersion"("deployedAt");

-- CreateIndex
CREATE INDEX "AIModelVersion_versionName_idx" ON "AIModelVersion"("versionName");

-- CreateIndex
CREATE INDEX "AIModelVersion_previousVersionId_idx" ON "AIModelVersion"("previousVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "AIModelVersion_modelType_versionNumber_key" ON "AIModelVersion"("modelType", "versionNumber");

-- CreateIndex
CREATE INDEX "AccuracySnapshot_snapshotType_idx" ON "AccuracySnapshot"("snapshotType");

-- CreateIndex
CREATE INDEX "AccuracySnapshot_createdAt_idx" ON "AccuracySnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "AccuracySnapshot_isPublic_idx" ON "AccuracySnapshot"("isPublic");

-- CreateIndex
CREATE INDEX "AccuracySnapshot_previousSnapshotId_idx" ON "AccuracySnapshot"("previousSnapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "AccuracySnapshot_periodStart_periodEnd_snapshotType_key" ON "AccuracySnapshot"("periodStart", "periodEnd", "snapshotType");

-- CreateIndex
CREATE INDEX "AIPromptTemplate_promptName_idx" ON "AIPromptTemplate"("promptName");

-- CreateIndex
CREATE INDEX "AIPromptTemplate_promptCategory_idx" ON "AIPromptTemplate"("promptCategory");

-- CreateIndex
CREATE INDEX "AIPromptTemplate_isActive_idx" ON "AIPromptTemplate"("isActive");

-- CreateIndex
CREATE INDEX "AIPromptTemplate_previousVersionId_idx" ON "AIPromptTemplate"("previousVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "AIPromptTemplate_promptName_version_key" ON "AIPromptTemplate"("promptName", "version");

-- CreateIndex
CREATE INDEX "AgilityDrill_category_idx" ON "AgilityDrill"("category");

-- CreateIndex
CREATE INDEX "AgilityDrill_coachId_idx" ON "AgilityDrill"("coachId");

-- CreateIndex
CREATE INDEX "AgilityDrill_isSystemDrill_idx" ON "AgilityDrill"("isSystemDrill");

-- CreateIndex
CREATE INDEX "AgilityDrill_difficultyLevel_idx" ON "AgilityDrill"("difficultyLevel");

-- CreateIndex
CREATE INDEX "AgilityDrill_minDevelopmentStage_idx" ON "AgilityDrill"("minDevelopmentStage");

-- CreateIndex
CREATE INDEX "AgilityDrill_progressionDrillId_idx" ON "AgilityDrill"("progressionDrillId");

-- CreateIndex
CREATE INDEX "AgilityDrill_regressionDrillId_idx" ON "AgilityDrill"("regressionDrillId");

-- CreateIndex
CREATE INDEX "AgilityWorkout_coachId_idx" ON "AgilityWorkout"("coachId");

-- CreateIndex
CREATE INDEX "AgilityWorkout_format_idx" ON "AgilityWorkout"("format");

-- CreateIndex
CREATE INDEX "AgilityWorkout_developmentStage_idx" ON "AgilityWorkout"("developmentStage");

-- CreateIndex
CREATE INDEX "AgilityWorkout_isTemplate_idx" ON "AgilityWorkout"("isTemplate");

-- CreateIndex
CREATE INDEX "AgilityWorkout_isPublic_idx" ON "AgilityWorkout"("isPublic");

-- CreateIndex
CREATE INDEX "AgilityWorkoutDrill_workoutId_idx" ON "AgilityWorkoutDrill"("workoutId");

-- CreateIndex
CREATE INDEX "AgilityWorkoutDrill_drillId_idx" ON "AgilityWorkoutDrill"("drillId");

-- CreateIndex
CREATE UNIQUE INDEX "AgilityWorkoutDrill_workoutId_order_key" ON "AgilityWorkoutDrill"("workoutId", "order");

-- CreateIndex
CREATE INDEX "AgilityWorkoutAssignment_workoutId_idx" ON "AgilityWorkoutAssignment"("workoutId");

-- CreateIndex
CREATE INDEX "AgilityWorkoutAssignment_athleteId_idx" ON "AgilityWorkoutAssignment"("athleteId");

-- CreateIndex
CREATE INDEX "AgilityWorkoutAssignment_assignedDate_idx" ON "AgilityWorkoutAssignment"("assignedDate");

-- CreateIndex
CREATE INDEX "AgilityWorkoutAssignment_status_idx" ON "AgilityWorkoutAssignment"("status");

-- CreateIndex
CREATE INDEX "AgilityWorkoutAssignment_teamBroadcastId_idx" ON "AgilityWorkoutAssignment"("teamBroadcastId");

-- CreateIndex
CREATE INDEX "AgilityWorkoutAssignment_locationId_idx" ON "AgilityWorkoutAssignment"("locationId");

-- CreateIndex
CREATE INDEX "AgilityWorkoutAssignment_startTime_idx" ON "AgilityWorkoutAssignment"("startTime");

-- CreateIndex
CREATE INDEX "AgilityWorkoutAssignment_calendarEventId_idx" ON "AgilityWorkoutAssignment"("calendarEventId");

-- CreateIndex
CREATE INDEX "AgilityWorkoutAssignment_responsibleCoachId_idx" ON "AgilityWorkoutAssignment"("responsibleCoachId");

-- CreateIndex
CREATE UNIQUE INDEX "AgilityWorkoutAssignment_workoutId_athleteId_assignedDate_key" ON "AgilityWorkoutAssignment"("workoutId", "athleteId", "assignedDate");

-- CreateIndex
CREATE INDEX "AgilityWorkoutResult_workoutId_idx" ON "AgilityWorkoutResult"("workoutId");

-- CreateIndex
CREATE INDEX "AgilityWorkoutResult_athleteId_idx" ON "AgilityWorkoutResult"("athleteId");

-- CreateIndex
CREATE INDEX "AgilityWorkoutResult_completedAt_idx" ON "AgilityWorkoutResult"("completedAt");

-- CreateIndex
CREATE INDEX "TimingGateSession_coachId_idx" ON "TimingGateSession"("coachId");

-- CreateIndex
CREATE INDEX "TimingGateSession_sessionDate_idx" ON "TimingGateSession"("sessionDate");

-- CreateIndex
CREATE INDEX "TimingGateSession_importSource_idx" ON "TimingGateSession"("importSource");

-- CreateIndex
CREATE INDEX "TimingGateSession_locationId_idx" ON "TimingGateSession"("locationId");

-- CreateIndex
CREATE INDEX "TimingGateResult_sessionId_idx" ON "TimingGateResult"("sessionId");

-- CreateIndex
CREATE INDEX "TimingGateResult_athleteId_idx" ON "TimingGateResult"("athleteId");

-- CreateIndex
CREATE INDEX "TimingGateResult_testProtocol_idx" ON "TimingGateResult"("testProtocol");

-- CreateIndex
CREATE INDEX "TimingGateResult_valid_idx" ON "TimingGateResult"("valid");

-- CreateIndex
CREATE INDEX "VoiceWorkoutSession_coachId_idx" ON "VoiceWorkoutSession"("coachId");

-- CreateIndex
CREATE INDEX "VoiceWorkoutSession_status_idx" ON "VoiceWorkoutSession"("status");

-- CreateIndex
CREATE INDEX "VoiceWorkoutSession_createdAt_idx" ON "VoiceWorkoutSession"("createdAt");

-- CreateIndex
CREATE INDEX "VoiceWorkoutSession_strengthSessionId_idx" ON "VoiceWorkoutSession"("strengthSessionId");

-- CreateIndex
CREATE INDEX "VoiceWorkoutSession_cardioSessionId_idx" ON "VoiceWorkoutSession"("cardioSessionId");

-- CreateIndex
CREATE INDEX "VoiceWorkoutSession_hybridWorkoutId_idx" ON "VoiceWorkoutSession"("hybridWorkoutId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentPreferences_clientId_key" ON "AgentPreferences"("clientId");

-- CreateIndex
CREATE INDEX "AgentPreferences_clientId_idx" ON "AgentPreferences"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentConsent_clientId_key" ON "AgentConsent"("clientId");

-- CreateIndex
CREATE INDEX "AgentConsent_clientId_idx" ON "AgentConsent"("clientId");

-- CreateIndex
CREATE INDEX "AgentPerception_clientId_perceivedAt_idx" ON "AgentPerception"("clientId", "perceivedAt");

-- CreateIndex
CREATE INDEX "AgentPerception_clientId_idx" ON "AgentPerception"("clientId");

-- CreateIndex
CREATE INDEX "AgentAction_clientId_status_idx" ON "AgentAction"("clientId", "status");

-- CreateIndex
CREATE INDEX "AgentAction_status_expiresAt_idx" ON "AgentAction"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "AgentAction_clientId_idx" ON "AgentAction"("clientId");

-- CreateIndex
CREATE INDEX "AgentAction_perceptionId_idx" ON "AgentAction"("perceptionId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentOversightItem_actionId_key" ON "AgentOversightItem"("actionId");

-- CreateIndex
CREATE INDEX "AgentOversightItem_coachId_status_idx" ON "AgentOversightItem"("coachId", "status");

-- CreateIndex
CREATE INDEX "AgentOversightItem_coachId_idx" ON "AgentOversightItem"("coachId");

-- CreateIndex
CREATE INDEX "AgentOversightItem_clientId_idx" ON "AgentOversightItem"("clientId");

-- CreateIndex
CREATE INDEX "AgentLearningEvent_eventType_idx" ON "AgentLearningEvent"("eventType");

-- CreateIndex
CREATE INDEX "AgentLearningEvent_processedForTraining_idx" ON "AgentLearningEvent"("processedForTraining");

-- CreateIndex
CREATE INDEX "AgentLearningEvent_clientId_idx" ON "AgentLearningEvent"("clientId");

-- CreateIndex
CREATE INDEX "AgentAuditLog_clientId_createdAt_idx" ON "AgentAuditLog"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentAuditLog_action_idx" ON "AgentAuditLog"("action");

-- CreateIndex
CREATE INDEX "AgentAuditLog_clientId_idx" ON "AgentAuditLog"("clientId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_targetId_targetType_idx" ON "AuditLog"("targetId", "targetType");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_userId_key" ON "CoachProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_slug_key" ON "CoachProfile"("slug");

-- CreateIndex
CREATE INDEX "CoachProfile_slug_idx" ON "CoachProfile"("slug");

-- CreateIndex
CREATE INDEX "CoachProfile_isPublic_isAcceptingClients_idx" ON "CoachProfile"("isPublic", "isAcceptingClients");

-- CreateIndex
CREATE INDEX "CoachProfile_isVerified_idx" ON "CoachProfile"("isVerified");

-- CreateIndex
CREATE INDEX "CoachRequest_coachUserId_status_idx" ON "CoachRequest"("coachUserId", "status");

-- CreateIndex
CREATE INDEX "CoachRequest_expiresAt_idx" ON "CoachRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "CoachRequest_athleteClientId_idx" ON "CoachRequest"("athleteClientId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachRequest_athleteClientId_coachUserId_key" ON "CoachRequest"("athleteClientId", "coachUserId");

-- CreateIndex
CREATE INDEX "CoachAgreement_coachUserId_status_idx" ON "CoachAgreement"("coachUserId", "status");

-- CreateIndex
CREATE INDEX "CoachAgreement_athleteClientId_idx" ON "CoachAgreement"("athleteClientId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachAgreement_athleteClientId_coachUserId_key" ON "CoachAgreement"("athleteClientId", "coachUserId");

-- CreateIndex
CREATE INDEX "CoachReview_coachProfileId_isPublic_idx" ON "CoachReview"("coachProfileId", "isPublic");

-- CreateIndex
CREATE INDEX "CoachReview_athleteClientId_idx" ON "CoachReview"("athleteClientId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachReview_coachProfileId_athleteClientId_key" ON "CoachReview"("coachProfileId", "athleteClientId");

-- CreateIndex
CREATE INDEX "CoachEarnings_coachUserId_status_idx" ON "CoachEarnings"("coachUserId", "status");

-- CreateIndex
CREATE INDEX "CoachEarnings_periodStart_idx" ON "CoachEarnings"("periodStart");

-- CreateIndex
CREATE INDEX "CoachEarnings_athleteClientId_idx" ON "CoachEarnings"("athleteClientId");

-- CreateIndex
CREATE INDEX "KnowledgeSkill_category_idx" ON "KnowledgeSkill"("category");

-- CreateIndex
CREATE INDEX "KnowledgeSkill_isActive_idx" ON "KnowledgeSkill"("isActive");

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_type_idx" ON "StripeWebhookEvent"("type");

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_createdAt_idx" ON "StripeWebhookEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredByBusinessId_fkey" FOREIGN KEY ("referredByBusinessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_selfAthleteClientId_fkey" FOREIGN KEY ("selfAthleteClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamWorkoutBroadcast" ADD CONSTRAINT "TeamWorkoutBroadcast_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamWorkoutBroadcast" ADD CONSTRAINT "TeamWorkoutBroadcast_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamWorkoutBroadcast" ADD CONSTRAINT "TeamWorkoutBroadcast_strengthSessionId_fkey" FOREIGN KEY ("strengthSessionId") REFERENCES "StrengthSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamWorkoutBroadcast" ADD CONSTRAINT "TeamWorkoutBroadcast_cardioSessionId_fkey" FOREIGN KEY ("cardioSessionId") REFERENCES "CardioSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamWorkoutBroadcast" ADD CONSTRAINT "TeamWorkoutBroadcast_hybridWorkoutId_fkey" FOREIGN KEY ("hybridWorkoutId") REFERENCES "HybridWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamWorkoutBroadcast" ADD CONSTRAINT "TeamWorkoutBroadcast_agilityWorkoutId_fkey" FOREIGN KEY ("agilityWorkoutId") REFERENCES "AgilityWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamWorkoutBroadcast" ADD CONSTRAINT "TeamWorkoutBroadcast_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "Tester"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestStage" ADD CONSTRAINT "TestStage_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "ReferralCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSubscription" ADD CONSTRAINT "AthleteSubscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSubscription" ADD CONSTRAINT "AthleteSubscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSubscription" ADD CONSTRAINT "AthleteSubscription_assignedCoachId_fkey" FOREIGN KEY ("assignedCoachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessApiKey" ADD CONSTRAINT "BusinessApiKey_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerReferral" ADD CONSTRAINT "PartnerReferral_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerReferral" ADD CONSTRAINT "PartnerReferral_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tester" ADD CONSTRAINT "Tester_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tester" ADD CONSTRAINT "Tester_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationEquipment" ADD CONSTRAINT "LocationEquipment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationEquipment" ADD CONSTRAINT "LocationEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationService" ADD CONSTRAINT "LocationService_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationStaff" ADD CONSTRAINT "LocationStaff_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationStaff" ADD CONSTRAINT "LocationStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessFeature" ADD CONSTRAINT "BusinessFeature_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationToken" ADD CONSTRAINT "IntegrationToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StravaActivity" ADD CONSTRAINT "StravaActivity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarminActivity" ADD CONSTRAINT "GarminActivity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concept2Result" ADD CONSTRAINT "Concept2Result_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteAccount" ADD CONSTRAINT "AthleteAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteAccount" ADD CONSTRAINT "AthleteAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteAccount" ADD CONSTRAINT "AthleteAccount_preferredLocationId_fkey" FOREIGN KEY ("preferredLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgram" ADD CONSTRAINT "TrainingProgram_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgram" ADD CONSTRAINT "TrainingProgram_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgram" ADD CONSTRAINT "TrainingProgram_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingWeek" ADD CONSTRAINT "TrainingWeek_programId_fkey" FOREIGN KEY ("programId") REFERENCES "TrainingProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingDay" ADD CONSTRAINT "TrainingDay_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "TrainingWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "TrainingDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSegment" ADD CONSTRAINT "WorkoutSegment_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSegment" ADD CONSTRAINT "WorkoutSegment_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_progressionExerciseId_fkey" FOREIGN KEY ("progressionExerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_regressionExerciseId_fkey" FOREIGN KEY ("regressionExerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_workoutLogId_fkey" FOREIGN KEY ("workoutLogId") REFERENCES "WorkoutLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "WorkoutSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "StrengthSessionAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThresholdCalculation" ADD CONSTRAINT "ThresholdCalculation_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteProfile" ADD CONSTRAINT "AthleteProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCheckIn" ADD CONSTRAINT "DailyCheckIn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMetrics" ADD CONSTRAINT "DailyMetrics_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingLoad" ADD CONSTRAINT "TrainingLoad_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyTrainingSummary" ADD CONSTRAINT "WeeklyTrainingSummary_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyTrainingSummary" ADD CONSTRAINT "MonthlyTrainingSummary_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityHRZoneDistribution" ADD CONSTRAINT "ActivityHRZoneDistribution_stravaActivityId_fkey" FOREIGN KEY ("stravaActivityId") REFERENCES "StravaActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityHRZoneDistribution" ADD CONSTRAINT "ActivityHRZoneDistribution_garminActivityId_fkey" FOREIGN KEY ("garminActivityId") REFERENCES "GarminActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YearlySummary" ADD CONSTRAINT "YearlySummary_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgramEngine" ADD CONSTRAINT "TrainingProgramEngine_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldTest" ADD CONSTRAINT "FieldTest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelfReportedLactate" ADD CONSTRAINT "SelfReportedLactate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceCalendar" ADD CONSTRAINT "RaceCalendar_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Race" ADD CONSTRAINT "Race_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "RaceCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Race" ADD CONSTRAINT "Race_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InjuryAssessment" ADD CONSTRAINT "InjuryAssessment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InjuryAssessment" ADD CONSTRAINT "InjuryAssessment_assessedById_fkey" FOREIGN KEY ("assessedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysioAssignment" ADD CONSTRAINT "PhysioAssignment_physioUserId_fkey" FOREIGN KEY ("physioUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysioAssignment" ADD CONSTRAINT "PhysioAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysioAssignment" ADD CONSTRAINT "PhysioAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysioAssignment" ADD CONSTRAINT "PhysioAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysioAssignment" ADD CONSTRAINT "PhysioAssignment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysioAssignment" ADD CONSTRAINT "PhysioAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_physioUserId_fkey" FOREIGN KEY ("physioUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_injuryId_fkey" FOREIGN KEY ("injuryId") REFERENCES "InjuryAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RehabProgram" ADD CONSTRAINT "RehabProgram_physioUserId_fkey" FOREIGN KEY ("physioUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RehabProgram" ADD CONSTRAINT "RehabProgram_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RehabProgram" ADD CONSTRAINT "RehabProgram_injuryId_fkey" FOREIGN KEY ("injuryId") REFERENCES "InjuryAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RehabExercise" ADD CONSTRAINT "RehabExercise_programId_fkey" FOREIGN KEY ("programId") REFERENCES "RehabProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RehabExercise" ADD CONSTRAINT "RehabExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RehabMilestone" ADD CONSTRAINT "RehabMilestone_programId_fkey" FOREIGN KEY ("programId") REFERENCES "RehabProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RehabProgressLog" ADD CONSTRAINT "RehabProgressLog_programId_fkey" FOREIGN KEY ("programId") REFERENCES "RehabProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RehabProgressLog" ADD CONSTRAINT "RehabProgressLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRestriction" ADD CONSTRAINT "TrainingRestriction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRestriction" ADD CONSTRAINT "TrainingRestriction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRestriction" ADD CONSTRAINT "TrainingRestriction_injuryId_fkey" FOREIGN KEY ("injuryId") REFERENCES "InjuryAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementScreen" ADD CONSTRAINT "MovementScreen_physioUserId_fkey" FOREIGN KEY ("physioUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementScreen" ADD CONSTRAINT "MovementScreen_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcuteInjuryReport" ADD CONSTRAINT "AcuteInjuryReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcuteInjuryReport" ADD CONSTRAINT "AcuteInjuryReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcuteInjuryReport" ADD CONSTRAINT "AcuteInjuryReport_injuryId_fkey" FOREIGN KEY ("injuryId") REFERENCES "InjuryAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTeamThread" ADD CONSTRAINT "CareTeamThread_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTeamThread" ADD CONSTRAINT "CareTeamThread_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTeamThread" ADD CONSTRAINT "CareTeamThread_injuryId_fkey" FOREIGN KEY ("injuryId") REFERENCES "InjuryAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTeamThread" ADD CONSTRAINT "CareTeamThread_rehabProgramId_fkey" FOREIGN KEY ("rehabProgramId") REFERENCES "RehabProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTeamThread" ADD CONSTRAINT "CareTeamThread_restrictionId_fkey" FOREIGN KEY ("restrictionId") REFERENCES "TrainingRestriction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTeamMessage" ADD CONSTRAINT "CareTeamMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CareTeamThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTeamMessage" ADD CONSTRAINT "CareTeamMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTeamParticipant" ADD CONSTRAINT "CareTeamParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CareTeamThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTeamParticipant" ADD CONSTRAINT "CareTeamParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossTrainingSession" ADD CONSTRAINT "CrossTrainingSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrengthTrainingSession" ADD CONSTRAINT "StrengthTrainingSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionTracking" ADD CONSTRAINT "ProgressionTracking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionTracking" ADD CONSTRAINT "ProgressionTracking_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneRepMaxHistory" ADD CONSTRAINT "OneRepMaxHistory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneRepMaxHistory" ADD CONSTRAINT "OneRepMaxHistory_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_linkedPredictionId_fkey" FOREIGN KEY ("linkedPredictionId") REFERENCES "AIPrediction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportPerformance" ADD CONSTRAINT "SportPerformance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportProfile" ADD CONSTRAINT "SportProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachDocument" ADD CONSTRAINT "CoachDocument_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CoachDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIGeneratedProgram" ADD CONSTRAINT "AIGeneratedProgram_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIGeneratedWOD" ADD CONSTRAINT "AIGeneratedWOD_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAnalysis" ADD CONSTRAINT "VideoAnalysis_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAnalysis" ADD CONSTRAINT "VideoAnalysis_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAnalysis" ADD CONSTRAINT "VideoAnalysis_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyComposition" ADD CONSTRAINT "BodyComposition_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserApiKey" ADD CONSTRAINT "UserApiKey_defaultModelId_fkey" FOREIGN KEY ("defaultModelId") REFERENCES "AIModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserApiKey" ADD CONSTRAINT "UserApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunningGaitAnalysis" ADD CONSTRAINT "RunningGaitAnalysis_videoAnalysisId_fkey" FOREIGN KEY ("videoAnalysisId") REFERENCES "VideoAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkiingTechniqueAnalysis" ADD CONSTRAINT "SkiingTechniqueAnalysis_videoAnalysisId_fkey" FOREIGN KEY ("videoAnalysisId") REFERENCES "VideoAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HyroxStationAnalysis" ADD CONSTRAINT "HyroxStationAnalysis_videoAnalysisId_fkey" FOREIGN KEY ("videoAnalysisId") REFERENCES "VideoAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioJournal" ADD CONSTRAINT "AudioJournal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioJournal" ADD CONSTRAINT "AudioJournal_dailyCheckInId_fkey" FOREIGN KEY ("dailyCheckInId") REFERENCES "DailyCheckIn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenstrualCycle" ADD CONSTRAINT "MenstrualCycle_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenstrualDailyLog" ADD CONSTRAINT "MenstrualDailyLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenstrualDailyLog" ADD CONSTRAINT "MenstrualDailyLog_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "MenstrualCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridWorkout" ADD CONSTRAINT "HybridWorkout_rxVersionId_fkey" FOREIGN KEY ("rxVersionId") REFERENCES "HybridWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridWorkout" ADD CONSTRAINT "HybridWorkout_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridWorkout" ADD CONSTRAINT "HybridWorkout_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "HybridWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridWorkoutVersion" ADD CONSTRAINT "HybridWorkoutVersion_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "HybridWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridMovement" ADD CONSTRAINT "HybridMovement_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "HybridWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridMovement" ADD CONSTRAINT "HybridMovement_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridWorkoutResult" ADD CONSTRAINT "HybridWorkoutResult_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "HybridWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridWorkoutResult" ADD CONSTRAINT "HybridWorkoutResult_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridWorkoutAssignment" ADD CONSTRAINT "HybridWorkoutAssignment_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "HybridWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridWorkoutAssignment" ADD CONSTRAINT "HybridWorkoutAssignment_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridWorkoutAssignment" ADD CONSTRAINT "HybridWorkoutAssignment_teamBroadcastId_fkey" FOREIGN KEY ("teamBroadcastId") REFERENCES "TeamWorkoutBroadcast"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridWorkoutAssignment" ADD CONSTRAINT "HybridWorkoutAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridWorkoutAssignment" ADD CONSTRAINT "HybridWorkoutAssignment_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridWorkoutAssignment" ADD CONSTRAINT "HybridWorkoutAssignment_responsibleCoachId_fkey" FOREIGN KEY ("responsibleCoachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridWorkoutLog" ADD CONSTRAINT "HybridWorkoutLog_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "HybridWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridWorkoutLog" ADD CONSTRAINT "HybridWorkoutLog_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HybridRoundLog" ADD CONSTRAINT "HybridRoundLog_hybridWorkoutLogId_fkey" FOREIGN KEY ("hybridWorkoutLogId") REFERENCES "HybridWorkoutLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrengthSession" ADD CONSTRAINT "StrengthSession_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrengthSessionAssignment" ADD CONSTRAINT "StrengthSessionAssignment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StrengthSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrengthSessionAssignment" ADD CONSTRAINT "StrengthSessionAssignment_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrengthSessionAssignment" ADD CONSTRAINT "StrengthSessionAssignment_teamBroadcastId_fkey" FOREIGN KEY ("teamBroadcastId") REFERENCES "TeamWorkoutBroadcast"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrengthSessionAssignment" ADD CONSTRAINT "StrengthSessionAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrengthSessionAssignment" ADD CONSTRAINT "StrengthSessionAssignment_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrengthSessionAssignment" ADD CONSTRAINT "StrengthSessionAssignment_responsibleCoachId_fkey" FOREIGN KEY ("responsibleCoachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrengthTemplate" ADD CONSTRAINT "StrengthTemplate_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardioSession" ADD CONSTRAINT "CardioSession_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardioSessionAssignment" ADD CONSTRAINT "CardioSessionAssignment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CardioSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardioSessionAssignment" ADD CONSTRAINT "CardioSessionAssignment_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardioSessionAssignment" ADD CONSTRAINT "CardioSessionAssignment_teamBroadcastId_fkey" FOREIGN KEY ("teamBroadcastId") REFERENCES "TeamWorkoutBroadcast"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardioSessionAssignment" ADD CONSTRAINT "CardioSessionAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardioSessionAssignment" ADD CONSTRAINT "CardioSessionAssignment_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardioSessionAssignment" ADD CONSTRAINT "CardioSessionAssignment_responsibleCoachId_fkey" FOREIGN KEY ("responsibleCoachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardioSessionLog" ADD CONSTRAINT "CardioSessionLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CardioSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardioSessionLog" ADD CONSTRAINT "CardioSessionLog_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardioSegmentLog" ADD CONSTRAINT "CardioSegmentLog_cardioSessionLogId_fkey" FOREIGN KEY ("cardioSessionLogId") REFERENCES "CardioSessionLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietaryPreferences" ADD CONSTRAINT "DietaryPreferences_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionGoal" ADD CONSTRAINT "NutritionGoal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VBTSession" ADD CONSTRAINT "VBTSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VBTMeasurement" ADD CONSTRAINT "VBTMeasurement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VBTSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VBTMeasurement" ADD CONSTRAINT "VBTMeasurement_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadVelocityProfile" ADD CONSTRAINT "LoadVelocityProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadVelocityProfile" ADD CONSTRAINT "LoadVelocityProfile_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEventChange" ADD CONSTRAINT "CalendarEventChange_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEventChange" ADD CONSTRAINT "CalendarEventChange_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEventChange" ADD CONSTRAINT "CalendarEventChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCalendarConnection" ADD CONSTRAINT "ExternalCalendarConnection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCalendarConnection" ADD CONSTRAINT "ExternalCalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErgometerFieldTest" ADD CONSTRAINT "ErgometerFieldTest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErgometerThreshold" ADD CONSTRAINT "ErgometerThreshold_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErgometerZone" ADD CONSTRAINT "ErgometerZone_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErgometerZone" ADD CONSTRAINT "ErgometerZone_sourceThresholdId_fkey" FOREIGN KEY ("sourceThresholdId") REFERENCES "ErgometerThreshold"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeepResearchSession" ADD CONSTRAINT "DeepResearchSession_savedDocumentId_fkey" FOREIGN KEY ("savedDocumentId") REFERENCES "CoachDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeepResearchSession" ADD CONSTRAINT "DeepResearchSession_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeepResearchSession" ADD CONSTRAINT "DeepResearchSession_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeepResearchProgress" ADD CONSTRAINT "DeepResearchProgress_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DeepResearchSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedResearchAccess" ADD CONSTRAINT "SharedResearchAccess_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DeepResearchSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedResearchAccess" ADD CONSTRAINT "SharedResearchAccess_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageBudget" ADD CONSTRAINT "AIUsageBudget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramGenerationSession" ADD CONSTRAINT "ProgramGenerationSession_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramGenerationSession" ADD CONSTRAINT "ProgramGenerationSession_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramGenerationProgress" ADD CONSTRAINT "ProgramGenerationProgress_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ProgramGenerationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMemory" ADD CONSTRAINT "ConversationMemory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationSummary" ADD CONSTRAINT "ConversationSummary_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIBriefing" ADD CONSTRAINT "AIBriefing_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AINotification" ADD CONSTRAINT "AINotification_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AINotificationPreferences" ADD CONSTRAINT "AINotificationPreferences_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachAlert" ADD CONSTRAINT "CoachAlert_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveHRSession" ADD CONSTRAINT "LiveHRSession_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveHRSession" ADD CONSTRAINT "LiveHRSession_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveHRParticipant" ADD CONSTRAINT "LiveHRParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveHRSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveHRParticipant" ADD CONSTRAINT "LiveHRParticipant_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveHRReading" ADD CONSTRAINT "LiveHRReading_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "LiveHRParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalMatchSchedule" ADD CONSTRAINT "ExternalMatchSchedule_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportTest" ADD CONSTRAINT "SportTest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportTest" ADD CONSTRAINT "SportTest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdHocWorkout" ADD CONSTRAINT "AdHocWorkout_createdWorkoutId_fkey" FOREIGN KEY ("createdWorkoutId") REFERENCES "Workout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdHocWorkout" ADD CONSTRAINT "AdHocWorkout_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseContract" ADD CONSTRAINT "EnterpriseContract_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseContractChange" ADD CONSTRAINT "EnterpriseContractChange_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "EnterpriseContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseContractChange" ADD CONSTRAINT "EnterpriseContractChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingOverride" ADD CONSTRAINT "PricingOverride_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "PricingTier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingOverride" ADD CONSTRAINT "PricingOverride_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemError" ADD CONSTRAINT "SystemError_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachDecision" ADD CONSTRAINT "CoachDecision_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachDecision" ADD CONSTRAINT "CoachDecision_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachDecision" ADD CONSTRAINT "CoachDecision_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachDecision" ADD CONSTRAINT "CoachDecision_programId_fkey" FOREIGN KEY ("programId") REFERENCES "TrainingProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPrediction" ADD CONSTRAINT "AIPrediction_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPrediction" ADD CONSTRAINT "AIPrediction_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionValidation" ADD CONSTRAINT "PredictionValidation_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "AIPrediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataMoatConsent" ADD CONSTRAINT "DataMoatConsent_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPeriodOutcome" ADD CONSTRAINT "TrainingPeriodOutcome_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPeriodOutcome" ADD CONSTRAINT "TrainingPeriodOutcome_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPeriodOutcome" ADD CONSTRAINT "TrainingPeriodOutcome_programId_fkey" FOREIGN KEY ("programId") REFERENCES "TrainingProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingFingerprint" ADD CONSTRAINT "TrainingFingerprint_periodOutcomeId_fkey" FOREIGN KEY ("periodOutcomeId") REFERENCES "TrainingPeriodOutcome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseEffectiveness" ADD CONSTRAINT "ExerciseEffectiveness_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseEffectiveness" ADD CONSTRAINT "ExerciseEffectiveness_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseOutcomePattern" ADD CONSTRAINT "ExerciseOutcomePattern_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPredictiveValidation" ADD CONSTRAINT "TestPredictiveValidation_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkComparison" ADD CONSTRAINT "BenchmarkComparison_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkComparison" ADD CONSTRAINT "BenchmarkComparison_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "AthleteCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthletePatternMatch" ADD CONSTRAINT "AthletePatternMatch_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthletePatternMatch" ADD CONSTRAINT "AthletePatternMatch_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "PerformancePattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIFeedbackLoop" ADD CONSTRAINT "AIFeedbackLoop_coachDecisionId_fkey" FOREIGN KEY ("coachDecisionId") REFERENCES "CoachDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIFeedbackLoop" ADD CONSTRAINT "AIFeedbackLoop_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "AIPrediction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIFeedbackLoop" ADD CONSTRAINT "AIFeedbackLoop_trainingOutcomeId_fkey" FOREIGN KEY ("trainingOutcomeId") REFERENCES "TrainingPeriodOutcome"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIFeedbackLoop" ADD CONSTRAINT "AIFeedbackLoop_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "PerformancePattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIFeedbackLoop" ADD CONSTRAINT "AIFeedbackLoop_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "AIModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIModelVersion" ADD CONSTRAINT "AIModelVersion_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "AIModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccuracySnapshot" ADD CONSTRAINT "AccuracySnapshot_previousSnapshotId_fkey" FOREIGN KEY ("previousSnapshotId") REFERENCES "AccuracySnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPromptTemplate" ADD CONSTRAINT "AIPromptTemplate_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "AIPromptTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgilityDrill" ADD CONSTRAINT "AgilityDrill_progressionDrillId_fkey" FOREIGN KEY ("progressionDrillId") REFERENCES "AgilityDrill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgilityDrill" ADD CONSTRAINT "AgilityDrill_regressionDrillId_fkey" FOREIGN KEY ("regressionDrillId") REFERENCES "AgilityDrill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgilityDrill" ADD CONSTRAINT "AgilityDrill_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgilityWorkout" ADD CONSTRAINT "AgilityWorkout_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgilityWorkoutDrill" ADD CONSTRAINT "AgilityWorkoutDrill_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "AgilityWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgilityWorkoutDrill" ADD CONSTRAINT "AgilityWorkoutDrill_drillId_fkey" FOREIGN KEY ("drillId") REFERENCES "AgilityDrill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgilityWorkoutAssignment" ADD CONSTRAINT "AgilityWorkoutAssignment_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "AgilityWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgilityWorkoutAssignment" ADD CONSTRAINT "AgilityWorkoutAssignment_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgilityWorkoutAssignment" ADD CONSTRAINT "AgilityWorkoutAssignment_teamBroadcastId_fkey" FOREIGN KEY ("teamBroadcastId") REFERENCES "TeamWorkoutBroadcast"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgilityWorkoutAssignment" ADD CONSTRAINT "AgilityWorkoutAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgilityWorkoutAssignment" ADD CONSTRAINT "AgilityWorkoutAssignment_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgilityWorkoutAssignment" ADD CONSTRAINT "AgilityWorkoutAssignment_responsibleCoachId_fkey" FOREIGN KEY ("responsibleCoachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgilityWorkoutResult" ADD CONSTRAINT "AgilityWorkoutResult_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "AgilityWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgilityWorkoutResult" ADD CONSTRAINT "AgilityWorkoutResult_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimingGateSession" ADD CONSTRAINT "TimingGateSession_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimingGateSession" ADD CONSTRAINT "TimingGateSession_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimingGateResult" ADD CONSTRAINT "TimingGateResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TimingGateSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimingGateResult" ADD CONSTRAINT "TimingGateResult_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceWorkoutSession" ADD CONSTRAINT "VoiceWorkoutSession_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceWorkoutSession" ADD CONSTRAINT "VoiceWorkoutSession_strengthSessionId_fkey" FOREIGN KEY ("strengthSessionId") REFERENCES "StrengthSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceWorkoutSession" ADD CONSTRAINT "VoiceWorkoutSession_cardioSessionId_fkey" FOREIGN KEY ("cardioSessionId") REFERENCES "CardioSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceWorkoutSession" ADD CONSTRAINT "VoiceWorkoutSession_hybridWorkoutId_fkey" FOREIGN KEY ("hybridWorkoutId") REFERENCES "HybridWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPreferences" ADD CONSTRAINT "AgentPreferences_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentConsent" ADD CONSTRAINT "AgentConsent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPerception" ADD CONSTRAINT "AgentPerception_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_perceptionId_fkey" FOREIGN KEY ("perceptionId") REFERENCES "AgentPerception"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentOversightItem" ADD CONSTRAINT "AgentOversightItem_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "AgentAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentLearningEvent" ADD CONSTRAINT "AgentLearningEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAuditLog" ADD CONSTRAINT "AgentAuditLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachRequest" ADD CONSTRAINT "CoachRequest_athleteClientId_fkey" FOREIGN KEY ("athleteClientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachRequest" ADD CONSTRAINT "CoachRequest_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachAgreement" ADD CONSTRAINT "CoachAgreement_athleteClientId_fkey" FOREIGN KEY ("athleteClientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachAgreement" ADD CONSTRAINT "CoachAgreement_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachReview" ADD CONSTRAINT "CoachReview_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachReview" ADD CONSTRAINT "CoachReview_athleteClientId_fkey" FOREIGN KEY ("athleteClientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachEarnings" ADD CONSTRAINT "CoachEarnings_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachEarnings" ADD CONSTRAINT "CoachEarnings_athleteClientId_fkey" FOREIGN KEY ("athleteClientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- pgvector: managed OUTSIDE of Prisma migrations (raw SQL)
-- The following are applied manually via Supabase SQL editor or prisma db execute:
--   CREATE EXTENSION IF NOT EXISTS vector;
--   ALTER TABLE "KnowledgeChunk" ADD COLUMN "embedding" vector(1536);
--   ALTER TABLE "KnowledgeSkill" ADD COLUMN "embedding" vector(1536);
--   CREATE INDEX idx_knowledge_chunk_embedding ON "KnowledgeChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
--   + search_knowledge_chunks() function
-- See: prisma/pgvector_setup.sql for the full script
-- ============================================================================

