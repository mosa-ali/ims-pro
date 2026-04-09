import { z } from 'zod';
import crypto from 'crypto';
import { TRPCError } from '@trpc/server';

// SAML types
export interface SAMLConfig {
  entityId: string;
  assertionConsumerServiceUrl: string;
  singleLogoutServiceUrl: string;
  nameIdFormat: string;
  signatureAlgorithm: string;
  digestAlgorithm: string;
}

export interface SAMLMetadata {
  entityId: string;
  singleSignOnUrl: string;
  singleLogoutUrl: string;
  certificate: string;
  nameIdFormat: string;
}

export interface SAMLAssertion {
  nameId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  attributes: Record<string, string>;
  sessionIndex: string;
  notOnOrAfter: Date;
}

export interface SAMLAuthRequest {
  id: string;
  issueInstant: Date;
  destination: string;
  assertionConsumerServiceUrl: string;
  nameIdPolicy: string;
}

/**
 * SAML 2.0 Single Sign-On Service
 * Handles SAML authentication flows for enterprise SSO
 */
export class SAMLSSOService {
  private config: SAMLConfig;
  private authRequests: Map<string, SAMLAuthRequest> = new Map();
  private samlSessions: Map<string, SAMLAssertion> = new Map();
  private idpMetadata: Map<string, SAMLMetadata> = new Map();

  constructor(config: Partial<SAMLConfig> = {}) {
    this.config = {
      entityId: config.entityId || 'https://clientsphere.example.com',
      assertionConsumerServiceUrl:
        config.assertionConsumerServiceUrl || 'https://clientsphere.example.com/auth/saml/acs',
      singleLogoutServiceUrl:
        config.singleLogoutServiceUrl || 'https://clientsphere.example.com/auth/saml/sls',
      nameIdFormat: config.nameIdFormat || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      signatureAlgorithm: config.signatureAlgorithm || 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
      digestAlgorithm: config.digestAlgorithm || 'http://www.w3.org/2001/04/xmlenc#sha256',
    };
  }

  /**
   * Generate SAML metadata for service provider
   */
  generateSPMetadata(): string {
    const metadata = `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${this.config.entityId}">
  <SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${this.config.singleLogoutServiceUrl}"/>
    <NameIDFormat>${this.config.nameIdFormat}</NameIDFormat>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${this.config.assertionConsumerServiceUrl}" index="0" isDefault="true"/>
  </SPSSODescriptor>
</EntityDescriptor>`;

    return metadata;
  }

  /**
   * Register Identity Provider metadata
   */
  registerIdPMetadata(idpEntityId: string, metadata: SAMLMetadata): void {
    this.idpMetadata.set(idpEntityId, metadata);
  }

  /**
   * Get Identity Provider metadata
   */
  getIdPMetadata(idpEntityId: string): SAMLMetadata {
    const metadata = this.idpMetadata.get(idpEntityId);

    if (!metadata) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Identity Provider ${idpEntityId} not found.`,
      });
    }

    return metadata;
  }

  /**
   * Create SAML authentication request
   */
  createAuthRequest(idpEntityId: string): { id: string; redirectUrl: string } {
    const metadata = this.getIdPMetadata(idpEntityId);
    const requestId = `_${crypto.randomBytes(16).toString('hex')}`;
    const issueInstant = new Date();

    const authRequest: SAMLAuthRequest = {
      id: requestId,
      issueInstant,
      destination: metadata.singleSignOnUrl,
      assertionConsumerServiceUrl: this.config.assertionConsumerServiceUrl,
      nameIdPolicy: this.config.nameIdFormat,
    };

    // Store auth request for validation
    this.authRequests.set(requestId, authRequest);

    // Generate SAML request (simplified)
    const samlRequest = this.generateSAMLRequest(authRequest);
    const encodedRequest = Buffer.from(samlRequest).toString('base64');

    // Build redirect URL
    const redirectUrl = `${metadata.singleSignOnUrl}?SAMLRequest=${encodeURIComponent(encodedRequest)}&RelayState=${encodeURIComponent(idpEntityId)}`;

    return { id: requestId, redirectUrl };
  }

  /**
   * Generate SAML authentication request XML
   */
  private generateSAMLRequest(authRequest: SAMLAuthRequest): string {
    const samlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${authRequest.id}" Version="2.0" IssueInstant="${authRequest.issueInstant.toISOString()}" Destination="${authRequest.destination}" AssertionConsumerServiceURL="${authRequest.assertionConsumerServiceUrl}" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${this.config.entityId}</saml:Issuer>
  <samlp:NameIDPolicy Format="${authRequest.nameIdPolicy}" AllowCreate="true"/>
</samlp:AuthnRequest>`;

    return samlRequest;
  }

