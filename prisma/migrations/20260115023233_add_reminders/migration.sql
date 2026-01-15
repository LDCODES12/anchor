-- AlterTable
ALTER TABLE "User" ADD COLUMN     "reminderFrequency" TEXT NOT NULL DEFAULT 'DAILY',
ADD COLUMN     "reminderTime" TEXT NOT NULL DEFAULT '09:00';
