-- AlterTable
ALTER TABLE `time_records` ADD COLUMN `check_in_status` ENUM('ON_TIME', 'LATE', 'LEAVE', 'ABSENT') NULL,
    ADD COLUMN `check_out_status` ENUM('NORMAL', 'EARLY', 'LEAVE', 'NO_CHECKOUT') NULL;
