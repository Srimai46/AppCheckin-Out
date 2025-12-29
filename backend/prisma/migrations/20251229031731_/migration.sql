-- AlterTable
ALTER TABLE `leave_requests` MODIFY `status` ENUM('Pending', 'Approved', 'Rejected', 'Cancelled', 'Withdraw_Pending') NOT NULL;
