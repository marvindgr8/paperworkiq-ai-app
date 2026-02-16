CREATE TABLE `DocumentShare` (
  `documentId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `permission` ENUM('VIEW', 'EDIT') NOT NULL DEFAULT 'VIEW',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`documentId`, `userId`),
  INDEX `DocumentShare_userId_idx`(`userId`),
  CONSTRAINT `DocumentShare_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `DocumentShare_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FolderShare` (
  `folderId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `permission` ENUM('VIEW', 'EDIT') NOT NULL DEFAULT 'VIEW',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`folderId`, `userId`),
  INDEX `FolderShare_userId_idx`(`userId`),
  CONSTRAINT `FolderShare_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `Folder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FolderShare_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
