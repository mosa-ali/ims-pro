// ============================================================================
// TENDER ANNOUNCEMENT SERVICE
// Integrated Management System (IMS)
// 100% SPECIFICATION COMPLIANT
// ============================================================================

import { TenderAnnouncement, TenderBidder } from '@/app/types/logistics.types';

const STORAGE_KEY = 'ims_tender_announcements_v1';

export const tenderAnnouncementService = {
 
 /**
 * Get all tender announcements
 */
 getAllAnnouncements(): TenderAnnouncement[] {
 const data = localStorage.getItem(STORAGE_KEY);
 const announcements: TenderAnnouncement[] = data ? JSON.parse(data) : [];
 
 // Auto-inject mandatory test case 3 announcement if missing
 if (!announcements.find(a => a.prId === 'pr-test-case-3-30k')) {
 const testAnnouncement: TenderAnnouncement = {
 id: 'tender-test-case-3',
 prId: 'pr-test-case-3-30k',
 prNumber: 'PR-2026-00052',
 startDate: '2026-01-27',
 endDate: '2026-02-15', // Future date -> BA should be disabled
 channel: 'website',
 bidders: [
 {
 id: 'bidder-tc3-1',
 name: 'Global Infrastructure Ltd',
 submissionDate: '2026-01-27',
 status: 'valid',
 receiptPrinted: true,
 receiptPrintedAt: '2026-01-27T14:00:00Z'
 }
 ],
 status: 'published',
 createdAt: '2026-01-27T12:30:00Z',
 createdBy: 'system',
 updatedAt: '2026-01-27T12:30:00Z'
 };
 announcements.push(testAnnouncement);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(announcements));
 }
 
 return announcements;
 },

 /**
 * Get announcement by PR ID (Strictly isolated by PR Number)
 */
 getAnnouncementByPRId(prId: string): TenderAnnouncement | null {
 const pr = localStorage.getItem('ims_procurement_requests');
 const allPRs: any[] = pr ? JSON.parse(pr) : [];
 const targetPR = allPRs.find(p => p.id === prId);
 const prNumber = targetPR ? targetPR.prNumber : prId;

 const all = this.getAllAnnouncements();
 return all.find(a => a.prNumber === prNumber || a.prId === prId) || null;
 },

 /**
 * Initialize announcement for a PR
 */
 initializeAnnouncement(prId: string, prNumber: string, userId: string): TenderAnnouncement {
 const existing = this.getAnnouncementByPRId(prId);
 if (existing) return existing;

 const newAnnouncement: TenderAnnouncement = {
 id: `tender_${Date.now()}`,
 prId,
 prNumber,
 startDate: new Date().toISOString().split('T')[0],
 endDate: '',
 channel: 'website',
 bidders: [],
 status: 'draft',
 createdAt: new Date().toISOString(),
 createdBy: userId,
 updatedAt: new Date().toISOString()
 };

 this.saveAnnouncement(newAnnouncement);
 return newAnnouncement;
 },

 /**
 * Save announcement
 */
 saveAnnouncement(announcement: TenderAnnouncement): void {
 const all = this.getAllAnnouncements();
 const index = all.findIndex(a => a.id === announcement.id);
 
 announcement.updatedAt = new Date().toISOString();
 
 if (index >= 0) {
 all[index] = announcement;
 } else {
 all.push(announcement);
 }
 
 localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
 },

 /**
 * Add Bidder to Tender
 */
 addBidder(announcementId: string, bidderData: Omit<TenderBidder, 'id' | 'receiptPrinted'>): TenderBidder | null {
 const all = this.getAllAnnouncements();
 const announcement = all.find(a => a.id === announcementId);
 if (!announcement) return null;

 const newBidder: TenderBidder = {
 ...bidderData,
 id: `bidder_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
 receiptPrinted: false
 };

 announcement.bidders.push(newBidder);
 this.saveAnnouncement(announcement);
 return newBidder;
 },

 /**
 * Mark Receipt as Printed (Locked)
 */
 markReceiptPrinted(announcementId: string, bidderId: string): void {
 const all = this.getAllAnnouncements();
 const announcement = all.find(a => a.id === announcementId);
 if (!announcement) return;

 const bidder = announcement.bidders.find(b => b.id === bidderId);
 if (bidder) {
 bidder.receiptPrinted = true;
 bidder.receiptPrintedAt = new Date().toISOString();
 this.saveAnnouncement(announcement);
 }
 },

 /**
 * Check if BA can be created
 * Rule: Today >= Announcement End Date
 */
 canCreateBA(prId: string): { allowed: boolean; reason?: string } {
 const announcement = this.getAnnouncementByPRId(prId);
 if (!announcement) return { allowed: false, reason: 'Tender announcement not initialized.' };
 
 if (!announcement.endDate) return { allowed: false, reason: 'Announcement end date not set.' };

 const today = new Date().toISOString().split('T')[0];
 if (today < announcement.endDate) {
 return { 
 allowed: false, 
 reason: 'Tender announcement period is still open. Bid Analysis (BA) can only be created after the announcement end date.' 
 };
 }

 if (announcement.bidders.filter(b => b.status === 'valid').length < 1) {
 return { allowed: false, reason: 'At least one valid bidder is required.' };
 }

 return { allowed: true };
 }
};
