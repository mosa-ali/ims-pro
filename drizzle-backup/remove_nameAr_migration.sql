-- ============================================================================
-- MIGRATION: Remove nameAr fields from Financial Management System
-- ============================================================================
-- Reason: System has built-in translation system, nameAr fields are redundant
-- Date: 2026-02-05
-- ============================================================================

-- 1. Chart of Accounts
ALTER TABLE chart_of_accounts_categories DROP COLUMN IF EXISTS nameAr;
ALTER TABLE chart_of_accounts DROP COLUMN IF EXISTS nameAr;

-- 2. Assets Management
ALTER TABLE finance_asset_categories DROP COLUMN IF EXISTS nameAr;
ALTER TABLE finance_assets DROP COLUMN IF EXISTS nameAr;

-- 3. Currency & Fiscal Years
ALTER TABLE currencies DROP COLUMN IF EXISTS nameAr;
ALTER TABLE fiscal_years DROP COLUMN IF EXISTS nameAr;

-- 4. Approval Workflows
ALTER TABLE approval_workflows DROP COLUMN IF EXISTS nameAr;

-- 5. Finance Permissions
ALTER TABLE finance_permissions DROP COLUMN IF EXISTS nameAr;

-- 6. Procurement
ALTER TABLE evaluation_criteria DROP COLUMN IF EXISTS nameAr;
ALTER TABLE vendors DROP COLUMN IF EXISTS nameAr;

-- 7. Cost Allocation
ALTER TABLE cost_allocation_pools DROP COLUMN IF EXISTS nameAr;
ALTER TABLE cost_allocation_keys DROP COLUMN IF EXISTS nameAr;

-- 8. Cost Centers
ALTER TABLE cost_centers DROP COLUMN IF EXISTS nameAr;

-- 9. Variance Alerts
ALTER TABLE variance_alert_thresholds DROP COLUMN IF EXISTS nameAr;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
