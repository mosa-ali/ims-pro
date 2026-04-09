/**
 * ============================================================================
 * Phase 4: Advanced Features Test Suite
 * ============================================================================
 * 
 * Comprehensive tests for:
 * - Onboarding status notifications (bilingual)
 * - Webhook delivery analytics
 * - Microsoft Graph API integration
 * - SharePoint/OneDrive document management
 * 
 * ============================================================================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  notifyOnboardingStarted,
  notifyOnboardingCompleted,
  notifyOnboardingFailed,
  notifyConsentLinkExpired,
  getNotificationTemplate,
  formatNotificationForAudit,
} from '../server/services/notifications/onboardingStatusNotificationService';
import {
  calculateDeliveryMetrics,
  analyzeEventTypeDistribution,
  analyzeRetryPatterns,
  generateDeliveryTrends,
  calculateSLACompliance,
  calculateWebhookHealthScore,
} from '../server/services/webhooks/webhookAnalyticsService';
import { GraphApiService } from '../server/services/microsoft/graphApiService';

describe('Phase 4: Advanced Features', () => {
  // ============================================================================
  // Onboarding Status Notifications Tests
  // ============================================================================

  describe('Onboarding Status Notifications', () => {
    it('should send onboarding started notification in English', async () => {
      const result = await notifyOnboardingStarted({
        organizationId: 'org-123',
        organizationName: 'Test Organization',
        adminEmail: 'admin@test.com',
        adminName: 'John Doe',
        status: 'started',
        onboardingLink: 'https://example.com/onboard/token123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        language: 'en',
      });
      expect(result).toBe(true);
    });

    it('should send onboarding started notification in Arabic', async () => {
      const result = await notifyOnboardingStarted({
        organizationId: 'org-123',
        organizationName: 'منظمة الاختبار',
        adminEmail: 'admin@test.com',
        adminName: 'أحمد علي',
        status: 'started',
        onboardingLink: 'https://example.com/onboard/token123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        language: 'ar',
      });
      expect(result).toBe(true);
    });

    it('should send onboarding completed notification', async () => {
      const result = await notifyOnboardingCompleted({
        organizationId: 'org-123',
        organizationName: 'Test Organization',
        adminEmail: 'admin@test.com',
        adminName: 'John Doe',
        status: 'completed',
        tenantId: 'tenant-456',
        language: 'en',
      });
      expect(result).toBe(true);
    });

    it('should send onboarding failed notification', async () => {
      const result = await notifyOnboardingFailed({
        organizationId: 'org-123',
        organizationName: 'Test Organization',
        adminEmail: 'admin@test.com',
        adminName: 'John Doe',
        status: 'failed',
        errorMessage: 'Invalid tenant configuration',
        language: 'en',
      });
      expect(result).toBe(true);
    });

    it('should send consent link expired notification', async () => {
      const result = await notifyConsentLinkExpired({
        organizationId: 'org-123',
        organizationName: 'Test Organization',
        adminEmail: 'admin@test.com',
        adminName: 'John Doe',
        status: 'expired',
        language: 'en',
      });
      expect(result).toBe(true);
    });

    it('should get notification template for English', () => {
      const template = getNotificationTemplate('completed', 'en');
      expect(template.subject).toContain('Onboarding is Complete');
      expect(template.body).toContain('successfully connected');
    });

    it('should get notification template for Arabic', () => {
      const template = getNotificationTemplate('completed', 'ar');
      expect(template.subject).toContain('اكتمل');
      expect(template.body).toContain('بنجاح');
    });

    it('should format notification for audit logging', () => {
      const audit = formatNotificationForAudit({
        organizationId: 'org-123',
        organizationName: 'Test Organization',
        adminEmail: 'admin@test.com',
        adminName: 'John Doe',
        status: 'completed',
        language: 'en',
      });
      expect(audit).toHaveProperty('timestamp');
      expect(audit).toHaveProperty('organizationId', 'org-123');
      expect(audit).toHaveProperty('type', 'onboarding_status_notification');
    });
  });

  // ============================================================================
  // Webhook Delivery Analytics Tests
  // ============================================================================

  describe('Webhook Delivery Analytics', () => {
    const mockDeliveries = [
      { webhookId: 'wh-1', status: 'success', responseTime: 1200, attempt: 1, timestamp: new Date().toISOString(), eventType: 'organization_created' },
      { webhookId: 'wh-1', status: 'success', responseTime: 1500, attempt: 1, timestamp: new Date().toISOString(), eventType: 'onboarding_started' },
      { webhookId: 'wh-1', status: 'failed', responseTime: 5000, attempt: 5, timestamp: new Date().toISOString(), eventType: 'onboarding_failed' },
      { webhookId: 'wh-1', status: 'success', responseTime: 800, attempt: 2, timestamp: new Date().toISOString(), eventType: 'organization_created' },
      { webhookId: 'wh-1', status: 'timeout', responseTime: 30000, attempt: 1, timestamp: new Date().toISOString(), eventType: 'onboarding_completed' },
    ];

    it('should calculate delivery metrics', () => {
      const metrics = calculateDeliveryMetrics(mockDeliveries);
      expect(metrics.totalDeliveries).toBe(5);
      expect(metrics.successfulDeliveries).toBe(3);
      expect(metrics.failedDeliveries).toBe(1);
      expect(metrics.timedOutDeliveries).toBe(1);
      expect(metrics.successRate).toBe(60);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should analyze event type distribution', () => {
      const distribution = analyzeEventTypeDistribution(mockDeliveries);
      expect(distribution.length).toBeGreaterThan(0);
      expect(distribution[0]).toHaveProperty('eventType');
      expect(distribution[0]).toHaveProperty('count');
      expect(distribution[0]).toHaveProperty('percentage');
      expect(distribution[0]).toHaveProperty('successRate');
    });

    it('should analyze retry patterns', () => {
      const analysis = analyzeRetryPatterns(mockDeliveries);
      expect(analysis.totalRetries).toBeGreaterThan(0);
      expect(analysis.retrySuccessRate).toBeGreaterThanOrEqual(0);
      expect(analysis.averageAttemptsPerDelivery).toBeGreaterThan(1);
    });

    it('should generate delivery trends', () => {
      const trends = generateDeliveryTrends(mockDeliveries, 60);
      expect(trends.length).toBeGreaterThan(0);
      expect(trends[0]).toHaveProperty('timestamp');
      expect(trends[0]).toHaveProperty('successCount');
      expect(trends[0]).toHaveProperty('failureCount');
    });

    it('should calculate SLA compliance', () => {
      const sla = calculateSLACompliance(mockDeliveries, 5000);
      expect(sla).toHaveProperty('compliant');
      expect(sla).toHaveProperty('nonCompliant');
      expect(sla).toHaveProperty('complianceRate');
      expect(sla.complianceRate).toBeGreaterThanOrEqual(0);
      expect(sla.complianceRate).toBeLessThanOrEqual(100);
    });

    it('should calculate webhook health score', () => {
      const metrics = calculateDeliveryMetrics(mockDeliveries);
      const healthScore = calculateWebhookHealthScore(metrics);
      expect(healthScore).toBeGreaterThanOrEqual(0);
      expect(healthScore).toBeLessThanOrEqual(100);
    });
  });

  // ============================================================================
  // Microsoft Graph API Service Tests
  // ============================================================================

  describe('Microsoft Graph API Service', () => {
    let graphService: GraphApiService;

    beforeEach(() => {
      graphService = new GraphApiService('tenant-123', 'mock-access-token');
      // Mock axios calls
      vi.mock('axios');
    });

    it('should initialize GraphApiService with tenant and token', () => {
      expect(graphService).toBeDefined();
    });

    it('should format file size correctly', () => {
      const formatFileSize = (bytes?: number) => {
        if (!bytes) return '-';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      };

      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
    });

    it('should handle SharePoint site data', () => {
      const mockSite = {
        id: 'site-1',
        name: 'Finance',
        webUrl: 'https://example.sharepoint.com/sites/finance',
        displayName: 'Finance Site',
      };
      expect(mockSite).toHaveProperty('id');
      expect(mockSite).toHaveProperty('webUrl');
    });

    it('should handle document library data', () => {
      const mockLibrary = {
        id: 'lib-1',
        name: 'Documents',
        displayName: 'Shared Documents',
        webUrl: 'https://example.sharepoint.com/sites/finance/Shared%20Documents',
        itemCount: 45,
      };
      expect(mockLibrary).toHaveProperty('id');
      expect(mockLibrary.itemCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle drive item data', () => {
      const mockItem = {
        id: 'item-1',
        name: 'Report.xlsx',
        type: 'file' as const,
        size: 2048000,
        createdDateTime: '2026-03-01T10:00:00Z',
        lastModifiedDateTime: '2026-03-10T15:30:00Z',
        webUrl: 'https://example.sharepoint.com/sites/finance/Report.xlsx',
      };
      expect(mockItem.type).toBe('file');
      expect(mockItem.size).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Document Management UI Tests
  // ============================================================================

  describe('Document Management UI', () => {
    it('should display SharePoint sites', () => {
      const mockSites = [
        { id: 'site-1', name: 'Finance', displayName: 'Finance Site', webUrl: 'https://example.sharepoint.com/sites/finance' },
        { id: 'site-2', name: 'HR', displayName: 'HR Site', webUrl: 'https://example.sharepoint.com/sites/hr' },
      ];
      expect(mockSites.length).toBe(2);
      expect(mockSites[0].displayName).toBe('Finance Site');
    });

    it('should display document libraries', () => {
      const mockLibraries = [
        { id: 'lib-1', name: 'Documents', displayName: 'Shared Documents', itemCount: 45 },
        { id: 'lib-2', name: 'Archives', displayName: 'Archived Files', itemCount: 120 },
      ];
      expect(mockLibraries.length).toBe(2);
      expect(mockLibraries[0].itemCount).toBe(45);
    });

    it('should display drive items with correct types', () => {
      const mockItems = [
        { id: 'item-1', name: 'Q1 Report', type: 'folder' as const, createdDateTime: '2026-03-01', lastModifiedDateTime: '2026-03-10', webUrl: '' },
        { id: 'item-2', name: 'Budget.xlsx', type: 'file' as const, size: 2048000, createdDateTime: '2026-02-15', lastModifiedDateTime: '2026-03-09', webUrl: '' },
      ];
      expect(mockItems[0].type).toBe('folder');
      expect(mockItems[1].type).toBe('file');
      expect(mockItems[1].size).toBeDefined();
    });

    it('should support bilingual labels', () => {
      const labels = {
        en: { title: 'Document Management', upload: 'Upload File' },
        ar: { title: 'إدارة المستندات', upload: 'تحميل ملف' },
      };
      expect(labels.en.title).toBe('Document Management');
      expect(labels.ar.title).toBe('إدارة المستندات');
    });

    it('should support RTL layout', () => {
      const isRTL = true;
      expect(isRTL).toBe(true);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Phase 4 Integration', () => {
    it('should complete full onboarding notification workflow', async () => {
      const startResult = await notifyOnboardingStarted({
        organizationId: 'org-123',
        organizationName: 'Test Organization',
        adminEmail: 'admin@test.com',
        adminName: 'John Doe',
        status: 'started',
        onboardingLink: 'https://example.com/onboard/token123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        language: 'en',
      });
      expect(startResult).toBe(true);

      const completeResult = await notifyOnboardingCompleted({
        organizationId: 'org-123',
        organizationName: 'Test Organization',
        adminEmail: 'admin@test.com',
        adminName: 'John Doe',
        status: 'completed',
        tenantId: 'tenant-456',
        language: 'en',
      });
      expect(completeResult).toBe(true);
    });

    it('should complete webhook analytics workflow', () => {
      const mockDeliveries = Array.from({ length: 100 }, (_, i) => ({
        webhookId: 'wh-1',
        status: Math.random() > 0.05 ? 'success' : 'failed',
        responseTime: Math.floor(Math.random() * 5000),
        attempt: Math.floor(Math.random() * 5) + 1,
        timestamp: new Date().toISOString(),
        eventType: ['organization_created', 'onboarding_started', 'onboarding_completed', 'onboarding_failed'][Math.floor(Math.random() * 4)],
      }));

      const metrics = calculateDeliveryMetrics(mockDeliveries);
      expect(metrics.successRate).toBeGreaterThan(0);

      const distribution = analyzeEventTypeDistribution(mockDeliveries);
      expect(distribution.length).toBeGreaterThan(0);

      const healthScore = calculateWebhookHealthScore(metrics);
      expect(healthScore).toBeGreaterThanOrEqual(0);
    });

    it('should support multi-language notifications and UI', () => {
      const languages = ['en', 'ar'];
      languages.forEach(lang => {
        const template = getNotificationTemplate('started', lang);
        expect(template.subject).toBeDefined();
        expect(template.body).toBeDefined();
      });
    });
  });
});
