/**
 * ============================================================================
 * CONFIRM ACTION MODAL
 * ============================================================================
 * Reusable confirmation modal for archive, restore, delete actions
 */

import { X, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';

interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  actionType: 'archive' | 'restore' | 'delete' | 'exit';
  employeeName?: string;
}

export function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  actionType,
  employeeName
}: ConfirmActionModalProps) {
  const { language, isRTL } = useLanguage();

  const t = {
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    confirm: language === 'en' ? 'Confirm' : 'تأكيد',
    archive: language === 'en' ? 'Archive' : 'أرشفة',
    restore: language === 'en' ? 'Restore' : 'استعادة',
    delete: language === 'en' ? 'Delete' : 'حذف',
    exit: language === 'en' ? 'Exit Employee' : 'خروج الموظف'
  };

  const getButtonColor = () => {
    switch (actionType) {
      case 'delete':
        return 'bg-red-600 hover:bg-red-700';
      case 'archive':
        return 'bg-gray-600 hover:bg-gray-700';
      case 'exit':
        return 'bg-orange-600 hover:bg-orange-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  const getActionText = () => {
    switch (actionType) {
      case 'archive':
        return t.archive;
      case 'restore':
        return t.restore;
      case 'delete':
        return t.delete;
      case 'exit':
        return t.exit;
      default:
        return t.confirm;
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-2 bg-orange-100 rounded-full">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className={`text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
            {message}
          </p>
          {employeeName && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className={`text-sm font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                {employeeName}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={`flex items-center gap-3 p-6 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-white rounded-lg font-medium ${getButtonColor()}`}
          >
            {getActionText()}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}