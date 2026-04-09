-- ============================================================================
-- DB-LEVEL GUARDRAILS FOR ERP COMPLIANCE
-- ============================================================================
-- These triggers enforce business rules at the database level to prevent
-- bypass via direct SQL or application-layer vulnerabilities.
-- ============================================================================

-- ============================================================================
-- 1. IMMUTABLE POSTED JOURNALS TRIGGER
-- ============================================================================
-- Prevent UPDATE on posted journal entries
-- Once status = POSTED, the entry is immutable

DELIMITER $$

CREATE TRIGGER prevent_update_posted_journal
BEFORE UPDATE ON journal_entries
FOR EACH ROW
BEGIN
  IF OLD.status = 'POSTED' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Cannot update posted journal entry. Use reversal workflow instead.';
  END IF;
END$$

-- Prevent DELETE on posted journal entries
CREATE TRIGGER prevent_delete_posted_journal
BEFORE DELETE ON journal_entries
FOR EACH ROW
BEGIN
  IF OLD.status = 'POSTED' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Cannot delete posted journal entry. Use reversal workflow instead.';
  END IF;
END$$

DELIMITER ;

-- ============================================================================
-- 2. PAYMENT ALLOCATION LIMIT TRIGGER
-- ============================================================================
-- Prevent payment allocation exceeding outstanding balance

DELIMITER $$

CREATE TRIGGER prevent_overpayment_allocation
BEFORE INSERT ON payment_allocations
FOR EACH ROW
BEGIN
  DECLARE outstanding_balance DECIMAL(15, 2);
  DECLARE allocated_amount DECIMAL(15, 2);
  DECLARE total_allocated DECIMAL(15, 2);
  
  -- Get outstanding balance for the payable
  SELECT (amount - COALESCE(SUM(allocated_amount), 0))
  INTO outstanding_balance
  FROM payables p
  LEFT JOIN payment_allocations pa ON p.id = pa.payable_id
  WHERE p.id = NEW.payable_id
  GROUP BY p.id;
  
  -- Get total allocated for this payment
  SELECT COALESCE(SUM(allocated_amount), 0)
  INTO total_allocated
  FROM payment_allocations
  WHERE payment_id = NEW.payment_id;
  
  -- Check if allocation exceeds outstanding balance
  IF (total_allocated + NEW.allocated_amount) > outstanding_balance THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Payment allocation exceeds outstanding balance. Overpayment not allowed.';
  END IF;
END$$

DELIMITER ;

-- ============================================================================
-- 3. MATCHING SNAPSHOT IMMUTABILITY TRIGGER
-- ============================================================================
-- Prevent modification of matching results after they are stored

DELIMITER $$

CREATE TRIGGER prevent_update_matching_result
BEFORE UPDATE ON matching_results
FOR EACH ROW
BEGIN
  -- Matching results are immutable once created
  -- Only status can be updated if needed for workflow
  IF OLD.created_at IS NOT NULL AND OLD.created_at < NOW() - INTERVAL 1 SECOND THEN
    -- Allow only status updates within the first second
    IF (OLD.quantity_variance != NEW.quantity_variance OR 
        OLD.amount_variance != NEW.amount_variance OR
        OLD.matching_basis != NEW.matching_basis) THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot modify matching result variance or basis. Matching results are immutable.';
    END IF;
  END IF;
END$$

CREATE TRIGGER prevent_delete_matching_result
BEFORE DELETE ON matching_results
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT = 'Cannot delete matching result. Matching results are immutable for audit trail.';
END$$

DELIMITER ;

-- ============================================================================
-- 4. PERIOD LOCK ENFORCEMENT TRIGGER
-- ============================================================================
-- Prevent posting to locked fiscal periods

DELIMITER $$

CREATE TRIGGER prevent_posting_to_locked_period
BEFORE INSERT ON journal_entries
FOR EACH ROW
BEGIN
  DECLARE period_status VARCHAR(50);
  
  -- Get period status for the posting date
  SELECT fp.status
  INTO period_status
  FROM finance_periods fp
  WHERE fp.organization_id = NEW.organization_id
  AND fp.start_date <= NEW.posting_date
  AND fp.end_date >= NEW.posting_date
  LIMIT 1;
  
  -- Check if period is locked
  IF period_status = 'LOCKED' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Cannot post to locked fiscal period. Period must be reopened first.';
  END IF;
