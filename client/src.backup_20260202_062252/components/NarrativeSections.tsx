import { useState, useEffect } from 'react';
import { Edit2, Save, X } from 'lucide-react';

interface NarrativeData {
  progressSummary?: string;
  challenges?: string;
  mitigationActions?: string;
  keyAchievements?: string;
  nextSteps?: string;
}

interface NarrativeSectionsProps {
  projectId: string;
  initialData?: NarrativeData;
  onSave?: (data: NarrativeData) => void;
}

export function NarrativeSections({ projectId, initialData, onSave }: NarrativeSectionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [narratives, setNarratives] = useState<NarrativeData>({
    progressSummary: initialData?.progressSummary || '',
    challenges: initialData?.challenges || '',
    mitigationActions: initialData?.mitigationActions || '',
    keyAchievements: initialData?.keyAchievements || '',
    nextSteps: initialData?.nextSteps || ''
  });

  useEffect(() => {
    if (initialData) {
      setNarratives({
        progressSummary: initialData.progressSummary || '',
        challenges: initialData.challenges || '',
        mitigationActions: initialData.mitigationActions || '',
        keyAchievements: initialData.keyAchievements || '',
        nextSteps: initialData.nextSteps || ''
      });
    }
  }, [initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // ✅ AUTHORITATIVE DATA: Persist narratives to Projects table in localStorage
      const projectsData = localStorage.getItem('pms_projects');
      const projects = projectsData ? JSON.parse(projectsData) : [];
      
      const projectIndex = projects.findIndex((p: any) => p.id === projectId);
      if (projectIndex !== -1) {
        projects[projectIndex].narratives = narratives;
        localStorage.setItem('pms_projects', JSON.stringify(projects));
      }
      
      // Call parent onSave if provided
      if (onSave) {
        onSave(narratives);
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save narratives:', error);
      alert('Failed to save narratives. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to initial data
    setNarratives({
      progressSummary: initialData?.progressSummary || '',
      challenges: initialData?.challenges || '',
      mitigationActions: initialData?.mitigationActions || '',
      keyAchievements: initialData?.keyAchievements || '',
      nextSteps: initialData?.nextSteps || ''
    });
    setIsEditing(false);
  };

  const handleChange = (field: keyof NarrativeData, value: string) => {
    setNarratives(prev => ({ ...prev, [field]: value }));
  };

  const sections = [
    {
      id: 'progressSummary',
      label: 'Progress Summary',
      placeholder: 'Summarize overall progress...',
      value: narratives.progressSummary || ''
    },
    {
      id: 'challenges',
      label: 'Challenges',
      placeholder: 'Describe key challenges faced...',
      value: narratives.challenges || ''
    },
    {
      id: 'mitigationActions',
      label: 'Mitigation Actions',
      placeholder: 'Outline mitigation strategies...',
      value: narratives.mitigationActions || ''
    },
    {
      id: 'keyAchievements',
      label: 'Key Achievements',
      placeholder: 'Highlight major accomplishments...',
      value: narratives.keyAchievements || ''
    },
    {
      id: 'nextSteps',
      label: 'Next Steps',
      placeholder: 'Outline upcoming activities...',
      value: narratives.nextSteps || ''
    }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Narrative Sections</h3>
            <p className="text-sm text-gray-500 mt-0.5">Editable text blocks for the report</p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors print:hidden"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Narrative Fields */}
      <div className="p-4 space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {section.label}
            </label>
            {isEditing ? (
              <textarea
                value={section.value}
                onChange={(e) => handleChange(section.id as keyof NarrativeData, e.target.value)}
                placeholder={section.placeholder}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              />
            ) : (
              <div className="min-h-[72px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                {section.value || (
                  <span className="text-gray-400 italic">{section.placeholder}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons (only shown when editing) */}
      {isEditing && (
        <div className="px-4 pb-4 flex items-center justify-end gap-2">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Narratives
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}