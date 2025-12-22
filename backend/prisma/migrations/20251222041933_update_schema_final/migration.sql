-- AlterTable
ALTER TABLE `leave_quotas` ADD COLUMN `carry_over_days` DECIMAL(5, 2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE `leave_requests` ADD COLUMN `attachment_url` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `leave_types` ADD COLUMN `max_carry_over` DECIMAL(5, 2) NOT NULL DEFAULT 0.00;

-- CreateIndex
CREATE INDEX `leave_requests_employee_id_start_date_idx` ON `leave_requests`(`employee_id`, `start_date`);

-- CreateIndex
CREATE INDEX `leave_requests_status_idx` ON `leave_requests`(`status`);

-- CreateIndex
CREATE INDEX `notifications_employee_id_created_at_idx` ON `notifications`(`employee_id`, `created_at` DESC);

-- CreateIndex
CREATE INDEX `notifications_employee_id_is_read_idx` ON `notifications`(`employee_id`, `is_read`);

-- CreateIndex
CREATE INDEX `time_records_employee_id_work_date_idx` ON `time_records`(`employee_id`, `work_date`);
