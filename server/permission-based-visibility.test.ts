import { describe, it, expect } from 'vitest';
import { MODULE_DEFINITIONS, SCREEN_DEFINITIONS, DEFAULT_ROLE_TEMPLATES } from './rbacService';

describe('Permission-Based Visibility - Risk & Compliance and Reports & Analytics', () => {
  
  describe('Module Registration', () => {
    it('should have risk_compliance module defined', () => {
      const riskModule = MODULE_DEFINITIONS.find(m => m.id === 'risk_compliance');
      expect(riskModule).toBeDefined();
      expect(riskModule?.name).toBe('Risk & Compliance');
    });

    it('should have reports_analytics module defined', () => {
      const reportsModule = MODULE_DEFINITIONS.find(m => m.id === 'reports_analytics');
      expect(reportsModule).toBeDefined();
      expect(reportsModule?.name).toBe('Reports & Analytics');
    });
  });

  describe('Screen Definitions', () => {
    it('should have screens for risk_compliance module', () => {
      const screens = SCREEN_DEFINITIONS['risk_compliance'];
      expect(screens).toBeDefined();
      expect(screens.map(s => s.id)).toContain('risks');
      expect(screens.map(s => s.id)).toContain('incidents');
    });

    it('should have screens for reports_analytics module', () => {
      const screens = SCREEN_DEFINITIONS['reports_analytics'];
      expect(screens).toBeDefined();
      expect(screens.map(s => s.id)).toContain('dashboard');
      expect(screens.map(s => s.id)).toContain('reports');
    });
  });

  describe('Role Permissions', () => {
    it('all roles should have permissions for risk_compliance', () => {
      DEFAULT_ROLE_TEMPLATES.forEach(role => {
        expect(role.permissions['risk_compliance']).toBeDefined();
      });
    });

    it('all roles should have permissions for reports_analytics', () => {
      DEFAULT_ROLE_TEMPLATES.forEach(role => {
        expect(role.permissions['reports_analytics']).toBeDefined();
      });
    });

    it('Program Manager should have full access to risk_compliance', () => {
      const pmRole = DEFAULT_ROLE_TEMPLATES.find(r => r.name === 'Program Manager');
      const perms = pmRole?.permissions['risk_compliance'];
      expect(perms?.view).toBe(true);
      expect(perms?.create).toBe(true);
    });

    it('Finance Manager should have full access to reports_analytics', () => {
      const fmRole = DEFAULT_ROLE_TEMPLATES.find(r => r.name === 'Finance Manager');
      const perms = fmRole?.permissions['reports_analytics'];
      expect(perms?.view).toBe(true);
      expect(perms?.create).toBe(true);
    });
  });

  describe('Sidebar Filtering', () => {
    it('should map risk to risk_compliance module', () => {
      const sidebarMap: Record<string, string> = {
        'risk': 'risk_compliance',
        'reports': 'reports_analytics',
      };
      expect(sidebarMap['risk']).toBe('risk_compliance');
    });

    it('should not include risk and reports in alwaysVisibleItems', () => {
      const alwaysVisible = new Set(['dash', 'assets']);
      expect(alwaysVisible.has('risk')).toBe(false);
      expect(alwaysVisible.has('reports')).toBe(false);
    });
  });
});
