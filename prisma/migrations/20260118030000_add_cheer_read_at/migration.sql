-- Add readAt field to Cheer for dismissing cheer notifications
ALTER TABLE "Cheer" ADD COLUMN "readAt" TIMESTAMP(3);