  /**
   * Process SAML assertion response
   */
  processSAMLResponse(
    samlResponse: string,
    relayState: string
  ): { assertion: SAMLAssertion; sessionId: string } {
    // Decode SAML response
    const decodedResponse = Buffer.from(samlResponse, 'base64').toString('utf-8');

    // In production, validate signature and parse XML properly
    // For now, extract basic information from the response
    const assertion = this.parseSAMLAssertion(decodedResponse);

    // Validate against stored auth request
    const authRequest = this.authRequests.get(assertion.sessionIndex);
    if (!authRequest) {
      throw new TRPCError({
        code: 'INVALID_ARGUMENT',
        message: 'Invalid SAML response: request not found.',
      });
    }

    // Check assertion expiration
    if (new Date() > assertion.notOnOrAfter) {
      throw new TRPCError({
        code: 'GONE',
        message: 'SAML assertion has expired.',
      });
    }

    // Create SAML session
    const sessionId = crypto.randomBytes(16).toString('hex');
    this.samlSessions.set(sessionId, assertion);

    // Clean up auth request
    this.authRequests.delete(assertion.sessionIndex);

    return { assertion, sessionId };
  }

  /**
   * Parse SAML assertion from response
   */
  private parseSAMLAssertion(samlResponse: string): SAMLAssertion {
    // Extract NameID
    const nameIdMatch = samlResponse.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/);
    const nameId = nameIdMatch ? nameIdMatch[1] : '';

    // Extract email attribute
    const emailMatch = samlResponse.match(/<saml:AttributeValue>([^<]+)<\/saml:AttributeValue>/);
    const email = emailMatch ? emailMatch[1] : nameId;

    // Extract session index
    const sessionIndexMatch = samlResponse.match(/SessionIndex="([^"]+)"/);
    const sessionIndex = sessionIndexMatch ? sessionIndexMatch[1] : `_${crypto.randomBytes(8).toString('hex')}`;

    // Extract NotOnOrAfter
    const notOnOrAfterMatch = samlResponse.match(/NotOnOrAfter="([^"]+)"/);
    const notOnOrAfter = notOnOrAfterMatch
      ? new Date(notOnOrAfterMatch[1])
      : new Date(Date.now() + 60 * 60 * 1000); // 1 hour default

    return {
      nameId,
      email,
      sessionIndex,
      notOnOrAfter,
      attributes: {
        // Extract additional attributes as needed
      },
    };
  }

  /**
   * Verify SAML session
   */
  verifySAMLSession(sessionId: string): SAMLAssertion {
    const assertion = this.samlSessions.get(sessionId);

    if (!assertion) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'SAML session not found.',
      });
    }

    if (new Date() > assertion.notOnOrAfter) {
      this.samlSessions.delete(sessionId);
      throw new TRPCError({
        code: 'GONE',
        message: 'SAML session has expired.',
      });
    }

    return assertion;
  }

  /**
   * Create SAML logout request
   */
  createLogoutRequest(idpEntityId: string, sessionIndex: string): { redirectUrl: string } {
    const metadata = this.getIdPMetadata(idpEntityId);
    const requestId = `_${crypto.randomBytes(16).toString('hex')}`;
    const issueInstant = new Date();

    // Generate SAML logout request
    const logoutRequest = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${requestId}" Version="2.0" IssueInstant="${issueInstant.toISOString()}" Destination="${metadata.singleLogoutUrl}">
  <saml:Issuer>${this.config.entityId}</saml:Issuer>
  <samlp:SessionIndex>${sessionIndex}</samlp:SessionIndex>
</samlp:LogoutRequest>`;

    const encodedRequest = Buffer.from(logoutRequest).toString('base64');
    const redirectUrl = `${metadata.singleLogoutUrl}?SAMLRequest=${encodeURIComponent(encodedRequest)}`;

    return { redirectUrl };
  }

  /**
   * Clean up expired auth requests
   */
  cleanupExpiredRequests(): number {
    let cleaned = 0;
    const now = new Date();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const [key, request] of this.authRequests.entries()) {
      if (now.getTime() - request.issueInstant.getTime() > maxAge) {
        this.authRequests.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): number {
    let cleaned = 0;
    const now = new Date();

    for (const [key, assertion] of this.samlSessions.entries()) {
      if (now > assertion.notOnOrAfter) {
        this.samlSessions.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Export singleton instance
export const samlSSOService = new SAMLSSOService({
  entityId: process.env.SAML_ENTITY_ID || 'https://clientsphere.example.com',
  assertionConsumerServiceUrl:
    process.env.SAML_ACS_URL || 'https://clientsphere.example.com/auth/saml/acs',
  singleLogoutServiceUrl:
    process.env.SAML_SLS_URL || 'https://clientsphere.example.com/auth/saml/sls',
});

// Start cleanup jobs
setInterval(() => {
  const cleaned = samlSSOService.cleanupExpiredRequests();
  if (cleaned > 0) {
    console.log(`[SAML] Cleaned up ${cleaned} expired auth requests`);
  }
}, 15 * 60 * 1000);

setInterval(() => {
  const cleaned = samlSSOService.cleanupExpiredSessions();
  if (cleaned > 0) {
    console.log(`[SAML] Cleaned up ${cleaned} expired sessions`);
  }
}, 30 * 60 * 1000);
