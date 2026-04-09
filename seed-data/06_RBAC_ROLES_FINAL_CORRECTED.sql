-- ============================================================================
-- RBAC ROLES - FINAL CORRECTED VERSION
-- ============================================================================
-- This file contains ALL RBAC roles with exact database structure
-- Organizations: Yamany (30001) and Efadah (30002)
-- Total: 9 roles per organization = 18 roles
-- Columns: id, organizationId, name, nameAr, description, descriptionAr, 
--          permissions, isSystem, isLocked, isDeleted, deletedAt, deletedBy,
--          createdAt, updatedAt, createdBy
-- Ready to copy-paste and execute
-- ============================================================================

-- ============================================================================
-- YAMANY ORGANIZATION (30001) - 9 ROLES
-- ============================================================================

-- Role 1: Organization Admin (ID: 60001)
INSERT INTO `rbac_roles` (
  `id`,
  `organizationId`,
  `name`,
  `nameAr`,
  `description`,
  `descriptionAr`,
  `permissions`,
  `isSystem`,
  `isLocked`,
  `isDeleted`,
  `createdAt`,
  `updatedAt`,
  `createdBy`
) VALUES (
  60001,
  30001,
  'Organization Admin',
  'مسؤول المنظمة',
  'Full access to all modules, workspaces, and settings. Can manage users and permissions.',
  'وصول كامل إلى جميع الوحدات والمساحات والإعدادات. يمكن إدارة المستخدمين والأذونات.',
  '{"grants":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"projects":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"finance":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"hr":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"meal":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"surveys":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"cases":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"documents":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"logistics":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"donors":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"settings":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true}}',
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
) ON DUPLICATE KEY UPDATE
  `updatedAt` = CURRENT_TIMESTAMP;

-- Role 2: Program Manager (ID: 60002)
INSERT INTO `rbac_roles` (
  `id`,
  `organizationId`,
  `name`,
  `nameAr`,
  `description`,
  `descriptionAr`,
  `permissions`,
  `isSystem`,
  `isLocked`,
  `isDeleted`,
  `createdAt`,
  `updatedAt`,
  `createdBy`
) VALUES (
  60002,
  30001,
  'Program Manager',
  'مدير البرنامج',
  'Manages grants, projects, and program activities. Full access to Case Management and MEAL.',
  'إدارة المنح والمشاريع والأنشطة البرنامجية. وصول كامل لإدارة الحالات والقياس والتقييم والتعلم.',
  '{"grants":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"projects":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"finance":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"hr":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"meal":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"surveys":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"cases":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"documents":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"logistics":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"donors":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"settings":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false}}',
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
) ON DUPLICATE KEY UPDATE
  `updatedAt` = CURRENT_TIMESTAMP;

-- Role 3: Finance Manager (ID: 60003)
INSERT INTO `rbac_roles` (
  `id`,
  `organizationId`,
  `name`,
  `nameAr`,
  `description`,
  `descriptionAr`,
  `permissions`,
  `isSystem`,
  `isLocked`,
  `isDeleted`,
  `createdAt`,
  `updatedAt`,
  `createdBy`
) VALUES (
  60003,
  30001,
  'Finance Manager',
  'مدير المالية',
  'Full access to financial data, budgets, and transactions. Can approve payments and manage budgets.',
  'وصول كامل إلى البيانات المالية والميزانيات والمعاملات. يمكن الموافقة على المدفوعات وإدارة الميزانيات.',
  '{"grants":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"projects":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"finance":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"hr":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"meal":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"surveys":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"cases":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"documents":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"logistics":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"donors":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"settings":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false}}',
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
) ON DUPLICATE KEY UPDATE
  `updatedAt` = CURRENT_TIMESTAMP;

-- Role 4: MEAL Officer (ID: 60004)
INSERT INTO `rbac_roles` (
  `id`,
  `organizationId`,
  `name`,
  `nameAr`,
  `description`,
  `descriptionAr`,
  `permissions`,
  `isSystem`,
  `isLocked`,
  `isDeleted`,
  `createdAt`,
  `updatedAt`,
  `createdBy`
) VALUES (
  60004,
  30001,
  'MEAL Officer',
  'مسؤول القياس والتقييم',
  'Full access to MEAL, Surveys, Accountability & CRM, and Case Management.',
  'وصول كامل للقياس والتقييم والتعلم والمسوحات والمساءلة وإدارة علاقات العملاء وإدارة الحالات.',
  '{"grants":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"projects":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"finance":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"hr":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"meal":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"surveys":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"cases":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"documents":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"logistics":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"donors":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"settings":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false}}',
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
) ON DUPLICATE KEY UPDATE
  `updatedAt` = CURRENT_TIMESTAMP;

