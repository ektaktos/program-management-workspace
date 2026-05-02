-- AlterTable
ALTER TABLE `Task`
    ADD COLUMN `recurring` VARCHAR(191) NULL,
    ADD COLUMN `subtasks` JSON NULL;

-- Backfill existing rows before enforcing NOT NULL
UPDATE `Task`
SET `subtasks` = JSON_ARRAY()
WHERE `subtasks` IS NULL;

-- AlterTable
ALTER TABLE `Task`
    MODIFY `subtasks` JSON NOT NULL;
