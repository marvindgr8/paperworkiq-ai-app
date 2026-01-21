-- DropForeignKey
ALTER TABLE `Document` DROP FOREIGN KEY `Document_workspaceId_fkey`;

-- DropForeignKey
ALTER TABLE `ChatSession` DROP FOREIGN KEY `ChatSession_workspaceId_fkey`;

-- AlterTable
ALTER TABLE `Document` MODIFY `workspaceId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `ChatSession` MODIFY `workspaceId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatSession` ADD CONSTRAINT `ChatSession_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
