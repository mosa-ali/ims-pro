import { AlertTriangle, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recordName: string;
  recordType: string;
  isPermanent?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  recordName,
  recordType,
  isPermanent = false
}: DeleteConfirmationModalProps) {
  const { language, isRTL } = useLanguage();

  if (!isOpen) return null;

  const t = {
    title: language === 'en' 
      ? (isPermanent ? 'Permanently Delete Record?' : 'Delete Record?')
      : (isPermanent ? 'حذف السجل نهائياً؟' : 'حذف السجل؟'),
    message: language === 'en'
      ? (isPermanent 
          ? `Are you sure you want to permanently delete "${recordName}"? This action CANNOT be undone.`
          : `Are you sure you want to delete "${recordName}"?`)
      : (isPermanent
          ? `هل أنت متأكد من حذف "${recordName}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`
          : `هل أنت متأكد من حذف "${recordName}"؟`),
    archiveNote: language === 'en'
      ? 'This action will archive the record. You can restore it later from Admin → Deleted Records.'
      : 'سيؤدي هذا الإجراء إلى أرشفة السجل. يمكنك استعادته لاحقاً من المسؤول ← السجلات المحذوفة.',
    warningNote: language === 'en'
      ? '⚠️ WARNING: This will permanently delete all data. This action cannot be undone!'
      : '⚠️ تحذير: سيؤدي هذا إلى حذف جميع البيانات نهائياً. لا يمكن التراجع عن هذا الإجراء!',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    confirm: language === 'en' 
      ? (isPermanent ? 'Permanently Delete' : 'Delete')
      : (isPermanent ? 'حذف نهائي' : 'حذف'),
    recordType: language === 'en' ? `Type: ${recordType}` : `النوع: ${recordType}`
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`p-2 rounded-full ${isPermanent ? 'bg-red-100' : 'bg-yellow-100'}`}>
              <AlertTriangle className={`w-6 h-6 ${isPermanent ? 'text-red-600' : 'text-yellow-600'}`} />
            </div>
            <h2 className={`text-xl font-bold ${isPermanent ? 'text-red-600' : 'text-gray-900'} ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className={`text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.message}
          </p>
          
          <div className={`p-3 bg-gray-50 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="text-sm text-gray-600">{t.recordType}</p>
          </div>

          {!isPermanent && (
            <div className={`p-3 bg-blue-50 border border-blue-200 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-sm text-blue-800">{t.archiveNote}</p>
            </div>
          )}

          {isPermanent && (
            <div className={`p-3 bg-red-50 border-2 border-red-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-sm font-semibold text-red-800">{t.warningNote}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex gap-3 p-6 bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors text-gray-700 font-medium"
          >
            {t.cancel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2 rounded-md transition-colors font-medium text-white ${
              isPermanent 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-yellow-600 hover:bg-yellow-700'
            }`}
          >
            {t.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
