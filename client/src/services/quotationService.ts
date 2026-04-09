// ============================================================================
// QUOTATION ANALYSIS SERVICE
// Integrated Management System (IMS)
// ============================================================================

import type { QuotationAnalysis, QuotationSupplierData, BidsAnalysis } from '@/app/types/logistics.types';

const QA_STORAGE_KEY = 'ims_quotation_analysis';
const BA_STORAGE_KEY = 'bidsAnalysis';

// ============================================================================
// SAMPLE DATA
// ============================================================================

const INITIAL_QA_DATA: QuotationAnalysis[] = [
 // ============================================================================
 // TEST RECORD #1: SINGLE QUOTATION (0 - 1,000 USD)
 // ============================================================================
 {
 id: 'qa-test-single-001',
 qaNumber: 'QA-2026-00001',
 prId: 'pr-test-hq-001',
 prNumber: 'PR-2026-HQ-00001',
 rfqId: '',
 rfqNumber: '',
 organizationId: 'org-001',
 operatingUnitId: 'ou-org-001-hq',
 country: 'Jordan',
 projectId: 'proj-001',
 budgetLineId: 'bl-office-supplies',
 estimatedBudget: 850,
 currency: 'USD',
 processType: 'single_quotation',
 minQuotationsRequired: 1,
 maxQuotationsAllowed: 1,
 analysisDate: '2026-01-10',
 purchaseDescription: 'Office supplies package - stationery, printer paper, folders',
 requestedBy: 'Admin Officer',
 evaluationCriteria: [],
 supplierEvaluationScores: [],
 suppliers: [
 {
 supplierId: 'sup-office-001',
 supplierName: 'Amman Office Supplies Co.',
 price: 820,
 deliveryTime: 3,
 warranty: 'No warranty - consumables',
 complianceNotes: 'All items in stock. Meets specifications. Regular supplier with good track record.',
 score: 100
 }
 ],
 lowestQuotedAmount: 820,
 selectedSupplierId: 'sup-office-001',
 selectedSupplierName: 'Amman Office Supplies Co.',
 selectionJustification: 'Single quotation process as per procurement threshold (amount: $820). Supplier is pre-approved and items are readily available.',
 lowestBidderSelected: true,
 requiresJustification: false,
 status: 'approved',
 locked: true,
 approver1: 'Logistics Manager',
 approver1Date: '2026-01-12',
 createdAt: '2026-01-10T09:00:00Z',
 createdBy: 'user-procurement-officer',
 updatedAt: '2026-01-12T14:30:00Z',
 updatedBy: 'user-logistics-manager'
 },

 // ============================================================================
 // TEST RECORD #2: MULTIPLE QUOTATIONS (1,001 - 5,000 USD)
 // ============================================================================
 {
 id: 'qa-test-multiple-002',
 qaNumber: 'QA-2026-00002',
 prId: 'pr-test-hq-002',
 prNumber: 'PR-2026-HQ-00002',
 rfqId: 'rfq-2026-001',
 rfqNumber: 'RFQ-2026-001',
 organizationId: 'org-001',
 operatingUnitId: 'ou-org-001-hq',
 country: 'Jordan',
 projectId: 'proj-002',
 budgetLineId: 'bl-it-equipment',
 estimatedBudget: 4500,
 currency: 'USD',
 processType: 'multiple_quotations',
 minQuotationsRequired: 3,
 maxQuotationsAllowed: 3,
 analysisDate: '2026-01-15',
 purchaseDescription: 'IT Equipment: 5x Desktop computers (i5, 8GB RAM, 256GB SSD, 21" monitor)',
 requestedBy: 'IT Manager',
 evaluationCriteria: [],
 supplierEvaluationScores: [],
 suppliers: [
 {
 supplierId: 'sup-it-001',
 supplierName: 'Tech Solutions LLC',
 price: 4250,
 deliveryTime: 7,
 warranty: '2 years comprehensive warranty with on-site support',
 complianceNotes: 'Fully compliant. Authorized Dell partner. Excellent track record with 10+ NGO clients.',
 score: 95
 },
 {
 supplierId: 'sup-it-002',
 supplierName: 'Digital World Trading',
 price: 3980,
 deliveryTime: 14,
 warranty: '1 year standard warranty',
 complianceNotes: 'Meets specifications but longer delivery time. New vendor with limited NGO experience.',
 score: 78
 },
 {
 supplierId: 'sup-it-003',
 supplierName: 'Global Tech Supplies',
 price: 4150,
 deliveryTime: 5,
 warranty: '2 years comprehensive coverage',
 complianceNotes: 'Premium supplier, fastest delivery. Certified Dell partner with 15 years experience.',
 score: 92
 }
 ],
 lowestQuotedAmount: 3980,
 selectedSupplierId: 'sup-it-001',
 selectedSupplierName: 'Tech Solutions LLC',
 selectionJustification: 'Although Tech Solutions LLC did not provide the lowest quote ($4,250 vs. $3,980), they have been selected based on:\n\n1. **Superior Warranty**: 2-year comprehensive warranty with on-site support vs. 1-year standard warranty from the lowest bidder.\n\n2. **Proven Track Record**: Authorized Dell partner with 10+ successful NGO deployments vs. limited experience from Digital World.\n\n3. **Faster Delivery**: 7-day delivery vs. 14 days from lowest bidder, critical for project timeline.\n\n4. **Risk Mitigation**: Digital World is a new vendor presenting higher risk for this critical IT infrastructure procurement.\n\n5. **Value for Money**: Price difference of $270 (6.8%) is justified by enhanced warranty, support, and reduced risk.\n\nRecommendation approved by IT Manager and Logistics Manager.',
 lowestBidderSelected: false,
 requiresJustification: true,
 status: 'approved',
 locked: true,
 approver1: 'Logistics Manager',
 approver1Date: '2026-01-17',
 approver2: 'Finance Manager',
 approver2Date: '2026-01-19',
 createdAt: '2026-01-15T09:00:00Z',
 createdBy: 'user-procurement-officer',
 updatedAt: '2026-01-19T14:30:00Z',
 updatedBy: 'user-finance-manager'
 },

 // ============================================================================
 // TEST RECORD #3: EXTENDED QUOTATIONS (5,001 - 25,000 USD)
 // ============================================================================
 {
 id: 'qa-test-extended-003',
 qaNumber: 'QA-2026-00003',
 prId: 'pr-test-hq-003',
 prNumber: 'PR-2026-HQ-00003',
 rfqId: 'rfq-2026-002',
 rfqNumber: 'RFQ-2026-002',
 organizationId: 'org-001',
 operatingUnitId: 'ou-org-001-hq',
 country: 'Jordan',
 projectId: 'proj-003',
 budgetLineId: 'bl-field-equipment',
 estimatedBudget: 18000,
 currency: 'USD',
 processType: 'extended_quotations',
 minQuotationsRequired: 3,
 maxQuotationsAllowed: 5,
 analysisDate: '2026-01-20',
 purchaseDescription: 'Field equipment package: 10x Tablets, 5x GPS devices, 10x Power banks, Accessories',
 requestedBy: 'Field Coordinator',
 evaluationCriteria: [],
 supplierEvaluationScores: [],
 suppliers: [
 {
 supplierId: 'sup-field-001',
 supplierName: 'Mobile Tech Solutions',
 price: 16800,
 deliveryTime: 10,
 warranty: '2 years manufacturer warranty',
 complianceNotes: 'All items meet specifications. Samsung tablets with rugged cases. Garmin GPS devices.',
 score: 88
 },
 {
 supplierId: 'sup-field-002',
 supplierName: 'Premium Electronics',
 price: 17500,
 deliveryTime: 7,
 warranty: '3 years comprehensive with replacement',
 complianceNotes: 'High-quality items exceeding specifications. Premium brands. Extended warranty included.',
 score: 92
 },
 {
 supplierId: 'sup-field-003',
 supplierName: 'Value Tech Supplies',
 price: 15900,
 deliveryTime: 15,
 warranty: '1 year basic warranty',
 complianceNotes: 'Meets minimum specifications. Budget option with acceptable quality. Slower delivery.',
 score: 75
 },
 {
 supplierId: 'sup-field-004',
 supplierName: 'Enterprise Solutions MENA',
 price: 16500,
 deliveryTime: 8,
 warranty: '2 years with on-site replacement',
 complianceNotes: 'Professional supplier. Excellent after-sales support. Certified distributor for all brands.',
 score: 90
 }
 ],
 lowestQuotedAmount: 15900,
 selectedSupplierId: 'sup-field-002',
 selectedSupplierName: 'Premium Electronics',
 selectionJustification: 'Premium Electronics selected despite not being the lowest bidder ($17,500 vs. $15,900) based on:\n\n1. **Extended Warranty**: 3-year comprehensive warranty with replacement vs. 1-year basic from lowest bidder.\n\n2. **Product Quality**: Premium brands exceeding minimum specifications, critical for field use in harsh environments.\n\n3. **Faster Delivery**: 7-day delivery vs. 15 days from Value Tech, important for project start date.\n\n4. **After-Sales Support**: Established reputation for excellent support vs. budget supplier with limited track record.\n\n5. **Total Cost of Ownership**: Price difference of $1,600 (10%) justified by:\n - Extended warranty coverage ($500 estimated value)\n - Higher durability reducing replacement costs\n - Better support reducing downtime\n\n6. **Field Reliability**: Equipment will be used in remote areas where failure is costly. Quality and warranty are critical.\n\nEvaluation conducted with participation of Field Coordinator, IT Manager, and Logistics Manager. Recommendation approved by Finance Manager.',
 lowestBidderSelected: false,
 requiresJustification: true,
 status: 'approved',
 locked: true,
 approver1: 'Logistics Manager',
 approver1Date: '2026-01-22',
 approver2: 'Finance Manager',
 approver2Date: '2026-01-23',
 createdAt: '2026-01-20T09:00:00Z',
 createdBy: 'user-procurement-officer',
 updatedAt: '2026-01-23T16:45:00Z',
 updatedBy: 'user-finance-manager'
 },

 // ============================================================================
 // TEST RECORD #4: EXTENDED QUOTATIONS (25,001 - 100,000 USD)
 // Note: This would normally be a Tender/CBA but kept as QA for testing
 // ============================================================================
 {
 id: 'qa-test-extended-004',
 qaNumber: 'QA-2026-00004',
 prId: 'pr-test-hq-004',
 prNumber: 'PR-2026-HQ-00004',
 rfqId: 'rfq-2026-003',
 rfqNumber: 'RFQ-2026-003',
 organizationId: 'org-001',
 operatingUnitId: 'ou-org-001-hq',
 country: 'Jordan',
 projectId: 'proj-004',
 budgetLineId: 'bl-heavy-equipment',
 estimatedBudget: 22000,
 currency: 'USD',
 processType: 'extended_quotations',
 minQuotationsRequired: 3,
 maxQuotationsAllowed: 5,
 analysisDate: '2026-01-25',
 purchaseDescription: 'Equipment package: 10x Laptops, 5x Printers, Network equipment, Software licenses',
 requestedBy: 'IT Manager',
 evaluationCriteria: [],
 supplierEvaluationScores: [],
 suppliers: [
 {
 supplierId: 'sup-it-enterprise-001',
 supplierName: 'Enterprise IT Solutions',
 price: 21500,
 deliveryTime: 12,
 warranty: '3 years comprehensive with on-site support',
 complianceNotes: 'Fully compliant. Authorized partner for all major brands. Excellent track record with 20+ NGO projects.',
 score: 95
 },
 {
 supplierId: 'sup-it-enterprise-002',
 supplierName: 'Corporate Technology Partners',
 price: 20800,
 deliveryTime: 10,
 warranty: '2 years comprehensive with replacement',
 complianceNotes: 'High-quality items exceeding specifications. Premium brands. Extended warranty included.',
 score: 92
 },
 {
 supplierId: 'sup-it-enterprise-003',
 supplierName: 'Budget IT Supplies',
 price: 19500,
 deliveryTime: 18,
 warranty: '1 year basic warranty',
 complianceNotes: 'Meets minimum specifications. Budget option with acceptable quality. Slower delivery.',
 score: 75
 },
 {
 supplierId: 'sup-it-enterprise-004',
 supplierName: 'Professional IT MENA',
 price: 20500,
 deliveryTime: 8,
 warranty: '2 years with on-site replacement',
 complianceNotes: 'Professional supplier. Excellent after-sales support. Certified distributor for all brands.',
 score: 90
 }
 ],
 lowestQuotedAmount: 19500,
 selectedSupplierId: 'sup-it-enterprise-001',
 selectedSupplierName: 'Enterprise IT Solutions',
 selectionJustification: 'Enterprise IT Solutions selected despite not being the lowest bidder ($21,500 vs. $19,500) based on:\n\n1. **Extended Warranty**: 3-year comprehensive warranty with on-site support vs. 1-year basic from lowest bidder.\n\n2. **Product Quality**: Premium brands exceeding minimum specifications, critical for enterprise IT infrastructure.\n\n3. **Faster Delivery**: 12-day delivery vs. 18 days from Budget IT, important for project rollout schedule.\n\n4. **After-Sales Support**: Established reputation for excellent support vs. budget supplier with limited track record.\n\n5. **Total Cost of Ownership**: Price difference of $2,000 (10%) justified by:\n - Extended warranty coverage (estimated value: $800)\n - Higher durability reducing replacement costs\n - Better support reducing downtime\n - Professional installation and configuration services\n\n6. **Operational Reliability**: IT infrastructure is mission-critical. Quality, warranty, and support are paramount.\n\nEvaluation conducted with participation of IT Manager, Logistics Manager, and Project Manager. Recommendation approved by Finance Manager and Director.',
 lowestBidderSelected: false,
 requiresJustification: true,
 status: 'approved',
 locked: true,
 approver1: 'Logistics Manager',
 approver1Date: '2026-01-27',
 approver2: 'Finance Manager',
 approver2Date: '2026-01-28',
 createdAt: '2026-01-25T09:00:00Z',
 createdBy: 'user-procurement-officer',
 updatedAt: '2026-01-28T16:45:00Z',
 updatedBy: 'user-finance-manager'
 }
];

