-- Add PointReason enum
CREATE TYPE "PointReason" AS ENUM ('CHECKIN_POINTS', 'ADJUSTMENT');

-- Add points fields to User
ALTER TABLE "User" ADD COLUMN "pointsLifetimeMilli" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "pointsWeekMilli" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "pointsWeekKey" TEXT;

-- Create PointLedger table
CREATE TABLE "PointLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT,
    "weekKey" TEXT NOT NULL,
    "localDate" TEXT,
    "pointsMilli" INTEGER NOT NULL,
    "reason" "PointReason" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointLedger_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint for idempotency
CREATE UNIQUE INDEX "PointLedger_userId_reason_sourceId_key" ON "PointLedger"("userId", "reason", "sourceId");

-- Add indexes for performance
CREATE INDEX "PointLedger_userId_weekKey_idx" ON "PointLedger"("userId", "weekKey");
CREATE INDEX "PointLedger_userId_createdAt_idx" ON "PointLedger"("userId", "createdAt");
CREATE INDEX "PointLedger_goalId_weekKey_idx" ON "PointLedger"("goalId", "weekKey");

-- Add foreign key constraints
ALTER TABLE "PointLedger" ADD CONSTRAINT "PointLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PointLedger" ADD CONSTRAINT "PointLedger_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
