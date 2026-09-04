-- Backfill existing accounts before making the new required field non-null.
ALTER TABLE "User" ADD COLUMN "name" TEXT;
UPDATE "User" SET "name" = split_part("email", '@', 1) WHERE "name" IS NULL;
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;
