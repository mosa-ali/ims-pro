export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
 const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
 const appId = import.meta.env.VITE_APP_ID;
 const redirectUri = `${window.location.origin}/api/oauth/callback`;
 const state = btoa(redirectUri);

 const url = new URL(`${oauthPortalUrl}/app-auth`);
 url.searchParams.set("appId", appId);
 url.searchParams.set("redirectUri", redirectUri);
 url.searchParams.set("state", state);
 url.searchParams.set("type", "signIn");

 return url.toString();
};

/**
 * Check if a user role has platform admin privileges
 * Platform Super Admin and Platform Admin both have platform-level access
 */
export function isPlatformAdmin(role?: string): boolean {
 return role === 'platform_super_admin' || role === 'platform_admin';
}
