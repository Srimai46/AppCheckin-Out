-- AlterTable
ALTER TABLE `notifications` MODIFY `notification_type` ENUM('NewRequest', 'Approval', 'Rejection', 'LateWarning', 'EarlyLeaveWarning') NOT NULL;
