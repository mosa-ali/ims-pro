# Finance Security Architecture

**Purpose**: Security model for all finance operations  
**Applies to**: Phases 2–12; enforced in every feature  

---

## Access Control Model (RBAC)

### **Finance Roles**

| Role | Responsibilities | Permissions |
|------|------------------|-------------|
| **Finance User** | View financial data, create invoices, submit expenses | Read most; Write invoices, expenses, advances |
| **Approver** | Approve invoices, payments, budget changes | Approve transactions up to limit |
| **Finance Manager** | Manage GL, reconcile accounts, close periods | Full read/write GL, create journals |
| **Treasurer** | Manage cash, payments, bank accounts | Manage treasury, release payments |
| **Auditor** | Review transactions, audit findings, compliance | Read-only audit trail, GL, compliance |
| **CFO/Admin** | System configuration, user management | Full access + admin functions |

### **Permission Matrix**

```
                      View  Create  Approve  Delete  Admin
Budget              User:✓ User:✓ Mgr:✓    Mgr:✓   Admin:✓
Invoice             User:✓ User:✓ Appr:✓   Mgr:✓   Admin:✓
Payment             Mgr:✓  Mgr:✓  Treas:✓  Mgr:✓   Admin:✓
GL Entry            Mgr:✓  Mgr:✓  -        -       Admin:✓
Bank Account        Treas✓ Treas✓ Treas:✓  Admin:✓ Admin:✓
Audit Trail         Audit✓ -      -        -       Admin:✓
Compliance Rule     Audit✓ Admin✓ Admin:✓  Admin:✓ Admin:✓
```

---

## Segregation of Duties (SOD)

Enforce at the application level:

```typescript
// ❌ WRONG: Same user can approve AND pay
async function approveAndPayInvoice(invoiceId, userId) {
  await approveInvoice(invoiceId, userId);  // User approves
  await releasePayment(invoiceId, userId);  // Same user pays
}

// ✅ CORRECT: Different users required
async function approveInvoice(invoiceId: number, approverId: number) {
  // Only Approver role can approve
  if (user.role !== 'Approver') throw new Error('Unauthorized');
  // ...
}

async function releasePayment(invoiceId: number, treasurerId: number) {
  // Only Treasurer role can release payment
  if (user.role !== 'Treasurer') throw new Error('Unauthorized');
  
  // Check: Different person than approver
  const invoice = await getInvoice(invoiceId);
  if (invoice.approvedBy === treasurerId) {
    throw new Error('SOD violation: Cannot approve and pay same invoice');
  }
  // ...
}
```

---

## Data Classification & Encryption

### **Data Classification**

| Level | Examples | Access | Encryption |
|-------|----------|--------|-----------|
| **Public** | Organization name, public reports | Anyone | Not required |
| **Internal** | Budget allocations, project plans | Finance staff | Recommended |
| **Confidential** | Vendor pricing, grant details | CFO + Finance Manager | Required |
| **Restricted** | Passwords, API keys, bank details | Admin only | Required |

### **Encryption Standards**

```
In Transit:
├─ HTTPS/TLS 1.3 for all API calls
├─ Encrypted database connections
└─ VPN for admin access

At Rest:
├─ Database encryption (MySQL AES-256)
├─ Sensitive fields encrypted (account numbers, API keys)
└─ Backups encrypted

Field-Level Encryption:
├─ Bank account numbers
├─ Vendor SSN/tax IDs
├─ Grant secret tokens
└─ API credentials
```

---

## Authentication & Authorization

### **Authentication**

```typescript
// ✅ JWT + Refresh tokens
const token = generateJWT({
  userId: user.id,
  role: user.role,
  organizationId: user.organizationId,
  expiresIn: '1h',
});

const refreshToken = generateRefreshToken({
  userId: user.id,
  expiresIn: '7d',  // Can refresh for 7 days
});

// Every API call includes token
Authorization: Bearer <jwt_token>

// Token verified on every request
const verified = verifyJWT(token, secret);
if (!verified || expired) {
  return 401 Unauthorized;
}
```

### **Multi-Org Authorization**

```typescript
// ✅ CORRECT: Verify organizationId matches token
async function getBudgets(organizationId: number, userId: number) {
  const user = await authenticateUser(userId);
  
  // CRITICAL: Token must match request org
  if (user.organizationId !== organizationId) {
    throw new Error('Unauthorized: Organization mismatch');
  }
  
  return db.select().from(budgets)
    .where(eq(budgets.organizationId, organizationId));
}
```

---

## Audit Logging

Every financial transaction logged:

```typescript
interface AuditLog {
  id: number;
  timestamp: DateTime;
  userId: number;
  action: string;  // 'invoice_approved', 'payment_released', etc.
  entityType: string;  // 'invoice', 'payment', 'gl_entry'
  entityId: number;
  oldValue: string;  // Before
  newValue: string;  // After
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failed';
  errorMessage: string | null;
  organizationId: number;
}

// Log every action
async function logAction(action: AuditLog) {
  await db.insert(auditLogs).values(action);
}

// Example usage
await logAction({
  userId: 123,
  action: 'payment_released',
  entityType: 'payment',
  entityId: 456,
  oldValue: JSON.stringify({ status: 'scheduled' }),
  newValue: JSON.stringify({ status: 'released' }),
  status: 'success',
});
```

---

## Secrets Management

### **Secure Credential Storage**

