-- AlterTable
ALTER TABLE `leave_types` ADD COLUMN `max_consecutive_days` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `special_leave_grants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employee_id` INTEGER NOT NULL,
    `leave_type_id` INTEGER NOT NULL,
    `amount` DECIMAL(5, 2) NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `expiry_date` DATE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `special_leave_grants` ADD CONSTRAINT `special_leave_grants_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`employee_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `special_leave_grants` ADD CONSTRAINT `special_leave_grants_leave_type_id_fkey` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`leave_type_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
