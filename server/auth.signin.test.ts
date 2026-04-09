/**
 * Tests for the email sign-in and request-access endpoints.
 * These validate the core Sign-In page backend flows.
 */
import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = "http://localhost:3000";

describe("Email Sign-In Endpoint", () => {
  it("should return 400 when email or password is missing", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/email-signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBeTruthy();
  });

  it("should return 401 for invalid credentials", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/email-signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nonexistent@example.com",
        password: "wrongpassword",
      }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBeTruthy();
  });

  it("should return 200 and set session cookie for valid credentials", async () => {
    // This test requires the test user to exist in the database
    const res = await fetch(`${BASE_URL}/api/auth/email-signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "TestPassword123!",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe("test@example.com");
    // Verify session cookie is set
    const setCookieHeader = res.headers.get("set-cookie");
    expect(setCookieHeader).toBeTruthy();
    expect(setCookieHeader).toContain("app_session_id");
  });

  it("should allow auth.me to return user after email sign-in", async () => {
    // Login first
    const loginRes = await fetch(`${BASE_URL}/api/auth/email-signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "TestPassword123!",
      }),
    });
    expect(loginRes.status).toBe(200);

    // Extract session cookie
    const setCookieHeader = loginRes.headers.get("set-cookie");
    const sessionCookie = setCookieHeader?.split(";")[0] || "";

    // Call auth.me with the session cookie
    const meRes = await fetch(
      `${BASE_URL}/api/trpc/auth.me?batch=1&input=%7B%7D`,
      {
        headers: { Cookie: sessionCookie },
      }
    );
    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    const user = meBody[0]?.result?.data?.json;
    expect(user).toBeTruthy();
    expect(user.email).toBe("test@example.com");
  });
});

describe("Request Access Endpoint", () => {
  it("should return 400 when required fields are missing", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/request-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: "Test User" }),
    });
    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid email", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/request-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Test User",
        workEmail: "not-an-email",
        organization: "Test Org",
        operatingUnit: "Main Office",
        jobTitle: "Manager",
        reasonForAccess: "Need access",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("should return 200 for valid request access submission", async () => {
    const uniqueEmail = `test.access.${Date.now()}@example.com`;
    const res = await fetch(`${BASE_URL}/api/auth/request-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "John Doe",
        workEmail: uniqueEmail,
        organization: "Test Organization",
        operatingUnit: "Main Office",
        jobTitle: "Project Manager",
        reasonForAccess: "Need access to manage projects and reports",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("should return 409 for duplicate request within 24 hours", async () => {
    const uniqueEmail = `test.duplicate.${Date.now()}@example.com`;
    const payload = {
      fullName: "Jane Doe",
      workEmail: uniqueEmail,
      organization: "Test Organization",
      operatingUnit: "Main Office",
      jobTitle: "Analyst",
      reasonForAccess: "Need access for analysis work",
    };

    // First submission
    const res1 = await fetch(`${BASE_URL}/api/auth/request-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(res1.status).toBe(200);

    // Second submission (duplicate)
    const res2 = await fetch(`${BASE_URL}/api/auth/request-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(res2.status).toBe(409);
  });
});
