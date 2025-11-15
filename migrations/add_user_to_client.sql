-- Migration: Add userId to Client table
-- This migration adds user ownership to clients for multi-tenant support

-- Step 1: Add userId column as nullable first
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Step 2: Set userId for existing clients to the default user 'user-1'
-- If you have existing clients, they will be assigned to user-1
UPDATE "Client" SET "userId" = 'user-1' WHERE "userId" IS NULL;

-- Step 3: Make userId NOT NULL
ALTER TABLE "Client" ALTER COLUMN "userId" SET NOT NULL;

-- Step 4: Add foreign key constraint
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 5: Create index for better query performance
CREATE INDEX IF NOT EXISTS "Client_userId_idx" ON "Client"("userId");

-- Note: Run this migration in your Supabase SQL Editor
