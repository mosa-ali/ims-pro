/**
 * ============================================================================
 * SURVEY SETTINGS TAB (PER-SURVEY CONFIGURATION)
 * ============================================================================
 * 
 * Individual survey metadata, configuration, and management
 * 
 * SIDEBAR SECTIONS:
 * - General: Survey metadata (name, description, sector, country, dates)
 * - Media: Upload survey logo and organization logo
 * - Sharing: User permissions, public sharing, transfer ownership
 * - Activity: Survey change log and activity history
 * 
 * FEATURES:
 * - Editable survey metadata
 * - Multi-select tags for Sector and Country
 * - File upload with drag-and-drop
 * - User management and permissions
 * - Activity log with filtering
 * - Archive project (stops accepting submissions)
 * - Delete project and data (danger zone)
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, Upload, Image, Users, Plus, Download, Filter } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 survey: any;
 projectId?: string;
 projectName?: string;
}

type SidebarSection = 'general' | 'media' | 'sharing' | 'activity';

interface UploadedFile {
 id: string;
 name: string;
 size: string;
 uploadedAt: string;
}

interface TeamMember {
 id: string;
 username: string;
 role: 'owner' | 'editor' | 'viewer';
 addedAt: string;
}

interface ActivityLog {
 id: string;
 eventDescription: string;
 user: string;
 date: string;
}

export function SurveySettingsTab({
 survey }: Props) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();
 const [activeSection, setActiveSection] = useState<SidebarSection>('general');
 
 // General tab state
 const [surveyName, setSurveyName] = useState(survey.name || '');
 const [description, setDescription] = useState(survey.description || '');
 const [sectors, setSectors] = useState<string[]>(['Humanitarian', 'Multiple Clusters']);
 const [countries, setCountries] = useState<string[]>(['Yemen']);
 const [startDate, setStartDate] = useState('');
 const [endDate, setEndDate] = useState('');
 const [language_survey, setLanguageSurvey] = useState<string[]>(['English', 'Arabic']);
 const [allowAnonymous, setAllowAnonymous] = useState(false);
 const [maxSubmissions, setMaxSubmissions] = useState('');

 // Media tab state
 const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
 const [urlInput, setUrlInput] = useState('');
 const [dragActive, setDragActive] = useState(false);

 // Sharing tab state - Initialize with current user as owner
 const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
 const [allowAnonymousSubmissions, setAllowAnonymousSubmissions] = useState(false);
 const [publicViewForm, setPublicViewForm] = useState(false);
 const [publicViewSubmissions, setPublicViewSubmissions] = useState(false);
 const [showAddUserModal, setShowAddUserModal] = useState(false);
 const [newUsername, setNewUsername] = useState('');

 // Activity tab state - Initialize empty, will be populated from real data
 const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
 const [activityFilter, setActivityFilter] = useState<string>('all');

 // Initialize with current user as owner
 useEffect(() => {
 if (user) {
 setTeamMembers([{
 id: user.id,
 username: user.username,
 role: 'owner',
 addedAt: new Date().toLocaleDateString(),
 }]);

 // Add initial activity log for survey creation
 setActivityLogs([{
 id: '1',
 eventDescription: `Survey "${survey.name}" was created`,
 user: user.username,
 date: new Date(survey.createdAt).toLocaleString(),
 }]);
 }
 }, [user, survey]);

 const localT = {
 // Sidebar
 general: t.mealTabs.general,
 media: t.mealTabs.media,
 sharing: t.mealTabs.sharing,
 activity: t.mealTabs.activity,
 
 // General Fields
 projectName: t.mealTabs.projectNameRequired,
 description: t.mealTabs.description,
 sector: t.mealTabs.sectorRequired,
 country: t.mealTabs.countryRequired,
 startDate: t.mealTabs.startDate,
 endDate: t.mealTabs.endDate,
 surveyLanguage: t.mealTabs.surveyLanguage,
 allowAnonymous: t.mealTabs.allowAnonymousSubmissions,
 maxSubmissions: t.mealTabs.maxSubmissionsLimit,
 optional: t.mealTabs.optional,
 
 saveChanges: t.mealTabs.saveChanges,
 archiveProject: t.mealTabs.archiveProject,
 archiveDesc: t.mealTabs.archiveProjectToStopAcceptingSubmissions,
 deleteProject: t.mealTabs.deleteProjectAndData,
 deleteWarning: 'Deleting this project will permanently remove all associated data and submissions. This action cannot be undone.',
 
 // Media Tab
 attachFiles: t.mealTabs.attachFiles,
 redeployNotice: 'You must redeploy this form to see media changes.',
 dragDropFiles: t.mealTabs.dragAndDropFilesHere,
 orClickBrowse: t.mealTabs.orClickHereToBrowse,
 addFileByUrl: t.mealTabs.youCanAlsoAddFilesUsing,
 pasteUrl: t.mealTabs.pasteUrlHere,
 add: t.mealTabs.add,
 attachedFiles: t.mealTabs.attachedFiles,
 noFilesUploaded: t.mealTabs.noFilesUploadedYet,
 remove: t.mealTabs.remove,
 
 // Sharing Tab
 whoHasAccess: t.mealTabs.whoHasAccess,
 addUser: t.mealTabs.addUser,
 isOwner: t.mealTabs.isOwner,
 allowSubmissionsNoAuth: 'Allow submissions to this form without a username and password',
 sharePublicly: t.mealTabs.sharePubliclyByLink,
 anyoneCanViewForm: t.mealTabs.anyoneCanViewThisForm,
 anyoneCanViewSubmissions: t.mealTabs.anyoneCanViewSubmissionsMadeTo,
 copyTeamFromProject: t.mealTabs.copyTeamFromAnotherProject,
 transferOwnership: t.mealTabs.transferProjectOwnership,
 transferOwnershipDesc: 'Transfer ownership of this project to another user. All submissions, data storage, and transcription and translation usage for this project will be transferred to the new project owner.',
 transfer: t.mealTabs.transfer,
 learnMore: t.mealTabs.learnMore,
 enterUsername: t.mealTabs.enterUsername,
 cancel: t.mealTabs.cancel,
 
 // Activity Tab
 recentActivity: t.mealTabs.recentProjectActivity,
 eventDescription: t.mealTabs.eventDescription,
 date: t.mealTabs.date,
 filterBy: t.mealTabs.filterBy,
 exportAllData: t.mealTabs.exportAllData,
 allEvents: t.mealTabs.allEvents,
 formChanges: t.mealTabs.formChanges,
 userChanges: t.mealTabs.userChanges,
 deployments: t.mealTabs.deployments,
 };

 const sidebarItems: Array<{ key: SidebarSection; label: string }> = [
 { key: 'general', label: t.general },
 { key: 'media', label: t.media },
 { key: 'sharing', label: t.sharing },
 { key: 'activity', label: t.activity },
 ];

 const handleRemoveSector = (sector: string) => {
 setSectors(sectors.filter(s => s !== sector));
 };

 const handleRemoveCountry = (country: string) => {
 setCountries(countries.filter(c => c !== country));
 };

 const handleRemoveLanguage = (lang: string) => {
 setLanguageSurvey(language_survey.filter(l => l !== lang));
 };

 const handleSave = () => {
 console.log('Saving survey settings:', {
 surveyName,
 description,
 sectors,
 countries,
 startDate,
 endDate,
 language_survey,
 allowAnonymous,
 maxSubmissions
 });
 alert(t.mealTabs.settingsSavedSuccessfully);
 };

 const handleArchive = () => {
 if (confirm(t.mealTabs.areYouSureYouWantTo)) {
 console.log('Archiving survey');
 alert(t.mealTabs.surveyArchivedSuccessfully);
 }
 };

 const handleDelete = () => {
 if (confirm(t.mealTabs.thisActionCannotBeUndoneAre)) {
 console.log('Deleting survey');
 alert(t.mealTabs.surveyDeleted);
 }
 };

 // Media Tab Handlers
 const handleDrag = (e: React.DragEvent) => {
 e.preventDefault();
 e.stopPropagation();
 if (e.type === 'dragenter' || e.type === 'dragover') {
 setDragActive(true);
 } else if (e.type === 'dragleave') {
 setDragActive(false);
 }
 };

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 e.stopPropagation();
 setDragActive(false);
 
 if (e.dataTransfer.files && e.dataTransfer.files[0]) {
 handleFiles(e.dataTransfer.files);
 }
 };

 const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files && e.target.files[0]) {
 handleFiles(e.target.files);
 }
 };

 const handleFiles = (files: FileList) => {
 const newFiles: UploadedFile[] = Array.from(files).map((file, index) => ({
 id: `file-${Date.now()}-${index}`,
 name: file.name,
 size: `${(file.size / 1024).toFixed(1)} KB`,
 uploadedAt: new Date().toLocaleString(),
 }));
 setUploadedFiles([...uploadedFiles, ...newFiles]);
 };

 const handleAddUrl = () => {
 if (urlInput.trim()) {
 const fileName = urlInput.split('/').pop() || 'file-from-url';
 const newFile: UploadedFile = {
 id: `url-${Date.now()}`,
 name: fileName,
 size: 'URL',
 uploadedAt: new Date().toLocaleString(),
 };
 setUploadedFiles([...uploadedFiles, newFile]);
 setUrlInput('');
 }
 };

 const handleRemoveFile = (fileId: string) => {
 setUploadedFiles(uploadedFiles.filter(f => f.id !== fileId));
 };

 // Sharing Tab Handlers
 const handleAddUser = () => {
 if (newUsername.trim()) {
 const newMember: TeamMember = {
 id: `user-${Date.now()}`,
 username: newUsername,
 role: 'editor',
 addedAt: new Date().toLocaleDateString(),
 };
 setTeamMembers([...teamMembers, newMember]);
 setNewUsername('');
 setShowAddUserModal(false);
 }
 };

 const handleRemoveUser = (userId: string) => {
 setTeamMembers(teamMembers.filter(m => m.id !== userId));
 };

 // Activity Tab Handlers
 const handleExportActivity = () => {
 alert(t.mealTabs.exportingActivityLog);
 };

 const filteredActivityLogs = activityFilter === 'all' 
 ? activityLogs 
 : activityLogs.filter(log => {
 if (activityFilter === 'formChanges') return log.eventDescription.toLowerCase().includes('form') || log.eventDescription.toLowerCase().includes('question');
 if (activityFilter === 'userChanges') return log.eventDescription.toLowerCase().includes('user');
 if (activityFilter === 'deployments') return log.eventDescription.toLowerCase().includes('deploy');
 return true;
 });

 const renderContent = () => {
 switch (activeSection) {
 case 'general':
 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* General Settings */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className="space-y-4">
 {/* Project Name */}
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {t.projectName}
 </label>
 <input
 type="text"
 value={surveyName}
 onChange={(e) => setSurveyName(e.target.value)}
 className={`w-full px-4 py-2 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 />
 </div>

 {/* Description */}
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {t.description}
 </label>
 <textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 rows={4}
 className={`w-full px-4 py-2 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 />
 </div>

 {/* Sector */}
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {t.sector}
 </label>
 <div className={`flex gap-2 flex-wrap`}>
 {sectors.map((sector) => (
 <span key={sector} className={`bg-red-100 text-red-700 px-3 py-1 rounded text-sm font-medium flex items-center gap-2`}>
 {sector}
 <button onClick={() => handleRemoveSector(sector)} className="hover:bg-red-200 rounded-full p-0.5">
 <X className="w-3 h-3" />
 </button>
 </span>
 ))}
 </div>
 </div>

 {/* Country */}
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {t.country}
 </label>
 <div className={`flex gap-2 flex-wrap`}>
 {countries.map((country) => (
 <span key={country} className={`bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-medium flex items-center gap-2`}>
 {country}
 <button onClick={() => handleRemoveCountry(country)} className="hover:bg-blue-200 rounded-full p-0.5">
 <X className="w-3 h-3" />
 </button>
 </span>
 ))}
 </div>
 </div>

 {/* Start Date */}
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {t.startDate} <span className="text-gray-500 text-xs font-normal">({t.optional})</span>
 </label>
 <input
 type="date"
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 className={`w-full px-4 py-2 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 />
 </div>

 {/* End Date */}
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {t.endDate} <span className="text-gray-500 text-xs font-normal">({t.optional})</span>
 </label>
 <input
 type="date"
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 className={`w-full px-4 py-2 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 />
 </div>

 {/* Survey Language */}
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {t.surveyLanguage}
 </label>
 <div className={`flex gap-2 flex-wrap`}>
 {language_survey.map((lang) => (
 <span key={lang} className={`bg-purple-100 text-purple-700 px-3 py-1 rounded text-sm font-medium flex items-center gap-2`}>
 {lang}
 <button onClick={() => handleRemoveLanguage(lang)} className="hover:bg-purple-200 rounded-full p-0.5">
 <X className="w-3 h-3" />
 </button>
 </span>
 ))}
 </div>
 </div>

 {/* Allow Anonymous Submissions */}
 <div className={`flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200`}>
 <div className={'text-start'}>
 <p className="text-sm font-semibold text-gray-900">{t.allowAnonymous}</p>
 </div>
 <button
 onClick={() => setAllowAnonymous(!allowAnonymous)}
 className={`w-12 h-6 rounded-full transition-colors relative ${ allowAnonymous ? 'bg-blue-600' : 'bg-gray-300' }`}
 >
 <span
 className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${ allowAnonymous ? ('right-1') : ('left-1') }`}
 />
 </button>
 </div>

 {/* Max Submissions Limit */}
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {t.maxSubmissions} <span className="text-gray-500 text-xs font-normal">({t.optional})</span>
 </label>
 <input
 type="number"
 value={maxSubmissions}
 onChange={(e) => setMaxSubmissions(e.target.value)}
 placeholder="0"
 className={`w-full px-4 py-2 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 />
 </div>

 {/* Save Button */}
 <div className={`pt-4 text-start`}>
 <button 
 onClick={handleSave}
 className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
 >
 {t.saveChanges}
 </button>
 </div>
 </div>
 </div>

 {/* Archive Section */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <h3 className="text-base font-bold text-gray-900 mb-1">{t.archiveProject}</h3>
 <p className="text-sm text-gray-600">{t.archiveDesc}</p>
 </div>
 <button 
 onClick={handleArchive}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
 >
 {t.archiveProject}
 </button>
 </div>
 </div>

 {/* Danger Zone - Delete */}
 <div className="bg-white rounded-lg border border-red-300 p-6">
 <div className={`flex items-start gap-3 mb-4`}>
 <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
 <div className={`flex-1 text-start`}>
 <h3 className="text-base font-bold text-red-900 mb-1">{t.deleteProject}</h3>
 <p className="text-sm text-red-700">{t.deleteWarning}</p>
 </div>
 </div>
 <button 
 onClick={handleDelete}
 className={`flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm transition-colors`}
 >
 <Trash2 className="w-4 h-4" />
 {t.deleteProject}
 </button>
 </div>
 </div>
 );

 case 'media':
 return (
 <div className="space-y-6">
 {/* Redeploy Notice */}
 <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
 <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
 <p className={`text-sm text-orange-800 text-start`}>
 {t.redeployNotice}
 </p>
 </div>

 {/* File Upload Area */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className={`text-base font-bold text-gray-900 mb-4 text-start`}>
 {t.attachFiles}
 </h3>

 {/* Drag and Drop Zone */}
 <div
 onDragEnter={handleDrag}
 onDragLeave={handleDrag}
 onDragOver={handleDrag}
 onDrop={handleDrop}
 className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${ dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50' }`}
 >
 <input
 type="file"
 id="file-upload"
 multiple
 onChange={handleFileInput}
 className="hidden"
 />
 <label htmlFor="file-upload" className="cursor-pointer">
 <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
 <p className="text-sm text-gray-600 mb-1">{t.dragDropFiles}</p>
 <p className="text-sm text-blue-600 hover:text-blue-700">{t.orClickBrowse}</p>
 </label>
 </div>

 {/* URL Input */}
 <div className="mt-6">
 <p className={`text-sm text-gray-600 mb-3 text-start`}>
 {t.addFileByUrl}
 </p>
 <div className={`flex gap-2`}>
 <input
 type="text"
 value={urlInput}
 onChange={(e) => setUrlInput(e.target.value)}
 placeholder={t.pasteUrl}
 className={`flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 />
 <button
 onClick={handleAddUrl}
 className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
 >
 {t.add}
 </button>
 </div>
 </div>
 </div>

 {/* Attached Files List */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className={`text-base font-bold text-gray-900 mb-4 text-start`}>
 {t.attachedFiles}
 </h3>
 
 {uploadedFiles.length === 0 ? (
 <p className={`text-sm text-gray-500 text-start`}>
 {t.noFilesUploaded}
 </p>
 ) : (
 <div className="space-y-2">
 {uploadedFiles.map((file) => (
 <div
 key={file.id}
 className={`flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50`}
 >
 <div className={`flex items-center gap-3 flex-1`}>
 <Image className="w-5 h-5 text-gray-400" />
 <div className={`flex-1 text-start`}>
 <p className="text-sm font-medium text-gray-900">{file.name}</p>
 <p className="text-xs text-gray-500">{file.size} • {file.uploadedAt}</p>
 </div>
 </div>
 <button
 onClick={() => handleRemoveFile(file.id)}
 className="text-red-600 hover:text-red-700 text-sm font-medium"
 >
 {t.remove}
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );

 case 'sharing':
 return (
 <div className="space-y-6">
 {/* Who Has Access */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className={`text-base font-bold text-gray-900 mb-4 text-start`}>
 {t.whoHasAccess}
 </h3>

 {/* Team Members List */}
 <div className="space-y-2 mb-4">
 {teamMembers.map((member) => (
 <div
 key={member.id}
 className={`flex items-center justify-between p-3 rounded-lg border border-gray-200`}
 >
 <div className={`flex items-center gap-3`}>
 <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
 <Users className="w-4 h-4 text-white" />
 </div>
 <span className="text-sm font-medium text-gray-900">{member.username}</span>
 </div>
 <div className={`flex items-center gap-2`}>
 <span className="text-sm text-gray-600">
 {member.role === 'owner' ? t.isOwner : member.role}
 </span>
 {member.role !== 'owner' && (
 <button
 onClick={() => handleRemoveUser(member.id)}
 className="text-red-600 hover:text-red-700"
 >
 <X className="w-4 h-4" />
 </button>
 )}
 </div>
 </div>
 ))}
 </div>

 {/* Add User Button */}
 <button
 onClick={() => setShowAddUserModal(true)}
 className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors`}
 >
 <Plus className="w-4 h-4" />
 {t.addUser}
 </button>

 {/* Add User Modal */}
 {showAddUserModal && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
 <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
 <h3 className={`text-lg font-bold text-gray-900 mb-4 text-start`}>
 {t.addUser}
 </h3>
 <input
 type="text"
 value={newUsername}
 onChange={(e) => setNewUsername(e.target.value)}
 placeholder={t.enterUsername}
 className={`w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4 text-start`}
 />
 <div className={`flex gap-2`}>
 <button
 onClick={handleAddUser}
 className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
 >
 {t.add}
 </button>
 <button
 onClick={() => setShowAddUserModal(false)}
 className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm transition-colors"
 >
 {t.cancel}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Anonymous Submissions */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className={`flex items-center justify-between`}>
 <div className={`flex-1 text-start`}>
 <p className="text-sm font-semibold text-gray-900">{t.allowSubmissionsNoAuth}</p>
 </div>
 <button
 onClick={() => setAllowAnonymousSubmissions(!allowAnonymousSubmissions)}
 className={`w-12 h-6 rounded-full transition-colors relative ${ allowAnonymousSubmissions ? 'bg-blue-600' : 'bg-gray-300' }`}
 >
 <span
 className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${ allowAnonymousSubmissions ? ('right-1') : ('left-1') }`}
 />
 </button>
 </div>
 </div>

 {/* Share Publicly */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className={`text-base font-bold text-gray-900 mb-4 text-start`}>
 {t.sharePublicly}
 </h3>
 
 <div className="space-y-3">
 {/* Anyone can view form */}
 <div className={`flex items-center gap-3`}>
 <input
 type="checkbox"
 id="public-view-form"
 checked={publicViewForm}
 onChange={(e) => setPublicViewForm(e.target.checked)}
 className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
 />
 <label htmlFor="public-view-form" className="text-sm text-gray-700">
 {t.anyoneCanViewForm}
 </label>
 </div>

 {/* Anyone can view submissions */}
 <div className={`flex items-center gap-3`}>
 <input
 type="checkbox"
 id="public-view-submissions"
 checked={publicViewSubmissions}
 onChange={(e) => setPublicViewSubmissions(e.target.checked)}
 className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
 />
 <label htmlFor="public-view-submissions" className="text-sm text-gray-700">
 {t.anyoneCanViewSubmissions}
 </label>
 </div>
 </div>

 {/* Copy team from another project */}
 <button className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
 {t.copyTeamFromProject} ▼
 </button>
 </div>

 {/* Transfer Ownership */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className={`text-base font-bold text-gray-900 mb-2 text-start`}>
 {t.transferOwnership}
 </h3>
 <p className={`text-sm text-gray-600 mb-4 text-start`}>
 {t.transferOwnershipDesc} <a href="#" className="text-blue-600 hover:text-blue-700">{t.learnMore}</a>
 </p>
 <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors">
 {t.transfer}
 </button>
 </div>
 </div>
 );

 case 'activity':
 return (
 <div className="space-y-6">
 {/* Header with Filter and Export */}
 <div className={`flex items-center justify-between`}>
 <h3 className={`text-xl font-bold text-gray-900 text-start`}>
 {t.recentActivity}
 </h3>
 <div className={`flex items-center gap-2`}>
 <select
 value={activityFilter}
 onChange={(e) => setActivityFilter(e.target.value)}
 className={`px-4 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 >
 <option value="all">{t.allEvents}</option>
 <option value="formChanges">{t.formChanges}</option>
 <option value="userChanges">{t.userChanges}</option>
 <option value="deployments">{t.deployments}</option>
 </select>
 <button
 onClick={handleExportActivity}
 className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors`}
 >
 <Download className="w-4 h-4" />
 {t.exportAllData}
 </button>
 </div>
 </div>

 {/* Activity Table */}
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
 {t.eventDescription}
 </th>
 <th className={`px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
 {t.date}
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {filteredActivityLogs.map((log) => (
 <tr key={log.id} className="hover:bg-gray-50">
 <td className={`px-6 py-4 text-sm text-gray-900 text-start`}>
 <div>
 <p className="font-medium">{log.eventDescription}</p>
 <p className="text-xs text-gray-500 mt-1">by {log.user}</p>
 </div>
 </td>
 <td className={`px-6 py-4 text-sm text-gray-600 whitespace-nowrap text-start`}>
 {log.date}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 );
 }
 };

 return (
 <div className="space-y-6">
 {/* Left Sidebar Navigation + Main Content */}
 <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
 {/* Sidebar */}
 <div className="lg:col-span-1">
 <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-1">
 {sidebarItems.map((item) => (
 <button
 key={item.key}
 onClick={() => setActiveSection(item.key)}
 className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors text-start ${ activeSection === item.key ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50' }`}
 >
 {item.label}
 </button>
 ))}
 </div>
 </div>

 {/* Main Content */}
 <div className="lg:col-span-3">
 {renderContent()}
 </div>
 </div>
 </div>
 );
}