/**
 * Shared admin check utility
 * Checks if a user has admin-level access (platform_admin, organization_admin, Admin, System Admin)
 * Used across settings pages and other admin-only areas
 */
export function isUserAdmin(user: any): boolean {
 if (!user) return false;
 
 // Check platformRole (from user_organizations table)
 if (user.platformRole === "platform_admin" || user.platformRole === "organization_admin") {
 return true;
 }
 
 // Check role (from users table)
 if (
 user.role === "platform_admin" || 
 user.role === "organization_admin" || 
 user.role === "admin" ||
 user.role === "Admin" ||
 user.role === "System Admin"
 ) {
 return true;
 }
 
 return false;
}
