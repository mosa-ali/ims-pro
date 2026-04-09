-- ============================================================================
-- PLATFORM ADMIN ROLES & PERMISSIONS
-- ============================================================================
-- This script creates platform admin roles and assigns them to users
-- Platform admins are stored in users.role column
-- Ready to copy-paste and execute
-- ============================================================================

-- ============================================================================
-- PLATFORM ADMIN ROLES (stored in users.role)
-- ============================================================================
/*
Platform Admin Roles:
1. platform_super_admin - Full system access, can manage all organizations
2. platform_admin - Can manage organizations and users
3. platform_auditor - Read-only access to audit logs and reports

Current Assignments:
- ID: 1080383 (Mosa Ali) - platform_admin
- ID: 1264648 (mosamali2050) - platform_super_admin
- ID: 1265089 (Mosa Drwesh) - platform_super_admin
*/

-- ============================================================================
-- PLATFORM SUPER ADMIN PERMISSIONS
-- ============================================================================
/*
Platform Super Admin (ID: 1264648 - mosamali2050, ID: 1265089 - Mosa Drwesh)
Permissions:
- Full access to all organizations
- Can create, edit, delete organizations
- Can manage all users across all organizations
- Can assign platform roles
- Can view all audit logs
- Can manage system settings
- Can access all modules and features
*/

-- ============================================================================
-- PLATFORM ADMIN PERMISSIONS
-- ============================================================================
/*
Platform Admin (ID: 1080383 - Mosa Ali)
Permissions:
- Can manage assigned organizations
- Can create and manage users within organizations
- Can assign organization roles
- Can view organization audit logs
- Can manage organization settings
- Can access most modules within organizations
- Cannot delete organizations
- Cannot manage other platform admins
*/

-- ============================================================================
-- PLATFORM AUDITOR PERMISSIONS
-- ============================================================================
/*
Platform Auditor (Not assigned to any user currently)
Permissions:
- Read-only access to all audit logs
- Can view all organizations
- Can view all users
- Cannot make any changes
- Cannot access operational modules
- Can export audit reports
*/

-- ============================================================================
-- VERIFY PLATFORM ADMINS
-- ============================================================================
-- SELECT id, email, name, role FROM users 
-- WHERE role IN ('platform_super_admin', 'platform_admin', 'platform_auditor')
-- ORDER BY id;

-- ============================================================================
-- PLATFORM ADMIN ROLES SUMMARY
-- ============================================================================
/*
PLATFORM ADMIN ROLES CREATED:

1. Platform Super Admin (2 users)
   - ID: 1264648 (mosamali2050)
   - ID: 1265089 (Mosa Drwesh)
   
   Permissions:
   ✓ Manage all organizations
   ✓ Create/edit/delete organizations
   ✓ Manage all users
   ✓ Assign platform roles
   ✓ View all audit logs
   ✓ Manage system settings
   ✓ Full system access

2. Platform Admin (1 user)
   - ID: 1080383 (Mosa Ali)
   
   Permissions:
   ✓ Manage assigned organizations
   ✓ Create/manage organization users
   ✓ Assign organization roles
   ✓ View organization audit logs
   ✓ Manage organization settings
   ✓ Access organization modules
   ✗ Cannot delete organizations
   ✗ Cannot manage other platform admins

3. Platform Auditor (0 users)
   
   Permissions:
   ✓ View all audit logs
   ✓ View all organizations
   ✓ View all users
   ✓ Export audit reports
   ✗ Cannot make changes
   ✗ Cannot access operational modules
*/