-- Role 5: Case Worker (ID: 60005)
INSERT INTO `rbac_roles` (
  `id`,
  `organizationId`,
  `name`,
  `nameAr`,
  `description`,
  `descriptionAr`,
  `permissions`,
  `isSystem`,
  `isLocked`,
  `isDeleted`,
  `createdAt`,
  `updatedAt`,
  `createdBy`
) VALUES (
  60005,
  30001,
  'Case Worker',
  'أخصائي الحالات',
  'Manages individual cases and beneficiary support. Full Case Management access.',
  'المتخصصون وعاملو الحالات. يمكن إدارة الحالات الفردية والدعم المخصص للمستفيدين. وصول كامل لإدارة الحالات.',
  '{"grants":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"projects":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"finance":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"hr":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"meal":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"surveys":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":true},"cases":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"documents":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"logistics":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"donors":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"settings":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false}}',
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
) ON DUPLICATE KEY UPDATE
  `updatedAt` = CURRENT_TIMESTAMP;

-- Role 6: Food Security Officer (ID: 60006)
INSERT INTO `rbac_roles` (
  `id`,
  `organizationId`,
  `name`,
  `nameAr`,
  `description`,
  `descriptionAr`,
  `permissions`,
  `isSystem`,
  `isLocked`,
  `isDeleted`,
  `createdAt`,
  `updatedAt`,
  `createdBy`
) VALUES (
  60006,
  30001,
  'Food Security Officer',
  'مسؤول الأمن الغذائي',
  'Full project access, view-only MEAL, no Case Management or CRM access.',
  'وصول كامل للمشاريع. وصول عرض فقط للقياس والتقييم والتعلم. لا يوجد وصول لإدارة الحالات أو إدارة علاقات العملاء.',
  '{"grants":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"projects":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"finance":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"hr":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"meal":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"surveys":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"cases":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"documents":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"logistics":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"donors":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"settings":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false}}',
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
) ON DUPLICATE KEY UPDATE
  `updatedAt` = CURRENT_TIMESTAMP;

-- Role 7: Viewer (ID: 60007)
INSERT INTO `rbac_roles` (
  `id`,
  `organizationId`,
  `name`,
  `nameAr`,
  `description`,
  `descriptionAr`,
  `permissions`,
  `isSystem`,
  `isLocked`,
  `isDeleted`,
  `createdAt`,
  `updatedAt`,
  `createdBy`
) VALUES (
  60007,
  30001,
  'Viewer',
  'مشاهد',
  'Read-only access to non-sensitive information. No access to Case Management or CRM.',
  'الوصول بصيغة عرض فقط للمعلومات غير الحساسة. لا يوجد وصول لإدارة الحالات أو إدارة علاقات العملاء.',
  '{"grants":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"projects":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"finance":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"hr":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"meal":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"surveys":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"cases":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"documents":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"logistics":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"donors":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"settings":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false}}',
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
) ON DUPLICATE KEY UPDATE
  `updatedAt` = CURRENT_TIMESTAMP;

-- Role 8: Logistic Manager (ID: 90001)
INSERT INTO `rbac_roles` (
  `id`,
  `organizationId`,
  `name`,
  `nameAr`,
  `description`,
  `descriptionAr`,
  `permissions`,
  `isSystem`,
  `isLocked`,
  `isDeleted`,
  `createdAt`,
  `updatedAt`,
  `createdBy`
) VALUES (
  90001,
  30001,
  'Logistic Manager',
  'مدير اللوجستيات',
  'Manages logistics, procurement, and supply chain operations. Full approval authority.',
  'إدارة اللوجستيات والمشتريات وعمليات سلسلة التوريد. سلطة موافقة كاملة.',
  '{"grants":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"projects":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"finance":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"hr":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"meal":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"surveys":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"cases":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"documents":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"logistics":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"donors":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"settings":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false}}',
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
) ON DUPLICATE KEY UPDATE
  `updatedAt` = CURRENT_TIMESTAMP;

-- Role 9: Logistic Officer (ID: 90002)
INSERT INTO `rbac_roles` (
  `id`,
  `organizationId`,
  `name`,
  `nameAr`,
  `description`,
  `descriptionAr`,
  `permissions`,
  `isSystem`,
  `isLocked`,
  `isDeleted`,
  `createdAt`,
  `updatedAt`,
  `createdBy`
) VALUES (
  90002,
  30001,
  'Logistic Officer',
  'ضابط اللوجستيات',
  'Manages logistics operations and inventory. Limited approval authority.',
  'إدارة عمليات اللوجستيات والمخزون. سلطة موافقة محدودة.',
  '{"grants":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"projects":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"finance":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"hr":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"meal":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"surveys":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"cases":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"documents":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"logistics":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"donors":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"settings":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false}}',
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
) ON DUPLICATE KEY UPDATE
  `updatedAt` = CURRENT_TIMESTAMP;

