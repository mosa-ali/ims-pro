-- ============================================================================
-- USER OPERATING UNIT ASSIGNMENTS
-- ============================================================================
-- This script assigns users to operating units with appropriate roles
-- Ready to copy-paste and execute
-- ============================================================================

-- ============================================================================
-- INSERT USER OPERATING UNIT ASSIGNMENTS
-- ============================================================================

-- Assignment 1: Mosa Ali (1080383) -> YDH Headquarters (30001) as organization_admin
INSERT INTO `user_operating_units` (
  `userId`,
  `operatingUnitId`,
  `role`,
  `createdAt`
) VALUES (
  1080383,
  30001,
  'organization_admin',
  CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
  `createdAt` = `createdAt`;

-- Assignment 2: Mosa Ali (1080383) -> Jordan Office Yamany (60005) as organization_admin
INSERT INTO `user_operating_units` (
  `userId`,
  `operatingUnitId`,
  `role`,
  `createdAt`
) VALUES (
  1080383,
  60005,
  'organization_admin',
  CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
  `createdAt` = `createdAt`;

-- Assignment 3: mosamali2050 (1264648) -> YDH Headquarters (30001) as organization_admin
INSERT INTO `user_operating_units` (
  `userId`,
  `operatingUnitId`,
  `role`,
  `createdAt`
) VALUES (
  1264648,
  30001,
  'organization_admin',
  CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
  `createdAt` = `createdAt`;

-- Assignment 4: mosamali2050 (1264648) -> EFADAH Headquarters (30002) as organization_admin
INSERT INTO `user_operating_units` (
  `userId`,
  `operatingUnitId`,
  `role`,
  `createdAt`
) VALUES (
  1264648,
  30002,
  'organization_admin',
  CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
  `createdAt` = `createdAt`;

-- Assignment 5: mosamali2050 (1264648) -> Jordan Office Efadah (90001) as organization_admin
INSERT INTO `user_operating_units` (
  `userId`,
  `operatingUnitId`,
  `role`,
  `createdAt`
) VALUES (
  1264648,
  90001,
  'organization_admin',
  CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
  `createdAt` = `createdAt`;

-- Assignment 6: Mosa Drwesh (1265089) -> YDH Headquarters (30001) as organization_admin
INSERT INTO `user_operating_units` (
  `userId`,
  `operatingUnitId`,
  `role`,
  `createdAt`
) VALUES (
  1265089,
  30001,
  'organization_admin',
  CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
  `createdAt` = `createdAt`;

-- Assignment 7: Mosa Drwesh (1265089) -> EFADAH Headquarters (30002) as organization_admin
INSERT INTO `user_operating_units` (
  `userId`,
  `operatingUnitId`,
  `role`,
  `createdAt`
) VALUES (
  1265089,
  30002,
  'organization_admin',
  CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
  `createdAt` = `createdAt`;

-- Assignment 8: Mosa Drwesh (1265089) -> Jordan Office Efadah (90001) as organization_admin
INSERT INTO `user_operating_units` (
  `userId`,
  `operatingUnitId`,
  `role`,
  `createdAt`
) VALUES (
  1265089,
  90001,
  'organization_admin',
  CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
  `createdAt` = `createdAt`;

-- Assignment 9: programs (1291213) -> YDH Headquarters (30001) as user
INSERT INTO `user_operating_units` (
  `userId`,
  `operatingUnitId`,
  `role`,
  `createdAt`
) VALUES (
  1291213,
  30001,
  'user',
  CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
  `createdAt` = `createdAt`;

-- Assignment 10: programs (1291213) -> EFADAH Headquarters (30002) as user
INSERT INTO `user_operating_units` (
  `userId`,
  `operatingUnitId`,
  `role`,
  `createdAt`
) VALUES (
  1291213,
  30002,
  'user',
  CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
  `createdAt` = `createdAt`;

-- ============================================================================
-- VERIFY USER OPERATING UNIT ASSIGNMENTS
-- ============================================================================
-- SELECT 
--   uou.id, u.email, u.name, o.name as organization_name,
--   ou.name as operating_unit_name, uou.role, uou.createdAt
-- FROM user_operating_units uou
-- LEFT JOIN users u ON uou.userId = u.id
-- LEFT JOIN operating_units ou ON uou.operatingUnitId = ou.id
-- LEFT JOIN organizations o ON ou.organizationId = o.id
-- WHERE ou.organizationId IN (30001, 30002)
-- ORDER BY o.id, ou.id, u.id;

-- ============================================================================
-- USER OPERATING UNIT ASSIGNMENTS SUMMARY
-- ============================================================================
/*
ASSIGNMENTS CREATED:

Organization: Yamany Development Foundation (30001)
  YDH Headquarters (30001):
    - Mosa Ali (1080383) - Role: organization_admin
    - mosamali2050 (1264648) - Role: organization_admin
    - Mosa Drwesh (1265089) - Role: organization_admin
    - programs (1291213) - Role: user

  Jordan Office (60005):
    - Mosa Ali (1080383) - Role: organization_admin

Organization: Efadah Organization for Development (30002)
  EFADAH Headquarters (30002):
    - mosamali2050 (1264648) - Role: organization_admin
    - Mosa Drwesh (1265089) - Role: organization_admin
    - programs (1291213) - Role: user

  Jordan Office (90001):
    - mosamali2050 (1264648) - Role: organization_admin
    - Mosa Drwesh (1265089) - Role: organization_admin

TOTAL ASSIGNMENTS: 10
*/

-- ============================================================================
-- ROLE REFERENCE
-- ============================================================================
/*
role values in user_operating_units table:
- organization_admin: User is an admin for this operating unit
- user: Regular user in this operating unit
*/
