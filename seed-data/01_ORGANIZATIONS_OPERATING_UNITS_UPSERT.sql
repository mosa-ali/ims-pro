-- ============================================================================
-- ORGANIZATIONS & OPERATING UNITS - UPSERT
-- ============================================================================
-- This script uses the exact data from _9.txt
-- Ready to copy-paste and execute
-- ============================================================================

-- ============================================================================
-- 1) ORGANIZATIONS (UPSERT)
-- ============================================================================
INSERT INTO `organizations` (
  `id`, `name`, `domain`, `status`, `country`, `timezone`, `currency`, 
  `notificationEmail`, `defaultLanguage`, `createdAt`, `updatedAt`, `nameAr`, 
  `shortCode`, `tenantId`, `primaryAdminId`, `secondaryAdminId`, 
  `isDeleted`, `deletedAt`, `deletedBy`
)
VALUES
  (30001, 'Yamany Development Foundation', 'yamany.org', 'active', 'Yemen', 'Asia/Aden', 'USD', NULL, 'en', '2026-01-26 21:07:00', '2026-02-18 18:57:09', NULL, 'YDH', '3dd371bd-d0ec-40d6-8b6b-0cc792a96a39', 2490368, 1291213, 0, NULL, NULL),
  (30002, 'Efadah Organization for Development (EFADAH)', 'efadah-ye.org', 'active', 'Yemen', 'Asia/Aden', 'USD', NULL, 'en', '2026-01-26 21:07:00', '2026-02-08 13:54:44', NULL, 'EFADAH', '06ba8aad-2c9b-4ddb-913d-88b7a2204435', 1265089, 1264648, 0, NULL, NULL)
ON DUPLICATE KEY UPDATE
  `name`=VALUES(`name`), `domain`=VALUES(`domain`), `status`=VALUES(`status`),
  `country`=VALUES(`country`), `timezone`=VALUES(`timezone`), `currency`=VALUES(`currency`),
  `notificationEmail`=VALUES(`notificationEmail`), `defaultLanguage`=VALUES(`defaultLanguage`),
  `createdAt`=VALUES(`createdAt`), `updatedAt`=VALUES(`updatedAt`),
  `nameAr`=VALUES(`nameAr`), `shortCode`=VALUES(`shortCode`), `tenantId`=VALUES(`tenantId`),
  `primaryAdminId`=VALUES(`primaryAdminId`), `secondaryAdminId`=VALUES(`secondaryAdminId`),
  `isDeleted`=VALUES(`isDeleted`), `deletedAt`=VALUES(`deletedAt`), `deletedBy`=VALUES(`deletedBy`);

-- ============================================================================
-- 2) OPERATING UNITS (UPSERT)
-- ============================================================================
INSERT INTO `operating_units` (
  `id`, `organizationId`, `name`, `type`, `country`, `city`, `currency`, 
  `timezone`, `status`, `createdAt`, `updatedAt`, `code`, `officeAdminName`, 
  `officeAdminEmail`, `isDeleted`, `deletedAt`, `deletedBy`
)
VALUES
  (30001, 30001, 'YDH Headquarters', 'hq', 'Yemen', 'Sana''a', 'USD', 'Asia/Aden', 'active', '2026-01-26 21:07:00', '2026-02-07 00:55:49', 'HQ', NULL, NULL, 0, NULL, NULL),
  (30002, 30002, 'EFADAH Headquarters', 'hq', 'Yemen', 'Sana''a', 'USD', 'Asia/Aden', 'active', '2026-01-26 21:07:00', '2026-01-30 00:36:00', 'EFADAH-01', NULL, NULL, 0, NULL, NULL),
  (60005, 30001, 'Jordan Office', 'regional', 'Jordan', NULL, 'USD', 'UTC', 'active', '2026-01-27 22:11:00', '2026-01-30 01:00:00', 'YDH-02', NULL, NULL, 0, NULL, 1),
  (90001, 30002, 'Jordan Office', 'regional', 'Jordan', NULL, 'USD', 'UTC', 'active', '2026-01-29 20:42:00', '2026-01-30 00:36:00', 'EFADAH-02', NULL, NULL, 0, NULL, NULL)
ON DUPLICATE KEY UPDATE
  `organizationId`=VALUES(`organizationId`), `name`=VALUES(`name`), `type`=VALUES(`type`),
  `country`=VALUES(`country`), `city`=VALUES(`city`), `currency`=VALUES(`currency`),
  `timezone`=VALUES(`timezone`), `status`=VALUES(`status`),
  `createdAt`=VALUES(`createdAt`), `updatedAt`=VALUES(`updatedAt`),
  `code`=VALUES(`code`), `officeAdminName`=VALUES(`officeAdminName`),
  `officeAdminEmail`=VALUES(`officeAdminEmail`), `isDeleted`=VALUES(`isDeleted`),
  `deletedAt`=VALUES(`deletedAt`), `deletedBy`=VALUES(`deletedBy`);

-- ============================================================================
-- VERIFY ORGANIZATIONS & OPERATING UNITS
-- ============================================================================
-- SELECT * FROM organizations WHERE id IN (30001, 30002) ORDER BY id;
-- SELECT * FROM operating_units WHERE id IN (30001, 30002, 60005, 90001) ORDER BY id;
