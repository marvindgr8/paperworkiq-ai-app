-- AlterTable
ALTER TABLE `Document`
    ADD COLUMN `fileUrl` VARCHAR(191) NULL,
    ADD COLUMN `previewImageUrl` VARCHAR(191) NULL,
    ADD COLUMN `extractData` JSON NULL;

-- CreateTable
CREATE TABLE `ChatCitation` (
    `id` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `page` INTEGER NULL,
    `field` VARCHAR(191) NULL,
    `snippet` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChatCitation_messageId_idx`(`messageId`),
    INDEX `ChatCitation_documentId_idx`(`documentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ChatCitation` ADD CONSTRAINT `ChatCitation_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `ChatMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatCitation` ADD CONSTRAINT `ChatCitation_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
