# Integrated Management System (IMS)

**A comprehensive web application for managing humanitarian and development projects, grants, beneficiaries, and MEAL (Monitoring, Evaluation, Accountability, and Learning) activities.**

---

## Overview

The Integrated Management System (IMS) is a full-stack TypeScript application built with React 19, Express 4, and tRPC 11. The system provides multi-organization support with role-based access control, enabling NGOs and humanitarian organizations to manage their project portfolios, track activities, monitor indicators, manage beneficiaries, and oversee financial operations.

**Key Features:**

- Multi-organization architecture with isolated data per organization
- Role-based access control (System Admin, Organization Admin, Program Manager, Finance Manager, MEAL Officer)
- Project lifecycle management with activities, tasks, and indicators tracking
- Beneficiaries registry with demographic data and project linkage
- Financial management with budget lines, expenses, and utilization tracking
- MEAL framework implementation (output, outcome, impact, and process indicators)
- Bilingual support (English and Arabic) with RTL layout
- OAuth authentication via Manus platform
- Real-time data synchronization with tRPC subscriptions

---

## Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **State Management**: TanStack Query (React Query) via tRPC hooks
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite 6
- **UI Components**: Radix UI primitives with custom styling

### Backend
- **Runtime**: Node.js 22 with TypeScript
- **Framework**: Express 4
- **API Layer**: tRPC 11 with SuperJSON serialization
- **Database**: MySQL/TiDB with Drizzle ORM
- **Authentication**: JWT sessions with Manus OAuth integration
- **File Storage**: AWS S3 compatible storage

### Development Tools
- **Package Manager**: pnpm
- **Type Checking**: TypeScript 5.7
- **Testing**: Vitest
- **Database Migrations**: Drizzle Kit
- **Code Quality**: ESLint

---

## Prerequisites

Before running the application locally, ensure you have the following installed:

- **Node.js**: Version 22.x or higher
- **pnpm**: Version 8.x or higher (install via `npm install -g pnpm`)
- **MySQL**: Version 8.x or compatible database (TiDB, PlanetScale, etc.)
- **Git**: For version control

---

## Local Development Setup

### 1. Download Source Code

If you're working with a Manus-hosted project, download all source files from the Management UI:

1. Open the project in Manus platform
2. Navigate to Management UI → Code panel
3. Click "Download all files" button
4. Extract the downloaded archive to your local machine

Alternatively, if you have Git repository access:

```bash
git clone <repository-url>
cd integrated_management_system
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all required packages for both frontend and backend.

### 3. Configure Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database Configuration
DATABASE_URL=mysql://username:password@localhost:3306/grant_management

# Authentication
JWT_SECRET=your-secure-random-string-min-32-chars
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
VITE_APP_ID=your-app-id

# Owner Information (System Admin)
OWNER_OPEN_ID=admin-user-open-id
OWNER_NAME=Admin Name

# File Storage (S3 Compatible)
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key

# LLM Integration (Optional - for AI features)
BUILT_IN_FORGE_API_URL=https://forge-api.manus.im
BUILT_IN_FORGE_API_KEY=your-forge-api-key
VITE_FRONTEND_FORGE_API_KEY=your-frontend-api-key
VITE_FRONTEND_FORGE_API_URL=https://forge-api.manus.im

# Analytics (Optional)
VITE_ANALYTICS_ENDPOINT=https://analytics.manus.im
VITE_ANALYTICS_WEBSITE_ID=your-website-id

# Application Metadata
VITE_APP_TITLE=Integrated Management System (IMS)
VITE_APP_LOGO=/logo.png
```

**Important Notes:**

- Replace all placeholder values with your actual credentials
- The `JWT_SECRET` should be a cryptographically secure random string (minimum 32 characters)
- For local development without Manus OAuth, you'll need to modify the authentication flow (see MIGRATION_GUIDE.md)
- S3 credentials are required for file upload features (documents, beneficiary photos, etc.)

### 4. Set Up Database

#### Create Database

```bash
mysql -u root -p
CREATE DATABASE grant_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### Run Migrations

The project uses Drizzle ORM for database schema management. To apply all migrations:

```bash
pnpm db:push
```

This command will:
1. Read the schema from `drizzle/schema.ts`
2. Generate SQL migrations
3. Apply changes to your database

**Note**: The `db:push` command is suitable for development. For production deployments, use `drizzle-kit generate` to create migration files, then apply them with `drizzle-kit migrate`.

#### Seed Initial Data (Optional)

To populate the database with sample data for testing:

```bash
node scripts/seed-database.mjs
```

This will create:
- Sample organizations
- Test users with different roles
- Demo projects and grants
- Sample activities, tasks, and indicators

### 5. Run Development Server

The application uses a single command to run both frontend and backend:

```bash
pnpm dev
```

This will start:
- **Backend API**: `http://localhost:3000/api`
- **Frontend Dev Server**: `http://localhost:3000` (proxied through backend)
- **tRPC Endpoint**: `http://localhost:3000/api/trpc`

