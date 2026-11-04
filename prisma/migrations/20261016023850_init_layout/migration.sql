CREATE TABLE `LayoutVersion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tab` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    `data` JSON NOT NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `publishedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `LayoutVersion_tab_version_key` (`tab`, `version`),
    INDEX `LayoutVersion_tab_status_idx` (`tab`, `status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
