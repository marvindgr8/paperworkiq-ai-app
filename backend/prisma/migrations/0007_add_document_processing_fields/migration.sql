-- AlterTable
ALTER TABLE `Document`
    ADD COLUMN `categoryLabel` VARCHAR(191) NULL,
    ADD COLUMN `fileHash` VARCHAR(191) NULL,
    ADD COLUMN `processedAt` DATETIME(3) NULL,
    ADD COLUMN `processingError` LONGTEXT NULL,
    ADD COLUMN `sensitiveDetected` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `Document_fileHash_idx` ON `Document`(`fileHash`);
