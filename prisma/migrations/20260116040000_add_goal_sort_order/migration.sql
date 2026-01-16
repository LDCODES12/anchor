-- Add sortOrder field to Goal for drag-and-drop ordering
ALTER TABLE "Goal" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Add index for efficient sorting queries
CREATE INDEX "Goal_ownerId_sortOrder_idx" ON "Goal"("ownerId", "sortOrder");

-- Initialize sortOrder based on creation date (oldest first)
UPDATE "Goal" SET "sortOrder" = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "ownerId" ORDER BY "createdAt") as row_num
  FROM "Goal"
) AS subquery
WHERE "Goal".id = subquery.id;
