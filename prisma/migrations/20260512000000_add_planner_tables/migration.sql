-- CreateTable
CREATE TABLE `PlannerTodo` (
    `id` VARCHAR(191) NOT NULL,
    `text` VARCHAR(191) NOT NULL,
    `done` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlannerEvent` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `notes` TEXT NOT NULL,
    `done` BOOLEAN NOT NULL DEFAULT false,
    `time` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlannerAppointment` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `time` VARCHAR(191) NOT NULL,
    `notes` TEXT NOT NULL,
    `done` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlannerWeekly` (
    `weekKey` VARCHAR(191) NOT NULL,
    `goals` JSON NOT NULL,
    `notes` TEXT NOT NULL,
    `focus` VARCHAR(191) NOT NULL DEFAULT '',
    `focusItems` JSON NOT NULL,

    PRIMARY KEY (`weekKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
