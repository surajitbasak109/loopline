ALTER TABLE `User`
  ADD COLUMN `emailVerified` DATETIME(3) NULL,
  ADD COLUMN `verifyToken` VARCHAR(191) NULL,
  ADD COLUMN `resetToken` VARCHAR(191) NULL,
  ADD COLUMN `resetTokenExpiry` DATETIME(3) NULL;

CREATE UNIQUE INDEX `User_verifyToken_key` ON `User`(`verifyToken`);
CREATE UNIQUE INDEX `User_resetToken_key` ON `User`(`resetToken`);
