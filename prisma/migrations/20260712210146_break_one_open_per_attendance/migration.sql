-- Enforce "at most one open break per attendance row" at the database level.
-- Previously only an index existed (attendanceId, endAt), which does not
-- prevent two concurrent inserts both having endAt = NULL for the same
-- attendanceId. This partial unique index makes that impossible even under
-- a serialization failure retry or a code path outside startBreak().
CREATE UNIQUE INDEX "breaks_attendanceId_open_unique"
ON "breaks" ("attendanceId")
WHERE "endAt" IS NULL;
