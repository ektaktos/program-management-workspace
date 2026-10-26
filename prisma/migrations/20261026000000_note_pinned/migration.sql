-- Notes can be pinned to stay at the top of the Dashboard's Recent Notes
ALTER TABLE `Note` ADD COLUMN `pinned` BOOLEAN NOT NULL DEFAULT false;
