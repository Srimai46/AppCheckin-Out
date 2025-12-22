-- CreateTable
CREATE TABLE `employees` (
    `employee_id` INTEGER NOT NULL AUTO_INCREMENT,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('Worker', 'HR') NOT NULL,
    `joining_date` DATE NOT NULL,
    `resignation_date` DATE NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `profile_image_url` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `employees_email_key`(`email`),
    PRIMARY KEY (`employee_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_types` (
    `leave_type_id` INTEGER NOT NULL AUTO_INCREMENT,
    `type_name` VARCHAR(100) NOT NULL,
    `is_paid` BOOLEAN NOT NULL DEFAULT true,
    `max_carry_over` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `max_consecutive_days` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `leave_types_type_name_key`(`type_name`),
    PRIMARY KEY (`leave_type_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `leave_quotas` (
    `quota_id` INTEGER NOT NULL AUTO_INCREMENT,
    `employee_id` INTEGER NOT NULL,
    `leave_type_id` INTEGER NOT NULL,
    `year` YEAR NOT NULL,
    `total_days` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `used_days` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `carry_over_days` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,

    UNIQUE INDEX `leave_quotas_employee_id_leave_type_id_year_key`(`employee_id`, `leave_type_id`, `year`),
    PRIMARY KEY (`quota_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `time_records` (
    `record_id` INTEGER NOT NULL AUTO_INCREMENT,
    `employee_id` INTEGER NOT NULL,
    `work_date` DATE NOT NULL,
    `check_in_time` DATETIME(3) NOT NULL,
    `check_out_time` DATETIME(3) NULL,
    `is_late` BOOLEAN NOT NULL DEFAULT false,
    `note` TEXT NULL,

    INDEX `time_records_employee_id_work_date_idx`(`employee_id`, `work_date`),
    PRIMARY KEY (`record_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_requests` (
    `request_id` INTEGER NOT NULL AUTO_INCREMENT,
    `employee_id` INTEGER NOT NULL,
    `leave_type_id` INTEGER NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `total_days_requested` DECIMAL(4, 2) NOT NULL,
    `start_duration` ENUM('Full', 'HalfMorning', 'HalfAfternoon') NOT NULL,
    `end_duration` ENUM('Full', 'HalfMorning', 'HalfAfternoon') NOT NULL,
    `reason` TEXT NULL,
    `attachment_url` VARCHAR(255) NULL,
    `status` ENUM('Pending', 'Approved', 'Rejected') NOT NULL,
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approved_by_hr_id` INTEGER NULL,
    `approval_date` DATETIME(3) NULL,
    `is_special_approved` BOOLEAN NOT NULL DEFAULT false,

    INDEX `leave_requests_employee_id_start_date_idx`(`employee_id`, `start_date`),
    INDEX `leave_requests_status_idx`(`status`),
    PRIMARY KEY (`request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `notification_id` INTEGER NOT NULL AUTO_INCREMENT,
    `employee_id` INTEGER NOT NULL,
    `notification_type` ENUM('NewRequest', 'Approval', 'Rejection', 'LateWarning') NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `related_request_id` INTEGER NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_employee_id_created_at_idx`(`employee_id`, `created_at` DESC),
    INDEX `notifications_employee_id_is_read_idx`(`employee_id`, `is_read`),
    PRIMARY KEY (`notification_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `special_leave_grants` ADD CONSTRAINT `special_leave_grants_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`employee_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `special_leave_grants` ADD CONSTRAINT `special_leave_grants_leave_type_id_fkey` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`leave_type_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_quotas` ADD CONSTRAINT `leave_quotas_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`employee_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_quotas` ADD CONSTRAINT `leave_quotas_leave_type_id_fkey` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`leave_type_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_records` ADD CONSTRAINT `time_records_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`employee_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`employee_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_leave_type_id_fkey` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`leave_type_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_approved_by_hr_id_fkey` FOREIGN KEY (`approved_by_hr_id`) REFERENCES `employees`(`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`employee_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_related_request_id_fkey` FOREIGN KEY (`related_request_id`) REFERENCES `leave_requests`(`request_id`) ON DELETE SET NULL ON UPDATE CASCADE;
