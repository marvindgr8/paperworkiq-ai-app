CREATE TABLE `Folder` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `ownerId` VARCHAR(191) NOT NULL,
  `parentId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `Folder_ownerId_idx`(`ownerId`),
  INDEX `Folder_parentId_idx`(`parentId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Document`
  ADD COLUMN `folderId` VARCHAR(191) NULL,
  ADD INDEX `Document_folderId_idx`(`folderId`);

ALTER TABLE `Folder`
  ADD CONSTRAINT `Folder_parentId_fkey`
  FOREIGN KEY (`parentId`) REFERENCES `Folder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Document`
  ADD CONSTRAINT `Document_folderId_fkey`
  FOREIGN KEY (`folderId`) REFERENCES `Folder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
