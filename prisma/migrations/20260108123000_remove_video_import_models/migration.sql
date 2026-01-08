-- Remove YouTube playlist import tables (feature deleted).
-- NOTE: This permanently deletes any existing video import/match rows.

-- Drop dependent tables first (FK from VideoMatch -> VideoImport)
DROP TABLE IF EXISTS "VideoMatch";
DROP TABLE IF EXISTS "VideoImport";


