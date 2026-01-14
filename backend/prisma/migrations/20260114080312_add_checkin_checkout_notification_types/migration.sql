/*
  Warnings:

  - The values [Worker] on the enum `work_configurations_role` will be removed. If these variants are still used in the database, this will fail.
  - The values [Worker] on the enum `work_configurations_role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `employees` MODIFY `role` ENUM('WORKER', 'HR') NOT NULL;

-- AlterTable
ALTER TABLE `notifications` MODIFY `notification_type` ENUM('NewRequest', 'Approval', 'Rejection', 'LateWarning', 'EarlyLeaveWarning', 'CheckIn', 'CheckOut') NOT NULL;

-- AlterTable
ALTER TABLE `work_configurations` MODIFY `role` ENUM('WORKER', 'HR') NOT NULL;
