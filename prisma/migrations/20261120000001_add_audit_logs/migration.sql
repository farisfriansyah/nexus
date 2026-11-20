CREATE TABLE `AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `action` VARCHAR(50) NOT NULL,
    `actor` VARCHAR(254) NULL,
    `target` VARCHAR(191) NULL,
    `details` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    INDEX `AuditLog_action_createdAt_idx`(`action`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TravoAlertState` (
    `unit` INTEGER NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `critical` BOOLEAN NOT NULL,
    `awaitingNormal` BOOLEAN NOT NULL,
    `observedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`unit`, `key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
