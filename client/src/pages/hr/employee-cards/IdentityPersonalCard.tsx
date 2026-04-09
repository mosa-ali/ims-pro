/**
 * ============================================================================
 * 1. IDENTITY & PERSONAL PROFILE (Base Card)
 * ============================================================================
 */

import { useState } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Building2, Briefcase, Edit } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { EditIdentityProfileModal } from '../modals/EditIdentityProfileModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 employee: StaffMember;
 language: string;
 isRTL: boolean;
 onEmployeeUpdate?: () => void;
}

export function IdentityPersonalCard({
 employee, language, isRTL, onEmployeeUpdate }: Props) {
 const { t } = useTranslation();
 const [showEditModal, setShowEditModal] = useState(false);

 const handleEmployeeUpdated = (updated: StaffMember) => {
 if (onEmployeeUpdate) {
 onEmployeeUpdate();
 }
 setShowEditModal(false);
 };
 const localT = {
 title: t.hrEmployeeCards.identityPersonalProfile,
 subtitle: t.hrEmployeeCards.coreEmployeeInformationAndContactDetails,
 edit: t.hrEmployeeCards.edit,
 
 staffId: t.hrEmployeeCards.staffId,
 fullName: t.hrEmployeeCards.fullName,
 gender: t.hrEmployeeCards.gender,
 nationality: t.hrEmployeeCards.nationality,
 fullAddress: t.hrEmployeeCards.fullAddress,
 email: t.hrEmployeeCards.email,
 phone: t.hrEmployeeCards.phone,
 hireDate: t.hrEmployeeCards.hireDate,
 department: t.hrEmployeeCards.department,
 position: t.hrEmployeeCards.position,
 supervisor: t.hrEmployeeCards.supervisor,
 
 uploads: t.hrEmployeeCards.uploadsDocuments,
 identification: t.hrEmployeeCards.identificationCopy,
 cv: t.hrEmployeeCards.cvResume,
 
 statusBadge: t.hrEmployeeCards.status,
 active: t.hrEmployeeCards.active
 };

 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.hrEmployeeCards.en, {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 });
 };

 const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
 <div className={`flex items-start gap-3`}>
 <div className="p-2 bg-blue-50 rounded">
 <Icon className="w-4 h-4 text-blue-600" />
 </div>
 <div className={`flex-1 text-start`}>
 <p className="text-xs text-gray-500 mb-1">{label}</p>
 <p className="text-sm text-gray-900 font-medium">{value}</p>
 </div>
 </div>
 );

 return (
 <div className="bg-white rounded-lg border border-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
 <div className={'text-start'}>
 <h3 className="text-lg font-semibold text-gray-900">{t.title}</h3>
 <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
 </div>
 <button
 onClick={() => setShowEditModal(true)}
 className={`flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700`}
 >
 <Edit className="w-4 h-4" />
 <span>{t.edit}</span>
 </button>
 </div>

 {/* Content */}
 <div className="p-6 space-y-6">
 {/* Basic Information Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 <InfoRow icon={User} label={t.staffId} value={employee.staffId} />
 <InfoRow icon={User} label={t.fullName} value={employee.fullName} />
 <InfoRow icon={User} label={t.gender} value={employee.gender} />
 <InfoRow icon={MapPin} label={t.nationality} value={employee.nationality} />
 <InfoRow icon={Mail} label={t.email} value={employee.email || '-'} />
 <InfoRow icon={Phone} label={t.phone} value={employee.phone || '-'} />
 <InfoRow icon={Calendar} label={t.hireDate} value={formatDate(employee.hireDate)} />
 <InfoRow icon={Building2} label={t.department} value={employee.department} />
 <InfoRow icon={Briefcase} label={t.position} value={employee.position} />
 </div>

 {/* Full Address */}
 <div className={`p-4 bg-gray-50 rounded-lg text-start`}>
 <p className="text-xs text-gray-500 mb-1">{t.fullAddress}</p>
 <p className="text-sm text-gray-900">
 {employee.address || (t.hrEmployeeCards.noAddressProvided)}
 </p>
 </div>

 {/* Supervisor */}
 <div className={`p-4 bg-blue-50 border border-blue-200 rounded-lg text-start`}>
 <p className="text-xs text-blue-700 mb-1">{t.supervisor}</p>
 <p className="text-sm text-blue-900 font-medium">
 {employee.supervisor || (t.hrEmployeeCards.noSupervisorAssigned)}
 </p>
 {employee.supervisorEmail && (
 <p className="text-xs text-blue-700 mt-1">{employee.supervisorEmail}</p>
 )}
 </div>

 {/* Uploads & Documents */}
 <div>
 <h4 className={`text-sm font-semibold text-gray-900 mb-3 text-start`}>
 {t.uploads}
 </h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {/* Identification */}
 <div className={`p-3 border border-gray-200 rounded-lg text-start`}>
 <p className="text-xs text-gray-500 mb-1">{t.identification}</p>
 <p className="text-sm text-gray-400">
 {t.hrEmployeeCards.noFileUploaded}
 </p>
 </div>
 
 {/* CV */}
 <div className={`p-3 border border-gray-200 rounded-lg text-start`}>
 <p className="text-xs text-gray-500 mb-1">{t.cv}</p>
 <p className="text-sm text-gray-400">
 {t.hrEmployeeCards.noFileUploaded}
 </p>
 </div>
 </div>
 </div>

 {/* Status Badge */}
 <div className={`flex items-center gap-2`}>
 <span className="text-sm text-gray-600">{t.statusBadge}:</span>
 <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-sm font-medium">
 {employee.status === 'active' ? t.active : employee.status}
 </span>
 </div>
 </div>

 {/* Edit Modal */}
 {showEditModal && (
 <EditIdentityProfileModal
 employee={employee}
 onClose={() => setShowEditModal(false)}
 onSave={handleEmployeeUpdated}
 />
 )}
 </div>
 );
}