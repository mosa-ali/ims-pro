import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.ts";
import "dotenv/config";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: "default" });

// Sample data for EFADAH organization (ID: 30002)
const ORGANIZATION_ID = 30002;
const OPERATING_UNIT_ID = 30002; // EFADAH Headquarters

const risks = [
  {
    title: "Funding Gap Risk",
    titleAr: "مخاطر فجوة التمويل",
    description: "Potential shortfall in donor funding for Q2 2026 programs due to global economic uncertainty",
    descriptionAr: "نقص محتمل في تمويل المانحين لبرامج الربع الثاني من عام 2026 بسبب عدم اليقين الاقتصادي العالمي",
    category: "financial",
    likelihood: 4,
    impact: 5,
    status: "assessed",
    reviewDate: new Date("2026-03-15"),
    mitigationPlan: "Diversify donor base, establish emergency fund, reduce non-essential expenses",
    mitigationPlanAr: "تنويع قاعدة المانحين، إنشاء صندوق طوارئ، تقليل النفقات غير الأساسية",
  },
  {
    title: "Staff Turnover Risk",
    titleAr: "مخاطر دوران الموظفين",
    description: "High attrition rate in field offices due to security concerns and competitive offers",
    descriptionAr: "معدل استنزاف مرتفع في المكاتب الميدانية بسبب المخاوف الأمنية والعروض التنافسية",
    category: "operational",
    likelihood: 3,
    impact: 4,
    status: "mitigated",
    reviewDate: new Date("2026-04-01"),
    mitigationPlan: "Improve compensation packages, enhance security protocols, career development programs",
    mitigationPlanAr: "تحسين حزم التعويضات، تعزيز بروتوكولات الأمن، برامج التطوير الوظيفي",
  },
  {
    title: "Data Breach Risk",
    titleAr: "مخاطر اختراق البيانات",
    description: "Vulnerability in legacy systems could expose beneficiary personal data",
    descriptionAr: "ثغرة أمنية في الأنظمة القديمة قد تعرض البيانات الشخصية للمستفيدين",
    category: "compliance",
    likelihood: 2,
    impact: 5,
    status: "identified",
    reviewDate: new Date("2026-02-28"),
    mitigationPlan: "System upgrade, penetration testing, staff training on data protection",
    mitigationPlanAr: "ترقية النظام، اختبار الاختراق، تدريب الموظفين على حماية البيانات",
  },
  {
    title: "Supply Chain Disruption",
    titleAr: "اضطراب سلسلة التوريد",
    description: "Political instability in Yemen may disrupt delivery of medical supplies and food aid",
    descriptionAr: "عدم الاستقرار السياسي في اليمن قد يعطل توصيل الإمدادات الطبية والمساعدات الغذائية",
    category: "operational",
    likelihood: 5,
    impact: 4,
    status: "assessed",
    reviewDate: new Date("2026-03-10"),
    mitigationPlan: "Establish alternative supply routes, increase local procurement, build buffer stock",
    mitigationPlanAr: "إنشاء طرق إمداد بديلة، زيادة المشتريات المحلية، بناء مخزون احتياطي",
  },
  {
    title: "Regulatory Compliance Risk",
    titleAr: "مخاطر الامتثال التنظيمي",
    description: "New government regulations on NGO operations may require operational changes",
    descriptionAr: "اللوائح الحكومية الجديدة بشأن عمليات المنظمات غير الحكومية قد تتطلب تغييرات تشغيلية",
    category: "compliance",
    likelihood: 3,
    impact: 3,
    status: "mitigated",
    reviewDate: new Date("2026-05-01"),
    mitigationPlan: "Legal review of all programs, engage with government stakeholders, update policies",
    mitigationPlanAr: "مراجعة قانونية لجميع البرامج، التواصل مع أصحاب المصلحة الحكوميين، تحديث السياسات",
  },
  {
    title: "Reputational Damage Risk",
    titleAr: "مخاطر الإضرار بالسمعة",
    description: "Negative media coverage following beneficiary complaint could impact donor confidence",
    descriptionAr: "التغطية الإعلامية السلبية بعد شكوى المستفيدين قد تؤثر على ثقة المانحين",
    category: "reputational",
    likelihood: 2,
    impact: 4,
    status: "closed",
    reviewDate: new Date("2026-01-15"),
    mitigationPlan: "Strengthen feedback mechanisms, media training, transparent reporting",
    mitigationPlanAr: "تعزيز آليات التغذية الراجعة، التدريب الإعلامي، التقارير الشفافة",
  },
  {
    title: "Project Delay Risk",
    titleAr: "مخاطر تأخير المشروع",
    description: "Construction delays in water sanitation project due to weather and material shortages",
    descriptionAr: "تأخيرات البناء في مشروع الصرف الصحي للمياه بسبب الطقس ونقص المواد",
    category: "operational",
    likelihood: 4,
    impact: 3,
    status: "assessed",
    reviewDate: new Date("2026-03-20"),
    mitigationPlan: "Adjust timeline, secure alternative suppliers, increase site supervision",
    mitigationPlanAr: "تعديل الجدول الزمني، تأمين موردين بديلين، زيادة الإشراف على الموقع",
  },
  {
    title: "Currency Fluctuation Risk",
    titleAr: "مخاطر تقلب العملة",
    description: "Yemeni Rial volatility affecting program budgets and purchasing power",
    descriptionAr: "تقلب الريال اليمني يؤثر على ميزانيات البرامج والقوة الشرائية",
    category: "financial",
    likelihood: 5,
    impact: 3,
    status: "identified",
    reviewDate: new Date("2026-02-25"),
    mitigationPlan: "Hedge currency exposure, adjust budgets quarterly, maintain USD reserves",
    mitigationPlanAr: "التحوط من تعرض العملة، تعديل الميزانيات ربع سنوياً، الحفاظ على احتياطيات الدولار",
  },
];

