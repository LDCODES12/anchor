-- Add daily target to Goal (for multi-completion goals like 3x/day)
ALTER TABLE "Goal" ADD COLUMN "dailyTarget" INTEGER NOT NULL DEFAULT 1;
