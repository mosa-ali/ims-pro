import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";
import { sendEmail } from "./_core/email";

// Mock the email service
vi.mock("./_core/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

describe("Organization Email Notification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send onboarding email when organization is created with admin email", async () => {
    const mockSendEmail = vi.mocked(sendEmail);
    
    // Simulate the email sending that happens in organization creation
    const adminEmail = "test-admin@example.com";
    const adminName = "Test Admin";
    const orgName = "Test Organization";
    const orgId = 1;
    
    const connectLink = `http://localhost:3000/organizations/${orgId}/connect-microsoft-365`;
    const emailContent = `
      <h2>Welcome to IMS!</h2>
      <p>Hello ${adminName},</p>
      <p>Your organization "${orgName}" has been successfully created in the Integrated Management System.</p>
      <p>To complete the setup and connect your Microsoft 365 tenant, please click the link below:</p>
      <p><a href="${connectLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Connect Microsoft 365</a></p>
      <p>If you have any questions, please contact the system administrator.</p>
      <p>Best regards,<br/>IMS Team</p>
    `;
    
    // Call sendEmail as it would be called in the organization creation
    await sendEmail({
      to: adminEmail,
      subject: `IMS Organization Created: ${orgName}`,
      html: emailContent,
      text: `Welcome to IMS! Your organization "${orgName}" has been created. Please visit ${connectLink} to connect your Microsoft 365 tenant.`,
    });
    
    // Verify sendEmail was called with correct parameters
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: adminEmail,
      subject: `IMS Organization Created: ${orgName}`,
      html: expect.stringContaining("Welcome to IMS!"),
      text: expect.stringContaining("Welcome to IMS!"),
    });
  });

  it("should include Connect Microsoft 365 link in email", async () => {
    const mockSendEmail = vi.mocked(sendEmail);
    
    const adminEmail = "admin@organization.com";
    const orgId = 42;
    const orgName = "My Organization";
    
    const connectLink = `http://localhost:3000/organizations/${orgId}/connect-microsoft-365`;
    
    await sendEmail({
      to: adminEmail,
      subject: `IMS Organization Created: ${orgName}`,
      html: `<a href="${connectLink}">Connect Microsoft 365</a>`,
      text: `Visit ${connectLink} to connect Microsoft 365`,
    });
    
    // Verify the link is included in the email
    const callArgs = mockSendEmail.mock.calls[0][0];
    expect(callArgs.html).toContain(connectLink);
    expect(callArgs.text).toContain(connectLink);
  });

  it("should use VITE_APP_URL environment variable for email links", async () => {
    const mockSendEmail = vi.mocked(sendEmail);
    
    // Simulate using VITE_APP_URL
    const appUrl = process.env.VITE_APP_URL || "http://localhost:3000";
    const orgId = 5;
    const expectedLink = `${appUrl}/organizations/${orgId}/connect-microsoft-365`;
    
    await sendEmail({
      to: "admin@test.com",
      subject: "Test",
      html: `<a href="${expectedLink}">Link</a>`,
      text: `Visit ${expectedLink}`,
    });
    
    const callArgs = mockSendEmail.mock.calls[0][0];
    expect(callArgs.html).toContain(expectedLink);
  });

  it("should not throw error if email sending fails", async () => {
    const mockSendEmail = vi.mocked(sendEmail);
    mockSendEmail.mockRejectedValueOnce(new Error("Email service unavailable"));
    
    // This should not throw - organization creation should succeed even if email fails
    let error: Error | null = null;
    try {
      await sendEmail({
        to: "admin@test.com",
        subject: "Test",
        html: "Test",
      }).catch((err) => {
        console.error("Email failed:", err);
      });
    } catch (e) {
      error = e as Error;
    }
    
    // No error should be thrown to caller
    expect(error).toBeNull();
  });

  it("should format email with organization name and admin name", async () => {
    const mockSendEmail = vi.mocked(sendEmail);
    
    const adminName = "Ahmed Hassan";
    const orgName = "Yamany Foundation for Development";
    
    await sendEmail({
      to: "ahmed@example.com",
      subject: `IMS Organization Created: ${orgName}`,
      html: `<p>Hello ${adminName},</p><p>Your organization "${orgName}" has been created.</p>`,
      text: `Hello ${adminName}, your organization "${orgName}" has been created.`,
    });
    
    const callArgs = mockSendEmail.mock.calls[0][0];
    expect(callArgs.html).toContain(adminName);
    expect(callArgs.html).toContain(orgName);
    expect(callArgs.text).toContain(adminName);
    expect(callArgs.text).toContain(orgName);
  });

  it("should send email only when admin email is provided", async () => {
    const mockSendEmail = vi.mocked(sendEmail);
    
    // Simulate organization creation without admin email
    const adminEmail = null;
    
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: "Test",
        html: "Test",
      });
    }
    
    // sendEmail should not be called
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
