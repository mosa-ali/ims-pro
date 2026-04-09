import { TRPCError } from '@trpc/server';

export interface OktaConfig {
  domain: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface AzureADConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface SAMLIdPConfig {
  entityId: string;
  singleSignOnUrl: string;
  singleLogoutUrl: string;
  certificate: string;
  nameIdFormat: string;
}

/**
 * SAML IdP Configuration Service
 * Handles configuration for Okta and Azure AD SAML 2.0 integration
 */
export class SAMLIdPConfigService {
  private oktaConfigs: Map<string, OktaConfig> = new Map();
  private azureConfigs: Map<string, AzureADConfig> = new Map();
  private samlConfigs: Map<string, SAMLIdPConfig> = new Map();

  /**
   * Configure Okta as SAML IdP
   */
  configureOkta(organizationId: string, config: OktaConfig): void {
    if (!config.domain || !config.clientId || !config.clientSecret) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Missing required Okta configuration',
      });
    }

    // Validate domain format
    if (!config.domain.includes('.okta.com')) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid Okta domain format',
      });
    }

    this.oktaConfigs.set(organizationId, config);

    // Generate SAML configuration from Okta
    const samlConfig: SAMLIdPConfig = {
      entityId: `https://${config.domain}`,
      singleSignOnUrl: `https://${config.domain}/app/amazon_aws/exk1234567890/sso/saml`,
      singleLogoutUrl: `https://${config.domain}/app/amazon_aws/exk1234567890/slo/saml`,
      certificate: this.generateOktaCertificate(config.domain),
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    };

    this.samlConfigs.set(`okta-${organizationId}`, samlConfig);
  }

  /**
   * Configure Azure AD as SAML IdP
   */
  configureAzureAD(organizationId: string, config: AzureADConfig): void {
    if (!config.tenantId || !config.clientId || !config.clientSecret) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Missing required Azure AD configuration',
      });
    }

    // Validate tenant ID format (GUID)
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(config.tenantId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid Azure AD tenant ID format',
      });
    }

    this.azureConfigs.set(organizationId, config);

    // Generate SAML configuration from Azure AD
    const samlConfig: SAMLIdPConfig = {
      entityId: `https://sts.windows.net/${config.tenantId}/`,
      singleSignOnUrl: `https://login.microsoftonline.com/${config.tenantId}/saml2`,
      singleLogoutUrl: `https://login.microsoftonline.com/${config.tenantId}/saml2`,
      certificate: this.generateAzureADCertificate(config.tenantId),
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    };

    this.samlConfigs.set(`azure-${organizationId}`, samlConfig);
  }

  /**
   * Get Okta configuration
   */
  getOktaConfig(organizationId: string): OktaConfig {
    const config = this.oktaConfigs.get(organizationId);
    if (!config) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Okta configuration not found',
      });
    }
    return config;
  }

  /**
   * Get Azure AD configuration
   */
  getAzureADConfig(organizationId: string): AzureADConfig {
    const config = this.azureConfigs.get(organizationId);
    if (!config) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Azure AD configuration not found',
      });
    }
    return config;
  }

  /**
   * Get SAML configuration
   */
  getSAMLConfig(configKey: string): SAMLIdPConfig {
    const config = this.samlConfigs.get(configKey);
    if (!config) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'SAML configuration not found',
      });
    }
    return config;
  }

  /**
   * Get Okta metadata URL
   */
  getOktaMetadataUrl(organizationId: string): string {
    const config = this.getOktaConfig(organizationId);
    return `https://${config.domain}/app/exk1234567890/sso/saml/metadata`;
  }

  /**
   * Get Azure AD metadata URL
   */
  getAzureADMetadataUrl(organizationId: string): string {
    const config = this.getAzureADConfig(organizationId);
    return `https://login.microsoftonline.com/${config.tenantId}/federationmetadata/2007-06/federationmetadata.xml`;
  }

  /**
   * Validate Okta credentials
   */
  async validateOktaCredentials(config: OktaConfig): Promise<boolean> {
    try {
      const response = await fetch(`https://${config.domain}/api/v1/org`, {
        method: 'GET',
        headers: {
          Authorization: `SSWS ${config.clientSecret}`,
          'Content-Type': 'application/json',
        },
      });

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate Azure AD credentials
   */
  async validateAzureADCredentials(config: AzureADConfig): Promise<boolean> {
    try {
      const response = await fetch(
        `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials',
          }).toString(),
        }
      );

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate Okta certificate (mock)
   */
  private generateOktaCertificate(domain: string): string {
    // In production, fetch from Okta metadata endpoint
    return `-----BEGIN CERTIFICATE-----
MIICljCCAX4CCQCKz0Td7x7InjANBgkqhkiG9w0BAQsFADANMQswCQYDVQQGEwJV
UzAeFw0yMjAxMDEwMDAwMDBaFw0yMzAxMDEwMDAwMDBaMA0xCzAJBgNVBAYTAlVT
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1234567890
-----END CERTIFICATE-----`;
  }

  /**
   * Generate Azure AD certificate (mock)
   */
  private generateAzureADCertificate(tenantId: string): string {
    // In production, fetch from Azure AD metadata endpoint
    return `-----BEGIN CERTIFICATE-----
MIICljCCAX4CCQCKz0Td7x7InjANBgkqhkiG9w0BAQsFADANMQswCQYDVQQGEwJV
UzAeFw0yMjAxMDEwMDAwMDBaFw0yMzAxMDEwMDAwMDBaMA0xCzAJBgNVBAYTAlVT
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0987654321
-----END CERTIFICATE-----`;
  }

  /**
   * Test SAML authentication with IdP
   */
  async testSAMLAuth(organizationId: string, provider: 'okta' | 'azure'): Promise<boolean> {
    try {
      if (provider === 'okta') {
        const config = this.getOktaConfig(organizationId);
        return await this.validateOktaCredentials(config);
      } else {
        const config = this.getAzureADConfig(organizationId);
        return await this.validateAzureADCredentials(config);
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get IdP configuration status
   */
  getConfigurationStatus(organizationId: string): {
    okta: boolean;
    azure: boolean;
  } {
    return {
      okta: this.oktaConfigs.has(organizationId),
      azure: this.azureConfigs.has(organizationId),
    };
  }

  /**
   * Remove IdP configuration
   */
  removeConfiguration(organizationId: string, provider: 'okta' | 'azure'): void {
    if (provider === 'okta') {
      this.oktaConfigs.delete(organizationId);
      this.samlConfigs.delete(`okta-${organizationId}`);
    } else {
      this.azureConfigs.delete(organizationId);
      this.samlConfigs.delete(`azure-${organizationId}`);
    }
  }

  /**
   * List all configured IdPs for organization
   */
  listConfiguredIdPs(organizationId: string): string[] {
    const idps: string[] = [];

    if (this.oktaConfigs.has(organizationId)) {
      idps.push('okta');
    }

    if (this.azureConfigs.has(organizationId)) {
      idps.push('azure');
    }

    return idps;
  }
}

// Singleton instance
export const samlIdPConfigService = new SAMLIdPConfigService();
