-- ============================================================
--  CSMS — Car Service Management System
--  MySQL Schema Reference File
--  Generated: 2026-08-11
--
--  NOTE: Django migrations create these tables automatically.
--  This file is for reference / manual inspection only.
--  Run: python manage.py migrate  (to apply in Django)
-- ============================================================

CREATE DATABASE IF NOT EXISTS csms_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE csms_db;

-- ────────────────────────────────────────────────────────────
-- 1. Django Auth User  (built-in, managed by Django)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `auth_user` (
    `id`           INT          NOT NULL AUTO_INCREMENT,
    `password`     VARCHAR(128) NOT NULL,
    `last_login`   DATETIME(6)  NULL,
    `is_superuser` TINYINT(1)   NOT NULL DEFAULT 0,
    `username`     VARCHAR(150) NOT NULL UNIQUE,
    `first_name`   VARCHAR(150) NOT NULL DEFAULT '',
    `last_name`    VARCHAR(150) NOT NULL DEFAULT '',
    `email`        VARCHAR(254) NOT NULL DEFAULT '',
    `is_staff`     TINYINT(1)   NOT NULL DEFAULT 0,
    `is_active`    TINYINT(1)   NOT NULL DEFAULT 1,
    `date_joined`  DATETIME(6)  NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 2. Auth Token  (DRF Token Authentication)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `authtoken_token` (
    `key`     VARCHAR(40)  NOT NULL,
    `created` DATETIME(6)  NOT NULL,
    `user_id` INT          NOT NULL UNIQUE,
    PRIMARY KEY (`key`),
    FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 3. Customers
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `customers_customer` (
    `id`         INT          NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(150) NOT NULL,
    `email`      VARCHAR(254) NOT NULL UNIQUE,
    `phone`      VARCHAR(20)  NOT NULL DEFAULT '',
    `address`    LONGTEXT     NOT NULL DEFAULT '',
    `created_at` DATETIME(6)  NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 4. Vehicles / Cars
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `cars_car` (
    `id`            INT             NOT NULL AUTO_INCREMENT,
    `make`          VARCHAR(100)    NOT NULL,
    `model`         VARCHAR(100)    NOT NULL,
    `year`          INT             NOT NULL,
    `color`         VARCHAR(50)     NOT NULL DEFAULT '',
    `plate_number`  VARCHAR(20)     NOT NULL UNIQUE,
    `status`        VARCHAR(20)     NOT NULL DEFAULT 'pending'
                    COMMENT 'pending | available | in_service | reserved | sold',
    `price`         DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    `mileage`       INT             NOT NULL DEFAULT 0,
    `submitted_by_id` INT           NULL,
    `created_at`    DATETIME(6)     NOT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`submitted_by_id`) REFERENCES `auth_user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 5. Services  (individual service requests per vehicle)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `services_service` (
    `id`              INT             NOT NULL AUTO_INCREMENT,
    `car_id`          INT             NOT NULL,
    `description`     LONGTEXT        NOT NULL,
    `mechanic`        VARCHAR(100)    NOT NULL DEFAULT '',
    `cost`            DECIMAL(10, 2)  NOT NULL DEFAULT 0.00,
    `service_date`    DATE            NOT NULL,
    `completed`       TINYINT(1)      NOT NULL DEFAULT 0,
    `status`          VARCHAR(20)     NOT NULL DEFAULT 'pending'
                      COMMENT 'pending | accepted | rejected | in_progress | completed',
    `requested_by_id` INT             NULL,
    `pickup_date`     DATE            NULL,
    `pickup_details`  LONGTEXT        NOT NULL DEFAULT '',
    `created_at`      DATETIME(6)     NOT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`car_id`)          REFERENCES `cars_car`  (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`requested_by_id`) REFERENCES `auth_user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 6. Bookings  (customer booking for a service appointment)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `bookings_booking` (
    `id`           INT         NOT NULL AUTO_INCREMENT,
    `car_id`       INT         NOT NULL,
    `customer_id`  INT         NOT NULL,
    `service_type` VARCHAR(50) NOT NULL
                   COMMENT 'oil_change | tire_rotation | brake_service | engine_check | full_service | other',
    `booking_date` DATE        NOT NULL,
    `booking_time` TIME(6)     NOT NULL,
    `status`       VARCHAR(20) NOT NULL DEFAULT 'pending'
                   COMMENT 'pending | confirmed | completed | cancelled',
    `notes`        LONGTEXT    NOT NULL DEFAULT '',
    `created_at`   DATETIME(6) NOT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`car_id`)      REFERENCES `cars_car`           (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`customer_id`) REFERENCES `customers_customer` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- Useful Queries
-- ────────────────────────────────────────────────────────────

-- Show all tables:
-- SHOW TABLES;

-- Count rows per table:
-- SELECT 'customers' AS tbl, COUNT(*) AS cnt FROM customers_customer
-- UNION ALL SELECT 'cars',     COUNT(*) FROM cars_car
-- UNION ALL SELECT 'services', COUNT(*) FROM services_service
-- UNION ALL SELECT 'bookings', COUNT(*) FROM bookings_booking
-- UNION ALL SELECT 'users',    COUNT(*) FROM auth_user;
