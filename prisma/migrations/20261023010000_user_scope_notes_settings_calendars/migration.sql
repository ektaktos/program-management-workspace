-- AlterTable: notes get their own owner, since a note no longer needs a project
ALTER TABLE `Note` ADD COLUMN `userId` VARCHAR(191) NULL;
UPDATE `Note` n JOIN `Project` p ON n.`projectId` = p.`id` SET n.`userId` = p.`userId`;

-- AlterTable: settings are per user. Setting gets a surrogate id so a key can repeat per user.
-- Existing rows reuse their (unique) key as the id.
ALTER TABLE `Setting` ADD COLUMN `id` VARCHAR(191) NULL,
    ADD COLUMN `userId` VARCHAR(191) NULL;
UPDATE `Setting` SET `id` = `key`;
ALTER TABLE `Setting` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `CalendarSource` ADD COLUMN `userId` VARCHAR(191) NULL;

-- Rows made before auth belong to the existing account, if there is exactly one
UPDATE `Note` t JOIN (SELECT MIN(`id`) AS `id` FROM `User` HAVING COUNT(*) = 1) u SET t.`userId` = u.`id` WHERE t.`userId` IS NULL;
UPDATE `Setting` t JOIN (SELECT MIN(`id`) AS `id` FROM `User` HAVING COUNT(*) = 1) u SET t.`userId` = u.`id` WHERE t.`userId` IS NULL;
UPDATE `CalendarSource` t JOIN (SELECT MIN(`id`) AS `id` FROM `User` HAVING COUNT(*) = 1) u SET t.`userId` = u.`id` WHERE t.`userId` IS NULL;

-- CreateIndex
CREATE INDEX `Note_userId_idx` ON `Note`(`userId`);

-- CreateIndex
CREATE UNIQUE INDEX `Setting_userId_key_key` ON `Setting`(`userId`, `key`);

-- CreateIndex
CREATE INDEX `CalendarSource_userId_idx` ON `CalendarSource`(`userId`);

-- AddForeignKey
ALTER TABLE `Note` ADD CONSTRAINT `Note_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Setting` ADD CONSTRAINT `Setting_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarSource` ADD CONSTRAINT `CalendarSource_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
