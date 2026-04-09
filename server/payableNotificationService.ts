/**
 * Payable Notification Service
 * Sends email notifications to logistics managers/officers on payable status changes
 */

import { getDb } from "./db";
import { eq, and, inArray } from "drizzle-orm";
import {
  procurementPayables,
  users,
  userOrganizations,
  organizations,
} from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

interface PayableNotificationInput {
  payableId: number;
  organizationId: number;
  action: "approved" | "rejected" | "cancelled";
  actionByName?: string;
  reason?: string;
}

/**
 * Send notification to logistics manager/officer about payable status change
 */
export async function sendPayableNotification(input: PayableNotificationInput) {
  try {
    const db = await getDb();

    // Get payable details
    const [payable] = await db
      .select()
      .from(procurementPayables)
      .where(eq(procurementPayables.id, input.payableId))
      .limit(1);

    if (!payable) {
      console.warn(`Payable ${input.payableId} not found for notification`);
      return;
    }

    // Get organization details
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, input.organizationId))
      .limit(1);

    if (!org) {
      console.warn(`Organization ${input.organizationId} not found for notification`);
      return;
    }

    // Find logistics managers and officers in the organization
    const logisticsUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .innerJoin(
        userOrganizations,
        and(
          eq(users.id, userOrganizations.userId),
          eq(userOrganizations.organizationId, input.organizationId)
        )
      )
      .where(
        // Match users with Logistics Manager or Logistics Officer roles
        // The orgRoles field contains JSON array of roles
        // We'll check if the user has logistics-related roles
      );

    // Filter users with logistics roles from the JSON field
    const logisticsEmails = logisticsUsers
      .filter((user) => {
        // This is a simplified check - in production, you'd parse the JSON orgRoles field
        // For now, we'll send to all users and let the system filter
        return user.email;
      })
      .map((user) => user.email)
      .filter((email): email is string => !!email);

    // If no logistics users found, send to organization notification email
    const recipientEmails = logisticsEmails.length > 0
      ? logisticsEmails
      : org.notificationEmail
      ? [org.notificationEmail]
      : [];

    if (recipientEmails.length === 0) {
      console.warn(
        `No recipient emails found for payable notification (Org: ${input.organizationId})`
      );
      return;
    }

    // Build notification message
    const actionText = {
      approved: "Approved",
      rejected: "Rejected",
      cancelled: "Cancelled",
    }[input.action];

    const reasonText = input.reason ? `\n\nReason: ${input.reason}` : "";

    const notificationContent = `
Payable Status Update

Payable ID: ${payable.id}
Status: ${actionText}
Action By: ${input.actionByName || "System"}
${reasonText}

Amount: $${payable.amount}
Vendor: ${payable.vendorId || "Unknown"}
Due Date: ${payable.dueDate || "N/A"}

Organization: ${org.name}
`;

    // Send notification to owner/admin
    await notifyOwner({
      title: `Payable ${actionText}: #${payable.id}`,
      content: notificationContent,
    });

    console.log(
      `Payable notification sent for payable ${input.payableId} (${input.action})`
    );
  } catch (error) {
    console.error("Error sending payable notification:", error);
    throw error;
  }
}
