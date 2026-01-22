/*
  Warnings:

  - You are about to drop the column `department` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `work_configurations` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[role_id]` on the table `work_configurations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `role_id` to the `employees` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_id` to the `work_configurations` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `work_configurations_role_key` ON `work_configurations`;

-- AlterTable
ALTER TABLE `employees` DROP COLUMN `department`,
    DROP COLUMN `role`,
    ADD COLUMN `department_id` INTEGER NULL,
    ADD COLUMN `role_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `work_configurations` DROP COLUMN `role`,
    ADD COLUMN `breakEndHour` INTEGER NOT NULL DEFAULT 13,
    ADD COLUMN `breakEndMin` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `breakStartHour` INTEGER NOT NULL DEFAULT 12,
    ADD COLUMN `breakStartMin` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lateThresholdMin` INTEGER NOT NULL DEFAULT 15,
    ADD COLUMN `role_id` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `roles` (
    `role_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `permissions` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `department_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `departments_name_key`(`name`),
    PRIMARY KEY (`department_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `work_configurations_role_id_key` ON `work_configurations`(`role_id`);

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`department_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_configurations` ADD CONSTRAINT `work_configurations_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
