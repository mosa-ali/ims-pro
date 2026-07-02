Mandatory Implementation Constraints
1. Approved Database Schema is the Single Source of Truth

The project already contains an approved database schema.

This schema is the authoritative definition for all entities, relationships, foreign keys, indexes, constraints, enums, and data types.

Claude must use the approved schema before implementing any feature.

Requirements
Never recreate existing tables.
Never assume table structures.
Never invent new columns when an approved column already exists.
Never introduce duplicate entities.
Never change existing naming conventions.
Never bypass existing repositories.
Never generate alternative schemas.
Only propose schema changes when they are absolutely necessary and accompanied by a backward-compatible migration.

If additional fields are required:

Verify they do not already exist.
Explain why they are needed.
Provide a migration.
Preserve backward compatibility.
2. Repository-First Development

Claude must never access database tables directly from engines.

Every database operation must go through the existing repository layer.

Finance Engine

↓

Repository

↓

Drizzle ORM

↓

Database

Never

Finance Engine

↓

SQL

↓

Database
3. Existing Business Logic Must Be Reused

Before implementing any new feature Claude must:

Search existing repositories.
Search existing services.
Search existing engines.
Search existing utilities.
Search existing validation.
Search existing helpers.

If functionality already exists:

Reuse it.

Do not duplicate it.

4. Organization and Operating Unit Isolation

This is one of the most important requirements.

The IMS already has an approved multi-tenant architecture.

Claude must follow it exactly.

Every financial operation must execute inside the current scope.

Never read

organizationId

from user input.

Never read

operatingUnitId

from request payload.

Always use

ctx.scope.organizationId
ctx.scope.operatingUnitId

These values are the authoritative source for data isolation.

All Queries Must Use Scope

Every repository query must automatically filter by

ctx.scope.organizationId

ctx.scope.operatingUnitId

Example

await db
  .select()
  .from(financeTransactions)
  .where(
    and(
      eq(financeTransactions.organizationId, ctx.scope.organizationId),
      eq(financeTransactions.operatingUnitId, ctx.scope.operatingUnitId)
    )
  );

Never allow unrestricted queries.

Never Pass Organization IDs From UI

Incorrect

postGL({
    organizationId,
    operatingUnitId
})

Correct

postGL(input, ctx.scope)

The UI must never decide organization ownership.

The server already knows the scope.

5. Use Existing scopedProcedure

Every new tRPC endpoint must follow the approved application architecture.

Never use

publicProcedure

for finance operations.

Never manually check organization ownership.

Always use

scopedProcedure

Example

export const financeRouter = router({

    postJournal:

        scopedProcedure

            .input(PostJournalSchema)

            .mutation(async ({ ctx, input }) => {

                return financeOrchestrator.postGL(

                    input,

                    ctx.scope

                );

            })

});

No exceptions.

6. Never Duplicate Scope Validation

The application already enforces scope.

Claude must reuse it.

Never implement

if(user.organizationId!=...)

Never compare organization IDs manually.

Never duplicate authorization logic.

Always rely on

ctx.scope
7. Every Repository Must Accept Scope

Repositories should receive

ctx.scope

rather than individual IDs.

Correct

repository.create(

    entity,

    ctx.scope

)

Not

repository.create(

    entity,

    organizationId,

    operatingUnitId

)
8. Preserve Existing Security Model

Claude must never bypass

Authentication
Authorization
scopedProcedure
Permission middleware
Audit middleware
Existing validation
9. Reuse Existing Drizzle Schema

The approved Drizzle schema must remain the canonical data model.

Claude must

import existing tables
reuse existing relations
reuse enums
reuse indexes
reuse foreign keys
reuse utilities

before creating anything new.

10. Existing Architecture Takes Priority

If there is a conflict between

Claude's preferred architecture

and

the approved IMS architecture

the IMS architecture always wins.

Claude's responsibility is to extend the platform.

Not redesign it.

11. Search Before Code

Before implementing any feature Claude should first inspect:

Existing schema
Existing repository
Existing service
Existing engine
Existing router
Existing utility
Existing validation
Existing shared types

Only after confirming the functionality does not already exist should new code be written.

12. Implementation Principle

For every task Claude should follow this sequence:

1. Read approved architecture documentation

↓

2. Read approved database schema

↓

3. Read existing repositories

↓

4. Read existing routers

↓

5. Read existing services

↓

6. Read existing engines

↓

7. Read shared utilities

↓

8. Reuse existing code

↓

9. Implement only the missing functionality

↓

10. Maintain backward compatibility

↓

11. Add tests

↓

12. Update documentation
One Additional Rule I Strongly Recommend

Given the maturity of your IMS, I would add one final mandatory principle:

"Adopt Before Build"

Before writing any new code, Claude must answer these questions:

Does this capability already exist elsewhere in the IMS?
Can an existing repository, service, engine, utility, or component be extended instead of creating a new one?
Does the approved schema already support this requirement?
Can the existing scopedProcedure and ctx.scope pattern satisfy the requirement without introducing new authorization logic?

Only if the answer to all of these is no should Claude create a new implementation.

This principle is especially important for your platform because it already has a mature architecture. As the codebase grows, avoiding duplicate business logic and preserving consistent organization and operating-unit isolation will be far more valuable than adding new abstractions. It will also keep the modernization aligned with your approved architecture and reduce long-term maintenance costs.