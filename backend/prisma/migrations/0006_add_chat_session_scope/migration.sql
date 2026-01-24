ALTER TABLE `ChatSession`
  ADD COLUMN `scope` ENUM('WORKSPACE', 'DOCUMENT') NOT NULL DEFAULT 'WORKSPACE',
  ADD COLUMN `documentId` VARCHAR(191) NULL;

CREATE INDEX `ChatSession_documentId_idx` ON `ChatSession`(`documentId`);
CREATE INDEX `ChatSession_workspaceId_scope_idx` ON `ChatSession`(`workspaceId`, `scope`);
CREATE INDEX `ChatSession_workspaceId_scope_documentId_idx` ON `ChatSession`(`workspaceId`, `scope`, `documentId`);

ALTER TABLE `ChatSession`
  ADD CONSTRAINT `ChatSession_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ChatSession`
  ADD CONSTRAINT `ChatSession_scope_document_check`
  CHECK ((`scope` = 'WORKSPACE' AND `documentId` IS NULL) OR (`scope` = 'DOCUMENT' AND `documentId` IS NOT NULL));
