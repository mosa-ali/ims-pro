import { useState } from 'react';
import { Plus, Edit, Trash2, Download, Upload, X } from 'lucide-react';
import { useLanguage, formatNumber } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface CSSLocation {
  id: number;
  cssCode: string;
  cssName: string;
  location: string;
  capacity: number;
  ageGroupsServed: string;
  operatingHours: string;
  facilitators: string;
  status: 'Active' | 'Inactive';
}

interface CSSActivity {
  id: number;
  cssId: number;
  activityDate: string;
  activityType: string;
  participantsCount: number;
  boys: number;
  girls: number;
  facilitator: string;
  duration: number;
  notes: string;
}

export function ChildSafeSpace({ projectId }: { projectId: number }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  
  
  const [cssLocations, setCssLocations] = useState<CSSLocation[]>([
    {
      id: 1,
      cssCode: 'CSS-001',
      cssName: 'Al-Amal Child Safe Space',
      location: 'Al-Amal District, Community Center',
      capacity: 50,
      ageGroupsServed: '6-12, 13-17',
      operatingHours: '9:00 AM - 3:00 PM',
      facilitators: 'Ahmed Ali, Fatima Hassan',
      status: 'Active'
    }
  ]);

  const [cssActivities, setCssActivities] = useState<CSSActivity[]>([
    {
      id: 1,
      cssId: 1,
      activityDate: '2024-01-15',
      activityType: 'Art & Drawing',
      participantsCount: 24,
      boys: 12,
      girls: 12,
      facilitator: 'Ahmed Ali',
      duration: 120,
      notes: 'Children enjoyed creative activities'
    },
    {
      id: 2,
      cssId: 1,
      activityDate: '2024-01-14',
      activityType: 'Sports & Games',
      participantsCount: 30,
      boys: 15,
      girls: 15,
      facilitator: 'Fatima Hassan',
      duration: 90,
      notes: 'Team building exercises'
    }
  ]);

  // Modal states
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [showEditLocationModal, setShowEditLocationModal] = useState(false);
  const [showDeleteLocationModal, setShowDeleteLocationModal] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [showEditActivityModal, setShowEditActivityModal] = useState(false);
  const [showDeleteActivityModal, setShowDeleteActivityModal] = useState(false);

  const [editingLocation, setEditingLocation] = useState<CSSLocation | null>(null);
  const [deletingLocationId, setDeletingLocationId] = useState<number | null>(null);
  const [editingActivity, setEditingActivity] = useState<CSSActivity | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<number | null>(null);
  const [selectedCssId, setSelectedCssId] = useState<number | null>(null);

  const [locationFormData, setLocationFormData] = useState<Partial<CSSLocation>>({
    status: 'Active'
  });

  const [activityFormData, setActivityFormData] = useState<Partial<CSSActivity>>({
    boys: 0,
    girls: 0,
    participantsCount: 0
  });

  const resetLocationForm = () => {
    setLocationFormData({ status: 'Active' });
  };

  const resetActivityForm = () => {
    setActivityFormData({ boys: 0, girls: 0, participantsCount: 0 });
  };

  // CSS Location CRUD
  const handleAddLocation = () => {
    if (!locationFormData.cssCode || !locationFormData.cssName || !locationFormData.location) {
      alert(t('caseManagement.fillRequiredFields'));
      return;
    }

    const newLocation: CSSLocation = {
      id: Math.max(0, ...cssLocations.map(c => c.id)) + 1,
      cssCode: locationFormData.cssCode!,
      cssName: locationFormData.cssName!,
      location: locationFormData.location!,
      capacity: locationFormData.capacity || 50,
      ageGroupsServed: locationFormData.ageGroupsServed || '',
      operatingHours: locationFormData.operatingHours || '',
      facilitators: locationFormData.facilitators || '',
      status: locationFormData.status as 'Active' | 'Inactive'
    };

    setCssLocations([...cssLocations, newLocation]);
    setShowAddLocationModal(false);
    resetLocationForm();
    alert(t('caseManagement.cssLocationAddedSuccess'));
  };

  const handleEditLocation = () => {
    if (!editingLocation) return;

    setCssLocations(cssLocations.map(c =>
      c.id === editingLocation.id
        ? { ...c, ...locationFormData } as CSSLocation
        : c
    ));

    setShowEditLocationModal(false);
    setEditingLocation(null);
    resetLocationForm();
    alert(t('caseManagement.cssLocationUpdatedSuccess'));
  };

  const handleDeleteLocation = () => {
    if (deletingLocationId !== null) {
      setCssLocations(cssLocations.filter(c => c.id !== deletingLocationId));
      // Also delete associated activities
      setCssActivities(cssActivities.filter(a => a.cssId !== deletingLocationId));
      setShowDeleteLocationModal(false);
      setDeletingLocationId(null);
      alert(t('caseManagement.cssLocationDeletedSuccess'));
    }
  };

  // CSS Activity CRUD
  const handleAddActivity = () => {
    if (!activityFormData.cssId || !activityFormData.activityDate || !activityFormData.activityType) {
      alert(t('caseManagement.fillRequiredFields'));
      return;
    }

    const boys = activityFormData.boys || 0;
    const girls = activityFormData.girls || 0;

    const newActivity: CSSActivity = {
      id: Math.max(0, ...cssActivities.map(a => a.id)) + 1,
      cssId: activityFormData.cssId!,
      activityDate: activityFormData.activityDate!,
      activityType: activityFormData.activityType!,
      boys,
      girls,
      participantsCount: boys + girls,
      facilitator: activityFormData.facilitator || '',
      duration: activityFormData.duration || 60,
      notes: activityFormData.notes || ''
    };

    setCssActivities([...cssActivities, newActivity]);
    setShowAddActivityModal(false);
    resetActivityForm();
    alert(t('caseManagement.cssActivityAddedSuccess'));
  };

  const handleEditActivity = () => {
    if (!editingActivity) return;

    const boys = activityFormData.boys || 0;
    const girls = activityFormData.girls || 0;

    setCssActivities(cssActivities.map(a =>
      a.id === editingActivity.id
        ? { 
            ...a, 
            ...activityFormData,
            boys,
            girls,
            participantsCount: boys + girls
          } as CSSActivity
        : a
    ));

    setShowEditActivityModal(false);
    setEditingActivity(null);
    resetActivityForm();
    alert(t('caseManagement.cssActivityUpdatedSuccess'));
  };

  const handleDeleteActivity = () => {
    if (deletingActivityId !== null) {
      setCssActivities(cssActivities.filter(a => a.id !== deletingActivityId));
      setShowDeleteActivityModal(false);
      setDeletingActivityId(null);
      alert(t('caseManagement.cssActivityDeletedSuccess'));
    }
  };

  // Excel Export - CSS Locations
  const handleExportLocations = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CSS Locations');

    worksheet.columns = [
      { header: 'CSS Code', key: 'cssCode', width: 15 },
      { header: 'CSS Name', key: 'cssName', width: 30 },
      { header: 'Location', key: 'location', width: 40 },
      { header: 'Capacity', key: 'capacity', width: 12 },
      { header: 'Age Groups Served', key: 'ageGroupsServed', width: 20 },
      { header: 'Operating Hours', key: 'operatingHours', width: 20 },
      { header: 'Facilitators', key: 'facilitators', width: 30 },
      { header: 'Status', key: 'status', width: 12 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };

    cssLocations.forEach(loc => {
      worksheet.addRow(loc);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `CSS_Locations_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Excel Export - CSS Activities
  const handleExportActivities = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CSS Activities');

    worksheet.columns = [
      { header: 'Activity ID', key: 'id', width: 12 },
      { header: 'CSS Code', key: 'cssCode', width: 15 },
      { header: 'CSS Name', key: 'cssName', width: 30 },
      { header: 'Activity Date', key: 'activityDate', width: 15 },
      { header: 'Activity Type', key: 'activityType', width: 25 },
      { header: 'Boys', key: 'boys', width: 10 },
      { header: 'Girls', key: 'girls', width: 10 },
      { header: 'Total Participants', key: 'participantsCount', width: 18 },
      { header: 'Facilitator', key: 'facilitator', width: 25 },
      { header: 'Duration (min)', key: 'duration', width: 15 },
      { header: 'Notes', key: 'notes', width: 40 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };

    cssActivities.forEach(activity => {
      const cssLocation = cssLocations.find(c => c.id === activity.cssId);
      worksheet.addRow({
        id: activity.id,
        cssCode: cssLocation?.cssCode || '',
        cssName: cssLocation?.cssName || '',
        activityDate: activity.activityDate,
        activityType: activity.activityType,
        boys: activity.boys,
        girls: activity.girls,
        participantsCount: activity.participantsCount,
        facilitator: activity.facilitator,
        duration: activity.duration,
        notes: activity.notes
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `CSS_Activities_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const openAddActivity = (cssId: number) => {
    setSelectedCssId(cssId);
    setActivityFormData({ ...activityFormData, cssId });
    setShowAddActivityModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className="text-sm font-semibold text-gray-900">{t('caseManagement.childSafeSpaceTitle')}</h2>
          <p className="text-xs text-gray-600 mt-0.5">{t('caseManagement.childSafeSpaceDescription')}</p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleExportLocations}
            className={`px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="w-4 h-4" />
            {t('caseManagement.exportCSSLocations')}
          </button>
          <button
            onClick={handleExportActivities}
            className={`px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="w-4 h-4" />
            {t('caseManagement.exportCSSActivities')}
          </button>
          <button
            onClick={() => setShowAddLocationModal(true)}
            className={`px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="w-4 h-4" />
            {t('caseManagement.addCSSLocation')}
          </button>
        </div>
      </div>
      
      {/* CSS Locations */}
      {cssLocations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
          <p className="text-sm font-medium">{t('caseManagement.noCSSLocations')}</p>
          <p className="text-xs mt-1">{t('caseManagement.noCSSLocationsDescription')}</p>
        </div>
      ) : (
        cssLocations.map((css) => {
          const activities = cssActivities.filter(a => a.cssId === css.id);
          const totalChildren = activities.reduce((sum, a) => sum + a.participantsCount, 0);
          const totalBoys = activities.reduce((sum, a) => sum + a.boys, 0);
          const totalGirls = activities.reduce((sum, a) => sum + a.girls, 0);
          
          return (
            <div key={css.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <h3 className="text-lg font-semibold text-gray-900">{css.cssName}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${css.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {css.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{css.cssCode}</p>
                </div>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <button
                    onClick={() => {
                      setEditingLocation(css);
                      setLocationFormData(css);
                      setShowEditLocationModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => {
                      setDeletingLocationId(css.id);
                      setShowDeleteLocationModal(true);
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-xs text-gray-600">{t('caseManagement.location')}</p>
                  <p className="text-sm font-medium text-gray-900">{css.location}</p>
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-xs text-gray-600">{t('caseManagement.capacity')}</p>
                  <p className="text-sm font-medium text-gray-900" dir="ltr">{formatNumber(css.capacity)} {t('caseManagement.childrenPerDay')}</p>
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-xs text-gray-600">{t('caseManagement.ageGroups')}</p>
                  <p className="text-sm font-medium text-gray-900">{css.ageGroupsServed}</p>
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-xs text-gray-600">{t('caseManagement.operatingHours')}</p>
                  <p className="text-sm font-medium text-gray-900">{css.operatingHours}</p>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <h4 className="text-md font-semibold text-gray-900">{t('caseManagement.activitiesSummary')}</h4>
                  <button
                    onClick={() => openAddActivity(css.id)}
                    className={`text-sm text-primary hover:text-primary/80 flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Plus className="w-4 h-4" />
                    {t('caseManagement.logActivity')}
                  </button>
                </div>
                
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700" dir="ltr">{formatNumber(activities.length)}</p>
                    <p className="text-xs text-blue-600">{t('caseManagement.totalActivities')}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-700" dir="ltr">{formatNumber(totalChildren)}</p>
                    <p className="text-xs text-green-600">{t('caseManagement.childrenReached')}</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-700" dir="ltr">{formatNumber(totalBoys)}</p>
                    <p className="text-xs text-purple-600">{t('caseManagement.boys')}</p>
                  </div>
                  <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-pink-700" dir="ltr">{formatNumber(totalGirls)}</p>
                    <p className="text-xs text-pink-600">{t('caseManagement.girls')}</p>
                  </div>
                </div>

                {/* Activities Table */}
                {activities.length > 0 && (
                  <div className="bg-gray-50 rounded-lg overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
                    <table className="w-full text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
                      <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                          <th className={`px-3 py-2 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.date')}</th>
                          <th className={`px-3 py-2 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.activityType')}</th>
                          <th className={`px-3 py-2 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-center'}`}>{t('caseManagement.boys')}</th>
                          <th className={`px-3 py-2 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-center'}`}>{t('caseManagement.girls')}</th>
                          <th className={`px-3 py-2 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-center'}`}>{t('caseManagement.total')}</th>
                          <th className={`px-3 py-2 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.facilitator')}</th>
                          <th className={`px-3 py-2 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-center'}`}>{t('common.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {activities.map(activity => (
                          <tr key={activity.id} className="hover:bg-gray-50">
                            <td className={`px-3 py-2 text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{activity.activityDate}</td>
                            <td className={`px-3 py-2 text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{activity.activityType}</td>
                            <td className={`px-3 py-2 text-gray-900 ${isRTL ? 'text-right' : 'text-center'}`} dir="ltr">{activity.boys}</td>
                            <td className={`px-3 py-2 text-gray-900 ${isRTL ? 'text-right' : 'text-center'}`} dir="ltr">{activity.girls}</td>
                            <td className={`px-3 py-2 font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-center'}`} dir="ltr">{activity.participantsCount}</td>
                            <td className={`px-3 py-2 text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{activity.facilitator}</td>
                            <td className={`px-3 py-2 ${isRTL ? 'text-left' : 'text-center'}`}>
                              <div className={`flex items-center gap-2 ${isRTL ? 'justify-start' : 'justify-center'}`}>
                                <button
                                  onClick={() => {
                                    setEditingActivity(activity);
                                    setActivityFormData(activity);
                                    setShowEditActivityModal(true);
                                  }}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    setDeletingActivityId(activity.id);
                                    setShowDeleteActivityModal(true);
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Add/Edit CSS Location Modal */}
      {(showAddLocationModal || showEditLocationModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {showAddLocationModal ? 'Add CSS Location' : 'Edit CSS Location'}
              </h3>
              <button
                onClick={() => {
                  setShowAddLocationModal(false);
                  setShowEditLocationModal(false);
                  setEditingLocation(null);
                  resetLocationForm();
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CSS Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={locationFormData.cssCode || ''}
                    onChange={(e) => setLocationFormData({ ...locationFormData, cssCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="CSS-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CSS Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={locationFormData.cssName || ''}
                    onChange={(e) => setLocationFormData({ ...locationFormData, cssName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Al-Amal Child Safe Space"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={locationFormData.location || ''}
                  onChange={(e) => setLocationFormData({ ...locationFormData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Al-Amal District, Community Center"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity (children/day)
                  </label>
                  <input
                    type="number"
                    value={locationFormData.capacity || ''}
                    onChange={(e) => setLocationFormData({ ...locationFormData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="50"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age Groups Served
                  </label>
                  <input
                    type="text"
                    value={locationFormData.ageGroupsServed || ''}
                    onChange={(e) => setLocationFormData({ ...locationFormData, ageGroupsServed: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="6-12, 13-17"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={locationFormData.status || 'Active'}
                    onChange={(e) => setLocationFormData({ ...locationFormData, status: e.target.value as 'Active' | 'Inactive' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operating Hours
                </label>
                <input
                  type="text"
                  value={locationFormData.operatingHours || ''}
                  onChange={(e) => setLocationFormData({ ...locationFormData, operatingHours: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="9:00 AM - 3:00 PM"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facilitators
                </label>
                <input
                  type="text"
                  value={locationFormData.facilitators || ''}
                  onChange={(e) => setLocationFormData({ ...locationFormData, facilitators: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Ahmed Ali, Fatima Hassan"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddLocationModal(false);
                  setShowEditLocationModal(false);
                  setEditingLocation(null);
                  resetLocationForm();
                }}
                className="px-6 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={showAddLocationModal ? handleAddLocation : handleEditLocation}
                className="px-6 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90"
              >
                {showAddLocationModal ? 'Add Location' : 'Update Location'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit CSS Activity Modal */}
      {(showAddActivityModal || showEditActivityModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {showAddActivityModal ? 'Log CSS Activity' : 'Edit CSS Activity'}
              </h3>
              <button
                onClick={() => {
                  setShowAddActivityModal(false);
                  setShowEditActivityModal(false);
                  setEditingActivity(null);
                  resetActivityForm();
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {showAddActivityModal && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CSS Location <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={activityFormData.cssId || ''}
                    onChange={(e) => setActivityFormData({ ...activityFormData, cssId: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select CSS Location</option>
                    {cssLocations.map(css => (
                      <option key={css.id} value={css.id}>{css.cssName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Activity Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={activityFormData.activityDate || ''}
                    onChange={(e) => setActivityFormData({ ...activityFormData, activityDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={activityFormData.duration || 60}
                    onChange={(e) => setActivityFormData({ ...activityFormData, duration: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity Type <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={activityFormData.activityType || ''}
                  onChange={(e) => setActivityFormData({ ...activityFormData, activityType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Art & Drawing, Sports & Games, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Boys
                  </label>
                  <input
                    type="number"
                    value={activityFormData.boys || 0}
                    onChange={(e) => setActivityFormData({ ...activityFormData, boys: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Girls
                  </label>
                  <input
                    type="number"
                    value={activityFormData.girls || 0}
                    onChange={(e) => setActivityFormData({ ...activityFormData, girls: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facilitator
                </label>
                <input
                  type="text"
                  value={activityFormData.facilitator || ''}
                  onChange={(e) => setActivityFormData({ ...activityFormData, facilitator: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Ahmed Ali"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={activityFormData.notes || ''}
                  onChange={(e) => setActivityFormData({ ...activityFormData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Activity observations"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddActivityModal(false);
                  setShowEditActivityModal(false);
                  setEditingActivity(null);
                  resetActivityForm();
                }}
                className="px-6 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={showAddActivityModal ? handleAddActivity : handleEditActivity}
                className="px-6 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90"
              >
                {showAddActivityModal ? 'Log Activity' : 'Update Activity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Location Modal */}
      {showDeleteLocationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete CSS Location</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this CSS location? This will also delete all associated activities. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteLocationModal(false);
                  setDeletingLocationId(null);
                }}
                className="px-6 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLocation}
                className="px-6 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Activity Modal */}
      {showDeleteActivityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete CSS Activity</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this activity? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteActivityModal(false);
                  setDeletingActivityId(null);
                }}
                className="px-6 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteActivity}
                className="px-6 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}