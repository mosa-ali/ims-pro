/**
 * ============================================================================
 * FORM STYLE PANEL
 * ============================================================================
 * 
 * Panel for selecting form presentation style:
 * - Default (single page)
 * - Grid theme
 * - Grid theme with ALL CAPS headings
 * - Multiple pages (one question per page)
 * - Grid theme + Multiple pages
 * - Grid theme + Multiple pages + ALL CAPS
 * 
 * Matches Kobo/ODK professional standards
 * ============================================================================
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { X, Info } from 'lucide-react';
import { useState } from 'react';

type FormStyle = 'default' | 'grid' | 'grid_caps' | 'multiple_pages' | 'grid_multiple' | 'grid_multiple_caps';

interface FormStylePanelProps {
  currentStyle: FormStyle;
  onUpdate: (style: FormStyle) => void;
  onClose: () => void;
}

export function FormStylePanel({ currentStyle, onUpdate, onClose }: FormStylePanelProps) {
  const { language, isRTL } = useLanguage();
  const [selectedStyle, setSelectedStyle] = useState<FormStyle>(currentStyle);

  const t = {
    formStyle: language === 'en' ? 'Form Style' : 'نمط النموذج',
    description: language === 'en' 
      ? 'Select the form style that you would like to use. This will only affect web forms.' 
      : 'اختر نمط النموذج الذي تريد استخدامه. سيؤثر هذا على النماذج الإلكترونية فقط.',
    save: language === 'en' ? 'Save' : 'حفظ',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    defaultSinglePage: language === 'en' ? 'Default - single page' : 'افتراضي - صفحة واحدة',
    gridTheme: language === 'en' ? 'Grid theme' : 'تصميم الشبكة',
    gridThemeCaps: language === 'en' ? 'Grid theme with headings in ALL CAPS' : 'تصميم الشبكة مع عناوين بأحرف كبيرة',
    multiplePages: language === 'en' ? 'Multiple pages' : 'صفحات متعددة',
    gridMultiple: language === 'en' ? 'Grid theme + Multiple pages' : 'تصميم الشبكة + صفحات متعددة',
    gridMultipleCaps: language === 'en' 
      ? 'Grid theme + Multiple pages + headings in ALL CAPS' 
      : 'تصميم الشبكة + صفحات متعددة + عناوين بأحرف كبيرة',
  };

  const formStyles: Array<{ value: FormStyle; label: string }> = [
    { value: 'default', label: t.defaultSinglePage },
    { value: 'grid', label: t.gridTheme },
    { value: 'grid_caps', label: t.gridThemeCaps },
    { value: 'multiple_pages', label: t.multiplePages },
    { value: 'grid_multiple', label: t.gridMultiple },
    { value: 'grid_multiple_caps', label: t.gridMultipleCaps },
  ];

  const handleSave = () => {
    onUpdate(selectedStyle);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-200 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <h2 className={`text-lg font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.formStyle}
            </h2>
            <div className="p-1 rounded-full bg-blue-100">
              <Info className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <div className="px-6 pt-4">
          <p className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.description}
          </p>
        </div>

        {/* Form Style Options */}
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          <div className="space-y-2">
            {formStyles.map((style) => (
              <button
                key={style.value}
                onClick={() => setSelectedStyle(style.value)}
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all text-left ${
                  isRTL ? 'text-right' : 'text-left'
                } ${
                  selectedStyle === style.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {/* Radio Circle */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedStyle === style.value
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedStyle === style.value && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  {/* Label */}
                  <span className={`text-sm font-medium ${
                    selectedStyle === style.value ? 'text-blue-900' : 'text-gray-700'
                  }`}>
                    {style.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`px-6 py-4 border-t border-gray-100 flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <span className="font-semibold text-white text-sm">{t.save}</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-700 text-sm">{t.cancel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
