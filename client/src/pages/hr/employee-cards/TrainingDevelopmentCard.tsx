/**
 * ============================================================================
 * 6. TRAINING & DEVELOPMENT CARD
 * ============================================================================
 * 
 * FEATURES:
 * - Training records table with full CRUD
 * - Training types: Technical, Soft Skills, Leadership, Compliance, Certification
 * - Training status tracking: Planned, Ongoing, Completed, Cancelled
 * - Certificate uploads and tracking
 * - Training cost tracking
 * - Bilingual support (EN/AR)
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { GraduationCap, Plus, Edit2, Trash2, X, Save, Award, Printer } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { trainingService as newTrainingService, TrainingRecord as NewTrainingRecord } from '@/app/services/trainingService';
import { TrainingFormModal } from '../modals/TrainingFormModal';
import { TrainingCertificatePrintModal } from '../modals/TrainingCertificatePrintModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TrainingRecord {
 id: string;
 staffId: string;
 trainingTitle: string;
 trainingType: 'Technical' | 'Soft Skills' | 'Leadership' | 'Compliance' | 'Certification' | 'Other';
 provider: string;
 startDate: string;
 endDate: string;
 duration: number; // In hours
 status: 'Planned' | 'Ongoing' | 'Completed' | 'Cancelled';
 cost: number;
 currency: string;
 certificateIssued: boolean;
 certificateFile?: string; // File name or URL
 location: string; // Online, In-Person, Hybrid
 notes?: string;
 createdAt: string;
 updatedAt: string;
}

interface Props {
 employee: StaffMember;
 language: string;
 isRTL: boolean;
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEY = 'hr_training_records';

// ============================================================================
// TRAINING SERVICE
// ============================================================================

const trainingService = {
 getAll(): TrainingRecord[] {
 try {
 const data = localStorage.getItem(STORAGE_KEY);
 return data ? JSON.parse(data) : [];
 } catch {
 return [];
 }
 },

 getByStaffId(staffId: string): TrainingRecord[] {
 return this.getAll().filter(t => t.staffId === staffId);
 },

 create(record: Omit<TrainingRecord, 'id' | 'createdAt' | 'updatedAt'>): TrainingRecord {
 const records = this.getAll();
 const newRecord: TrainingRecord = {
 ...record,
 id: `TR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString()
 };
 records.push(newRecord);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
 return newRecord;
 },

 update(id: string, data: Partial<TrainingRecord>): boolean {
 const records = this.getAll();
 const index = records.findIndex(r => r.id === id);
 if (index === -1) return false;
 
 records[index] = {
 ...records[index],
 ...data,
 id: records[index].id,
 createdAt: records[index].createdAt,
 updatedAt: new Date().toISOString()
 };
 localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
 return true;
 },

 delete(id: string): boolean {
 const records = this.getAll();
 const filtered = records.filter(r => r.id !== id);
 if (filtered.length === records.length) return false;
 localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
 return true;
 }
};

// ============================================================================
// COMPONENT
// ============================================================================

export function TrainingDevelopmentCard({
 employee, language, isRTL }: Props) {
 const { t } = useTranslation();
 const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
 const [showAddModal, setShowAddModal] = useState(false);
 const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);
 const [showPrintModal, setShowPrintModal] = useState(false);
 const [selectedRecord, setSelectedRecord] = useState<TrainingRecord | null>(null);

 useEffect(() => {
 loadTrainings();
 }, [employee]);

 const loadTrainings = () => {
 const records = trainingService.getByStaffId(employee.staffId);
 // Sort by start date descending
 records.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
 setTrainings(records);
 };

 const handleDelete = (id: string) => {
 if (!confirm(t.deleteConfirm)) return;
 trainingService.delete(id);
 loadTrainings();
 };

 const localT = {
 title: t.hrEmployeeCards.trainingDevelopment,
 subtitle: t.hrEmployeeCards.trainingProgramsAndCertifications,
 addTraining: t.hrEmployeeCards.addTraining,
 noTrainings: t.hrEmployeeCards.noTrainingRecordsYet,
 
 // Table headers
 trainingTitle: t.hrEmployeeCards.trainingTitle,
 type: t.hrEmployeeCards.type,
 provider: t.hrEmployeeCards.provider,
 dates: t.hrEmployeeCards.dates,
 duration: t.hrEmployeeCards.duration,
 status: t.hrEmployeeCards.status,
 cost: t.hrEmployeeCards.cost,
 certificate: t.hrEmployeeCards.certificate,
 actions: t.hrEmployeeCards.actions,
 
 // Status labels
 planned: t.hrEmployeeCards.planned,
 ongoing: t.hrEmployeeCards.ongoing2,
 completed: t.hrEmployeeCards.completed,
 cancelled: t.hrEmployeeCards.cancelled,
 
 // Certificate status
 issued: t.hrEmployeeCards.issued,
 notIssued: t.hrEmployeeCards.notIssued,
 
 // Actions
 edit: t.hrEmployeeCards.edit,
 delete: t.hrEmployeeCards.delete,
 deleteConfirm: t.hrEmployeeCards.areYouSureYouWantTo3,
 
 hours: t.hrEmployeeCards.hours
 };

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
 case 'Ongoing': return 'bg-blue-100 text-blue-700 border-blue-200';
 case 'Planned': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
 case 'Cancelled': return 'bg-gray-100 text-gray-700 border-gray-200';
 default: return 'bg-gray-100 text-gray-700 border-gray-200';
 }
 };

 const getStatusLabel = (status: string) => {
 switch (status) {
 case 'Completed': return t.completed;
 case 'Ongoing': return t.ongoing;
 case 'Planned': return t.planned;
 case 'Cancelled': return t.cancelled;
 default: return status;
 }
 };

 const formatDate = (dateString: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.hrEmployeeCards.en, {
 year: 'numeric',
 month: 'short',
 day: 'numeric'
 });
 };

 return (
 <div className="bg-white rounded-lg border border-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
 <div className={'text-start'}>
 <h3 className="text-lg font-semibold text-gray-900">{t.title}</h3>
 <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
 </div>
 <button 
 onClick={() => { setEditingRecord(null); setShowAddModal(true); }}
 className={`flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700`}
 >
 <Plus className="w-4 h-4" />
 <span>{t.addTraining}</span>
 </button>
 </div>

 {/* Content */}
 <div className="p-6">
 {trainings.length === 0 ? (
 <div className="text-center py-12">
 <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
 <p className="text-gray-500">{t.noTrainings}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.trainingTitle}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.type}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.provider}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">{t.dates}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">{t.duration}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">{t.status}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-end">{t.cost}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">{t.certificate}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">{t.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {trainings.map((training) => (
 <tr key={training.id} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm text-gray-900 font-medium">{training.trainingTitle}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{training.trainingType}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{training.provider}</td>
 <td className="px-4 py-3 text-sm text-gray-700 text-center">
 {formatDate(training.startDate)} - {formatDate(training.endDate)}
 </td>
 <td className="px-4 py-3 text-sm text-gray-700 text-center">{training.duration} {t.hours}</td>
 <td className="px-4 py-3 text-sm text-center">
 <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(training.status)}`}>
 {getStatusLabel(training.status)}
 </span>
 </td>
 <td className="px-4 py-3 text-sm text-gray-900 font-mono text-end">
 {training.cost.toLocaleString()} {training.currency}
 </td>
 <td className="px-4 py-3 text-sm text-center">
 <span className={`inline-block px-2 py-1 rounded text-xs ${training.certificateIssued ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
 {training.certificateIssued ? t.issued : t.notIssued}
 </span>
 </td>
 <td className="px-4 py-3 text-sm text-center">
 <div className="flex items-center justify-center gap-2">
 <button
 onClick={() => { setEditingRecord(training); setShowAddModal(true); }}
 className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded"
 title={t.edit}
 >
 <Edit2 className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleDelete(training.id)}
 className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
 title={t.delete}
 >
 <Trash2 className="w-4 h-4" />
 </button>
 <button
 onClick={() => { setSelectedRecord(training); setShowPrintModal(true); }}
 className="text-gray-600 hover:text-gray-700 p-1 hover:bg-gray-50 rounded"
 title="Print Certificate"
 >
 <Printer className="w-4 h-4" />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Add/Edit Modal */}
 {showAddModal && (
 <TrainingFormModal
 employee={employee}
 existingRecord={editingRecord || undefined}
 onClose={() => { setShowAddModal(false); setEditingRecord(null); }}
 onSave={() => { loadTrainings(); setShowAddModal(false); setEditingRecord(null); }}
 />
 )}

 {/* Print Certificate Modal */}
 {showPrintModal && selectedRecord && (
 <TrainingCertificatePrintModal
 record={selectedRecord}
 onClose={() => { setShowPrintModal(false); setSelectedRecord(null); }}
 />
 )}
 </div>
 );
}