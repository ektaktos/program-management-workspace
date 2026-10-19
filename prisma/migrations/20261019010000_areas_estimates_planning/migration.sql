-- AlterTable
ALTER TABLE `Project`
    ADD COLUMN `area` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Task`
    ADD COLUMN `estimate` INT NULL,
    ADD COLUMN `plannedDate` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `PlannerEvent`
    ADD COLUMN `estimate` INT NULL;
