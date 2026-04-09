/**
 * ============================================================================
 * DAILY RISK EVALUATION SCHEDULER
 * ============================================================================
 * 
 * Automatically evaluates all active projects for risk triggers every day
 * Sends email notifications to stakeholders for critical/high risks
 * 
 * Schedule: Daily at 2:00 AM (organization timezone)
 * 
 * Stakeholders notified:
 * - Finance Managers (for budget/financial risks)
 * - Project Managers (for project-specific risks)
 * - MEAL Officers (for indicator performance risks)
 * 
 * ============================================================================
 */

import { getDb } from '../db';
import { projects, risks, users, organizations } from '../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { evaluateProjectRisks } from '../_core/riskIntelligenceEngine';
import { enqueueNotification } from '../services/emailService';

interface RiskNotification {
  organizationId: number;
  organizationName: string;
  risks: {
    id: number;
    title: string;
    level: string;
    score: number;
    category: string;
    projectName: string;
    projectCode: string;
    source: string;
  }[];
}

/**
 * Get stakeholders for risk notifications
 * Returns Finance Managers, Project Managers, and MEAL Officers
 */
async function getStakeholders(organizationId: number, operatingUnitId: number | null) {
  const db = getDb();
  const stakeholders = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(
      and(
        eq(users.organizationId, organizationId),
        operatingUnitId ? eq(users.operatingUnitId, operatingUnitId) : sql`1=1`,
        sql`${users.role} IN ('finance_manager', 'project_manager', 'meal_officer')`
      )
    );

  return stakeholders;
}

/**
 * Send risk notification email to stakeholders
 */
