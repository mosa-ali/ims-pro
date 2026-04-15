export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // Microsoft Entra ID / Azure AD credentials
  MS_CLIENT_ID: process.env.MS_CLIENT_ID ?? "",
  MS_CLIENT_SECRET: process.env.MS_CLIENT_SECRET ?? "",
  MS_TENANT_ID: process.env.MS_TENANT_ID ?? "",
  MS_REDIRECT_URI: process.env.MS_REDIRECT_URI ?? "",
  
  // ✅ FIX: Add missing MS_GRAPH_SCOPE property
  // This is the scope for Microsoft Graph API access
  // Default: "https://graph.microsoft.com/.default" (includes all permissions)
  // Can be customized to specific scopes like "https://graph.microsoft.com/User.Read"
  MS_GRAPH_SCOPE: process.env.MS_GRAPH_SCOPE ?? "https://graph.microsoft.com/.default",

  // App base URL - used for generating onboarding links and other absolute URLs
  // Derived from APP_BASE_URL env var, or from MS_REDIRECT_URI (strip the callback path),
  // or from VITE_FRONTEND_URL, or falls back to the production domain
  get APP_BASE_URL(): string {
    if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, '');
    if (process.env.MS_REDIRECT_URI) {
      // Strip any known OAuth callback path suffixes to get the base URL
      return process.env.MS_REDIRECT_URI
        .replace('/api/oauth/microsoft/callback', '')
        .replace('/api/auth/microsoft/callback', '')
        .replace(/\/$/, '');
    }
    if (process.env.VITE_FRONTEND_URL) return process.env.VITE_FRONTEND_URL.replace(/\/$/, '');
    return 'https://www.imserp.org';
  },

  // Storage mode: "manus" (default), "local" (filesystem), "s3" (MinIO/AWS S3)
  STORAGE_MODE: (process.env.STORAGE_MODE ?? "manus") as "manus" | "local" | "s3",
  LOCAL_STORAGE_PATH: process.env.LOCAL_STORAGE_PATH ?? "./local-storage",
  LOCAL_STORAGE_BASE_URL: process.env.LOCAL_STORAGE_BASE_URL ?? "http://localhost:3000",

  // S3-compatible storage (MinIO or AWS S3)
  S3_ENDPOINT: process.env.S3_ENDPOINT ?? "",
  S3_BUCKET: process.env.S3_BUCKET ?? "ims-documents",
  S3_REGION: process.env.S3_REGION ?? "us-east-1",
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ?? "",
  S3_SECRET_KEY: process.env.S3_SECRET_KEY ?? "",

  // Authentication mode: set MOCK_AUTH=true for local development without OAuth server
  MOCK_AUTH: process.env.MOCK_AUTH === "true",
  MOCK_AUTH_USER_EMAIL: process.env.MOCK_AUTH_USER_EMAIL ?? "admin@ims.local",
  MOCK_AUTH_USER_NAME: process.env.MOCK_AUTH_USER_NAME ?? "IMS Local Admin",
  MOCK_AUTH_USER_ROLE: process.env.MOCK_AUTH_USER_ROLE ?? "platform_super_admin",
};