```
Secrets stored in:
├─ Environment variables (dev/staging)
├─ AWS Secrets Manager (production) — NOT in code
├─ Rotated every 90 days
└─ Minimal logging (never in logs)

Examples:
├─ DATABASE_PASSWORD
├─ JWT_SECRET
├─ API_KEYS
├─ BANK_API_CREDENTIALS
└─ DONOR_PORTAL_TOKENS

Never:
├─ Commit secrets to git
├─ Log full tokens (log first 4 chars only)
├─ Send secrets in URLs
└─ Store in code
```

---

## API Security Standards

### **Input Validation**

```typescript
// ✅ Validate ALL inputs with Zod
const InvoiceApprovalSchema = z.object({
  invoiceId: z.number().positive(),
  approvalDate: z.date().max(new Date()),  // Not future
  comment: z.string().max(1000),
});

async function approveInvoice(request: unknown) {
  const validated = InvoiceApprovalSchema.parse(request);
  // Process validated data
}

// Rate limiting (prevent brute force)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // 100 requests per window
  message: 'Too many requests',
}));
```

### **Output Sanitization**

```typescript
// ✅ Never return sensitive data
async function getInvoice(invoiceId: number) {
  const invoice = await db.select().from(invoices)
    .where(eq(invoices.id, invoiceId));
  
  // Remove sensitive fields
  delete invoice.bankAccount;  // Bank details not needed
  delete invoice.apiKey;       // Never expose API keys
  
  return invoice;
}

// ✅ Mask sensitive output
function maskBankAccount(account: string): string {
  return account.slice(0, 4) + '****' + account.slice(-2);
}
```

---

## SQL Injection Prevention

```typescript
// ❌ WRONG: Raw SQL (vulnerable)
const query = `SELECT * FROM invoices WHERE id = ${invoiceId}`;

// ✅ CORRECT: Parameterized queries (Drizzle)
const result = await db.select().from(invoices)
  .where(eq(invoices.id, invoiceId));
```

---

## Session Management

```typescript
interface Session {
  id: string;  // UUID
  userId: number;
  expiresAt: DateTime;
  lastActivity: DateTime;
  ipAddress: string;
}

// Invalidate on logout
async function logout(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

// Invalidate on inactivity
// Sessions expire after 1 hour of inactivity
async function invalidateStaleSessions() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  await db.delete(sessions)
    .where(lt(sessions.lastActivity, oneHourAgo));
}
```

---

## Data Privacy Compliance

### **GDPR Compliance (if applicable)**

```
Right to be forgotten:
├─ User can request deletion
├─ Remove personal data
└─ Keep audit trail (legal requirement)

Data portability:
├─ Export all personal data
├─ Machine-readable format (JSON)
└─ Within 30 days

Privacy by design:
├─ Minimize data collection
├─ Encrypt sensitive fields
├─ Regular privacy audits
└─ Privacy policy published
```

---

## Security Checklist per Phase

### **Phase 2 (Orchestrator)**
- [ ] JWT authentication implemented
- [ ] Role-based access control defined
- [ ] Multi-org isolation enforced
- [ ] Audit logging for all GL posts
- [ ] Input validation with Zod
- [ ] HTTPS/TLS enforced
- [ ] Rate limiting implemented

### **Phase 3 (GL Service)**
- [ ] GL posting requires Approver role
- [ ] Reversals require Finance Manager role
- [ ] Period closing requires CFO role
- [ ] All GL changes audit logged
- [ ] Source event links immutable
- [ ] Account balance encryption optional

### **Phase 4 (Budget)**
- [ ] Budget allocation requires approval
- [ ] Budget changes audit logged
- [ ] Reallocation requires CFO approval
- [ ] Multi-org isolation verified

### **Phase 5 (Treasury)**
- [ ] Bank account details encrypted
- [ ] Payment release requires Treasurer role
- [ ] Only Treasurer can see bank credentials
- [ ] Payment audit trail complete

### **Phase 6 (Intelligence)**
- [ ] Risk scores calculated consistently
- [ ] Compliance violations flagged
- [ ] Audit trail for all decisions
- [ ] No sensitive data in risk output

### **Phase 7 (Rules)**
- [ ] Rule changes logged
- [ ] Rule evaluation consistent
- [ ] Exception handling secure
- [ ] Audit trail for violations

### **Phases 8–12**
- [ ] Knowledge graph access controlled
- [ ] Digital Twin updates audit logged
- [ ] AI recommendations traced
- [ ] Autonomous operations reversible

---

## Incident Response

```
If security breach detected:
├─ 1. Immediately disable affected accounts
├─ 2. Log incident with timestamp
├─ 3. Alert security team
├─ 4. Isolate affected systems
├─ 5. Forensic investigation
├─ 6. Notify stakeholders (if required)
├─ 7. Patch vulnerability
└─ 8. Post-mortem & lessons learned
```

---

## Security Testing (per phase)

```
Unit tests:
├─ Role-based access denied
├─ Multi-org isolation enforced
├─ Input validation rejects invalid

Integration tests:
├─ End-to-end auth flows
├─ Audit logging works
├─ SOD enforced

Security tests:
├─ SQL injection attempts
├─ XSS prevention
├─ CSRF tokens
├─ Brute force protection
```

---

## Conclusion

Finance module security architecture:
- ✅ **RBAC** with segregation of duties
- ✅ **Encryption** in-transit and at-rest
- ✅ **Audit logging** of every action
- ✅ **Multi-org isolation** enforced
- ✅ **Input validation** with Zod
- ✅ **Secrets management** secure
- ✅ **Session management** with timeouts
- ✅ **Privacy compliance** (GDPR ready)

**All code must follow these standards.**