async function sendRiskNotificationEmail(
  recipient: { name: string; email: string },
  notification: RiskNotification,
  language: 'en' | 'ar' = 'en'
) {
  const isArabic = language === 'ar';
  
  const subject = isArabic
    ? `تنبيه: تم اكتشاف ${notification.risks.length} مخاطر ذات أولوية عالية`
    : `Alert: ${notification.risks.length} High-Priority Risks Detected`;

  const criticalCount = notification.risks.filter(r => r.level === 'critical').length;
  const highCount = notification.risks.filter(r => r.level === 'high').length;

  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 20px; }
        .risk-card { background: white; border-left: 4px solid #ef4444; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .risk-card.critical { border-left-color: #dc2626; }
        .risk-card.high { border-left-color: #f97316; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
        .badge.critical { background-color: #fee2e2; color: #dc2626; }
        .badge.high { background-color: #ffedd5; color: #f97316; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isArabic ? 'تنبيه المخاطر التلقائي' : 'Automated Risk Alert'}</h1>
          <p>${isArabic ? `المنظمة: ${notification.organizationName}` : `Organization: ${notification.organizationName}`}</p>
        </div>
        <div class="content">
          <p>${isArabic ? `مرحباً ${recipient.name}،` : `Hello ${recipient.name},`}</p>
          <p>${isArabic 
            ? `تم اكتشاف ${notification.risks.length} مخاطر ذات أولوية عالية تتطلب انتباهك الفوري:`
            : `${notification.risks.length} high-priority risks have been detected that require your immediate attention:`
          }</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>${isArabic ? 'حرجة:' : 'Critical:'}</strong> ${criticalCount}</p>
            <p style="margin: 5px 0;"><strong>${isArabic ? 'عالية:' : 'High:'}</strong> ${highCount}</p>
          </div>

          <h3>${isArabic ? 'تفاصيل المخاطر:' : 'Risk Details:'}</h3>
  `;

  notification.risks.forEach((risk) => {
    htmlContent += `
      <div class="risk-card ${risk.level}">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <h4 style="margin: 0 0 10px 0;">${risk.title}</h4>
            <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
              ${isArabic ? 'المشروع:' : 'Project:'} ${risk.projectCode} - ${risk.projectName}
            </p>
            <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
              ${isArabic ? 'الفئة:' : 'Category:'} ${risk.category} | ${isArabic ? 'المصدر:' : 'Source:'} ${risk.source}
            </p>
          </div>
          <div style="text-align: right;">
            <span class="badge ${risk.level}">${risk.level.toUpperCase()}</span>
            <p style="font-size: 24px; font-weight: bold; color: #ef4444; margin: 10px 0 0 0;">${risk.score}</p>
          </div>
        </div>
      </div>
    `;
  });

  htmlContent += `
        </div>
        <div class="footer">
          <p>${isArabic 
            ? 'هذا تنبيه تلقائي من نظام إدارة المخاطر. يرجى تسجيل الدخول لعرض التفاصيل الكاملة واتخاذ الإجراءات.'
            : 'This is an automated alert from the Risk Management System. Please log in to view full details and take action.'
          }</p>
          <p>${isArabic ? 'تم الإرسال بواسطة IMS' : 'Sent by IMS'} - ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Enqueue notification using the organization's email system
  try {
    await enqueueNotification({
      organizationId: notification.organizationId,
      eventKey: 'risk_alert_critical_high',
      channel: 'email',
      recipients: [recipient.email],
      subject,
      payloadJson: {
        recipientName: recipient.name,
        organizationName: notification.organizationName,
        criticalCount,
        highCount,
        risks: notification.risks,
        bodyHtml: htmlContent, // Pre-rendered HTML
      },
    });
    console.log(`[Risk Notification] Email notification enqueued for ${recipient.email}`);
  } catch (error) {
    console.error(`[Risk Notification] Failed to enqueue notification for ${recipient.email}:`, error);
  }
}

/**
 * Main scheduler function - evaluates all active projects and sends notifications
 */
export async function runDailyRiskEvaluation() {
  console.log('[Risk Scheduler] Starting daily risk evaluation...');
  
  try {
    const db = getDb();
    // Get all organizations
    const allOrganizations = await db.select().from(organizations);

    for (const org of allOrganizations) {
      console.log(`[Risk Scheduler] Evaluating organization: ${org.name}`);
      
      // Get all active projects for this organization
      const activeProjects = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, org.id),
            eq(projects.status, 'active')
          )
        );

      console.log(`[Risk Scheduler] Found ${activeProjects.length} active projects`);

      const newHighPriorityRisks: any[] = [];

      // Evaluate each project
      for (const project of activeProjects) {
        try {
          const result = await evaluateProjectRisks(
            project.id,
            org.id,
            project.operatingUnitId,
            null // System-generated, no specific user
          );

          // Fetch newly created high/critical risks
          if (result.risksCreated > 0) {
            const projectRisks = await db
              .select()
              .from(risks)
              .where(
                and(
                  eq(risks.projectId, project.id),
                  eq(risks.isSystemGenerated, true),
                  sql`${risks.level} IN ('high', 'critical')`,
                  sql`DATE(${risks.createdAt}) = CURDATE()` // Only today's risks
                )
              );

            newHighPriorityRisks.push(
              ...projectRisks.map((risk) => ({
                ...risk,
                projectName: project.titleEn,
                projectCode: project.projectCode,
              }))
            );
          }

          console.log(`[Risk Scheduler] Project ${project.projectCode}: ${result.risksCreated} risks created, ${result.risksUpdated} risks updated`);
        } catch (error) {
          console.error(`[Risk Scheduler] Failed to evaluate project ${project.id}:`, error);
        }
      }

      // Send notifications if there are new high-priority risks
      if (newHighPriorityRisks.length > 0) {
        console.log(`[Risk Scheduler] Sending notifications for ${newHighPriorityRisks.length} high-priority risks`);

        const stakeholders = await getStakeholders(org.id, null);

        const notification: RiskNotification = {
          organizationId: org.id,
          organizationName: org.name,
          risks: newHighPriorityRisks.map((risk) => ({
            id: risk.id,
            title: risk.title,
            level: risk.level,
            score: risk.score,
            category: risk.category,
            projectName: risk.projectName,
            projectCode: risk.projectCode,
            source: risk.source || 'system',
          })),
        };

        for (const stakeholder of stakeholders) {
          await sendRiskNotificationEmail(
            { name: stakeholder.name, email: stakeholder.email },
            notification,
            'en' // TODO: Get user's preferred language from profile
          );
        }
      }
    }

    console.log('[Risk Scheduler] Daily risk evaluation completed successfully');
  } catch (error) {
    console.error('[Risk Scheduler] Daily risk evaluation failed:', error);
    throw error;
  }
}

// Export for cron job registration
export const dailyRiskEvaluationJob = {
  name: 'daily-risk-evaluation',
  schedule: '0 2 * * *', // Every day at 2:00 AM
  handler: runDailyRiskEvaluation,
};
