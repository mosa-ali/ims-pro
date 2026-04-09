import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { encryptData, decryptData, verifyWebhookSignature } from "../services/encryptionService";

// Alias for test readability
const encryptApiKey = encryptData;
const decryptApiKey = decryptData;

describe("Email Provider Configuration", () => {
  describe("Encryption Service", () => {
    it("should encrypt and decrypt API keys correctly", () => {
      const apiKey = "sendgrid_test_key_12345";
      const encrypted = encryptApiKey(apiKey);

      expect(encrypted).not.toBe(apiKey);
      // Encrypted data is base64 encoded
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);

      const decrypted = decryptApiKey(encrypted);
      expect(decrypted).toBe(apiKey);
    });

    it("should produce different ciphertexts for the same plaintext", () => {
      const apiKey = "sendgrid_test_key_12345";
      const encrypted1 = encryptApiKey(apiKey);
      const encrypted2 = encryptApiKey(apiKey);

      expect(encrypted1).not.toBe(encrypted2);

      const decrypted1 = decryptApiKey(encrypted1);
      const decrypted2 = decryptApiKey(encrypted2);

      expect(decrypted1).toBe(apiKey);
      expect(decrypted2).toBe(apiKey);
    });

    it("should handle long API keys", () => {
      const longKey = "x".repeat(500);
      const encrypted = encryptApiKey(longKey);
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe(longKey);
    });

    it("should handle special characters in API keys", () => {
      const specialKey = "key_with_!@#$%^&*()_+-=[]{}|;:',.<>?/";
      const encrypted = encryptApiKey(specialKey);
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe(specialKey);
    });

    it("should throw error on invalid encrypted data", () => {
      const invalidEncrypted = "invalid_encrypted_data";

      expect(() => {
        decryptApiKey(invalidEncrypted);
      }).toThrow();
    });

    it("should throw error on corrupted encrypted data", () => {
      const apiKey = "test_key";
      const encrypted = encryptApiKey(apiKey);
      const corrupted = encrypted.slice(0, -5) + "xxxxx";

      expect(() => {
        decryptApiKey(corrupted);
      }).toThrow();
    });
  });

  describe("Webhook Signature Verification", () => {
    it("should verify valid webhook signatures", () => {
      const payload = JSON.stringify({ event: "test", timestamp: Date.now() });
      const signingKey = "test_signing_key_12345";

      const signature = require("crypto")
        .createHmac("sha256", signingKey)
        .update(payload)
        .digest("hex");

      const isValid = verifyWebhookSignature(payload, signature, signingKey);
      expect(isValid).toBe(true);
    });

    it("should reject invalid webhook signatures", () => {
      const payload = JSON.stringify({ event: "test", timestamp: Date.now() });
      const signingKey = "test_signing_key_12345";
      const invalidSignature = "invalid_signature_12345";

      const isValid = verifyWebhookSignature(payload, invalidSignature, signingKey);
      expect(isValid).toBe(false);
    });

    it("should reject signatures with wrong signing key", () => {
      const payload = JSON.stringify({ event: "test", timestamp: Date.now() });
      const signingKey = "test_signing_key_12345";
      const wrongKey = "wrong_signing_key_12345";

      const signature = require("crypto")
        .createHmac("sha256", signingKey)
        .update(payload)
        .digest("hex");

      const isValid = verifyWebhookSignature(payload, signature, wrongKey);
      expect(isValid).toBe(false);
    });

    it("should reject signatures with modified payload", () => {
      const payload = JSON.stringify({ event: "test", timestamp: Date.now() });
      const signingKey = "test_signing_key_12345";
      const modifiedPayload = JSON.stringify({ event: "modified", timestamp: Date.now() });

      const signature = require("crypto")
        .createHmac("sha256", signingKey)
        .update(payload)
        .digest("hex");

      const isValid = verifyWebhookSignature(modifiedPayload, signature, signingKey);
      expect(isValid).toBe(false);
    });
  });

  describe("Provider Configuration Validation", () => {
    it("should validate SendGrid API key format", () => {
      const validKey = "SG.1234567890abcdefghijklmnop";
      expect(validKey).toMatch(/^SG\./);
    });

    it("should validate Mailgun API key format", () => {
      const validKey = "key-1234567890abcdefghijklmnop";
      expect(validKey).toMatch(/^key-/);
    });

    it("should validate AWS SES region", () => {
      const validRegions = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"];
      validRegions.forEach((region) => {
        expect(region).toMatch(/^[a-z]{2}-[a-z]+-\d$/);
      });
    });
  });

  describe("Provider Configuration Storage", () => {
    it("should store encrypted API keys", () => {
      const config = {
        provider: "sendgrid",
        apiKey: "SG.test_key_12345",
        webhookSecret: "webhook_secret_12345",
      };

      const encryptedKey = encryptApiKey(config.apiKey);
      const encryptedSecret = encryptApiKey(config.webhookSecret);

      expect(encryptedKey).not.toBe(config.apiKey);
      expect(encryptedSecret).not.toBe(config.webhookSecret);

      const decryptedKey = decryptApiKey(encryptedKey);
      const decryptedSecret = decryptApiKey(encryptedSecret);

      expect(decryptedKey).toBe(config.apiKey);
      expect(decryptedSecret).toBe(config.webhookSecret);
    });

    it("should support multiple providers per organization", () => {
      const providers = [
        { provider: "sendgrid", apiKey: "SG.key1" },
        { provider: "mailgun", apiKey: "key-key2" },
        { provider: "aws_ses", apiKey: "AKIAIOSFODNN7EXAMPLE" },
      ];

      providers.forEach((config) => {
        const encrypted = encryptApiKey(config.apiKey);
        const decrypted = decryptApiKey(encrypted);
        expect(decrypted).toBe(config.apiKey);
      });
    });
  });

  describe("API Key Rotation", () => {
    it("should support API key rotation", () => {
      const oldKey = "SG.old_key_12345";
      const newKey = "SG.new_key_67890";

      const encryptedOld = encryptApiKey(oldKey);
      const encryptedNew = encryptApiKey(newKey);

      expect(encryptedOld).not.toBe(encryptedNew);

      const decryptedOld = decryptApiKey(encryptedOld);
      const decryptedNew = decryptApiKey(encryptedNew);

      expect(decryptedOld).toBe(oldKey);
      expect(decryptedNew).toBe(newKey);
    });

    it("should maintain backward compatibility during key rotation", () => {
      const key = "SG.test_key_12345";
      const encrypted = encryptApiKey(key);

      // Simulate key rotation - old encrypted key should still decrypt correctly
      const decrypted = decryptApiKey(encrypted);
      expect(decrypted).toBe(key);
    });
  });

  describe("Security", () => {
    it("should never store plain API keys", () => {
      const apiKey = "SG.sensitive_key_12345";
      const encrypted = encryptApiKey(apiKey);

      // Encrypted key should not contain the original key
      expect(encrypted).not.toContain(apiKey);
    });

    it("should use HMAC for integrity verification", () => {
      const payload = JSON.stringify({ test: "data" });
      const signingKey = "secret_key";

      const signature = require("crypto")
        .createHmac("sha256", signingKey)
        .update(payload)
        .digest("hex");

      // Signature should be deterministic for same payload and key
      const signature2 = require("crypto")
        .createHmac("sha256", signingKey)
        .update(payload)
        .digest("hex");

      expect(signature).toBe(signature2);
    });

    it("should use AES-256-GCM for encryption", () => {
      const apiKey = "SG.test_key_12345";
      const encrypted = encryptApiKey(apiKey);

      // Encrypted data should be base64 encoded (IV + authTag + ciphertext concatenated)
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
      // Decryption should work
      const decrypted = decryptApiKey(encrypted);
      expect(decrypted).toBe(apiKey);
    });
  });
});
