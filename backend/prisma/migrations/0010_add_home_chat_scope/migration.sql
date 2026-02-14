ALTER TABLE `ChatSession`
  ADD COLUMN `scopeType` VARCHAR(191) NOT NULL DEFAULT 'folder',
  ADD COLUMN `rootFolderId` VARCHAR(191) NULL,
  ADD COLUMN `includeSubfolders` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `ChatSession_rootFolderId_idx` ON `ChatSession`(`rootFolderId`);
CREATE INDEX `ChatSession_workspaceId_scopeType_rootFolderId_includeSubfolders_idx`
  ON `ChatSession`(`workspaceId`, `scopeType`, `rootFolderId`, `includeSubfolders`);

ALTER TABLE `ChatSession`
  ADD CONSTRAINT `ChatSession_rootFolderId_fkey`
  FOREIGN KEY (`rootFolderId`) REFERENCES `Folder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `ChatSessionFile` (
  `sessionId` VARCHAR(191) NOT NULL,
  `fileId` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`sessionId`, `fileId`),
  INDEX `ChatSessionFile_fileId_idx`(`fileId`),
  CONSTRAINT `ChatSessionFile_sessionId_fkey`
    FOREIGN KEY (`sessionId`) REFERENCES `ChatSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ChatSessionFile_fileId_fkey`
    FOREIGN KEY (`fileId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ChatSessionFolder` (
  `sessionId` VARCHAR(191) NOT NULL,
  `folderId` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`sessionId`, `folderId`),
  INDEX `ChatSessionFolder_folderId_idx`(`folderId`),
  CONSTRAINT `ChatSessionFolder_sessionId_fkey`
    FOREIGN KEY (`sessionId`) REFERENCES `ChatSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ChatSessionFolder_folderId_fkey`
    FOREIGN KEY (`folderId`) REFERENCES `Folder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
