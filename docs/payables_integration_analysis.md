# Payables Management Integration - Document Analysis

## Key Points from Document

### Core Architecture
1. **PR-Level View** (PR Workspace → Finance & Control → Payment Card) = operational, filtered by PR
2. **Finance-Level View** (Financial Management → Payables Management) = global ledger, org+OU scoped
3. **Both views use the SAME payable table** as single source of truth

### Payable Creation Flow (per document)
- GRN status → ACCEPTED → system auto-creates payable
- Payable amount = SUM(acceptedQty × unitPrice)
- Linked to: prId, poId, grnId, vendorId, projectId, operatingUnitId

### Status Flow (per document)
- Pending Invoice → Pending Approval → Approved → Paid

### Key Rule: ONE payable table serving both views
- Finance page: one row per PAYABLE record (not per PR)
- PR Workspace: filtered view by prId

### Document does NOT mention a separate "Invoice" card
- The document focuses on: Payment Card (PR Workspace) and Payables Management (Finance)
- Invoice is part of the payable lifecycle (status: "Pending Invoice")
- Invoice upload is an action ON a payable, not a separate entity

## Questions to Investigate
1. Does the current Invoice card duplicate what the Payables/Payment card already handles?
2. Is invoice creation a separate step or part of the payable workflow?
3. What data does the Invoice card show vs the Payment card?