const incidents = [
  {
    title: "Security Incident - Sana'a Office",
    titleAr: "حادث أمني - مكتب صنعاء",
    description: "Armed group attempted to enter office premises, security protocol activated successfully",
    descriptionAr: "حاولت مجموعة مسلحة دخول مقر المكتب، تم تفعيل البروتوكول الأمني بنجاح",
    category: "security",
    severity: "major",
    incidentDate: new Date("2026-01-15"),
    investigationStatus: "closed",
    reportedDate: new Date("2026-01-15"),
    resolvedDate: new Date("2026-01-16"),
    actionsTaken: "Increased security presence, reported to authorities, staff safety confirmed",
    actionsTakenAr: "زيادة الحضور الأمني، الإبلاغ للسلطات، تأكيد سلامة الموظفين",
  },
  {
    title: "Data Loss Incident",
    titleAr: "حادث فقدان البيانات",
    description: "Hard drive failure resulted in loss of beneficiary registration data from December 2025",
    descriptionAr: "فشل القرص الصلب أدى إلى فقدان بيانات تسجيل المستفيدين من ديسمبر 2025",
    category: "data_breach",
    severity: "critical",
    incidentDate: new Date("2026-02-01"),
    investigationStatus: "in_progress",
    reportedDate: new Date("2026-02-01"),
    actionsTaken: "Data recovery in progress, backup systems being reviewed, incident report filed",
    actionsTakenAr: "استعادة البيانات جارية، مراجعة أنظمة النسخ الاحتياطي، تقديم تقرير الحادث",
  },
  {
    title: "Vehicle Accident",
    titleAr: "حادث مركبة",
    description: "Minor traffic accident involving project vehicle, no injuries reported",
    descriptionAr: "حادث مروري بسيط يتعلق بمركبة المشروع، لم يتم الإبلاغ عن إصابات",
    category: "safety",
    severity: "minor",
    incidentDate: new Date("2026-01-20"),
    investigationStatus: "closed",
    reportedDate: new Date("2026-01-20"),
    resolvedDate: new Date("2026-01-22"),
    actionsTaken: "Vehicle repaired, driver retrained, insurance claim processed",
    actionsTakenAr: "إصلاح المركبة، إعادة تدريب السائق، معالجة مطالبة التأمين",
  },
  {
    title: "Beneficiary Complaint",
    titleAr: "شكوى مستفيد",
    description: "Complaint received regarding delayed food distribution in Taiz district",
    descriptionAr: "شكوى وردت بشأن تأخر توزيع الغذاء في منطقة تعز",
    category: "operational",
    severity: "moderate",
    incidentDate: new Date("2026-02-05"),
    investigationStatus: "in_progress",
    reportedDate: new Date("2026-02-05"),
    actionsTaken: "Investigation initiated, beneficiary contacted, distribution schedule reviewed",
    actionsTakenAr: "بدء التحقيق، الاتصال بالمستفيد، مراجعة جدول التوزيع",
  },
];

