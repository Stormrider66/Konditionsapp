-- Create ENUMS
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');
CREATE TYPE "TestType" AS ENUM ('RUNNING', 'CYCLING');
CREATE TYPE "TestStatus" AS ENUM ('DRAFT', 'COMPLETED', 'ARCHIVED');

-- Create User table
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'tester',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create Client table
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "gender" "Gender" NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create Test table
CREATE TABLE "Test" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testDate" TIMESTAMP(3) NOT NULL,
    "testType" "TestType" NOT NULL,
    "status" "TestStatus" NOT NULL DEFAULT 'DRAFT',
    "maxHR" INTEGER,
    "maxLactate" DOUBLE PRECISION,
    "vo2max" DOUBLE PRECISION,
    "aerobicThreshold" JSONB,
    "anaerobicThreshold" JSONB,
    "trainingZones" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Test_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Test_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create TestStage table
CREATE TABLE "TestStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "economy" DOUBLE PRECISION,
    "wattsPerKg" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestStage_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create Report table
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testId" TEXT NOT NULL UNIQUE,
    "htmlContent" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,
    "customNotes" TEXT,
    "recommendations" TEXT,
    CONSTRAINT "Report_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX "Client_name_idx" ON "Client"("name");
CREATE INDEX "Client_email_idx" ON "Client"("email");
CREATE INDEX "Test_clientId_idx" ON "Test"("clientId");
CREATE INDEX "Test_userId_idx" ON "Test"("userId");
CREATE INDEX "Test_testDate_idx" ON "Test"("testDate");
CREATE INDEX "TestStage_testId_idx" ON "TestStage"("testId");
CREATE INDEX "TestStage_sequence_idx" ON "TestStage"("sequence");
