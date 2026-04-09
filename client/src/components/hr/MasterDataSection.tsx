/**
 * ============================================================================
 * MASTER DATA SECTION - ALL HR REFERENCE DATA IN ONE TAB
 * ============================================================================
 * 
 * Consolidates:
 * - Departments
 * - Positions
 * - Contract Types
 * - Leave Types
 * - Exit Reasons
 * 
 * ============================================================================
 */

import { Plus, Users, Briefcase, FileText, Calendar, LogOut, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Department, Position, ContractType, LeaveType, ExitReason } from '@/services/hrSettingsService';
import { useTranslation } from '@/i18n/useTranslation';

interface MasterDataSectionProps {
 departments: Department[];
 positions: Position[];
 contractTypes: ContractType[];
 leaveTypes: LeaveType[];
 exitReasons: ExitReason[];
 onAddDepartment: () => void;
 onAddPosition: () => void;
 onAddContractType: () => void;
 onAddLeaveType: () => void;
 onAddExitReason: () => void;
 onDeleteDepartment: (id: string) => void;
 onDeletePosition: (id: string) => void;
}

export function MasterDataSection({
 departments,
 positions,
 contractTypes,
 leaveTypes,
 exitReasons,
 onAddDepartment,
 onAddPosition,
 onAddContractType,
 onAddLeaveType,
 onAddExitReason,
 onDeleteDepartment,
 onDeletePosition,
}: MasterDataSectionProps) {
 const { t } = useTranslation();
 const { language } = useLanguage();
 const labels = {
 masterData: t.hr.masterData,
 subtitle: language === 'en' 
 ? 'Manage core HR reference data used across all modules'
 : 'إدارة بيانات المرجع الأساسية للموارد البشرية المستخدمة في جميع الوحدات',
 departments: t.hr.departments,
 positions: t.hr.positions,
 contractTypes: t.hr.contractTypes,
 leaveTypes: t.hr.leaveTypes,
 exitReasons: t.hr.exitReasons,
 name: t.hr.name,
 active: t.hr.active,
 inactive: t.hr.inactive,
 createdDate: t.hr.createdDate,
 actions: t.hr.actions,
 add: t.hr.add,
 deductibleFromAnnual: t.hr.deductibleFromAnnualLeave,
 };

 return (
 <div className="space-y-8">
 {/* Header */}
 <div>
 <h3 className="text-lg font-semibold text-gray-900 mb-2">{labels.masterData}</h3>
 <p className="text-sm text-gray-600">{labels.subtitle}</p>
 </div>

 {/* Departments Section */}
 <div className="border border-gray-200 rounded-lg overflow-hidden">
 <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Users className="w-5 h-5 text-gray-600" />
 <h4 className="font-semibold text-gray-900">{labels.departments}</h4>
 <span className="text-sm text-gray-500">({departments.length})</span>
 </div>
 <button
 onClick={onAddDepartment}
 className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
 >
 <Plus className="w-4 h-4" />
 {labels.add}
 </button>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{labels.name}</th>
 <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{labels.active}</th>
 <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{labels.createdDate}</th>
 <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{labels.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200 bg-white">
 {departments.map(dept => (
 <tr key={dept.departmentId} className="hover:bg-gray-50">
 <td className="px-6 py-4 text-sm font-medium text-gray-900">{dept.departmentName}</td>
 <td className="px-6 py-4 text-sm">
 <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${ dept.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700' }`}>
 {dept.active ? labels.active : labels.inactive}
 </span>
 </td>
 <td className="px-6 py-4 text-sm text-gray-500">
 {new Date(dept.createdDate).toLocaleDateString()}
 </td>
 <td className="px-6 py-4 text-sm">
 <button
 onClick={() => onDeleteDepartment(dept.departmentId)}
 className="text-red-600 hover:text-red-800"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Positions Section */}
 <div className="border border-gray-200 rounded-lg overflow-hidden">
 <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Briefcase className="w-5 h-5 text-gray-600" />
 <h4 className="font-semibold text-gray-900">{labels.positions}</h4>
 <span className="text-sm text-gray-500">({positions.length})</span>
 </div>
 <button
 onClick={onAddPosition}
 className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
 >
 <Plus className="w-4 h-4" />
 {labels.add}
 </button>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{labels.name}</th>
 <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{labels.active}</th>
 <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{labels.createdDate}</th>
 <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{labels.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200 bg-white">
 {positions.map(pos => (
 <tr key={pos.positionId} className="hover:bg-gray-50">
 <td className="px-6 py-4 text-sm font-medium text-gray-900">{pos.positionName}</td>
 <td className="px-6 py-4 text-sm">
 <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${ pos.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700' }`}>
 {pos.active ? labels.active : labels.inactive}
 </span>
 </td>
 <td className="px-6 py-4 text-sm text-gray-500">
 {new Date(pos.createdDate).toLocaleDateString()}
 </td>
 <td className="px-6 py-4 text-sm">
 <button
 onClick={() => onDeletePosition(pos.positionId)}
 className="text-red-600 hover:text-red-800"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Contract Types Section */}
 <div className="border border-gray-200 rounded-lg overflow-hidden">
 <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <FileText className="w-5 h-5 text-gray-600" />
 <h4 className="font-semibold text-gray-900">{labels.contractTypes}</h4>
 <span className="text-sm text-gray-500">({contractTypes.length})</span>
 </div>
 <button
 onClick={onAddContractType}
 className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
 >
 <Plus className="w-4 h-4" />
 {labels.add}
 </button>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
 {contractTypes.map(ct => (
 <div key={ct.contractTypeId} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <div className="flex items-center justify-between">
 <span className="font-medium text-gray-900">{ct.name}</span>
 <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${ ct.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700' }`}>
 {ct.active ? labels.active : labels.inactive}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Leave Types Section */}
 <div className="border border-gray-200 rounded-lg overflow-hidden">
 <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Calendar className="w-5 h-5 text-gray-600" />
 <h4 className="font-semibold text-gray-900">{labels.leaveTypes}</h4>
 <span className="text-sm text-gray-500">({leaveTypes.length})</span>
 </div>
 <button
 onClick={onAddLeaveType}
 className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
 >
 <Plus className="w-4 h-4" />
 {labels.add}
 </button>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
 {leaveTypes.map(lt => (
 <div key={lt.leaveTypeId} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <div className="flex items-center justify-between mb-2">
 <span className="font-medium text-gray-900">{lt.name}</span>
 <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${ lt.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700' }`}>
 {lt.active ? labels.active : labels.inactive}
 </span>
 </div>
 <p className="text-xs text-gray-500">
 {labels.deductibleFromAnnual}: {lt.deductibleFromAnnual ? '✓' : '✗'}
 </p>
 </div>
 ))}
 </div>
 </div>

 {/* Exit Reasons Section */}
 <div className="border border-gray-200 rounded-lg overflow-hidden">
 <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <LogOut className="w-5 h-5 text-gray-600" />
 <h4 className="font-semibold text-gray-900">{labels.exitReasons}</h4>
 <span className="text-sm text-gray-500">({exitReasons.length})</span>
 </div>
 <button
 onClick={onAddExitReason}
 className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
 >
 <Plus className="w-4 h-4" />
 {labels.add}
 </button>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
 {exitReasons.map(er => (
 <div key={er.reasonId} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <div className="flex items-center justify-between">
 <span className="font-medium text-gray-900">{er.reasonName}</span>
 <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${ er.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700' }`}>
 {er.active ? labels.active : labels.inactive}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}