async function seedData() {
  console.log("🌱 Starting Risk & Compliance data seeding...");

  try {
    // Calculate risk scores and insert risks
    const insertedRisks = [];
    for (const risk of risks) {
      const score = risk.likelihood * risk.impact;
      let level;
      if (score >= 20) level = "critical";
      else if (score >= 11) level = "high";
      else if (score >= 5) level = "medium";
      else level = "low";

      const [result] = await db.insert(schema.risks).values({
        ...risk,
        score,
        level,
        organizationId: ORGANIZATION_ID,
        operatingUnitId: OPERATING_UNIT_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      insertedRisks.push({ id: result.insertId, ...risk, score, level });
      console.log(`✅ Created risk: ${risk.title} (${level}, Score: ${score})`);
    }

    // Link incidents to risks and insert
    const riskIds = insertedRisks.map((r) => r.id);
    for (let i = 0; i < incidents.length; i++) {
      const incident = incidents[i];
      const relatedRiskId = i < riskIds.length ? riskIds[i] : null;

      await db.insert(schema.incidents).values({
        ...incident,
        relatedRiskId,
        organizationId: ORGANIZATION_ID,
        operatingUnitId: OPERATING_UNIT_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`✅ Created incident: ${incident.title} (${incident.severity})`);
    }

    // Create audit history for some risks
    const auditEntries = [
      {
        riskId: insertedRisks[0].id,
        changeType: "status_change",
        oldValue: "Identified",
        newValue: "Assessed",
        changedBy: "Risk Manager",
        notes: "Risk assessment completed, mitigation plan approved",
        notesAr: "تم إكمال تقييم المخاطر، تمت الموافقة على خطة التخفيف",
      },
      {
        riskId: insertedRisks[1].id,
        changeType: "mitigation_update",
        oldValue: null,
        newValue: "Compensation packages improved by 15%",
        changedBy: "HR Director",
        notes: "Mitigation action implemented successfully",
        notesAr: "تم تنفيذ إجراء التخفيف بنجاح",
      },
      {
        riskId: insertedRisks[5].id,
        changeType: "status_change",
        oldValue: "Mitigated",
        newValue: "Closed",
        changedBy: "Communications Director",
        notes: "Risk successfully resolved, no further action needed",
        notesAr: "تم حل المخاطر بنجاح، لا حاجة لمزيد من الإجراءات",
      },
    ];

    for (const entry of auditEntries) {
      await db.insert(schema.riskHistory).values({
        ...entry,
        organizationId: ORGANIZATION_ID,
        operatingUnitId: OPERATING_UNIT_ID,
        changedAt: new Date(),
      });
      console.log(`✅ Created audit entry for risk ID: ${entry.riskId}`);
    }

    console.log("\n🎉 Seeding completed successfully!");
    console.log(`📊 Summary:`);
    console.log(`   - ${risks.length} risks created`);
    console.log(`   - ${incidents.length} incidents created`);
    console.log(`   - ${auditEntries.length} audit history entries created`);
    console.log(`\n🔗 Visit: /organization/risk-compliance to view the data`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedData();