-- ============================================================================
-- EFADAH ORGANIZATION (30002) - 9 ROLES
-- ============================================================================

-- Role 1: Organization Admin (ID: 120001)
INSERT INTO `rbac_roles` (
  `id`,
  `organizationId`,
  `name`,
  `nameAr`,
  `description`,
  `descriptionAr`,
  `permissions`,
  `isSystem`,
  `isLocked`,
  `isDeleted`,
  `createdAt`,
  `updatedAt`,
  `createdBy`
) VALUES (
  120001,
  30002,
  'Organization Admin',
  'مسؤول المنظمة',
  'Full access to all modules, workspaces, and settings. Can manage users and permissions.',
  'وصول كامل إلى جميع الوحدات والمساحات والإعدادات. يمكن إدارة المستخدمين والأذونات.',
  '{"grants":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"projects":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"finance":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"hr":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"meal":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"surveys":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"cases":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"documents":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"logistics":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"donors":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"settings":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true}}',
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
) ON DUPLICATE KEY UPDATE
  `updatedAt` = CURRENT_TIMESTAMP;

-- Role 2: Program Manager (ID: 120002)
INSERT INTO `rbac_roles` (
  `id`,
  `organizationId`,
  `name`,
  `nameAr`,
  `description`,
  `descriptionAr`,
  `permissions`,
  `isSystem`,
  `isLocked`,
  `isDeleted`,
  `createdAt`,
  `updatedAt`,
  `createdBy`
) VALUES (
  120002,
  30002,
  'Program Manager',
  'مدير البرنامج',
  'Manages grants, projects, and program activities. Full access to Case Management and MEAL.',
  'إدارة المنح والمشاريع والأنشطة البرنامجية. وصول كامل لإدارة الحالات والقياس والتقييم والتعلم.',
  '{"grants":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"projects":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"finance":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"hr":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"meal":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"surveys":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"cases":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"documents":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"logistics":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"donors":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"settings":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false}}',
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
) ON DUPLICATE KEY UPDATE
  `updatedAt` = CURRENT_TIMESTAMP;

-- Role 3: Finance Manager (ID: 120003)
INSERT INTO `rbac_roles` (
  `id`,
  `organizationId`,
  `name`,
  `nameAr`,
  `description`,
  `descriptionAr`,
  `permissions`,
  `isSystem`,
  `isLocked`,
  `isDeleted`,
  `createdAt`,
  `updatedAt`,
  `createdBy`
) VALUES (
  120003,
  30002,
  'Finance Manager',
  'مدير المالية',
  'Full access to financial data, budgets, and transactions. Can approve payments and manage budgets.',
  'وصول كامل إلى البيانات المالية والميزانيات والمعاملات. يمكن الموافقة على المدفوعات وإدارة الميزانيات.',
  '{"grants":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"projects":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"finance":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"hr":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"meal":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"surveys":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"cases":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"documents":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"logistics":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"donors":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"settings":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false}}',
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
) ON DUPLICATE KEY UPDATE
  `updatedAt` = CURRENT_TIMESTAMP;

-- Role 4: MEAL Officer (ID: 120004)
INSERT INTO `rbac_roles` (
  `id`,
  `organizationId`,
  `name`,
  `nameAr`,
  `description`,
  `descriptionAr`,
  `permissions`,
  `isSystem`,
  `isLocked`,
  `isDeleted`,
  `createdAt`,
  `updatedAt`,
  `createdBy`
) VALUES (
  120004,
  30002,
  'MEAL Officer',
  'مسؤول القياس والتقييم',
  'Full access to MEAL, Surveys, Accountability & CRM, and Case Management.',
  'وصول كامل للقياس والتقييم والتعلم والمسوحات والمساءلة وإدارة علاقات العملاء وإدارة الحالات.',
  '{"grants":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"projects":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"finance":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"hr":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"meal":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"surveys":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"cases":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"documents":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"logistics":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"donors":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"settings":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false}}',
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
) ON DUPLICATE KEY UPDATE
  `updatedAt` = CURRENT_TIMESTAMP;

-- Role 5: Case Worker (ID: 120005)
INSERT INTO `rbac_roles` (
  `id`,
  `organizationId`,
  `name`,
  `nameAr`,
  `description`,
  `descriptionAr`,
  `permissions`,
  `isSystem`,
  `isLocked`,
  `isDeleted`,
  `createdAt`,
  `updatedAt`,
  `createdBy`
) VALUES (
  120005,
  30002,
  'Case Worker',
  'أخصائي الحالات',
  'Manages individual cases and beneficiary support. Full Case Management access.',
  'المتخصصون وعاملو الحالات. يمكن إدارة الحالات الفردية والدعم المخصص للمستفيدين. وصول كامل لإدارة الحالات.',
  '{"grants":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"projects":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"finance":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"hr":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"meal":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"surveys":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":true},"cases":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"documents":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"logistics":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"donors":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"settings":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false}}',
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
) ON DUPLICATE KEY UPDATE
  `updatedAt` = CURRENT_TIMESTAMP;

