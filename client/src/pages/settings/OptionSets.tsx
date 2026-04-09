import { useState } from 'react';
import { List, Plus, Edit2, Trash2, Save, X, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { isUserAdmin } from '@/lib/adminCheck';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function OptionSets() {
 const { t } = useTranslation();
 const [, navigate] = useLocation();
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();
 const [expandedSetId, setExpandedSetId] = useState<number | null>(null);
 const [showCreateSet, setShowCreateSet] = useState(false);
 const [newSetName, setNewSetName] = useState('');
 const [newSetNameAr, setNewSetNameAr] = useState('');
 const [newSetDesc, setNewSetDesc] = useState('');
 const [showAddValue, setShowAddValue] = useState<number | null>(null);
 const [newValueLabel, setNewValueLabel] = useState('');
 const [newValueLabelAr, setNewValueLabelAr] = useState('');
 const [newValueKey, setNewValueKey] = useState('');

 if (!isUserAdmin(user)) {
 return <div className="flex items-center justify-center h-64"><div className="text-center p-8 bg-white rounded-2xl shadow border"><h2 className="text-xl font-bold text-gray-900">Access Denied</h2></div></div>;
 }

 const setsQuery = trpc.settings.optionSets.list.useQuery();
 const createSetMutation = trpc.settings.optionSets.create.useMutation({
 onSuccess: () => { toast.success('Option set created'); setsQuery.refetch(); setShowCreateSet(false); setNewSetName(''); setNewSetNameAr(''); setNewSetDesc(''); },
 onError: (e) => toast.error(e.message),
 });
 const deleteSetMutation = trpc.settings.optionSets.delete.useMutation({
 onSuccess: () => { toast.success('Option set deleted'); setsQuery.refetch(); },
 onError: (e) => toast.error(e.message),
 });
 const addValueMutation = trpc.settings.optionSets.addValue.useMutation({
 onSuccess: () => { toast.success('Value added'); setsQuery.refetch(); setShowAddValue(null); setNewValueLabel(''); setNewValueLabelAr(''); setNewValueKey(''); },
 onError: (e) => toast.error(e.message),
 });
 const deleteValueMutation = trpc.settings.optionSets.deleteValue.useMutation({
 onSuccess: () => { toast.success('Value deleted'); setsQuery.refetch(); },
 onError: (e) => toast.error(e.message),
 });
 const toggleValueMutation = trpc.settings.optionSets.updateValue.useMutation({
 onSuccess: () => setsQuery.refetch(),
 onError: (e) => toast.error(e.message),
 });

 const optionSets = setsQuery.data || [];

 const labels = {
 title: t.settingsModule.optionSetsLookups,
 subtitle: t.settingsModule.manageDropdownValuesUsedAcrossThe,
 back: t.settingsModule.backToSettings,
 addSet: t.settingsModule.addOptionSet,
 addValue: t.settingsModule.addValue,
 name: t.settingsModule.name,
 nameAr: t.settingsModule.nameArabic,
 description: t.settingsModule.description,
 label: t.settingsModule.label,
 labelAr: t.settingsModule.labelArabic,
 value: t.settingsModule.valueKey,
 save: t.settingsModule.save,
 cancel: t.settingsModule.cancel,
 create: t.settingsModule.create,
 system: t.settingsModule.system,
 values: t.settingsModule.values,
 noSets: t.settingsModule.noOptionSetsFound,
 active: t.settingsModule.active,
 inactive: t.settingsModule.inactive,
 };

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className={`flex items-center gap-3`}>
 <BackButton onClick={() => navigate('/organization/settings')} label={labels.back} />
 </div>
 <div className={`flex items-center justify-between`}>
 <div className={`flex items-center gap-3`}>
 <div className="p-3 bg-indigo-50 rounded-lg"><List className="w-6 h-6 text-indigo-600" /></div>
 <div>
 <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-end' : ''}`}>{labels.title}</h1>
 <p className={`text-sm text-gray-500 ${isRTL ? 'text-end' : ''}`}>{labels.subtitle}</p>
 </div>
 </div>
 <button onClick={() => setShowCreateSet(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
 <Plus className="w-4 h-4" />{labels.addSet}
 </button>
 </div>

 {/* Option Sets List */}
 {setsQuery.isLoading ? (
 <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
 ) : optionSets.length === 0 ? (
 <div className="flex items-center justify-center h-32 bg-white rounded-lg border border-gray-200 text-gray-500">{labels.noSets}</div>
 ) : (
 <div className="space-y-3">
 {optionSets.map((set: any) => (
 <div key={set.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 <button
 onClick={() => setExpandedSetId(expandedSetId === set.id ? null : set.id)}
 className={`w-full p-4 flex items-center justify-between hover:bg-gray-50`}
 >
 <div className={`flex items-center gap-3`}>
 {expandedSetId === set.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className={`w-4 h-4 text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />}
 <div className={'text-start'}>
 <h3 className="font-medium text-gray-900 text-sm">{language === 'en' ? set.name : (set.nameAr || set.name)}</h3>
 <p className="text-xs text-gray-500">{set.values?.length || 0} {labels.values}</p>
 </div>
 {set.isSystem && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{labels.system}</span>}
 </div>
 <div className={`flex items-center gap-2`}>
 {!set.isSystem && (
 <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete this option set?')) deleteSetMutation.mutate({ id: set.id }); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
 <Trash2 className="w-4 h-4" />
 </button>
 )}
 </div>
 </button>

 {expandedSetId === set.id && (
 <div className="border-t border-gray-100 p-4">
 <div className="space-y-2">
 {set.values?.map((val: any) => (
 <div key={val.id} className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg`}>
 <div className={`flex items-center gap-3`}>
 <GripVertical className="w-4 h-4 text-gray-300" />
 <div className={'text-start'}>
 <span className="text-sm font-medium text-gray-900">{language === 'en' ? val.label : (val.labelAr || val.label)}</span>
 <span className="text-xs text-gray-400 ms-2">({val.value})</span>
 </div>
 </div>
 <div className={`flex items-center gap-2`}>
 <button
 onClick={() => toggleValueMutation.mutate({ id: val.id, isActive: !val.isActive })}
 className={`text-xs px-2 py-1 rounded ${val.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}
 >
 {val.isActive ? labels.active : labels.inactive}
 </button>
 <button onClick={() => { if (confirm('Delete this value?')) deleteValueMutation.mutate({ id: val.id }); }} className="p-1 text-red-400 hover:text-red-600">
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 ))}
 </div>

 {showAddValue === set.id ? (
 <div className="mt-3 p-3 bg-blue-50 rounded-lg space-y-2">
 <input type="text" value={newValueLabel} onChange={(e) => setNewValueLabel(e.target.value)} placeholder={labels.label} className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm" />
 <input type="text" value={newValueLabelAr} onChange={(e) => setNewValueLabelAr(e.target.value)} placeholder={labels.labelAr} className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm" dir="rtl" />
 <input type="text" value={newValueKey} onChange={(e) => setNewValueKey(e.target.value)} placeholder={labels.value} className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm font-mono" />
 <div className={`flex gap-2`}>
 <button onClick={() => { if (newValueLabel && newValueKey) addValueMutation.mutate({ optionSetId: set.id, label: newValueLabel, labelAr: newValueLabelAr, value: newValueKey }); }} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm">{labels.save}</button>
 <button onClick={() => setShowAddValue(null)} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm">{labels.cancel}</button>
 </div>
 </div>
 ) : (
 <button onClick={() => { setShowAddValue(set.id); setNewValueLabel(''); setNewValueLabelAr(''); setNewValueKey(''); }} className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
 <Plus className="w-4 h-4" />{labels.addValue}
 </button>
 )}
 </div>
 )}
 </div>
 ))}
 </div>
 )}

 {/* Create Option Set Modal */}
 {showCreateSet && (
 <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
 <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
 <div className={`flex items-center justify-between mb-4`}>
 <h2 className="text-lg font-bold">{labels.addSet}</h2>
 <button onClick={() => setShowCreateSet(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
 </div>
 <div className="space-y-3">
 <div><label className="text-sm font-medium text-gray-700 block mb-1">{labels.name}</label><input type="text" value={newSetName} onChange={(e) => setNewSetName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
 <div><label className="text-sm font-medium text-gray-700 block mb-1">{labels.nameAr}</label><input type="text" value={newSetNameAr} onChange={(e) => setNewSetNameAr(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" dir="rtl" /></div>
 <div><label className="text-sm font-medium text-gray-700 block mb-1">{labels.description}</label><textarea value={newSetDesc} onChange={(e) => setNewSetDesc(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={2} /></div>
 </div>
 <div className={`flex gap-3 mt-6 ${'justify-end'}`}>
 <button onClick={() => setShowCreateSet(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg">{labels.cancel}</button>
 <button onClick={() => { if (newSetName.trim()) createSetMutation.mutate({ name: newSetName, nameAr: newSetNameAr, description: newSetDesc }); }} disabled={createSetMutation.isPending} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg disabled:opacity-50">{labels.create}</button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

export default OptionSets;
