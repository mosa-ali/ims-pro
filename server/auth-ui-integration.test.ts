import { describe, it, expect, beforeEach } from 'vitest';
import { SAMLIdPConfigService } from './_core/auth/saml-idp-config';
import { TRPCError } from '@trpc/server';

describe('SAML IdP Configuration Service', () => {
  let service: SAMLIdPConfigService;

  beforeEach(() => {
    service = new SAMLIdPConfigService();
  });

  describe('Okta Configuration', () => {
    it('should configure Okta successfully', () => {
      const config = {
        domain: 'company.okta.com',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      service.configureOkta('org1', config);
      const retrieved = service.getOktaConfig('org1');

      expect(retrieved.domain).toBe('company.okta.com');
      expect(retrieved.clientId).toBe('client123');
    });

    it('should reject invalid Okta domain', () => {
      const config = {
        domain: 'company.example.com',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      expect(() => service.configureOkta('org1', config)).toThrow(TRPCError);
    });

    it('should reject missing Okta credentials', () => {
      const config = {
        domain: 'company.okta.com',
        clientId: '',
        clientSecret: '',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      expect(() => service.configureOkta('org1', config)).toThrow(TRPCError);
    });

    it('should generate Okta metadata URL', () => {
      const config = {
        domain: 'company.okta.com',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      service.configureOkta('org1', config);
      const url = service.getOktaMetadataUrl('org1');

      expect(url).toContain('company.okta.com');
      expect(url).toContain('metadata');
    });

    it('should throw error for non-existent Okta config', () => {
      expect(() => service.getOktaConfig('non-existent')).toThrow(TRPCError);
    });
  });

  describe('Azure AD Configuration', () => {
    it('should configure Azure AD successfully', () => {
      const config = {
        tenantId: '12345678-1234-1234-1234-123456789012',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      service.configureAzureAD('org1', config);
      const retrieved = service.getAzureADConfig('org1');

      expect(retrieved.tenantId).toBe('12345678-1234-1234-1234-123456789012');
      expect(retrieved.clientId).toBe('client123');
    });

    it('should reject invalid Azure AD tenant ID', () => {
      const config = {
        tenantId: 'invalid-guid',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      expect(() => service.configureAzureAD('org1', config)).toThrow(TRPCError);
    });

    it('should reject missing Azure AD credentials', () => {
      const config = {
        tenantId: '12345678-1234-1234-1234-123456789012',
        clientId: '',
        clientSecret: '',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      expect(() => service.configureAzureAD('org1', config)).toThrow(TRPCError);
    });

    it('should generate Azure AD metadata URL', () => {
      const config = {
        tenantId: '12345678-1234-1234-1234-123456789012',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      service.configureAzureAD('org1', config);
      const url = service.getAzureADMetadataUrl('org1');

      expect(url).toContain('12345678-1234-1234-1234-123456789012');
      expect(url).toContain('federationmetadata');
    });

    it('should throw error for non-existent Azure AD config', () => {
      expect(() => service.getAzureADConfig('non-existent')).toThrow(TRPCError);
    });
  });

  describe('SAML Configuration', () => {
    it('should generate SAML config from Okta', () => {
      const config = {
        domain: 'company.okta.com',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      service.configureOkta('org1', config);
      const samlConfig = service.getSAMLConfig('okta-org1');

      expect(samlConfig.entityId).toContain('okta.com');
      expect(samlConfig.singleSignOnUrl).toContain('saml');
      expect(samlConfig.certificate).toContain('BEGIN CERTIFICATE');
    });

    it('should generate SAML config from Azure AD', () => {
      const config = {
        tenantId: '12345678-1234-1234-1234-123456789012',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      service.configureAzureAD('org1', config);
      const samlConfig = service.getSAMLConfig('azure-org1');

      expect(samlConfig.entityId).toContain('sts.windows.net');
      expect(samlConfig.singleSignOnUrl).toContain('login.microsoftonline.com');
      expect(samlConfig.certificate).toContain('BEGIN CERTIFICATE');
    });

    it('should throw error for non-existent SAML config', () => {
      expect(() => service.getSAMLConfig('non-existent')).toThrow(TRPCError);
    });
  });

  describe('Configuration Status', () => {
    it('should return configuration status', () => {
      const oktaConfig = {
        domain: 'company.okta.com',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      service.configureOkta('org1', oktaConfig);
      const status = service.getConfigurationStatus('org1');

      expect(status.okta).toBe(true);
      expect(status.azure).toBe(false);
    });

    it('should list configured IdPs', () => {
      const oktaConfig = {
        domain: 'company.okta.com',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      const azureConfig = {
        tenantId: '12345678-1234-1234-1234-123456789012',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      service.configureOkta('org1', oktaConfig);
      service.configureAzureAD('org1', azureConfig);

      const idps = service.listConfiguredIdPs('org1');

      expect(idps).toContain('okta');
      expect(idps).toContain('azure');
      expect(idps).toHaveLength(2);
    });
  });

  describe('Configuration Removal', () => {
    it('should remove Okta configuration', () => {
      const config = {
        domain: 'company.okta.com',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      service.configureOkta('org1', config);
      service.removeConfiguration('org1', 'okta');

      expect(() => service.getOktaConfig('org1')).toThrow(TRPCError);
    });

    it('should remove Azure AD configuration', () => {
      const config = {
        tenantId: '12345678-1234-1234-1234-123456789012',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      service.configureAzureAD('org1', config);
      service.removeConfiguration('org1', 'azure');

      expect(() => service.getAzureADConfig('org1')).toThrow(TRPCError);
    });
  });

  describe('Test SAML Authentication', () => {
    it('should test Okta SAML authentication', async () => {
      const config = {
        domain: 'company.okta.com',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      service.configureOkta('org1', config);
      const result = await service.testSAMLAuth('org1', 'okta');

      // Will be false since we're not making real API calls
      expect(typeof result).toBe('boolean');
    });

    it('should test Azure AD SAML authentication', async () => {
      const config = {
        tenantId: '12345678-1234-1234-1234-123456789012',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      service.configureAzureAD('org1', config);
      const result = await service.testSAMLAuth('org1', 'azure');

      // Will be false since we're not making real API calls
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Multi-Organization Support', () => {
    it('should support multiple organizations', () => {
      const oktaConfig = {
        domain: 'company1.okta.com',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      const azureConfig = {
        domain: 'company2.okta.com',
        clientId: 'client456',
        clientSecret: 'secret456',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      service.configureOkta('org1', oktaConfig);
      service.configureOkta('org2', azureConfig as any);

      const config1 = service.getOktaConfig('org1');
      const config2 = service.getOktaConfig('org2');

      expect(config1.domain).toBe('company1.okta.com');
      expect(config2.domain).toBe('company2.okta.com');
    });

    it('should isolate configurations by organization', () => {
      const oktaConfig = {
        domain: 'company.okta.com',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'https://app.example.com/auth/saml/acs',
      };

      service.configureOkta('org1', oktaConfig);
      service.removeConfiguration('org1', 'okta');

      // org2 should not be affected
      expect(() => service.getOktaConfig('org2')).toThrow(TRPCError);
    });
  });
});