-- Role 6: Food Security Officer (ID: 120006)
INSERT INTO `rbac_roles` (
  `id`,
  `organizationId`,
  `name`,
  `nameAr`,
  `description`,
  `descriptionAr`,
  `permissions`,
  `isSystem`,
  `isLocked`,
  `isDeleted`,
  `createdAt`,
  `updatedAt`,
  `createdBy`
) VALUES (
  120006,
  30002,
  'Food Security Officer',
  'مسؤول الأمن الغذائي',
  'Full project access, view-only MEAL, no Case Management or CRM access.',
  'وصول كامل للمشاريع. وصول عرض فقط للقياس والتقييم والتعلم. لا يوجد وصول لإدارة الحالات أو إدارة علاقات العملاء.',
  '{"grants":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"projects":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"finance":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"hr":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"meal":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"surveys":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"cases":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"documents":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"logistics":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"donors":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"settings":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false}}',
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
) ON DUPLICATE KEY UPDATE
  `updatedAt` = CURRENT_TIMESTAMP;

-- Role 7: Viewer (ID: 120007)
INSERT INTO `rbac_roles` (
  `id`,
  `organizationId`,
  `name`,
  `nameAr`,
  `description`,
  `descriptionAr`,
  `permissions`,
  `isSystem`,
  `isLocked`,
  `isDeleted`,
  `createdAt`,
  `updatedAt`,
  `createdBy`
) VALUES (
  120007,
  30002,
  'Viewer',
  'مشاهد',
  'Read-only access to non-sensitive information. No access to Case Management or CRM.',
  'الوصول بصيغة عرض فقط للمعلومات غير الحساسة. لا يوجد وصول لإدارة الحالات أو إدارة علاقات العملاء.',
  '{"grants":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"projects":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"finance":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"hr":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"meal":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"surveys":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"cases":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"documents":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"logistics":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"donors":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"settings":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false}}',
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
) ON DUPLICATE KEY UPDATE
  `updatedAt` = CURRENT_TIMESTAMP;

-- Role 8: Logistic Manager (ID: 120008)
INSERT INTO `rbac_roles` (
  `id`,
  `organizationId`,
  `name`,
  `nameAr`,
  `description`,
  `descriptionAr`,
  `permissions`,
  `isSystem`,
  `isLocked`,
  `isDeleted`,
  `createdAt`,
  `updatedAt`,
  `createdBy`
) VALUES (
  120008,
  30002,
  'Logistic Manager',
  'مدير اللوجستيات',
  'Manages logistics, procurement, and supply chain operations. Full approval authority.',
  'إدارة اللوجستيات والمشتريات وعمليات سلسلة التوريد. سلطة موافقة كاملة.',
  '{"grants":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"projects":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"finance":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"hr":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"meal":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"surveys":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"cases":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"documents":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"logistics":{"view":true,"create":true,"edit":true,"delete":true,"export":true,"approve":true,"submit":true},"donors":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"settings":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false}}',
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
) ON DUPLICATE KEY UPDATE
  `updatedAt` = CURRENT_TIMESTAMP;

-- Role 9: Logistic Officer (ID: 120009)
INSERT INTO `rbac_roles` (
  `id`,
  `organizationId`,
  `name`,
  `nameAr`,
  `description`,
  `descriptionAr`,
  `permissions`,
  `isSystem`,
  `isLocked`,
  `isDeleted`,
  `createdAt`,
  `updatedAt`,
  `createdBy`
) VALUES (
  120009,
  30002,
  'Logistic Officer',
  'ضابط اللوجستيات',
  'Manages logistics operations and inventory. Limited approval authority.',
  'إدارة عمليات اللوجستيات والمخزون. سلطة موافقة محدودة.',
  '{"grants":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"projects":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"finance":{"view":true,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"hr":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"meal":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"surveys":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"cases":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"documents":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"logistics":{"view":true,"create":true,"edit":true,"delete":false,"export":true,"approve":false,"submit":true},"donors":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false},"settings":{"view":false,"create":false,"edit":false,"delete":false,"export":false,"approve":false,"submit":false}}',
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
) ON DUPLICATE KEY UPDATE
  `updatedAt` = CURRENT_TIMESTAMP;

-- ============================================================================
-- VERIFY RBAC ROLES CREATED
-- ============================================================================
-- Run this query to verify all 18 roles were created:
-- SELECT id, organizationId, name, nameAr FROM rbac_roles 
-- WHERE organizationId IN (30001, 30002) AND isDeleted = 0
-- ORDER BY organizationId, id;
