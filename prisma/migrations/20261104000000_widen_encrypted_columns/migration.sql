-- Encrypted values are longer than the plaintext, so short text columns that now hold encrypted
-- data become TEXT (see lib/fieldCrypto.ts). Nullability is unchanged.
ALTER TABLE `Project` MODIFY `name` TEXT NOT NULL, MODIFY `area` TEXT NULL;
ALTER TABLE `Task` MODIFY `title` TEXT NOT NULL, MODIFY `assignee` TEXT NULL;
ALTER TABLE `Milestone` MODIFY `title` TEXT NOT NULL;
ALTER TABLE `Phase` MODIFY `name` TEXT NOT NULL;
ALTER TABLE `Note` MODIFY `title` TEXT NOT NULL;
ALTER TABLE `PlannerTodo` MODIFY `text` TEXT NOT NULL;
ALTER TABLE `PlannerEvent` MODIFY `title` TEXT NOT NULL;
ALTER TABLE `PlannerAppointment` MODIFY `title` TEXT NOT NULL;
ALTER TABLE `CalendarSource` MODIFY `name` TEXT NOT NULL;
