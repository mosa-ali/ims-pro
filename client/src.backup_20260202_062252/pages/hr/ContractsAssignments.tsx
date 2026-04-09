import { useLanguage } from '@/contexts/LanguageContext';

export function ContractsAssignments() {
  const { language } = useLanguage();
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {language === 'en' ? 'Contracts & Assignments' : 'العقود والتكليفات'}
      </h2>
      <p className="text-gray-600">
        {language === 'en' ? 'Coming soon...' : 'قريباً...'}
      </p>
    </div>
  );
}