The development server includes:
- Hot Module Replacement (HMR) for instant frontend updates
- Automatic TypeScript compilation
- tRPC type safety across client and server
- OAuth callback handling at `/api/oauth/callback`

### 6. Access the Application

Open your browser and navigate to:

```
http://localhost:3000
```

**Default Login:**

If you've run the seed script, you can log in with:
- **System Admin**: (credentials from seed script)
- **Organization Admin**: (credentials from seed script)

**Note**: Without Manus OAuth integration, you'll need to implement an alternative authentication method. See the "Authentication Without Manus" section in MIGRATION_GUIDE.md.

---

## Project Structure

```
integrated_management_system/
├── client/                      # Frontend application
│   ├── public/                  # Static assets
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── ui/              # shadcn/ui base components
│   │   │   ├── dialogs/         # Modal dialogs
│   │   │   └── project-tabs/    # Project detail tab components
│   │   ├── contexts/            # React contexts
│   │   ├── hooks/               # Custom React hooks
│   │   ├── layouts/             # Layout components
│   │   ├── lib/                 # Utility libraries
│   │   │   └── trpc.ts          # tRPC client configuration
│   │   ├── pages/               # Page components
│   │   ├── App.tsx              # Main app component with routes
│   │   ├── main.tsx             # Application entry point
│   │   └── index.css            # Global styles and Tailwind config
│   └── index.html               # HTML template
├── server/                      # Backend application
│   ├── _core/                   # Framework-level code (DO NOT MODIFY)
│   │   ├── context.ts           # tRPC context builder
│   │   ├── env.ts               # Environment variable validation
│   │   ├── index.ts             # Express server setup
│   │   ├── llm.ts               # LLM integration helper
│   │   ├── map.ts               # Google Maps proxy
│   │   ├── notification.ts      # Owner notification helper
│   │   └── voiceTranscription.ts # Audio transcription helper
│   ├── db.ts                    # Database query helpers
│   ├── routers.ts               # tRPC procedure definitions
│   └── *.test.ts                # Backend unit tests
├── drizzle/                     # Database schema and migrations
│   ├── schema.ts                # Drizzle schema definitions
│   └── *.sql                    # Migration files
├── shared/                      # Shared types and constants
├── storage/                     # S3 storage helpers
├── scripts/                     # Utility scripts
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite configuration
├── drizzle.config.ts            # Drizzle ORM configuration
└── tailwind.config.js           # Tailwind CSS configuration
```

---

## Available Scripts

### Development

```bash
# Start development server (frontend + backend)
pnpm dev

# Run TypeScript type checking
pnpm type-check

# Run linter
pnpm lint
```

### Database

```bash
# Push schema changes to database (development)
pnpm db:push

# Generate migration files (production)
pnpm drizzle-kit generate

# Apply migrations (production)
pnpm drizzle-kit migrate

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Production Build

```bash
# Build frontend and backend
pnpm build