// ============================================================================
// QUOTATION ANALYSIS - CRUD OPERATIONS
// ============================================================================

// One-time force reset to ensure fresh test data loads
function forceResetIfNeeded(): void {
 const FORCE_RESET_FLAG = 'qa_fresh_init_v3_cba_added';
 
 if (!localStorage.getItem(FORCE_RESET_FLAG)) {
 console.log('[QA Service] 🔄 FORCE RESET: Clearing all old QA data...');
 localStorage.removeItem(QA_STORAGE_KEY);
 localStorage.removeItem('logistics_data_v2_loaded');
 localStorage.removeItem('logistics_data_v3_loaded');
 localStorage.removeItem('logistics_data_v4_final');
 localStorage.removeItem('qa_fresh_init_v1');
 localStorage.removeItem('qa_fresh_init_v2_cost_levels'); // Clear old flag
 localStorage.setItem(FORCE_RESET_FLAG, 'true');
 console.log('[QA Service] ✅ Force reset complete - will initialize fresh data with 4 cost level examples including CBA');
 }
}

function initializeStorage(): void {
 forceResetIfNeeded();
 
 const existing = localStorage.getItem(QA_STORAGE_KEY);
 if (!existing) {
 console.log('[QA Service] 💾 Initializing fresh test data - 4 quotation analyses (cost levels 1-4)');
 localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(INITIAL_QA_DATA));
 console.log('[QA Service] ✅ Test data saved:', INITIAL_QA_DATA.length, 'records');
 } else {
 const data = JSON.parse(existing);
 console.log('[QA Service] 📂 Existing data found:', data.length, 'records');
 }
}

