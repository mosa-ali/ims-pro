/**
 * ============================================================================
 * 7. EXIT & OFFBOARDING CARD
 * ============================================================================
 * 
 * FEATURES:
 * - Exit process initiation and tracking
 * - Exit checklist with completion status
 * - Exit types: Resignation, Termination, End of Contract, Retirement
 * - Clearance tracking (Finance, IT, HR, Admin)
 * - Final settlement calculation
 * - Once completed → status becomes 'Exited' → Profile becomes read-only
 * - Bilingual support (EN/AR)
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { LogOut, Plus, CheckCircle, XCircle, AlertCircle, FileText, CheckSquare, MessageSquare, DoorOpen, Circle, CheckCircle2, Printer } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { exitService } from '@/app/services/exitService';
import { ResignationFormModal } from '../modals/ResignationFormModal';
import { ClearanceFormModal } from '../modals/ClearanceFormModal';
import { ExitInterviewFormModal } from '../modals/ExitInterviewFormModal';
import { ResignationPrintModal } from '../modals/ResignationPrintModal';
import { ClearancePrintModal } from '../modals/ClearancePrintModal';
import { ExitInterviewPrintModal } from '../modals/ExitInterviewPrintModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ExitProcess {
 id: string;
 staffId: string;
 exitType: 'Resignation' | 'Termination' | 'End of Contract' | 'Retirement' | 'Death';
 resignationDate?: string; // Date employee submitted resignation
 lastWorkingDay: string; // Last day of work
 exitReason: string;
 noticeProvided: boolean;
 noticePeriodDays: number;
 
 // Clearance checklist
 hrClearance: boolean;
 hrClearanceDate?: string;
 hrClearanceBy?: string;
 
 financeClearance: boolean;
 financeClearanceDate?: string;
 financeClearanceBy?: string;
 
 itClearance: boolean;
 itClearanceDate?: string;
 itClearanceBy?: string;
 
 adminClearance: boolean;
 adminClearanceDate?: string;
 adminClearanceBy?: string;
 
 // Settlement
 finalSettlementCalculated: boolean;
 finalSettlementAmount?: number;
 settlementCurrency?: string;
 settlementPaid: boolean;
 settlementPaidDate?: string;
 
 // Documents
 experienceCertificateIssued: boolean;
 referenceLetterIssued: boolean;
 
 // Process status
 status: 'Initiated' | 'In Progress' | 'Pending Clearance' | 'Completed';
 completedDate?: string;
 exitInterviewConducted: boolean;
 exitInterviewDate?: string;
 exitInterviewNotes?: string;
 
 notes?: string;
 
 createdAt: string;
 updatedAt: string;
}

interface Props {
 employee: StaffMember;
 language: string;
 isRTL: boolean;
 onEmployeeUpdate?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ExitOffboardingCard({
 employee, language, isRTL, onEmployeeUpdate }: Props) {
 const { t } = useTranslation();
 const [exitData, setExitData] = useState<any>(null);
 const [showResignationForm, setShowResignationForm] = useState(false);
 const [showClearanceForm, setShowClearanceForm] = useState(false);
 const [showExitInterviewForm, setShowExitInterviewForm] = useState(false);
 const [showResignationPrint, setShowResignationPrint] = useState(false);
 const [showClearancePrint, setShowClearancePrint] = useState(false);
 const [showExitInterviewPrint, setShowExitInterviewPrint] = useState(false);

 useEffect(() => {
 loadExitData();
 }, [employee]);

 const loadExitData = () => {
 const data = exitService.getAllExitData(employee.staffId);
 setExitData(data);
 };

 const calculateCompletion = () => {
 if (!exitData || !exitData.process) return 0;
 
 const process = exitData.process;
 const clearance = exitData.clearance;
 
 const checks = [
 clearance?.allCleared,
 process?.exitInterviewConducted,
 process?.finalSettlementPaid,
 process?.experienceCertificateIssued
 ];
 
 const completed = checks.filter(c => c).length;
 return Math.round((completed / checks.length) * 100);
 };

 const localT = {
 title: t.hrEmployeeCards.exitOffboarding,
 subtitle: t.hrEmployeeCards.exitProcessAndClearance,
 initiateExit: t.hrEmployeeCards.initiateExitProcess,
 viewDetails: t.hrEmployeeCards.viewDetails,
 updateClearance: t.hrEmployeeCards.updateClearance,
 noExit: t.hrEmployeeCards.noExitProcessInitiated,
 employeeActive: t.hrEmployeeCards.employeeIsCurrentlyActive,
 exitInProgress: t.hrEmployeeCards.exitProcessInProgress,
 completionRate: t.hrEmployeeCards.completion,
 
 // Exit info
 exitType: t.hrEmployeeCards.exitType,
 lastWorkingDay: t.hrEmployeeCards.lastWorkingDay,
 status: t.hrEmployeeCards.status,
 
 // Checklist
 clearanceChecklist: t.hrEmployeeCards.clearanceChecklist,
 hrClearance: t.hrEmployeeCards.hrClearance,
 financeClearance: t.hrEmployeeCards.financeClearance,
 itClearance: t.hrEmployeeCards.itClearance,
 adminClearance: t.hrEmployeeCards.adminClearance,
 finalSettlement: t.hrEmployeeCards.finalSettlementPaid,
 experienceCertificate: t.hrEmployeeCards.experienceCertificateIssued,
 exitInterview: t.hrEmployeeCards.exitInterviewConducted,
 
 completed: t.hrEmployeeCards.completed,
 pending: t.hrEmployeeCards.pending,
 
 // Status
 initiated: t.hrEmployeeCards.initiated,
 inProgress: t.hrEmployeeCards.inProgress,
 pendingClearance: t.hrEmployeeCards.pendingClearance,
 exitCompleted: t.hrEmployeeCards.exitCompleted
 };

 const completion = calculateCompletion();

 return (
 <div className="bg-white rounded-lg border border-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
 <div className={'text-start'}>
 <h3 className="text-lg font-semibold text-gray-900">{t.title}</h3>
 <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
 </div>
 <div className="flex items-center gap-2">
 <button 
 onClick={() => setShowResignationForm(true)}
 className={`flex items-center gap-2 px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700`}
 >
 <FileText className="w-4 h-4" />
 <span>Resignation</span>
 </button>
 <button 
 onClick={() => setShowClearanceForm(true)}
 className={`flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700`}
 >
 <CheckSquare className="w-4 h-4" />
 <span>Clearance</span>
 </button>
 <button 
 onClick={() => setShowExitInterviewForm(true)}
 className={`flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700`}
 >
 <MessageSquare className="w-4 h-4" />
 <span>Exit Interview</span>
 </button>
 </div>
 </div>

 {/* Content */}
 <div className="p-6">
 {!exitData?.resignation && !exitData?.clearance && !exitData?.exitInterview ? (
 <div className="text-center py-12">
 <DoorOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
 <p className="text-gray-500">{t.noExit}</p>
 <p className="text-sm text-green-600 mt-2">{t.employeeActive}</p>
 </div>
 ) : (
 <div className="space-y-4">
 {/* Resignation Summary */}
 {exitData.resignation && (
 <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <FileText className="w-5 h-5 text-orange-600" />
 <h4 className="text-sm font-semibold text-gray-900">Resignation Submitted</h4>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-xs px-2 py-1 bg-orange-200 text-orange-800 rounded">
 {new Date(exitData.resignation.resignationDate).toLocaleDateString()}
 </span>
 <button
 onClick={() => setShowResignationPrint(true)}
 className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
 title="Print Resignation Letter"
 >
 <Printer className="w-3 h-3" />
 <span>Print</span>
 </button>
 </div>
 </div>
 <div className="text-sm text-gray-600">
 Last Working Day: {new Date(exitData.resignation.lastWorkingDay).toLocaleDateString()}
 </div>
 </div>
 )}

 {/* Clearance Summary */}
 {exitData.clearance && (
 <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2">
 <CheckSquare className="w-5 h-5 text-green-600" />
 <h4 className="text-sm font-semibold text-gray-900">Clearance Process</h4>
 </div>
 <div className="flex items-center gap-2">
 {exitData.clearance.allCleared && (
 <span className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded">
 All Cleared
 </span>
 )}
 <button
 onClick={() => setShowClearancePrint(true)}
 className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
 title="Print Clearance Form"
 >
 <Printer className="w-3 h-3" />
 <span>Print</span>
 </button>
 </div>
 </div>
 <div className="space-y-1">
 {exitData.clearance.checklist.map((item: any, idx: number) => (
 <div key={idx} className="flex items-center justify-between text-sm">
 <span className="text-gray-600">{item.department}</span>
 {item.cleared ? (
 <CheckCircle2 className="w-4 h-4 text-green-600" />
 ) : (
 <Circle className="w-4 h-4 text-gray-300" />
 )}
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Exit Interview Summary */}
 {exitData.exitInterview && (
 <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <MessageSquare className="w-5 h-5 text-purple-600" />
 <h4 className="text-sm font-semibold text-gray-900">Exit Interview Completed</h4>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-xs px-2 py-1 bg-purple-200 text-purple-800 rounded">
 {new Date(exitData.exitInterview.interviewDate).toLocaleDateString()}
 </span>
 <button
 onClick={() => setShowExitInterviewPrint(true)}
 className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
 title="Print Exit Interview Report"
 >
 <Printer className="w-3 h-3" />
 <span>Print</span>
 </button>
 </div>
 </div>
 <div className="text-sm text-gray-600">
 Interviewed by: {exitData.exitInterview.interviewedBy}
 </div>
 </div>
 )}

 {/* Progress Bar */}
 {completion > 0 && (
 <div>
 <div className="flex items-center justify-between mb-2">
 <span className="text-sm font-medium text-gray-700">{t.completionRate}</span>
 <span className="text-sm font-bold text-blue-600">{completion}%</span>
 </div>
 <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
 <div 
 className="h-full bg-blue-600 transition-all duration-300"
 style={{ width: `${completion}%` }}
 />
 </div>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Resignation Form Modal */}
 {showResignationForm && (
 <ResignationFormModal
 employee={employee}
 onClose={() => setShowResignationForm(false)}
 onSave={() => {
 loadExitData();
 setShowResignationForm(false);
 if (onEmployeeUpdate) onEmployeeUpdate();
 }}
 />
 )}

 {/* Clearance Form Modal */}
 {showClearanceForm && (
 <ClearanceFormModal
 employee={employee}
 onClose={() => setShowClearanceForm(false)}
 onSave={() => {
 loadExitData();
 setShowClearanceForm(false);
 if (onEmployeeUpdate) onEmployeeUpdate();
 }}
 />
 )}

 {/* Exit Interview Form Modal */}
 {showExitInterviewForm && (
 <ExitInterviewFormModal
 employee={employee}
 onClose={() => setShowExitInterviewForm(false)}
 onSave={() => {
 loadExitData();
 setShowExitInterviewForm(false);
 if (onEmployeeUpdate) onEmployeeUpdate();
 }}
 />
 )}

 {/* Resignation Print Modal */}
 {showResignationPrint && (
 <ResignationPrintModal
 employee={employee}
 onClose={() => setShowResignationPrint(false)}
 onSave={() => {
 loadExitData();
 setShowResignationPrint(false);
 if (onEmployeeUpdate) onEmployeeUpdate();
 }}
 />
 )}

 {/* Clearance Print Modal */}
 {showClearancePrint && (
 <ClearancePrintModal
 employee={employee}
 onClose={() => setShowClearancePrint(false)}
 onSave={() => {
 loadExitData();
 setShowClearancePrint(false);
 if (onEmployeeUpdate) onEmployeeUpdate();
 }}
 />
 )}

 {/* Exit Interview Print Modal */}
 {showExitInterviewPrint && (
 <ExitInterviewPrintModal
 employee={employee}
 onClose={() => setShowExitInterviewPrint(false)}
 onSave={() => {
 loadExitData();
 setShowExitInterviewPrint(false);
 if (onEmployeeUpdate) onEmployeeUpdate();
 }}
 />
 )}
 </div>
 );
}

// ============================================================================
// CHECKLIST ITEM COMPONENT
// ============================================================================

function ChecklistItem({
 label, completed, date, by, language }: {
 label: string;
 completed: boolean;
 date?: string;
 by?: string;
 language: string;
}) {
 return (
 <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
 <div className="flex items-center gap-3">
 {completed ? (
 <CheckCircle2 className="w-5 h-5 text-green-600" />
 ) : (
 <Circle className="w-5 h-5 text-gray-300" />
 )}
 <span className={`text-sm ${completed ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
 {label}
 </span>
 </div>
 {completed && date && (
 <div className="text-xs text-gray-500">
 {new Date(date).toLocaleDateString(t.hrEmployeeCards.en)}
 {by && ` • ${by}`}
 </div>
 )}
 </div>
 );
}