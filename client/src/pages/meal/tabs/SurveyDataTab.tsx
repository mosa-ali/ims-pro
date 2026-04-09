/**
 * ============================================================================
 * SURVEY DATA TAB (PARENT)
 * ============================================================================
 * 
 * Container for data sub-tabs: Table, Reports, Gallery, Files, Downloads, Map
 * 
 * ============================================================================
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { useSearch } from 'wouter';
import { Table, BarChart3, Image, FileText, Download, Map } from 'lucide-react';

// Import sub-tab components
import { DataTableSubTab } from './data/DataTableSubTab';
import { DataReportsSubTab } from './data/DataReportsSubTab';
import { DataGallerySubTab } from './data/DataGallerySubTab';
import { DataFilesSubTab } from './data/DataFilesSubTab';
import { DataDownloadsSubTab } from './data/DataDownloadsSubTab';
import { DataMapSubTab } from './data/DataMapSubTab';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 survey: any;
}

type DataSubTab = 'table' | 'reports' | 'gallery' | 'files' | 'downloads' | 'map';

export function SurveyDataTab({
 survey }: Props) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const searchString = useSearch();
 const searchParams = new URLSearchParams(searchString);
 const [activeSubTab, setActiveSubTab] = useState<DataSubTab>('table');

 // ✅ Support URL parameter navigation
 useEffect(() => {
 const subtab = searchParams.get('subtab');
 if (subtab && ['table', 'reports', 'gallery', 'files', 'downloads', 'map'].includes(subtab)) {
 setActiveSubTab(subtab as DataSubTab);
 }
 }, [searchParams]);

 const localT = {
 table: t.mealTabs.table,
 reports: t.mealTabs.reports,
 gallery: t.mealTabs.gallery,
 files: t.mealTabs.files,
 downloads: t.mealTabs.downloads,
 map: t.mealTabs.map,
 };

 const subTabs: Array<{ key: DataSubTab; label: string; icon: any }> = [
 { key: 'table', label: t.table, icon: Table },
 { key: 'reports', label: t.reports, icon: BarChart3 },
 { key: 'gallery', label: t.gallery, icon: Image },
 { key: 'files', label: t.files, icon: FileText },
 { key: 'downloads', label: t.downloads, icon: Download },
 { key: 'map', label: t.map, icon: Map },
 ];

 // ✅ RTL: Reverse sub-tab order for Arabic
 const displaySubTabs = isRTL ? [...subTabs].reverse() : subTabs;

 return (
 <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Sub-Tabs Navigation */}
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 <div className={`flex border-b border-gray-200`}>
 {displaySubTabs.map((tab) => {
 const Icon = tab.icon;
 return (
 <button
 key={tab.key}
 onClick={() => setActiveSubTab(tab.key)}
 className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${ activeSubTab === tab.key ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50' }`}
 >
 <Icon className="w-4 h-4" />
 <span>{tab.label}</span>
 </button>
 );
 })}
 </div>

 {/* Sub-Tab Content */}
 <div className="p-6">
 {activeSubTab === 'table' && <DataTableSubTab survey={survey} />}
 {activeSubTab === 'reports' && <DataReportsSubTab survey={survey} />}
 {activeSubTab === 'gallery' && <DataGallerySubTab survey={survey} />}
 {activeSubTab === 'files' && <DataFilesSubTab survey={survey} />}
 {activeSubTab === 'downloads' && <DataDownloadsSubTab survey={survey} />}
 {activeSubTab === 'map' && <DataMapSubTab survey={survey} />}
 </div>
 </div>
 </div>
 );
}