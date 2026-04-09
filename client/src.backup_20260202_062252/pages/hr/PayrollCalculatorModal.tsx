/**
 * Payroll Calculator Modal - Form 2
 * Standalone salary calculator for HR/Finance
 */

import { X } from 'lucide-react';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';

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
  if (!isOpen) return null;

  const t = {
    calculatorTitle: language === 'en' ? 'Salary Calculator' : 'حاسبة الرواتب',
    calculatorDesc: language === 'en' 
      ? 'Calculate salary breakdown for one staff member'
      : 'احسب تفاصيل الراتب لموظف واحد',
    basicSalary: language === 'en' ? 'Basic Salary' : 'الراتب الأساسي',
    allowances: language === 'en' ? 'Allowances' : 'البدلات',
    housingAllowance: language === 'en' ? 'Housing Allowance' : 'بدل السكن',
    transportAllowance: language === 'en' ? 'Transport Allowance' : 'بدل المواصلات',
    representationAllowance: language === 'en' ? 'Representation Allowance' : 'بدل التمثيل',
    otherAllowances: language === 'en' ? 'Other Allowances' : 'بدلات أخرى',
    grossSalary: language === 'en' ? 'Gross Salary' : 'إجمالي الراتب',
    taxableIncomeBase: language === 'en' ? 'Taxable Income Base' : 'الوعاء الضريبي',
    taxCalculation: language === 'en' ? 'Tax Calculation' : 'حساب الضريبة',
    taxRate: language === 'en' ? 'Tax Rate (%)' : 'معدل الضريبة (%)',
    taxAmount: language === 'en' ? 'Tax Amount' : 'مب��غ الضريبة',
    deductionsCalc: language === 'en' ? 'Deductions' : 'اخصومات',
    socialSecRate: language === 'en' ? 'Social Security Rate (%)' : 'معدل الضمان الاجتماعي (%)',
    healthRate: language === 'en' ? 'Health Insurance Rate (%)' : 'معدل التأمين الصحي (%)',
    otherDeductions: language === 'en' ? 'Other Deductions' : 'خصومات أخرى',
    totalDeductions: language === 'en' ? 'Total Deductions' : 'إجمالي الخصومات',
    results: language === 'en' ? 'Results' : 'النتائج',
    netSalary: language === 'en' ? 'Net Salary' : 'صافي الراتب',
    close: language === 'en' ? 'Close' : 'إغلاق',
    editableNote: language === 'en'
      ? 'All fields are editable for multi-country flexibility'
      : 'جميع الحقول قابلة للتحرير لمرونة متعددة البلدان',
    yemenTip: language === 'en'
      ? 'Yemen: Set Taxable Base = Basic Salary'
      : 'اليمن: اضبط الوعاء الضريبي = الراتب الأساسي',
    otherTip: language === 'en'
      ? 'Others: Set Taxable Base = Gross Salary'
      : 'أخرى: اضبط الوعاء الضريبي = إجمالي الراتب'
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
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t.calculatorTitle}</h3>
            <p className="text-sm text-gray-600 mt-1">{t.calculatorDesc}</p>
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
            <p className="text-blue-900 font-medium mb-2">{t.editableNote}</p>
            <ul className="text-blue-800 space-y-1">
              <li>• {t.yemenTip}</li>
              <li>• {t.otherTip}</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Inputs */}
            <div className="space-y-6">
              {/* Basic Salary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.basicSalary}
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
                <h4 className="text-sm font-medium text-gray-900 mb-3">{t.allowances}</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t.housingAllowance}</label>
                    <input
                      type="number"
                      value={calcHousing}
                      onChange={(e) => setCalcHousing(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t.transportAllowance}</label>
                    <input
                      type="number"
                      value={calcTransport}
                      onChange={(e) => setCalcTransport(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t.representationAllowance}</label>
                    <input
                      type="number"
                      value={calcRepresentation}
                      onChange={(e) => setCalcRepresentation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t.otherAllowances}</label>
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
                <h4 className="text-sm font-medium text-gray-900 mb-3">{t.taxCalculation}</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t.taxableIncomeBase}</label>
                    <input
                      type="number"
                      value={calcTaxableBase}
                      onChange={(e) => setCalcTaxableBase(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t.taxRate}</label>
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
                <h4 className="text-sm font-medium text-gray-900 mb-3">{t.deductionsCalc}</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t.socialSecRate}</label>
                    <input
                      type="number"
                      value={calcSocialSecRate}
                      onChange={(e) => setCalcSocialSecRate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="7"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t.healthRate}</label>
                    <input
                      type="number"
                      value={calcHealthRate}
                      onChange={(e) => setCalcHealthRate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t.otherDeductions}</label>
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
              <h4 className="text-sm font-medium text-gray-900 mb-4">{t.results}</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-sm text-gray-700">{t.grossSalary}</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(calcGross())}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">{t.taxCalculation}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{t.taxAmount}</span>
                    <span className="text-sm font-medium text-red-600">
                      -{formatCurrency(calcTax())}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">{t.deductionsCalc}</div>
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
                      <span className="text-gray-700">{t.otherDeductions}</span>
                      <span className="text-red-600">-{formatCurrency(parseFloat(calcOtherDed) || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                  <span className="text-sm text-gray-700">{t.totalDeductions}</span>
                  <span className="text-base font-semibold text-red-600">
                    -{formatCurrency(calcTotalDed())}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t-2 border-gray-900 bg-blue-50 -mx-4 px-4 py-3 rounded-b">
                  <span className="text-base font-semibold text-gray-900">{t.netSalary}</span>
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
            {t.close}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}