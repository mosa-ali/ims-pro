/**
 * useTranslation Hook
 * Provides RTL/LTR support and language detection
 */

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from '@/contexts/LanguageContext';

type Language = "en" | "ar";

interface TranslationContext {
 language: Language;
 isRTL: boolean;
 setLanguage: (lang: Language) => void;
 t: (key: string, fallback?: string) => string;
 dir: "ltr" | "rtl";
}

// Simple translations for common UI elements
const translations: Record<Language, Record<string, string>> = {
 en: {
 // Common
 "common.loading": "Loading...",
 "common.save": "Save",
 "common.cancel": "Cancel",
 "common.delete": "Delete",
 "common.edit": "Edit",
 "common.view": "View",
 "common.add": "Add",
 "common.search": "Search...",
 "common.export": "Export",
 "common.import": "Import",
 "common.print": "Print",
 "common.back": "Back",
 "common.next": "Next",
 "common.previous": "Previous",
 "common.submit": "Submit",
 "common.confirm": "Confirm",
 "common.actions": "Actions",
 "common.status": "Status",
 "common.date": "Date",
 "common.amount": "Amount",
 "common.total": "Total",
 "common.description": "Description",
 "common.notes": "Notes",
 "common.attachments": "Attachments",
 "common.required": "Required",
 "common.optional": "Optional",
 "common.all": "All",
 "common.none": "None",
 "common.yes": "Yes",
 "common.no": "No",
 
 // Project Form
 "organization.projectForm.createNewProject": "Create New Project",
 "organization.projectForm.editProject": "Edit Project",
 "organization.projectForm.projectCode": "Project Code",
 "organization.projectForm.projectCodePlaceholder": "e.g., PRJ-001",
 "organization.projectForm.projectTitle": "Project Title",
 "organization.projectForm.projectTitlePlaceholder": "Enter project title",
 "organization.projectForm.status": "Status",
 "organization.projectForm.startDate": "Start Date",
 "organization.projectForm.endDate": "End Date",
 "organization.projectForm.totalBudget": "Total Budget",
 "organization.projectForm.currency": "Currency",
 "organization.projectForm.sectors": "Sectors",
 "organization.projectForm.donor": "Donor",
 "organization.projectForm.donorPlaceholder": "Enter donor name",
 "organization.projectForm.implementingPartner": "Implementing Partner",
 "organization.projectForm.partnerPlaceholder": "Enter partner name",
 "organization.projectForm.location": "Location",
 "organization.projectForm.locationPlaceholder": "Enter project location",
 "organization.projectForm.description": "Description",
 "organization.projectForm.descriptionPlaceholder": "Enter project description",
 "organization.projectForm.required": "*",
 "organization.projectForm.planning": "Planning",
 "organization.projectForm.active": "Active",
 "organization.projectForm.onHold": "On Hold",
 "organization.projectForm.completed": "Completed",
 "organization.projectForm.cancelled": "Cancelled",
 "organization.projectForm.ongoing": "Ongoing",
 "organization.projectForm.planned": "Planned",
 "organization.projectForm.notStarted": "Not Started",
 "organization.projectForm.cancel": "Cancel",
 "organization.projectForm.save": "Save Project",
 "organization.projectForm.saving": "Saving...",
 "organization.projectForm.updateProject": "Update Project",
 "organization.projectForm.createProject": "Create Project",
 "organization.projectForm.validation.codeRequired": "Project code is required",
 "organization.projectForm.validation.titleRequired": "Project title is required",
 "organization.projectForm.validation.startDateRequired": "Start date is required",
 "organization.projectForm.validation.endDateRequired": "End date is required",
 "organization.projectForm.validation.budgetPositive": "Budget must be greater than 0",
 "organization.projectForm.validation.sectorsRequired": "At least one sector is required",
 "organization.projectForm.validation.endDateAfterStart": "End date must be after start date",
 
 // Onboarding Dashboard
 "onboarding.dashboard.title": "Onboarding Dashboard",
 "onboarding.dashboard.subtitle": "Monitor organization Microsoft 365 onboarding status",
 "onboarding.dashboard.totalOrganizations": "Total Organizations",
 "onboarding.dashboard.notConnected": "Not Connected",
 "onboarding.dashboard.pendingConsent": "Pending Consent",
 "onboarding.dashboard.connected": "Connected",
 "onboarding.dashboard.error": "Error",
 "onboarding.dashboard.exportCSV": "Export CSV",
 "onboarding.dashboard.allStatuses": "All Statuses",
 "onboarding.dashboard.searchPlaceholder": "Search by name or code",
 "onboarding.dashboard.tenantId": "Tenant ID",
 "onboarding.dashboard.connectedAt": "Connected At",
 "onboarding.dashboard.linkSentAt": "Link Sent At",
 "onboarding.dashboard.linkSentTo": "Link Sent To",
 "onboarding.dashboard.status": "Status",
 "onboarding.dashboard.organization": "Organization",
 "onboarding.dashboard.noData": "No organizations found",
 "onboarding.dashboard.resendLink": "Resend Link",
 "onboarding.dashboard.confirmResend": "Are you sure you want to resend the onboarding link?",
 "onboarding.dashboard.resendSuccess": "Link resent successfully",
 "onboarding.dashboard.resendError": "Failed to resend link",
 
 // Webhook Management
 "webhook.management.title": "Webhook Management",
 "webhook.management.subtitle": "Register and monitor webhook endpoints",
 "webhook.management.createWebhook": "Create Webhook",
 "webhook.management.webhookUrl": "Webhook URL",
 "webhook.management.eventTypes": "Event Types",
 "webhook.management.selectEvents": "Select events to subscribe to",
 "webhook.management.organizationCreated": "Organization Created",
 "webhook.management.onboardingStarted": "Onboarding Started",
 "webhook.management.onboardingCompleted": "Onboarding Completed",
 "webhook.management.onboardingFailed": "Onboarding Failed",
 "webhook.management.testWebhook": "Test Webhook",
 "webhook.management.deleteWebhook": "Delete Webhook",
 "webhook.management.confirmDelete": "Are you sure you want to delete this webhook?",
 "webhook.management.copyUrl": "Copy URL",
 "webhook.management.urlCopied": "URL copied to clipboard",
 "webhook.management.totalWebhooks": "Total Webhooks",
 "webhook.management.successful": "Successful",
 "webhook.management.failed": "Failed",
 "webhook.management.pending": "Pending",
 "webhook.management.lastDelivery": "Last Delivery",
 "webhook.management.successRate": "Success Rate",
 "webhook.management.noWebhooks": "No webhooks registered",
 "webhook.management.createSuccess": "Webhook created successfully",
 "webhook.management.createError": "Failed to create webhook",
 "webhook.management.deleteSuccess": "Webhook deleted successfully",
 "webhook.management.deleteError": "Failed to delete webhook",
 "webhook.management.testSuccess": "Webhook test sent successfully",
 "webhook.management.testError": "Failed to send webhook test",
 },
 ar: {
 // Common
 "common.loading": "جاري التحميل...",
 "common.save": "حفظ",
 "common.cancel": "إلغاء",
 "common.delete": "حذف",
 "common.edit": "تعديل",
 "common.view": "عرض",
 "common.add": "إضافة",
 "common.search": "بحث...",
 "common.export": "تصدير",
 "common.import": "استيراد",
 "common.print": "طباعة",
 "common.back": "رجوع",
 "common.next": "التالي",
 "common.previous": "السابق",
 "common.submit": "إرسال",
 "common.confirm": "تأكيد",
 "common.actions": "الإجراءات",
 "common.status": "الحالة",
 "common.date": "التاريخ",
 "common.amount": "المبلغ",
 "common.total": "الإجمالي",
 "common.description": "الوصف",
 "common.notes": "ملاحظات",
 "common.attachments": "المرفقات",
 "common.required": "مطلوب",
 "common.optional": "اختياري",
 "common.all": "الكل",
 "common.none": "لا شيء",
 "common.yes": "نعم",
 "common.no": "لا",
 
 // Project Form
 "organization.projectForm.createNewProject": "إنشاء مشروع جديد",
 "organization.projectForm.editProject": "تعديل المشروع",
 "organization.projectForm.projectCode": "رمز المشروع",
 "organization.projectForm.projectCodePlaceholder": "مثال: PRJ-001",
 "organization.projectForm.projectTitle": "عنوان المشروع",
 "organization.projectForm.projectTitlePlaceholder": "أدخل عنوان المشروع",
 "organization.projectForm.status": "الحالة",
 "organization.projectForm.startDate": "تاريخ البدء",
 "organization.projectForm.endDate": "تاريخ الانتهاء",
 "organization.projectForm.totalBudget": "إجمالي الميزانية",
 "organization.projectForm.currency": "العملة",
 "organization.projectForm.sectors": "القطاعات",
 "organization.projectForm.donor": "الجهة المانحة",
 "organization.projectForm.donorPlaceholder": "أدخل اسم الجهة المانحة",
 "organization.projectForm.implementingPartner": "الشريك المنفذ",
 "organization.projectForm.partnerPlaceholder": "أدخل اسم الشريك",
 "organization.projectForm.location": "الموقع",
 "organization.projectForm.locationPlaceholder": "أدخل موقع المشروع",
 "organization.projectForm.description": "الوصف",
 "organization.projectForm.descriptionPlaceholder": "أدخل وصف المشروع",
 "organization.projectForm.required": "*",
 "organization.projectForm.planning": "تخطيط",
 "organization.projectForm.active": "نشط",
 "organization.projectForm.onHold": "معلق",
 "organization.projectForm.completed": "مكتمل",
 "organization.projectForm.cancelled": "ملغى",
 "organization.projectForm.ongoing": "جاري",
 "organization.projectForm.planned": "مخطط",
 "organization.projectForm.notStarted": "لم يبدأ",
 "organization.projectForm.cancel": "إلغاء",
 "organization.projectForm.save": "حفظ المشروع",
 "organization.projectForm.saving": "جاري الحفظ...",
 "organization.projectForm.updateProject": "تحديث المشروع",
 "organization.projectForm.createProject": "إنشاء المشروع",
 "organization.projectForm.validation.codeRequired": "رمز المشروع مطلوب",
 "organization.projectForm.validation.titleRequired": "عنوان المشروع مطلوب",
 "organization.projectForm.validation.startDateRequired": "تاريخ البدء مطلوب",
 "organization.projectForm.validation.endDateRequired": "تاريخ الانتهاء مطلوب",
 "organization.projectForm.validation.budgetPositive": "يجب أن تكون الميزانية أكبر من 0",
 "organization.projectForm.validation.sectorsRequired": "مطلوب قطاع واحد على الأقل",
 "organization.projectForm.validation.endDateAfterStart": "يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء",
 
 // Onboarding Dashboard
 "onboarding.dashboard.title": "لوحة تحكم الإعداد",
 "onboarding.dashboard.subtitle": "مراقبة حالة إعداد Microsoft 365 للمنظمات",
 "onboarding.dashboard.totalOrganizations": "إجمالي المنظمات",
 "onboarding.dashboard.notConnected": "غير متصل",
 "onboarding.dashboard.pendingConsent": "في انتظار الموافقة",
 "onboarding.dashboard.connected": "متصل",
 "onboarding.dashboard.error": "خطأ",
 "onboarding.dashboard.exportCSV": "تصدير CSV",
 "onboarding.dashboard.allStatuses": "جميع الحالات",
 "onboarding.dashboard.searchPlaceholder": "ابحث حسب الاسم أو الرمز",
 "onboarding.dashboard.tenantId": "معرف المستأجر",
 "onboarding.dashboard.connectedAt": "تاريخ الاتصال",
 "onboarding.dashboard.linkSentAt": "تاريخ إرسال الرابط",
 "onboarding.dashboard.linkSentTo": "تم إرسال الرابط إلى",
 "onboarding.dashboard.status": "الحالة",
 "onboarding.dashboard.organization": "المنظمة",
 "onboarding.dashboard.noData": "لم يتم العثور على منظمات",
 "onboarding.dashboard.resendLink": "إعادة إرسال الرابط",
 "onboarding.dashboard.confirmResend": "هل أنت متأكد من رغبتك في إعادة إرسال رابط الإعداد؟",
 "onboarding.dashboard.resendSuccess": "تم إعادة إرسال الرابط بنجاح",
 "onboarding.dashboard.resendError": "فشل إعادة إرسال الرابط",
 
 // Webhook Management
 "webhook.management.title": "إدارة Webhook",
 "webhook.management.subtitle": "تسجيل ومراقبة نقاط نهاية Webhook",
 "webhook.management.createWebhook": "إنشاء Webhook",
 "webhook.management.webhookUrl": "عنوان URL الخاص بـ Webhook",
 "webhook.management.eventTypes": "أنواع الأحداث",
 "webhook.management.selectEvents": "حدد الأحداث للاشتراك فيها",
 "webhook.management.organizationCreated": "تم إنشاء المنظمة",
 "webhook.management.onboardingStarted": "بدء الإعداد",
 "webhook.management.onboardingCompleted": "اكتمل الإعداد",
 "webhook.management.onboardingFailed": "فشل الإعداد",
 "webhook.management.testWebhook": "اختبار Webhook",
 "webhook.management.deleteWebhook": "حذف Webhook",
 "webhook.management.confirmDelete": "هل أنت متأكد من رغبتك في حذف هذا Webhook؟",
 "webhook.management.copyUrl": "نسخ العنوان",
 "webhook.management.urlCopied": "تم نسخ العنوان إلى الحافظة",
 "webhook.management.totalWebhooks": "إجمالي Webhooks",
 "webhook.management.successful": "ناجح",
 "webhook.management.failed": "فشل",
 "webhook.management.pending": "قيد الانتظار",
 "webhook.management.lastDelivery": "آخر تسليم",
 "webhook.management.successRate": "معدل النجاح",
 "webhook.management.noWebhooks": "لم يتم تسجيل أي webhooks",
 "webhook.management.createSuccess": "تم إنشاء Webhook بنجاح",
 "webhook.management.createError": "فشل إنشاء Webhook",
 "webhook.management.deleteSuccess": "تم حذف Webhook بنجاح",
 "webhook.management.deleteError": "فشل حذف Webhook",
 "webhook.management.testSuccess": "تم إرسال اختبار Webhook بنجاح",
 "webhook.management.testError": "فشل إرسال اختبار Webhook",
 },
};

const STORAGE_KEY = "ims_language";

export function useTranslation(): TranslationContext {
 const [language, setLanguageState] = useState<Language>(() => {
 if (typeof window !== "undefined") {
 const stored = localStorage.getItem(STORAGE_KEY);
 if (stored === "ar" || stored === "en") return stored;
 // Auto-detect from browser
 const browserLang = navigator.language.toLowerCase();
 if (browserLang.startsWith("ar")) return "ar";
 }
 return "en";
 });

 const isRTL = language === "ar";
 const dir = isRTL ? "rtl" : "ltr";

 useEffect(() => {
 // Update document direction
 document.documentElement.dir = dir;
 document.documentElement.lang = language;
 localStorage.setItem(STORAGE_KEY, language);
 }, [language, dir]);

 const setLanguage = useCallback((lang: Language) => {
 setLanguageState(lang);
 }, []);

 const t = useCallback(
 (key: string, fallback?: string): string => {
 return translations[language]?.[key] || fallback || key;
 },
 [language]
 );

 return {
 language,
 isRTL,
 setLanguage,
 t,
 dir,
 };
}

export default useTranslation;
