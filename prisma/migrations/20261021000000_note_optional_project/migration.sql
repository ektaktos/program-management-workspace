-- Notes can stand on their own; a project is optional (existing notes keep theirs)
ALTER TABLE `Note` MODIFY `projectId` VARCHAR(191) NULL;
