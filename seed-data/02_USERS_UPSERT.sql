-- ============================================================================
-- USERS - UPSERT
-- ============================================================================
-- This script uses the exact data from _9.txt
-- Ready to copy-paste and execute
-- ============================================================================

-- ============================================================================
-- 3) USERS (UPSERT)
-- ============================================================================
INSERT INTO `users` (
  `id`, `openId`, `name`, `email`, `loginMethod`, `authenticationProvider`, 
  `externalIdentityId`, `role`, `createdAt`, `updatedAt`, `lastSignedIn`, 
  `organizationId`, `currentOrganizationId`, `languagePreference`, `isDeleted`, 
  `deletedAt`, `deletedBy`, `deletionReason`, `passwordResetToken`, `passwordResetExpiry`
)
VALUES
  (1080383, '3dpWpYwuvmbie7YWiB9mjE', 'Mosa Ali', 'mdrwesh@outlook.com', 'email', 'email', NULL, 'platform_admin', '2026-02-03 18:36:44', '2026-02-05 23:42:26', '2026-02-05 23:42:27', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL),
  (1264648, 'm9rxrbEffQdRUFvPZS9Gps', 'mosamali2050', 'mosamali2050@gmail.com', 'email', 'email', NULL, 'platform_super_admin', '2026-02-08 13:10:56', '2026-02-18 23:55:22', '2026-02-18 18:55:23', NULL, NULL, 'en', 0, NULL, NULL, NULL, NULL, NULL),
  (1265089, '3d6F6bzKF4EcqVVd2D5xox', 'Mosa Drwesh', 'mdrwesh82@gmail.com', 'google', 'email', NULL, 'platform_super_admin', '2026-02-08 13:54:44', '2026-02-08 16:13:24', '2026-02-08 16:13:25', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL),
  (1291213, 'DtvbmQuavshZjaafxECNVx', 'programs', 'programs@yamany.org', 'email', 'email', NULL, 'user', '2026-02-09 13:17:51', '2026-02-18 19:01:37', '2026-02-18 14:01:37', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE
  `openId`=VALUES(`openId`), `name`=VALUES(`name`), `email`=VALUES(`email`),
  `loginMethod`=VALUES(`loginMethod`), `authenticationProvider`=VALUES(`authenticationProvider`),
  `externalIdentityId`=VALUES(`externalIdentityId`), `role`=VALUES(`role`),
  `createdAt`=VALUES(`createdAt`), `updatedAt`=VALUES(`updatedAt`), `lastSignedIn`=VALUES(`lastSignedIn`),
  `organizationId`=VALUES(`organizationId`), `currentOrganizationId`=VALUES(`currentOrganizationId`),
  `languagePreference`=VALUES(`languagePreference`), `isDeleted`=VALUES(`isDeleted`),
  `deletedAt`=VALUES(`deletedAt`), `deletedBy`=VALUES(`deletedBy`),
  `deletionReason`=VALUES(`deletionReason`), `passwordResetToken`=VALUES(`passwordResetToken`),
  `passwordResetExpiry`=VALUES(`passwordResetExpiry`);

-- ============================================================================
-- VERIFY USERS
-- ============================================================================
-- SELECT id, email, name, role FROM users WHERE id IN (1080383, 1264648, 1265089, 1291213) ORDER BY id;

-- ============================================================================
-- USER DATA SUMMARY
-- ============================================================================
/*
USERS CREATED:

1. ID: 1080383
   - Name: Mosa Ali
   - Email: mdrwesh@outlook.com
   - Role: platform_admin
   - OpenID: 3dpWpYwuvmbie7YWiB9mjE

2. ID: 1264648
   - Name: mosamali2050
   - Email: mosamali2050@gmail.com
   - Role: platform_super_admin
   - OpenID: m9rxrbEffQdRUFvPZS9Gps

3. ID: 1265089
   - Name: Mosa Drwesh
   - Email: mdrwesh82@gmail.com
   - Role: platform_super_admin
   - OpenID: 3d6F6bzKF4EcqVVd2D5xox

4. ID: 1291213
   - Name: programs
   - Email: programs@yamany.org
   - Role: user
   - OpenID: DtvbmQuavshZjaafxECNVx
*/
