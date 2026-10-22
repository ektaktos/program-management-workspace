-- When a planner task was ticked off (for the weekly report's patterns); empty for older ones
ALTER TABLE `PlannerEvent` ADD COLUMN `completedAt` DATETIME(3) NULL;
