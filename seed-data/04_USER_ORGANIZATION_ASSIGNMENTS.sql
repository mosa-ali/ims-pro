-- ============================================================================
-- USER ORGANIZATION ASSIGNMENTS
-- ============================================================================
-- This script assigns users to organizations with appropriate roles
-- Ready to copy-paste and execute
-- ============================================================================

-- ============================================================================
-- INSERT USER ORGANIZATION ASSIGNMENTS
-- ============================================================================

-- Assignment 1: Mosa Ali (1080383) -> Yamany (30001) as platform_admin
INSERT INTO `user_organizations` (
  `userId`,
  `organizationId`,
  `platformRole`,
  `createdAt`
) VALUES (
  1080383,
  30001,
  'platform_admin',
  CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
  `createdAt` = `createdAt`;

-- Assignment 2: mosamali2050 (1264648) -> Yamany (30001) as platform_admin
INSERT INTO `user_organizations` (
  `userId`,
  `organizationId`,
  `platformRole`,
  `createdAt`
) VALUES (
  1264648,
  30001,
  'platform_admin',
  CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
  `createdAt` = `createdAt`;

-- Assignment 3: mosamali2050 (1264648) -> Efadah (30002) as platform_admin
INSERT INTO `user_organizations` (
  `userId`,
  `organizationId`,
  `platformRole`,
  `createdAt`
) VALUES (
  1264648,
  30002,
  'platform_admin',
  CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
  `createdAt` = `createdAt`;

-- Assignment 4: Mosa Drwesh (1265089) -> Yamany (30001) as platform_admin
INSERT INTO `user_organizations` (
  `userId`,
  `organizationId`,
  `platformRole`,
  `createdAt`
) VALUES (
  1265089,
  30001,
  'platform_admin',
  CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
  `createdAt` = `createdAt`;

-- Assignment 5: Mosa Drwesh (1265089) -> Efadah (30002) as platform_admin
INSERT INTO `user_organizations` (
  `userId`,
  `organizationId`,
  `platformRole`,
  `createdAt`
) VALUES (
  1265089,
  30002,
  'platform_admin',
  CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
  `createdAt` = `createdAt`;

-- Assignment 6: programs (1291213) -> Yamany (30001) as organization_admin
INSERT INTO `user_organizations` (
  `userId`,
  `organizationId`,
  `platformRole`,
  `createdAt`
) VALUES (
  1291213,
  30001,
  'organization_admin',
  CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
  `createdAt` = `createdAt`;

-- Assignment 7: programs (1291213) -> Efadah (30002) as user
INSERT INTO `user_organizations` (
  `userId`,
  `organizationId`,
  `platformRole`,
  `createdAt`
) VALUES (
  1291213,
  30002,
  'user',
  CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
  `createdAt` = `createdAt`;

-- ============================================================================
-- VERIFY USER ORGANIZATION ASSIGNMENTS
-- ============================================================================
-- SELECT 
--   uo.id, u.email, u.name, o.name as organization_name, 
--   uo.platformRole, uo.createdAt
-- FROM user_organizations uo
-- LEFT JOIN users u ON uo.userId = u.id
-- LEFT JOIN organizations o ON uo.organizationId = o.id
-- WHERE uo.organizationId IN (30001, 30002)
-- ORDER BY o.id, u.id;

-- ============================================================================
-- USER ORGANIZATION ASSIGNMENTS SUMMARY
-- ============================================================================
/*
ASSIGNMENTS CREATED:

Organization: Yamany Development Foundation (30001)
  1. Mosa Ali (1080383) - Role: platform_admin
  2. mosamali2050 (1264648) - Role: platform_admin
  3. Mosa Drwesh (1265089) - Role: platform_admin
  4. programs (1291213) - Role: organization_admin

Organization: Efadah Organization for Development (30002)
  1. mosamali2050 (1264648) - Role: platform_admin
  2. Mosa Drwesh (1265089) - Role: platform_admin
  3. programs (1291213) - Role: user

TOTAL ASSIGNMENTS: 7
*/

-- ============================================================================
-- ROLE REFERENCE
-- ============================================================================
/*
platformRole values in user_organizations table:
- platform_admin: User has platform admin access to this organization
- organization_admin: User is an admin for this organization
- user: Regular user in this organization
*/