# Start production server
pnpm start
```

---

## Key Workflows

### Adding a New Feature

1. **Update Database Schema** (if needed):
   - Edit `drizzle/schema.ts`
   - Run `pnpm db:push` to apply changes

2. **Create Database Helpers**:
   - Add query functions in `server/db.ts`
   - Return raw Drizzle query results

3. **Define tRPC Procedures**:
   - Add procedures in `server/routers.ts`
   - Use `publicProcedure` or `protectedProcedure`
   - Implement input validation with Zod

4. **Build Frontend UI**:
   - Create page component in `client/src/pages/`
   - Use tRPC hooks (`trpc.*.useQuery`, `trpc.*.useMutation`)
   - Add route in `client/src/App.tsx`

5. **Write Tests**:
   - Create test file in `server/*.test.ts`
   - Test all CRUD operations
   - Verify permissions and edge cases

### Adding a New PDF Document

All PDF documents must follow the official header standard for proper RTL/LTR mirroring. See **[docs/PDF_HEADER_RTL_LTR_GUIDELINE.md](./docs/PDF_HEADER_RTL_LTR_GUIDELINE.md)** for the complete guide.

**Quick summary:**

1. **Server-side PDFs (Puppeteer)**: Import `buildPdfHeader()` from `server/services/pdf/buildPdfHeader.ts` and use `official-pdf.css` (flexbox approach)
2. **Client-side print pages**: Use the `OfficialPrintTemplate` component from `client/src/components/logistics/OfficialPrintTemplate.tsx` with `direction={isRTL ? 'rtl' : 'ltr'}`
3. **Never hardcode `direction={'ltr'}`** — always derive from language context
4. **Never use CSS Grid** for header layout — use flexbox only (proven to work in Puppeteer)

### Working with Multi-Organization Data

All database queries must be scoped to the current user's organization:

```typescript
// In server/db.ts
export async function getProjectsByOrganization(organizationId: number) {
  return db.select()
    .from(projects)
    .where(eq(projects.organizationId, organizationId));
}

// In server/routers.ts
projectsList: protectedProcedure.query(async ({ ctx }) => {
  return getProjectsByOrganization(ctx.user.organizationId);
}),
```

The `ctx.user` object is automatically populated by the authentication middleware and includes:
- `openId`: Unique user identifier
- `name`: User's display name
- `email`: User's email address
- `organizationId`: Current organization ID
- `role`: User's role (admin, manager, etc.)

### Implementing Role-Based Access Control

Use custom procedures for role-specific operations:

```typescript
// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Usage
deleteOrganization: adminProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input }) => {
    // Only admins can reach this code
  }),
```

---

## Environment-Specific Configuration

### Development

The development environment uses:
- Hot Module Replacement for instant updates
- Source maps for debugging
- Verbose error messages
- Auto-restart on file changes

### Production

For production deployment:

1. Set `NODE_ENV=production`
2. Build the application: `pnpm build`
3. Use a process manager (PM2, systemd) to run `pnpm start`
4. Configure reverse proxy (Nginx, Caddy) for HTTPS
5. Set up database connection pooling
6. Enable error tracking (Sentry, etc.)

---

## Troubleshooting

### Database Connection Errors

**Problem**: `ER_ACCESS_DENIED_ERROR` or connection timeout

**Solution**:
- Verify `DATABASE_URL` in `.env` is correct
- Ensure MySQL server is running: `sudo systemctl status mysql`
- Check firewall rules allow port 3306
- Test connection: `mysql -h localhost -u username -p`

### TypeScript Errors After Schema Changes

**Problem**: Type mismatches after updating `drizzle/schema.ts`

**Solution**:
```bash
# Regenerate types
pnpm db:push

# Restart TypeScript server in your IDE
# VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### tRPC Procedure Not Found

**Problem**: `TRPCClientError: No "query"-procedure on path "feature.action"`

**Solution**:
- Ensure procedure is exported in `server/routers.ts`
- Check procedure name matches client call
- Restart development server: `Ctrl+C` then `pnpm dev`

### OAuth Authentication Fails

**Problem**: Redirect loop or "Invalid token" error

**Solution**:
- Verify `OAUTH_SERVER_URL` and `VITE_OAUTH_PORTAL_URL` are correct
- Check `JWT_SECRET` is set and consistent
- Clear browser cookies and try again
- For local development without Manus, see MIGRATION_GUIDE.md

---

## Known Issues

See [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) for a complete list of:
- Incomplete features
- Known bugs
- Technical debt
- Planned improvements

---

## Migration from Manus Platform

This application is designed to run on the Manus platform but can be migrated to standalone hosting. See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for:
- Manus-specific dependencies
- Alternative authentication methods
- Self-hosting instructions
- Estimated migration effort

---

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: System design, frameworks, and architectural decisions
- **[DATABASE.md](./DATABASE.md)**: Database schema, relationships, and data model
- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Production deployment guide
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)**: Guide for migrating away from Manus platform
- **[CHECKPOINT_HISTORY.md](./CHECKPOINT_HISTORY.md)**: Version history and changelog
- **[KNOWN_ISSUES.md](./KNOWN_ISSUES.md)**: Current limitations and technical debt
- **[docs/PDF_HEADER_RTL_LTR_GUIDELINE.md](./docs/PDF_HEADER_RTL_LTR_GUIDELINE.md)**: Mandatory standard for PDF header RTL/LTR mirroring across all modules

---

## Support and Maintenance

**Original Development**: Manus AI Platform

**License**: (To be specified by project owner)

**Contact**: (To be specified by project owner)

---

## Contributing

(Guidelines to be added by project owner)

---

**Last Updated**: January 10, 2026
=======
# ims-platform
A comprehensive CRM portal for managing customer records, interactions, and sales pipeline stages with a clean enterprise UI featuring dashboard, contact management, customer profiles, and Kanban-style pipeline board.
>>>>>>> 0287b9f97f2035b18e19a015c6f45970dc4c5c3b
# ims-app
