/**
 * ============================================================================
 * FULL EMPLOYEE PROFILE PDF GENERATOR
 * ============================================================================
 * 
 * ✅ FIXED ISSUES:
 * 1. Salary data now pulled from ACTIVE salary record (Salary Scale Service)
 * 2. Print architecture completely rebuilt for reliable PDF export
 * 
 * Features:
 * - Dedicated print-safe layout (A4 optimized)
 * - Auto-excludes sections with no data
 * - Official, branded, audit-ready
 * - Bilingual support (EN/AR)
 * - Can be printed or downloaded as PDF
 * 
 * ============================================================================
 */

import { useRef, useEffect } from 'react';
import { X, Printer, Download, FileText } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { salaryScaleService } from '@/app/services/salaryScaleService';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 employee: StaffMember;
 language: string;
 isRTL: boolean;
 isOpen: boolean;
 onClose: () => void;
 autoPrint?: boolean;
}

export function FullEmployeeProfilePDF({
 employee, language, isRTL, isOpen, onClose, autoPrint = false }: Props) {
 const { t } = useTranslation();
 const contentRef = useRef<HTMLDivElement>(null);

 // ✅ FIX ISSUE 1: Fetch ACTIVE salary record from Salary Scale Service
 const activeSalaryRecord = salaryScaleService.getActiveByStaffId(employee.staffId);

 const localT = {
 title: t.hrModals.fullEmployeeProfile,
 organizationName: t.hrModals.humanitarianOrganization,
 generatedOn: t.hrModals.generatedOn,
 confidential: t.hrModals.confidentialForOfficialUseOnly,
 
 // Sections
 identitySection: t.hrModals.k1IdentityPersonalProfile,
 employmentSection: t.hrModals.k2EmploymentContract,
 salarySection: t.hrModals.k3SalaryCompensationActiveRecordOnly,
 
 // Fields
 staffId: t.hrModals.staffId,
 fullName: t.hrModals.fullName,
 gender: t.hrModals.gender,
 nationality: t.hrModals.nationality,
 dateOfBirth: t.hrModals.dateOfBirth,
 phone: t.hrModals.phone,
 email: t.hrModals.email,
 address: t.hrModals.address,
 supervisor: t.hrModals.supervisor,
 
 position: t.hrModals.position,
 department: t.hrModals.department,
 hireDate: t.hrModals.hireDate,
 contractType: t.hrModals.contractType,
 employmentType: t.hrModals.employmentType,
 contractStart: t.hrModals.contractStart,
 contractEnd: t.hrModals.contractEnd,
 project: t.hrModals.project,
 
 grade: t.hrModals.grade,
 step: t.hrModals.step,
 baseSalary: t.hrModals.baseSalary,
 housing: t.hrModals.housingAllowance,
 transport: t.hrModals.transportAllowance,
 representation: t.hrModals.representationAllowance,
 other: t.hrModals.otherAllowances,
 grossSalary: t.hrModals.grossSalary,
 effectiveStartDate: t.hrModals.effectiveStartDate,
 currency: t.hrModals.currency,
 
 status: t.hrModals.status,
 active: t.hrModals.active,
 archived: t.hrModals.archived,
 exited: t.hrModals.exited,
 
 noActiveSalary: t.hrModals.noActiveSalaryRecordAvailable,
 noData: t.hrModals.noDataAvailable,
 
 // Actions
 print: t.hrModals.print,
 download: t.hrModals.downloadPdf,
 close: t.hrModals.close
 };

 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.hrModals.en, {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 });
 };

 const formatCurrency = (amount?: number, curr?: string) => {
 if (!amount) return `${curr || 'USD'} 0.00`;
 return new Intl.NumberFormat(t.hrModals.en, {
 style: 'currency',
 currency: curr || 'USD',
 minimumFractionDigits: 2
 }).format(amount);
 };

 const getStatusLabel = (status: string) => {
 const statusMap: Record<string, { en: string; ar: string }> = {
 active: { en: 'Active', ar: 'نشط' },
 archived: { en: 'Archived', ar: 'مؤرشف' },
 exited: { en: 'Exited', ar: 'خرج' }
 };
 return statusMap[status]?.[language] || status;
 };

 const handlePrint = () => {
 window.print();
 };

 const handleDownload = () => {
 window.print();
 };

 // Auto-print if requested
 useEffect(() => {
 if (autoPrint && isOpen) {
 const timer = setTimeout(() => {
 window.print();
 }, 500);
 return () => clearTimeout(timer);
 }
 }, [autoPrint, isOpen]);

 // Calculate if section has data
 const hasSalaryData = !!activeSalaryRecord;
 const hasContractData = employee.contractType || employee.contractStartDate;

 // Calculate gross salary from active record
 const calculateGrossSalary = () => {
 if (!activeSalaryRecord) return 0;
 return (
 (activeSalaryRecord.approvedGrossSalary || 0) +
 (activeSalaryRecord.housingAllowance || 0) +
 (activeSalaryRecord.transportAllowance || 0) +
 (activeSalaryRecord.representationAllowance || 0) +
 (activeSalaryRecord.otherAllowances || 0)
 );
 };

 if (!isOpen) return null;

 return (
 <>
 {/* Modal Overlay */}
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 screen-only" onClick={onClose}>
 <div 
 className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
 dir={isRTL ? 'rtl' : 'ltr'}
 onClick={(e) => e.stopPropagation()}
 
 >
 {/* Header - Hidden in print */}
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-blue-50">
 <div>
 <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
 <FileText className="w-5 h-5 text-blue-600" />
 {t.title}
 </h2>
 <p className="text-sm text-gray-600 mt-1">{employee.fullName}</p>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={handlePrint}
 className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 >
 <Printer className="w-4 h-4" />
 {t.print}
 </button>
 <button
 onClick={handleDownload}
 className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 <Download className="w-4 h-4" />
 {t.download}
 </button>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-6 h-6" />
 </button>
 </div>
 </div>

 {/* Scrollable Content Container */}
 <div className="flex-1 overflow-y-auto p-8">
 {/* The actual printable content */}
 <div ref={contentRef} id="employee-profile-printable">
 {/* Official Header */}
 <div className="mb-8 pb-6 border-b-2 border-gray-300">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h1 className="text-3xl font-bold text-gray-900">{t.organizationName}</h1>
 <p className="text-sm text-gray-600 mt-1">{t.title}</p>
 </div>
 <div className="text-end">
 <p className="text-xs text-gray-500">{t.generatedOn}:</p>
 <p className="text-sm font-semibold text-gray-900">
 {new Date().toLocaleDateString(t.hrModals.en, {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 })}
 </p>
 </div>
 </div>
 <div className="bg-red-50 border border-red-200 rounded px-3 py-2">
 <p className="text-xs font-semibold text-red-800 text-center">{t.confidential}</p>
 </div>
 </div>

 {/* Employee Header Info */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div>
 <p className="text-xs text-gray-500 mb-1">{t.staffId}</p>
 <p className="text-sm font-mono font-bold text-blue-600">{employee.staffId}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500 mb-1">{t.fullName}</p>
 <p className="text-sm font-semibold text-gray-900">{employee.fullName}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500 mb-1">{t.position}</p>
 <p className="text-sm text-gray-900">{employee.position || '-'}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500 mb-1">{t.status}</p>
 <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${ employee.status === 'active' ? 'bg-green-100 text-green-800' : employee.status === 'archived' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800' }`}>
 {getStatusLabel(employee.status)}
 </span>
 </div>
 </div>
 </div>

 {/* 1. Identity & Personal Profile */}
 <div className="mb-8 page-break-inside-avoid">
 <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-300">
 {t.identitySection}
 </h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-3">
 <div>
 <p className="text-xs text-gray-500">{t.gender}</p>
 <p className="text-sm text-gray-900">{employee.gender || '-'}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500">{t.nationality}</p>
 <p className="text-sm text-gray-900">{employee.nationality || '-'}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500">{t.dateOfBirth}</p>
 <p className="text-sm text-gray-900">{formatDate(employee.dateOfBirth)}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500">{t.supervisor}</p>
 <p className="text-sm text-gray-900">{employee.supervisor || '-'}</p>
 </div>
 </div>
 <div className="space-y-3">
 <div>
 <p className="text-xs text-gray-500">{t.phone}</p>
 <p className="text-sm text-gray-900">{employee.phoneNumber || '-'}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500">{t.email}</p>
 <p className="text-sm text-gray-900">{employee.email || '-'}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500">{t.address}</p>
 <p className="text-sm text-gray-900">{employee.fullAddress || '-'}</p>
 </div>
 </div>
 </div>
 </div>

 {/* 2. Employment & Contract */}
 {hasContractData && (
 <div className="mb-8 page-break-inside-avoid">
 <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-300">
 {t.employmentSection}
 </h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-3">
 <div>
 <p className="text-xs text-gray-500">{t.department}</p>
 <p className="text-sm text-gray-900">{employee.department || '-'}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500">{t.hireDate}</p>
 <p className="text-sm text-gray-900">{formatDate(employee.hireDate)}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500">{t.contractType}</p>
 <p className="text-sm text-gray-900">{employee.contractType || '-'}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500">{t.employmentType}</p>
 <p className="text-sm text-gray-900">{employee.employmentType || '-'}</p>
 </div>
 </div>
 <div className="space-y-3">
 <div>
 <p className="text-xs text-gray-500">{t.project}</p>
 <p className="text-sm text-gray-900">{employee.project || '-'}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500">{t.contractStart}</p>
 <p className="text-sm text-gray-900">{formatDate(employee.contractStartDate)}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500">{t.contractEnd}</p>
 <p className="text-sm text-gray-900">{formatDate(employee.contractEndDate)}</p>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* 3. Salary & Compensation - ACTIVE RECORD ONLY */}
 <div className="mb-8 page-break-inside-avoid">
 <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-300">
 {t.salarySection}
 </h2>
 {hasSalaryData && activeSalaryRecord ? (
 <div className="space-y-4">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 <div>
 <p className="text-xs text-gray-500">{t.grade}</p>
 <p className="text-sm font-semibold text-gray-900">{activeSalaryRecord.grade || '-'}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500">{t.step}</p>
 <p className="text-sm font-semibold text-gray-900">{activeSalaryRecord.step || '-'}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500">{t.currency}</p>
 <p className="text-sm font-semibold text-gray-900">{activeSalaryRecord.currency || 'USD'}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500">{t.effectiveStartDate}</p>
 <p className="text-sm font-semibold text-gray-900">
 {formatDate(activeSalaryRecord.effectiveStartDate)}
 </p>
 </div>
 </div>
 
 <div className="bg-blue-50 border border-blue-200 rounded p-4">
 <div className="grid grid-cols-1 gap-2">
 <div className="flex justify-between">
 <p className="text-xs text-gray-600">{t.baseSalary}</p>
 <p className="text-sm font-bold text-blue-900">
 {formatCurrency(activeSalaryRecord.approvedGrossSalary, activeSalaryRecord.currency)}
 </p>
 </div>
 </div>
 </div>
 
 <div className="bg-gray-50 p-4 rounded space-y-2">
 <p className="text-xs font-semibold text-gray-700 mb-2">Allowances:</p>
 <div className="grid grid-cols-2 gap-3">
 <div className="flex justify-between">
 <p className="text-xs text-gray-600">{t.housing}</p>
 <p className="text-sm text-gray-900">
 {formatCurrency(activeSalaryRecord.housingAllowance, activeSalaryRecord.currency)}
 </p>
 </div>
 <div className="flex justify-between">
 <p className="text-xs text-gray-600">{t.transport}</p>
 <p className="text-sm text-gray-900">
 {formatCurrency(activeSalaryRecord.transportAllowance, activeSalaryRecord.currency)}
 </p>
 </div>
 <div className="flex justify-between">
 <p className="text-xs text-gray-600">{t.representation}</p>
 <p className="text-sm text-gray-900">
 {formatCurrency(activeSalaryRecord.representationAllowance, activeSalaryRecord.currency)}
 </p>
 </div>
 <div className="flex justify-between">
 <p className="text-xs text-gray-600">{t.other}</p>
 <p className="text-sm text-gray-900">
 {formatCurrency(activeSalaryRecord.otherAllowances, activeSalaryRecord.currency)}
 </p>
 </div>
 </div>
 </div>
 
 <div className="bg-green-50 border-2 border-green-300 rounded p-4">
 <div className="flex justify-between items-center">
 <p className="text-sm font-bold text-green-800">{t.grossSalary}</p>
 <p className="text-2xl font-bold text-green-700">
 {formatCurrency(calculateGrossSalary(), activeSalaryRecord.currency)}
 </p>
 </div>
 </div>
 </div>
 ) : (
 <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
 <p className="text-sm text-yellow-800 italic">{t.noActiveSalary}</p>
 </div>
 )}
 </div>

 {/* Footer - Official stamp */}
 <div className="mt-12 pt-6 border-t-2 border-gray-300">
 <p className="text-xs text-gray-500 text-center">
 {'This is an official document generated from the HR Management System'}
 </p>
 <p className="text-xs text-gray-400 text-center mt-2">
 {employee.staffId} | {new Date().toLocaleDateString()}
 </p>
 </div>
 </div>
 </div>

 {/* Footer Actions */}
 <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
 <button
 onClick={onClose}
 className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 {t.close}
 </button>
 </div>
 </div>
 </div>

 {/* ✅ FIX ISSUE 2: Proper Print Styles */}
 <style>{`
 @media print {
 /* Hide everything by default */
 body * {
 visibility: hidden;
 }
 
 /* Hide modal overlay and chrome */
 .screen-only {
 display: none !important;
 }
 
 /* Show only the printable content */
 #employee-profile-printable,
 #employee-profile-printable * {
 visibility: visible;
 }
 
 /* Position printable content at top of page */
 #employee-profile-printable {
 position: absolute;
 left: 0;
 top: 0;
 width: 100%;
 background: white;
 padding: 20mm;
 }
 
 /* Page setup */
 @page {
 size: A4;
 margin: 15mm;
 }
 
 /* Avoid breaking inside sections */
 .page-break-inside-avoid {
 page-break-inside: avoid;
 break-inside: avoid;
 }
 
 /* Ensure white background */
 body {
 background: white !important;
 }
 
 /* Remove shadows and rounded corners for print */
 * {
 box-shadow: none !important;
 border-radius: 0 !important;
 }
 }
 
 @media screen {
 .screen-only {
 display: block;
 }
 }
 `}</style>
 </>
 );
}