export const quotationAnalysisService = {
 // Get all quotations
 getAll(): QuotationAnalysis[] {
 initializeStorage();
 const data = localStorage.getItem(QA_STORAGE_KEY);
 const result = data ? JSON.parse(data) : [];
 console.log('[QA Service] getAll() returning:', result.length, 'records');
 return result;
 },

 // Get by ID
 getById(id: string): QuotationAnalysis | null {
 const all = quotationAnalysisService.getAll();
 return all.find(qa => qa.id === id) || null;
 },

 // Get by QA Number
 getByQANumber(qaNumber: string): QuotationAnalysis | null {
 const all = quotationAnalysisService.getAll();
 return all.find(qa => qa.qaNumber === qaNumber) || null;
 },

 // Get by PR ID
 getByPRId(prId: string): QuotationAnalysis[] {
 const all = quotationAnalysisService.getAll();
 return all.filter(qa => qa.prId === prId);
 },

 // Create new quotation analysis
 create(data: Omit<QuotationAnalysis, 'id' | 'qaNumber' | 'createdAt' | 'updatedAt'>): QuotationAnalysis {
 const all = quotationAnalysisService.getAll();
 
 // Generate QA number
 const currentYear = new Date().getFullYear();
 const yearQAs = all.filter(qa => qa.qaNumber.startsWith(`QA-${currentYear}`));
 const nextSequence = yearQAs.length + 1;
 const qaNumber = `QA-${currentYear}-${nextSequence.toString().padStart(5, '0')}`;
 
 // Generate ID
 const id = `qa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
 
 const now = new Date().toISOString();
 const newQA: QuotationAnalysis = {
 ...data,
 id,
 qaNumber,
 createdAt: now,
 updatedAt: now
 };
 
 all.push(newQA);
 localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(all));
 
 return newQA;
 },

 // Update quotation analysis
 update(id: string, data: Partial<QuotationAnalysis>): QuotationAnalysis | null {
 const all = quotationAnalysisService.getAll();
 const index = all.findIndex(qa => qa.id === id);
 
 if (index === -1) return null;
 
 const updated: QuotationAnalysis = {
 ...all[index],
 ...data,
 id: all[index].id, // Preserve ID
 qaNumber: all[index].qaNumber, // Preserve QA number
 createdAt: all[index].createdAt, // Preserve creation date
 updatedAt: new Date().toISOString()
 };
 
 all[index] = updated;
 localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(all));
 
 return updated;
 },

 // Delete quotation analysis
 delete(id: string): boolean {
 const all = quotationAnalysisService.getAll();
 const filtered = all.filter(qa => qa.id !== id);
 
 if (filtered.length === all.length) return false;
 
 localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(filtered));
 return true;
 },

 // Calculate supplier score
 calculateScore(
 supplier: Omit<QuotationSupplierData, 'score'>,
 weights: { price: number; delivery: number; warranty: number; compliance: number },
 allSuppliers: Omit<QuotationSupplierData, 'score'>[]
 ): number {
 // Price score (lowest price gets 100)
 const lowestPrice = Math.min(...allSuppliers.map(s => s.price));
 const priceScore = (lowestPrice / supplier.price) * 100;
 
 // Delivery time score (fastest delivery gets 100)
 const fastestDelivery = Math.min(...allSuppliers.map(s => s.deliveryTime));
 const deliveryScore = (fastestDelivery / supplier.deliveryTime) * 100;
 
 // Warranty score (simplified - based on months extracted from warranty text)
 const getWarrantyMonths = (warranty: string): number => {
 const match = warranty.match(/(\d+)\s*months?/i);
 return match ? parseInt(match[1]) : 12;
 };
 const warrantyMonths = getWarrantyMonths(supplier.warranty);
 const maxWarrantyMonths = Math.max(...allSuppliers.map(s => getWarrantyMonths(s.warranty)));
 const warrantyScore = (warrantyMonths / maxWarrantyMonths) * 100;
 
 // Compliance score (subjective - based on notes quality)
 const complianceScore = supplier.complianceNotes.length > 50 ? 95 : 
 supplier.complianceNotes.length > 30 ? 85 : 75;
 
 // Calculate weighted total
 const totalScore = (
 (priceScore * weights.price / 100) +
 (deliveryScore * weights.delivery / 100) +
 (warrantyScore * weights.warranty / 100) +
 (complianceScore * weights.compliance / 100)
 );
 
 return Math.round(totalScore);
 },

 // Get statistics
 getStatistics() {
 const all = quotationAnalysisService.getAll();
 return {
 total: all.length,
 draft: all.filter(qa => qa.status === 'draft').length,
 completed: all.filter(qa => qa.status === 'completed').length,
 approved: all.filter(qa => qa.status === 'approved').length,
 attachedToPO: all.filter(qa => qa.status === 'attached_to_po').length
 };
 }
};

// ============================================================================
// BIDS ANALYSIS - SAMPLE DATA (for future implementation)
// ============================================================================

const INITIAL_BA_DATA: BidsAnalysis[] = [
 // ============================================================================
 // TEST RECORD #1: FORMAL TENDER / CBA (> $25,000)
 // ============================================================================
 {
 id: 'ba-test-tender-001',
 baNumber: 'BA-2026-00001',
 rfqNumber: 'RFQ-2026-TENDER-001',
 tenderNumber: 'TENDER-2026-001',
 organizationId: 'org-001',
 operatingUnitId: 'ou-org-001-hq',
 country: 'Jordan',
 analysisDate: '2026-01-28',
 purchaseDescription: 'Heavy Equipment Procurement: 2x Excavators, 1x Bulldozer, 1x Loader with accessories',
 requestedBy: 'Infrastructure Manager',
 budgetAmount: 75000,
 budgetLineId: 'bl-capital-equipment',
 currency: 'USD',
 evaluationCriteria: [],
 technicalThreshold: 70,
 bidders: ['bidder-heavy-001', 'bidder-heavy-002', 'bidder-heavy-003', 'bidder-heavy-004'],
 technicalScores: [
 {
 bidderId: 'bidder-heavy-001',
 bidderName: 'Caterpillar Jordan LLC',
 criterionScores: {},
 totalTechnicalScore: 92,
 meetsThreshold: true
 },
 {
 bidderId: 'bidder-heavy-002',
 bidderName: 'Heavy Equipment Solutions',
 criterionScores: {},
 totalTechnicalScore: 88,
 meetsThreshold: true
 },
 {
 bidderId: 'bidder-heavy-003',
 bidderName: 'Industrial Machinery MENA',
 criterionScores: {},
 totalTechnicalScore: 85,
 meetsThreshold: true
 },
 {
 bidderId: 'bidder-heavy-004',
 bidderName: 'Budget Heavy Machinery',
 criterionScores: {},
 totalTechnicalScore: 65,
 meetsThreshold: false
 }
 ],
 financialScores: [
 {
 bidderId: 'bidder-heavy-001',
 bidderName: 'Caterpillar Jordan LLC',
 totalPrice: 72000,
 financialScore: 94
 },
 {
 bidderId: 'bidder-heavy-002',
 bidderName: 'Heavy Equipment Solutions',
 totalPrice: 68000,
 financialScore: 100
 },
 {
 bidderId: 'bidder-heavy-003',
 bidderName: 'Industrial Machinery MENA',
 totalPrice: 70000,
 financialScore: 97
 },
 {
 bidderId: 'bidder-heavy-004',
 bidderName: 'Budget Heavy Machinery',
 totalPrice: 65000,
 financialScore: 0 // Disqualified - failed technical threshold
 }
 ],
 finalScores: [
 {
 bidderId: 'bidder-heavy-001',
 bidderName: 'Caterpillar Jordan LLC',
 technicalScore: 92,
 financialScore: 94,
 totalScore: 93,
 remarks: 'Excellent technical proposal. Authorized Caterpillar dealer with comprehensive warranty and support.'
 },
 {
 bidderId: 'bidder-heavy-002',
 bidderName: 'Heavy Equipment Solutions',
 technicalScore: 88,
 financialScore: 100,
 totalScore: 94,
 remarks: 'Lowest bidder. Good technical proposal with acceptable warranty terms.'
 },
 {
 bidderId: 'bidder-heavy-003',
 bidderName: 'Industrial Machinery MENA',
 technicalScore: 85,
 financialScore: 97,
 totalScore: 91,
 remarks: 'Competitive proposal with good technical specifications.'
 },
 {
 bidderId: 'bidder-heavy-004',
 bidderName: 'Budget Heavy Machinery',
 technicalScore: 65,
 financialScore: 0,
 totalScore: 0,
 remarks: 'DISQUALIFIED - Failed to meet minimum technical threshold of 70%'
 }
 ],
 lowestProposalAmount: 68000,
 selectedBidderId: 'bidder-heavy-001',
 selectedBidderName: 'Caterpillar Jordan LLC',
 selectionJustification: 'Caterpillar Jordan LLC selected despite not being the lowest bidder ($72,000 vs. $68,000) based on:\n\n**TECHNICAL SUPERIORITY** (Score: 92/100 vs. 88/100)\n1. Authorized Caterpillar dealer with 25+ years experience in MENA region\n2. OEM (Original Equipment Manufacturer) parts and warranties\n3. Comprehensive 3-year warranty with on-site support vs. 2-year standard from lowest bidder\n4. Proven track record with 50+ NGO/INGO projects in region\n5. Dedicated service center in Amman with certified technicians\n\n**RISK MITIGATION**\n1. Critical infrastructure project requiring highest reliability\n2. Equipment will operate in challenging field conditions\n3. Downtime costs estimated at $500/day - reliability is paramount\n4. OEM parts availability vs. generic parts from competitors\n\n**TOTAL COST OF OWNERSHIP**\nPrice difference: $4,000 (5.9%) justified by:\n- Extended warranty coverage (estimated value: $2,000)\n- Superior parts availability and faster service response\n- Higher resale value of Caterpillar equipment\n- Lower maintenance costs over equipment lifecycle\n\n**COMBINED EVALUATION SCORE**\n- Technical Score: 92% (highest among qualified bidders)\n- Financial Score: 94% (second highest)\n- **Overall Score: 93%** (HIGHEST COMBINED SCORE)\n\n**EVALUATION COMMITTEE RECOMMENDATION**\nUnanimous recommendation to award to Caterpillar Jordan LLC based on best value for money considering technical superiority, risk mitigation, and total cost of ownership.\n\nCommittee Members:\n- Infrastructure Manager (Chair)\n- Logistics Manager \n- Finance Manager\n- Technical Specialist (Equipment Expert)\n\nApproved by Director and Country Representative.',
 approver1: 'Logistics Manager',
 approver1Date: '2026-01-30',
 approver2: 'Finance Manager',
 approver2Date: '2026-01-31',
 approver3: 'Country Director',
 approver3Date: '2026-02-01',
 status: 'approved',
 locked: true,
 createdAt: '2026-01-28T09:00:00Z',
 createdBy: 'user-procurement-officer',
 updatedAt: '2026-02-01T16:00:00Z',
 updatedBy: 'user-country-director'
 }
];

// ============================================================================
// BIDS ANALYSIS - CRUD OPERATIONS
// ============================================================================

export const bidsAnalysisService = {
 initialize: () => {
 const existing = localStorage.getItem(BA_STORAGE_KEY);
 if (!existing) {
 localStorage.setItem(BA_STORAGE_KEY, JSON.stringify(INITIAL_BA_DATA));
 console.log('[BA Service] 💾 Initialized with', INITIAL_BA_DATA.length, 'CBA test records');
 }
 },

 getAllBidsAnalyses: (): BidsAnalysis[] => {
 bidsAnalysisService.initialize();
 const data = localStorage.getItem(BA_STORAGE_KEY);
 const result = data ? JSON.parse(data) : [];
 console.log('[BA Service] getAllBidsAnalyses() returning:', result.length, 'records');
 return result;
 },

 getById: (id: string): BidsAnalysis | null => {
 const all = bidsAnalysisService.getAllBidsAnalyses();
 return all.find(ba => ba.id === id) || null;
 },

 delete: (id: string): boolean => {
 const all = bidsAnalysisService.getAllBidsAnalyses();
 const filtered = all.filter(ba => ba.id !== id);
 
 if (filtered.length === all.length) return false;
 
 localStorage.setItem(BA_STORAGE_KEY, JSON.stringify(filtered));
 return true;
 },

 // Additional CRUD methods to be implemented when Bids module is built
};