/**
 * Payroll Calculator Modal - Form 2
 * Standalone salary calculator for HR/Finance
 */

import { X } from 'lucide-react';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 isOpen: boolean;
 onClose: () => void;
 language: 'en' | 'ar';
 isRTL: boolean;
 calcBasic: string;
 calcHousing: string;
 calcTransport: string;
 calcRepresentation: string;
 calcOther: string;
 calcTaxableBase: string;
 calcTaxRate: string;
 calcSocialSecRate: string;
 calcHealthRate: string;
 calcOtherDed: string;
 setCalcBasic: (v: string) => void;
 setCalcHousing: (v: string) => void;
 setCalcTransport: (v: string) => void;
 setCalcRepresentation: (v: string) => void;
 setCalcOther: (v: string) => void;
 setCalcTaxableBase: (v: string) => void;
 setCalcTaxRate: (v: string) => void;
 setCalcSocialSecRate: (v: string) => void;
 setCalcHealthRate: (v: string) => void;
 setCalcOtherDed: (v: string) => void;
 formatCurrency: (amount: number, currency?: string) => string;
}

export function PayrollCalculatorModal({
 isOpen,
 onClose,
 language,
 isRTL,
 calcBasic,
 calcHousing,
 calcTransport,
 calcRepresentation,
 calcOther,
 calcTaxableBase,
 calcTaxRate,
 calcSocialSecRate,
 calcHealthRate,
 calcOtherDed,
 setCalcBasic,
 setCalcHousing,
 setCalcTransport,
 setCalcRepresentation,
 setCalcOther,
 setCalcTaxableBase,
 setCalcTaxRate,
 setCalcSocialSecRate,
 setCalcHealthRate,
 setCalcOtherDed,
 formatCurrency
}: Props) {
 const { t } = useTranslation();
 if (!isOpen) return null;

 const labels = {
 calculatorTitle: t.hrPayroll.salaryCalculator,
 calculatorDesc: 'Calculate salary breakdown for one staff member',
 basicSalary: t.hrPayroll.basicSalary,
 allowances: t.hrPayroll.allowances,
 housingAllowance: t.hrPayroll.housingAllowance,
 transportAllowance: t.hrPayroll.transportAllowance,
 representationAllowance: t.hrPayroll.representationAllowance,
 otherAllowances: t.hrPayroll.otherAllowances,
 grossSalary: t.hrPayroll.grossSalary,
 taxableIncomeBase: t.hrPayroll.taxableIncomeBase,
 taxCalculation: t.hrPayroll.taxCalculation,
 taxRate: t.hrPayroll.taxRate,
 taxAmount: t.hrPayroll.taxAmount,
 deductionsCalc: t.hrPayroll.deductions2,
 socialSecRate: t.hrPayroll.socialSecurityRate,
 healthRate: t.hrPayroll.healthInsuranceRate,
 otherDeductions: t.hrPayroll.otherDeductions,
 totalDeductions: t.hrPayroll.totalDeductions,
 results: t.hrPayroll.results,
 netSalary: t.hrPayroll.netSalary,
 close: t.hrPayroll.close,
 editableNote: 'All fields are editable for multi-country flexibility',
 yemenTip: 'Yemen: Set Taxable Base = Basic Salary',
 otherTip: 'Others: Set Taxable Base = Gross Salary'
 };

 // Calculations
 const calcGross = () => {
 const basic = parseFloat(calcBasic) || 0;
 const housing = parseFloat(calcHousing) || 0;
 const transport = parseFloat(calcTransport) || 0;
 const representation = parseFloat(calcRepresentation) || 0;
 const other = parseFloat(calcOther) || 0;
 return basic + housing + transport + representation + other;
 };

 const calcTax = () => {
 const base = parseFloat(calcTaxableBase) || 0;
 const rate = parseFloat(calcTaxRate) || 0;
 return (base * rate) / 100;
 };

 const calcSocialSec = () => {
 const gross = calcGross();
 const rate = parseFloat(calcSocialSecRate) || 0;
 return (gross * rate) / 100;
 };

 const calcHealth = () => {
 const gross = calcGross();
 const rate = parseFloat(calcHealthRate) || 0;
 return (gross * rate) / 100;
 };

 const calcTotalDed = () => {
 const tax = calcTax();
 const social = calcSocialSec();
 const health = calcHealth();
 const other = parseFloat(calcOtherDed) || 0;
 return tax + social + health + other;
 };

 const calcNet = () => {
 const gross = calcGross();
 const deductions = calcTotalDed();
 return gross - deductions;
 };

 return (
 <ModalOverlay onClose={onClose}>
 <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 max-h-[90vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
 <div>
 <h3 className="text-lg font-semibold text-gray-900">{labels.calculatorTitle}</h3>
 <p className="text-sm text-gray-600 mt-1">{labels.calculatorDesc}</p>
 </div>
 <button
 onClick={onClose}
 className="text-gray-400 hover:text-gray-600"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Body */}
 <div className="px-6 py-4 space-y-6 overflow-y-auto flex-grow">
 {/* Help Text */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
 <p className="text-blue-900 font-medium mb-2">{labels.editableNote}</p>
 <ul className="text-blue-800 space-y-1">
 <li>• {labels.yemenTip}</li>
 <li>• {labels.otherTip}</li>
 </ul>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Left Column: Inputs */}
 <div className="space-y-6">
 {/* Basic Salary */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {labels.basicSalary}
 </label>
 <input
 type="number"
 value={calcBasic}
 onChange={(e) => setCalcBasic(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 placeholder="0.00"
 />
 </div>

 {/* Allowances */}
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-3">{labels.allowances}</h4>
 <div className="space-y-3">
 <div>
 <label className="block text-sm text-gray-700 mb-1">{labels.housingAllowance}</label>
 <input
 type="number"
 value={calcHousing}
 onChange={(e) => setCalcHousing(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 placeholder="0.00"
 />
 </div>
 <div>
 <label className="block text-sm text-gray-700 mb-1">{labels.transportAllowance}</label>
 <input
 type="number"
 value={calcTransport}
 onChange={(e) => setCalcTransport(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 placeholder="0.00"
 />
 </div>
 <div>
 <label className="block text-sm text-gray-700 mb-1">{labels.representationAllowance}</label>
 <input
 type="number"
 value={calcRepresentation}
 onChange={(e) => setCalcRepresentation(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 placeholder="0.00"
 />
 </div>
 <div>
 <label className="block text-sm text-gray-700 mb-1">{labels.otherAllowances}</label>
 <input
 type="number"
 value={calcOther}
 onChange={(e) => setCalcOther(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 placeholder="0.00"
 />
 </div>
 </div>
 </div>

 {/* Tax Calculation */}
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-3">{labels.taxCalculation}</h4>
 <div className="space-y-3">
 <div>
 <label className="block text-sm text-gray-700 mb-1">{labels.taxableIncomeBase}</label>
 <input
 type="number"
 value={calcTaxableBase}
 onChange={(e) => setCalcTaxableBase(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 placeholder="0.00"
 />
 </div>
 <div>
 <label className="block text-sm text-gray-700 mb-1">{labels.taxRate}</label>
 <input
 type="number"
 value={calcTaxRate}
 onChange={(e) => setCalcTaxRate(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 placeholder="15"
 />
 </div>
 </div>
 </div>

 {/* Deductions */}
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-3">{labels.deductionsCalc}</h4>
 <div className="space-y-3">
 <div>
 <label className="block text-sm text-gray-700 mb-1">{labels.socialSecRate}</label>
 <input
 type="number"
 value={calcSocialSecRate}
 onChange={(e) => setCalcSocialSecRate(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 placeholder="7"
 />
 </div>
 <div>
 <label className="block text-sm text-gray-700 mb-1">{labels.healthRate}</label>
 <input
 type="number"
 value={calcHealthRate}
 onChange={(e) => setCalcHealthRate(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 placeholder="5"
 />
 </div>
 <div>
 <label className="block text-sm text-gray-700 mb-1">{labels.otherDeductions}</label>
 <input
 type="number"
 value={calcOtherDed}
 onChange={(e) => setCalcOtherDed(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 placeholder="0.00"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Right Column: Results */}
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-4">{labels.results}</h4>
 <div className="bg-gray-50 rounded-lg p-4 space-y-4">
 <div className="flex justify-between items-center pb-3 border-b border-gray-200">
 <span className="text-sm text-gray-700">{labels.grossSalary}</span>
 <span className="text-lg font-semibold text-gray-900">
 {formatCurrency(calcGross())}
 </span>
 </div>

 <div>
 <div className="text-xs font-medium text-gray-500 mb-2">{labels.taxCalculation}</div>
 <div className="flex justify-between items-center">
 <span className="text-sm text-gray-700">{labels.taxAmount}</span>
 <span className="text-sm font-medium text-red-600">
 -{formatCurrency(calcTax())}
 </span>
 </div>
 </div>

 <div>
 <div className="text-xs font-medium text-gray-500 mb-2">{labels.deductionsCalc}</div>
 <div className="space-y-1">
 <div className="flex justify-between items-center text-sm">
 <span className="text-gray-700">Social Security ({calcSocialSecRate}%)</span>
 <span className="text-red-600">-{formatCurrency(calcSocialSec())}</span>
 </div>
 <div className="flex justify-between items-center text-sm">
 <span className="text-gray-700">Health ({calcHealthRate}%)</span>
 <span className="text-red-600">-{formatCurrency(calcHealth())}</span>
 </div>
 <div className="flex justify-between items-center text-sm">
 <span className="text-gray-700">{labels.otherDeductions}</span>
 <span className="text-red-600">-{formatCurrency(parseFloat(calcOtherDed) || 0)}</span>
 </div>
 </div>
 </div>

 <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
 <span className="text-sm text-gray-700">{labels.totalDeductions}</span>
 <span className="text-base font-semibold text-red-600">
 -{formatCurrency(calcTotalDed())}
 </span>
 </div>

 <div className="flex justify-between items-center pt-3 border-t-2 border-gray-900 bg-blue-50 -mx-4 px-4 py-3 rounded-b">
 <span className="text-base font-semibold text-gray-900">{labels.netSalary}</span>
 <span className="text-xl font-bold text-blue-600">
 {formatCurrency(calcNet())}
 </span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Footer */}
 <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
 <button
 onClick={onClose}
 className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700"
 >
 {labels.close}
 </button>
 </div>
 </div>
 </ModalOverlay>
 );
}