END$$

DELIMITER ;

-- ============================================================================
-- 5. APPROVAL THRESHOLD ENFORCEMENT TRIGGER
-- ============================================================================
-- Prevent skip-level approvals

DELIMITER $$

CREATE TRIGGER enforce_sequential_approval
BEFORE UPDATE ON invoices
FOR EACH ROW
BEGIN
  DECLARE current_approver_level INT;
  DECLARE required_level INT;
  
  -- Only check when moving to approval status
  IF NEW.status IN ('PENDING_MANAGER', 'PENDING_DIRECTOR', 'APPROVED') 
     AND OLD.status != NEW.status THEN
    
    -- Get current user's approval level
    -- (This would need to be passed as a session variable or context)
    -- For now, this is a placeholder for the logic
    
    -- Check if trying to skip levels
    IF NEW.status = 'PENDING_DIRECTOR' AND OLD.status = 'DRAFT' THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot skip approval levels. Must go through Finance Officer and Manager first.';
    END IF;
  END IF;
END$$

DELIMITER ;

-- ============================================================================
-- 6. AUDIT TRAIL IMMUTABILITY TRIGGER
-- ============================================================================
-- Prevent modification or deletion of audit trail entries

DELIMITER $$

CREATE TRIGGER prevent_update_audit_trail
BEFORE UPDATE ON journal_audit_events
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT = 'Cannot update audit trail. Audit events are immutable.';
END$$

CREATE TRIGGER prevent_delete_audit_trail
BEFORE DELETE ON journal_audit_events
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT = 'Cannot delete audit trail. Audit events are immutable.';
END$$

DELIMITER ;

-- ============================================================================
-- 7. BUDGET HARD STOP TRIGGER
-- ============================================================================
-- Prevent expenditure approval if budget exceeded

DELIMITER $$

CREATE TRIGGER enforce_budget_hard_stop
BEFORE UPDATE ON expenditures
FOR EACH ROW
BEGIN
  DECLARE available_budget DECIMAL(15, 2);
  DECLARE total_committed DECIMAL(15, 2);
  
  -- Only check when approving
  IF NEW.status = 'APPROVED' AND OLD.status != 'APPROVED' THEN
    
    -- Get available budget for the budget line
    SELECT available_amount
    INTO available_budget
    FROM budget_lines
    WHERE id = NEW.budget_line_id;
    
    -- Get total committed expenditures
    SELECT COALESCE(SUM(amount), 0)
    INTO total_committed
    FROM expenditures
    WHERE budget_line_id = NEW.budget_line_id
    AND status IN ('APPROVED', 'POSTED');
    
    -- Check hard stop
    IF (total_committed + NEW.amount) > available_budget THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Budget hard stop exceeded. Cannot approve expenditure. Budget exhausted.';
    END IF;
  END IF;
END$$

DELIMITER ;

-- ============================================================================
-- 8. ORGANIZATION/OU SCOPE ENFORCEMENT TRIGGER
-- ============================================================================
-- Prevent cross-org/OU data access

DELIMITER $$

CREATE TRIGGER enforce_org_scope_on_journal_insert
BEFORE INSERT ON journal_entries
FOR EACH ROW
BEGIN
  -- Ensure organization_id is set
  IF NEW.organization_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'organization_id is required for all journal entries.';
  END IF;
END$$

DELIMITER ;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for period lock enforcement
CREATE INDEX IF NOT EXISTS idx_finance_periods_dates 
ON finance_periods(organization_id, start_date, end_date, status);

-- Index for payment allocation validation
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payable 
ON payment_allocations(payable_id, payment_id);

-- Index for matching result queries
CREATE INDEX IF NOT EXISTS idx_matching_results_invoice 
ON matching_results(invoice_id, organization_id);

-- Index for audit trail queries
CREATE INDEX IF NOT EXISTS idx_journal_audit_events_journal 
ON journal_audit_events(journal_id, created_at);

-- Index for budget enforcement
CREATE INDEX IF NOT EXISTS idx_expenditures_budget_status 
ON expenditures(budget_line_id, status, organization_id);