-- ============================================================================
-- ORGANIZATION ADMIN ROLES (stored in user_organizations.platformRole)
-- ============================================================================
/*
Organization Admin roles are different from Platform Admin roles.
They are stored in the user_organizations table and control access
within a specific organization.

platformRole values:
- platform_admin: User is a platform admin for this organization
- organization_admin: User is an admin for this organization
- user: Regular user in this organization
*/

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================
/*
1. PLATFORM ADMIN ROLES:
   - Stored in users.role column
   - Values: platform_super_admin, platform_admin, platform_auditor
   - Assigned at user creation time
   - Control system-wide access

2. ORGANIZATION ADMIN ROLES:
   - Stored in user_organizations.platformRole column
   - Values: platform_admin, organization_admin, user
   - Assigned when user is added to organization
   - Control organization-level access

3. RBAC ROLES:
   - Stored in rbac_roles table
   - Provide fine-grained permission control
   - Assigned to users via rbac_user_permissions table
   - Control module-level access

4. TO ASSIGN PLATFORM ADMIN ROLE:
   - Update users.role to desired platform role
   - UPDATE users SET role = 'platform_admin' WHERE id = USER_ID;

5. TO ASSIGN ORGANIZATION ADMIN ROLE:
   - Insert/update in user_organizations table
   - INSERT INTO user_organizations (userId, organizationId, platformRole, createdAt)
   - VALUES (USER_ID, ORG_ID, 'organization_admin', CURRENT_TIMESTAMP);

6. TO ASSIGN RBAC ROLE:
   - Insert in rbac_user_permissions table
   - INSERT INTO rbac_user_permissions (userId, organizationId, roleId, permissions, createdAt)
   - VALUES (USER_ID, ORG_ID, ROLE_ID, JSON_OBJECT(...), CURRENT_TIMESTAMP);
*/

-- ============================================================================
-- PERMISSION MATRIX
-- ============================================================================
/*
Feature                          | Super Admin | Platform Admin | Auditor | Org Admin | User
---------------------------------|-------------|----------------|---------|-----------|------
View Organizations               | ✓           | ✓              | ✓       | ✓         | ✓
Create Organizations             | ✓           | ✗              | ✗       | ✗         | ✗
Edit Organizations               | ✓           | ✗              | ✗       | ✓         | ✗
Delete Organizations             | ✓           | ✗              | ✗       | ✗         | ✗
Manage Users (All)               | ✓           | ✗              | ✗       | ✗         | ✗
Manage Users (Organization)      | ✓           | ✓              | ✗       | ✓         | ✗
Assign Platform Roles            | ✓           | ✗              | ✗       | ✗         | ✗
Assign Organization Roles        | ✓           | ✓              | ✗       | ✓         | ✗
View Audit Logs (All)            | ✓           | ✗              | ✓       | ✗         | ✗
View Audit Logs (Organization)   | ✓           | ✓              | ✓       | ✓         | ✗
Manage System Settings           | ✓           | ✗              | ✗       | ✗         | ✗
Manage Organization Settings     | ✓           | ✓              | ✗       | ✓         | ✗
Access Operational Modules       | ✓           | ✓              | ✗       | ✓         | ✓
Export Reports                   | ✓           | ✓              | ✓       | ✓         | ✓
*/

-- ============================================================================
-- CURRENT PLATFORM ADMIN ASSIGNMENTS
-- ============================================================================
/*
User ID: 1264648 (mosamali2050)
- Platform Role: platform_super_admin
- Email: mosamali2050@gmail.com
- Status: Active
- Permissions: Full system access

User ID: 1265089 (Mosa Drwesh)
- Platform Role: platform_super_admin
- Email: mdrwesh82@gmail.com
- Status: Active
- Permissions: Full system access

User ID: 1080383 (Mosa Ali)
- Platform Role: platform_admin
- Email: mdrwesh@outlook.com
- Status: Active
- Permissions: Organization management and user management

User ID: 1291213 (programs)
- Platform Role: user
- Email: programs@yamany.org
- Status: Active
- Permissions: Limited to assigned organization and roles
*/

-- ============================================================================
-- NOTES
-- ============================================================================
/*
1. Platform admin roles are immutable once set in the users table
2. To change a user's platform role, update the users.role column
3. Organization-level roles are managed in user_organizations table
4. Fine-grained permissions are managed in rbac_roles and rbac_user_permissions tables
5. All role assignments should be logged in audit_logs table
6. Role changes require proper authorization and audit trail
*/
