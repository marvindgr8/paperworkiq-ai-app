-- AlterTable
ALTER TABLE `Document`
    ADD COLUMN `type` VARCHAR(191) NULL,
    ADD COLUMN `summary` LONGTEXT NULL,
    ADD COLUMN `ocrText` LONGTEXT NULL,
    ADD COLUMN `ocrPages` JSON NULL;
