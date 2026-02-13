ALTER TABLE `Folder`
  ADD COLUMN `workspaceId` VARCHAR(191) NULL;

UPDATE `Folder` f
JOIN `Workspace` w ON w.ownerId = f.ownerId AND w.type = 'PERSONAL'
SET f.workspaceId = w.id
WHERE f.workspaceId IS NULL;

ALTER TABLE `Folder`
  MODIFY `workspaceId` VARCHAR(191) NOT NULL,
  ADD INDEX `Folder_workspaceId_idx`(`workspaceId`),
  ADD UNIQUE INDEX `Folder_workspaceId_parentId_name_key`(`workspaceId`, `parentId`, `name`),
  ADD CONSTRAINT `Folder_workspaceId_fkey`
    FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
