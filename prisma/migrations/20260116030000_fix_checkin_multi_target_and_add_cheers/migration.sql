-- Remove unique constraint on CheckIn to allow multiple check-ins per day for multi-target goals
-- First drop the unique constraint if it exists
DROP INDEX IF EXISTS "CheckIn_goalId_userId_localDateKey_key";

-- Add index for efficient querying (replacing the unique constraint)
CREATE INDEX IF NOT EXISTS "CheckIn_goalId_userId_localDateKey_idx" ON "CheckIn"("goalId", "userId", "localDateKey");

-- Create Cheer table for tracking cheers on check-ins
CREATE TABLE "Cheer" (
    "id" TEXT NOT NULL,
    "checkInId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cheer_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint: one cheer per person per check-in
CREATE UNIQUE INDEX "Cheer_checkInId_senderId_key" ON "Cheer"("checkInId", "senderId");

-- Add index for efficient querying
CREATE INDEX "Cheer_checkInId_idx" ON "Cheer"("checkInId");

-- Add foreign key constraints
ALTER TABLE "Cheer" ADD CONSTRAINT "Cheer_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cheer" ADD CONSTRAINT "Cheer_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
