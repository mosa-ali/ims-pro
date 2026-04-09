/**
 * ============================================================================
 * MEAL SERVICE - Complete Backend Service
 * ============================================================================
 * 
 * Provides full CRUD operations for:
 * - Surveys (Create, Read, Update, Delete)
 * - Survey Questions
 * - Survey Submissions/Responses
 * - Indicators (Create, Read, Update, Delete)
 * - Indicator Data Entry
 * - MEAL Reports
 * 
 * Features:
 * - Real data persistence (localStorage)
 * - Data validation
 * - Business logic
 * - Duplicate prevention
 * - Audit logging
 * - Export/Import support
 * 
 * ============================================================================
 */

import { v7 as uuidv7 } from 'uuid';

// Helper to generate UUID
const uuidv4 = uuidv7;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type SurveyType = 'baseline' | 'endline' | 'pdm' | 'aap' | 'custom';
export type SurveyLanguage = 'en' | 'ar' | 'multi';
export type SurveyStatus = 'draft' | 'published' | 'archived';
export type QuestionType = 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'date' | 'location' | 'photo';

export interface Survey {
  id: string;
  projectId: string;
  name: string;
  nameAr?: string;
  description: string;
  descriptionAr?: string;
  type: SurveyType;
  language: SurveyLanguage;
  targetGroup?: string;
  consentRequired: boolean;
  status: SurveyStatus;
  questions: SurveyQuestion[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  version: number;
  submissionsCount: number;
  templateId?: string; // Link to template if created from template
  isTemplate?: boolean; // Flag to identify if this is a template
}

export interface SurveyQuestion {
  id: string;
  surveyId: string;
  order: number;
  type: QuestionType;
  question: string;
  questionAr?: string;
  required: boolean;
  options?: string[];
  optionsAr?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  logic?: {
    showIf?: {
      questionId: string;
      value: any;
    };
  };
}

export interface SurveySubmission {
  id: string;
  surveyId: string;
  projectId: string;
  submittedBy: string;
  submittedAt: string;
  responses: SurveyResponse[];
  location?: {
    latitude: number;
    longitude: number;
    governorate?: string;
    district?: string;
  };
  status: 'completed' | 'partial';
  deviceInfo?: string;
  syncStatus: 'synced' | 'pending';
}

export interface SurveyResponse {
  questionId: string;
  value: any;
  valueAr?: any;
}

// Indicator Types
export type IndicatorType = 'output' | 'outcome' | 'impact';
export type DataSource = 'survey' | 'manual' | 'automatic' | 'external';
export type MeasurementUnit = 'number' | 'percentage' | 'ratio' | 'index';
export type DisaggregationType = 'gender' | 'age' | 'location' | 'disability' | 'none';

export interface Indicator {
  id: string;
  projectId: string;
  code: string;
  name: string;
  nameAr?: string;
  description: string;
  descriptionAr?: string;
  type: IndicatorType;
  category: string;
  sector: string;
  unit: MeasurementUnit;
  dataSource: DataSource;
  collectionFrequency: 'monthly' | 'quarterly' | 'annually' | 'adhoc';
  baseline: number;
  target: number;
  current: number;
  disaggregation: DisaggregationType[];
  responsiblePerson: string;
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IndicatorDataEntry {
  id: string;
  indicatorId: string;
  projectId: string;
  period: string; // YYYY-MM format
  value: number;
  disaggregatedData?: {
    male?: number;
    female?: number;
    ageGroups?: Record<string, number>;
    locations?: Record<string, number>;
    disability?: { pwd: number; nonPwd: number };
  };
  notes?: string;
  enteredBy: string;
  enteredAt: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}

// ✅ Deleted Records Type
export interface DeletedRecord {
  id: string;
  recordType: 'Survey' | 'Indicator' | 'Submission' | 'IndicatorData';
  recordId: string;
  recordName: string;
  module: 'MEAL';
  deletedBy: string;
  deletedAt: string;
  originalStatus?: string;
  originalData: any; // Store full record for restoration
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  SURVEYS: 'meal_surveys',
  SUBMISSIONS: 'meal_submissions',
  INDICATORS: 'meal_indicators',
  INDICATOR_DATA: 'meal_indicator_data',
  AUDIT_LOG: 'meal_audit_log',
  DELETED_RECORDS: 'meal_deleted_records', // ✅ Track all soft-deleted records
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getFromStorage<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading from storage (${key}):`, error);
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to storage (${key}):`, error);
    throw new Error('Failed to save data');
  }
}

function logAudit(action: string, entityType: string, entityId: string, userId: string, details?: any) {
  const auditLog = getFromStorage<any>(STORAGE_KEYS.AUDIT_LOG);
  auditLog.push({
    id: uuidv4(),
    action,
    entityType,
    entityId,
    userId,
    timestamp: new Date().toISOString(),
    details,
  });
  saveToStorage(STORAGE_KEYS.AUDIT_LOG, auditLog);
}

// ============================================================================
// SURVEY CRUD OPERATIONS
// ============================================================================

export const surveyService = {
  // Create new survey
  createSurvey(data: Omit<Survey, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'submissionsCount'>, userId: string): Survey {
    const surveys = getFromStorage<Survey>(STORAGE_KEYS.SURVEYS);
    
    // Check for duplicate survey name in project
    const duplicate = surveys.find(
      s => s.projectId === data.projectId && s.name.toLowerCase() === data.name.toLowerCase() && s.status !== 'archived'
    );
    if (duplicate) {
      throw new Error('A survey with this name already exists in the project');
    }

    const newSurvey: Survey = {
      ...data,
      id: uuidv4(),
      questions: [],
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      submissionsCount: 0,
    };

    surveys.push(newSurvey);
    saveToStorage(STORAGE_KEYS.SURVEYS, surveys);
    logAudit('CREATE', 'survey', newSurvey.id, userId, { projectId: data.projectId, name: data.name });

    return newSurvey;
  },

  // Get all surveys
  getAllSurveys(filters?: { projectId?: string; status?: SurveyStatus; type?: SurveyType }): Survey[] {
    let surveys = getFromStorage<Survey>(STORAGE_KEYS.SURVEYS);

    // ✅ Filter out archived surveys by default (unless specifically requested)
    if (!filters?.status || filters.status !== 'archived') {
      surveys = surveys.filter(s => s.status !== 'archived');
    }

    // ✅ Filter out templates from regular survey list
    surveys = surveys.filter(s => !s.isTemplate);

    if (filters?.projectId) {
      surveys = surveys.filter(s => s.projectId === filters.projectId);
    }
    if (filters?.status) {
      surveys = surveys.filter(s => s.status === filters.status);
    }
    if (filters?.type) {
      surveys = surveys.filter(s => s.type === filters.type);
    }

    // ✅ Load questions for each survey from separate storage
    surveys = surveys.map(survey => {
      const questionsKey = `survey_questions_${survey.id}`;
      const storedQuestions = localStorage.getItem(questionsKey);
      
      if (storedQuestions) {
        try {
          const questionsData = JSON.parse(storedQuestions);
          if (questionsData.questions && Array.isArray(questionsData.questions)) {
            return { ...survey, questions: questionsData.questions };
          }
        } catch (error) {
          console.error('Error parsing questions for survey:', survey.id, error);
        }
      }
      
      return survey;
    });

    return surveys.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // Get survey by ID
  getSurveyById(id: string): Survey | null {
    const surveys = getFromStorage<Survey>(STORAGE_KEYS.SURVEYS);
    const survey = surveys.find(s => s.id === id);
    
    if (!survey) return null;
    
    // ✅ Load questions from separate storage
    const questionsKey = `survey_questions_${id}`;
    const storedQuestions = localStorage.getItem(questionsKey);
    
    if (storedQuestions) {
      try {
        const questionsData = JSON.parse(storedQuestions);
        if (questionsData.questions && Array.isArray(questionsData.questions)) {
          survey.questions = questionsData.questions;
        }
      } catch (error) {
        console.error('Error loading survey questions:', error);
      }
    }
    
    return survey;
  },

  // Update survey
  updateSurvey(id: string, updates: Partial<Survey>, userId: string): Survey {
    const surveys = getFromStorage<Survey>(STORAGE_KEYS.SURVEYS);
    const index = surveys.findIndex(s => s.id === id);

    if (index === -1) {
      throw new Error('Survey not found');
    }

    // Check for duplicate name if name is being updated
    if (updates.name && updates.name !== surveys[index].name) {
      const duplicate = surveys.find(
        s => s.id !== id && s.projectId === surveys[index].projectId && s.name.toLowerCase() === updates.name!.toLowerCase() && s.status !== 'archived'
      );
      if (duplicate) {
        throw new Error('A survey with this name already exists in the project');
      }
    }

    surveys[index] = {
      ...surveys[index],
      ...updates,
      updatedAt: new Date().toISOString(),
      version: surveys[index].version + 1,
    };

    saveToStorage(STORAGE_KEYS.SURVEYS, surveys);
    logAudit('UPDATE', 'survey', id, userId, updates);

    return surveys[index];
  },

  // Delete survey (soft delete - archive)
  deleteSurvey(id: string, userId: string): void {
    const surveys = getFromStorage<Survey>(STORAGE_KEYS.SURVEYS);
    const index = surveys.findIndex(s => s.id === id);

    if (index === -1) {
      throw new Error('Survey not found');
    }

    const survey = surveys[index];

    // ✅ Add to deleted records BEFORE archiving
    deletedRecordsService.addDeletedRecord(
      'Survey',
      survey.id,
      survey.name,
      { ...survey }, // Store full survey data
      userId,
      survey.status
    );

    surveys[index].status = 'archived';
    surveys[index].updatedAt = new Date().toISOString();

    saveToStorage(STORAGE_KEYS.SURVEYS, surveys);
    logAudit('DELETE', 'survey', id, userId);
  },

  // Add questions to survey
  addQuestions(surveyId: string, questions: Omit<SurveyQuestion, 'id' | 'surveyId'>[], userId: string): Survey {
    const surveys = getFromStorage<Survey>(STORAGE_KEYS.SURVEYS);
    const index = surveys.findIndex(s => s.id === surveyId);

    if (index === -1) {
      throw new Error('Survey not found');
    }

    const newQuestions: SurveyQuestion[] = questions.map(q => ({
      ...q,
      id: uuidv4(),
      surveyId,
    }));

    surveys[index].questions = [...surveys[index].questions, ...newQuestions];
    surveys[index].updatedAt = new Date().toISOString();
    surveys[index].version += 1;

    saveToStorage(STORAGE_KEYS.SURVEYS, surveys);
    logAudit('ADD_QUESTIONS', 'survey', surveyId, userId, { count: questions.length });

    return surveys[index];
  },

  // Update questions
  updateQuestions(surveyId: string, questions: SurveyQuestion[], userId: string): Survey {
    const surveys = getFromStorage<Survey>(STORAGE_KEYS.SURVEYS);
    const index = surveys.findIndex(s => s.id === surveyId);

    if (index === -1) {
      throw new Error('Survey not found');
    }

    surveys[index].questions = questions;
    surveys[index].updatedAt = new Date().toISOString();
    surveys[index].version += 1;

    saveToStorage(STORAGE_KEYS.SURVEYS, surveys);
    logAudit('UPDATE_QUESTIONS', 'survey', surveyId, userId, { count: questions.length });

    return surveys[index];
  },

  // Publish survey
  publishSurvey(id: string, userId: string): Survey {
    return this.updateSurvey(id, { status: 'published', publishedAt: new Date().toISOString() }, userId);
  },

  // Clone survey
  cloneSurvey(id: string, newName: string, userId: string): Survey {
    const survey = this.getSurveyById(id);
    if (!survey) {
      throw new Error('Survey not found');
    }

    const cloned = {
      ...survey,
      name: newName,
      status: 'draft' as SurveyStatus,
      questions: survey.questions.map(q => ({ ...q, id: uuidv4() })),
    };

    return this.createSurvey(cloned, userId);
  },

  // ✅ Get all templates (surveys marked as templates)
  getAllTemplates(): Survey[] {
    const surveys = getFromStorage<Survey>(STORAGE_KEYS.SURVEYS);
    return surveys
      .filter(s => s.isTemplate === true && s.status !== 'archived') // ✅ Don't show archived templates
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // ✅ Create template from survey
  createTemplate(surveyId: string, userId: string): Survey {
    const survey = this.getSurveyById(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    // Mark as template
    return this.updateSurvey(surveyId, { isTemplate: true }, userId);
  },

  // ✅ Use template to create new survey
  useTemplate(templateId: string, projectId: string, surveyName: string, userId: string): Survey {
    const template = this.getSurveyById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Create new survey from template
    const newSurvey = this.createSurvey({
      projectId,
      name: surveyName,
      nameAr: template.nameAr,
      description: template.description,
      descriptionAr: template.descriptionAr,
      type: template.type,
      language: template.language,
      targetGroup: template.targetGroup,
      consentRequired: template.consentRequired,
      status: 'draft',
      templateId: templateId,
    }, userId);

    // Copy questions from template
    if (template.questions && template.questions.length > 0) {
      const questionsWithoutIds = template.questions.map(q => ({
        order: q.order,
        type: q.type,
        question: q.question,
        questionAr: q.questionAr,
        required: q.required,
        options: q.options,
        optionsAr: q.optionsAr,
        validation: q.validation,
        logic: q.logic,
      }));
      this.addQuestions(newSurvey.id, questionsWithoutIds, userId);
    }

    return this.getSurveyById(newSurvey.id)!;
  },
};

// ============================================================================
// SURVEY SUBMISSION OPERATIONS
// ============================================================================

export const submissionService = {
  // Submit survey response
  submitSurvey(data: Omit<SurveySubmission, 'id' | 'submittedAt' | 'syncStatus'>, userId: string): SurveySubmission {
    const submissions = getFromStorage<SurveySubmission>(STORAGE_KEYS.SUBMISSIONS);
    
    const newSubmission: SurveySubmission = {
      ...data,
      id: uuidv4(),
      submittedBy: userId,
      submittedAt: new Date().toISOString(),
      syncStatus: 'synced',
    };

    submissions.push(newSubmission);
    saveToStorage(STORAGE_KEYS.SUBMISSIONS, submissions);

    // Update survey submission count
    const surveys = getFromStorage<Survey>(STORAGE_KEYS.SURVEYS);
    const surveyIndex = surveys.findIndex(s => s.id === data.surveyId);
    if (surveyIndex !== -1) {
      surveys[surveyIndex].submissionsCount += 1;
      saveToStorage(STORAGE_KEYS.SURVEYS, surveys);
    }

    logAudit('SUBMIT', 'survey_submission', newSubmission.id, userId, { surveyId: data.surveyId });

    return newSubmission;
  },

  // Get all submissions
  getAllSubmissions(filters?: { surveyId?: string; projectId?: string; status?: 'completed' | 'partial' }): SurveySubmission[] {
    let submissions = getFromStorage<SurveySubmission>(STORAGE_KEYS.SUBMISSIONS);

    if (filters?.surveyId) {
      submissions = submissions.filter(s => s.surveyId === filters.surveyId);
    }
    if (filters?.projectId) {
      submissions = submissions.filter(s => s.projectId === filters.projectId);
    }
    if (filters?.status) {
      submissions = submissions.filter(s => s.status === filters.status);
    }

    return submissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  },

  // Get submission by ID
  getSubmissionById(id: string): SurveySubmission | null {
    const submissions = getFromStorage<SurveySubmission>(STORAGE_KEYS.SUBMISSIONS);
    return submissions.find(s => s.id === id) || null;
  },

  // Delete submission
  deleteSubmission(id: string, userId: string): void {
    const submissions = getFromStorage<SurveySubmission>(STORAGE_KEYS.SUBMISSIONS);
    const index = submissions.findIndex(s => s.id === id);

    if (index === -1) {
      throw new Error('Submission not found');
    }

    const submission = submissions[index];
    submissions.splice(index, 1);
    saveToStorage(STORAGE_KEYS.SUBMISSIONS, submissions);

    // Update survey submission count
    const surveys = getFromStorage<Survey>(STORAGE_KEYS.SURVEYS);
    const surveyIndex = surveys.findIndex(s => s.id === submission.surveyId);
    if (surveyIndex !== -1 && surveys[surveyIndex].submissionsCount > 0) {
      surveys[surveyIndex].submissionsCount -= 1;
      saveToStorage(STORAGE_KEYS.SURVEYS, surveys);
    }

    logAudit('DELETE', 'survey_submission', id, userId);
  },

  // Get submission statistics
  getSubmissionStats(surveyId: string) {
    const submissions = this.getAllSubmissions({ surveyId });
    const survey = surveyService.getSurveyById(surveyId);

    if (!survey) {
      throw new Error('Survey not found');
    }

    return {
      total: submissions.length,
      completed: submissions.filter(s => s.status === 'completed').length,
      partial: submissions.filter(s => s.status === 'partial').length,
      byDate: this.groupSubmissionsByDate(submissions),
      byLocation: this.groupSubmissionsByLocation(submissions),
    };
  },

  groupSubmissionsByDate(submissions: SurveySubmission[]) {
    const grouped: Record<string, number> = {};
    submissions.forEach(s => {
      const date = new Date(s.submittedAt).toISOString().split('T')[0];
      grouped[date] = (grouped[date] || 0) + 1;
    });
    return grouped;
  },

  groupSubmissionsByLocation(submissions: SurveySubmission[]) {
    const grouped: Record<string, number> = {};
    submissions.forEach(s => {
      if (s.location?.governorate) {
        grouped[s.location.governorate] = (grouped[s.location.governorate] || 0) + 1;
      }
    });
    return grouped;
  },
};

// ============================================================================
// INDICATOR CRUD OPERATIONS
// ============================================================================

export const indicatorService = {
  // Create new indicator
  createIndicator(data: Omit<Indicator, 'id' | 'createdAt' | 'updatedAt' | 'current'>, userId: string): Indicator {
    const indicators = getFromStorage<Indicator>(STORAGE_KEYS.INDICATORS);
    
    // Check for duplicate code
    const duplicate = indicators.find(
      i => i.projectId === data.projectId && i.code.toLowerCase() === data.code.toLowerCase()
    );
    if (duplicate) {
      throw new Error('An indicator with this code already exists in the project');
    }

    const newIndicator: Indicator = {
      ...data,
      id: uuidv4(),
      current: 0,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    indicators.push(newIndicator);
    saveToStorage(STORAGE_KEYS.INDICATORS, indicators);
    logAudit('CREATE', 'indicator', newIndicator.id, userId, { projectId: data.projectId, code: data.code });

    return newIndicator;
  },

  // Get all indicators
  getAllIndicators(filters?: { projectId?: string; type?: IndicatorType; status?: 'active' | 'inactive' }): Indicator[] {
    let indicators = getFromStorage<Indicator>(STORAGE_KEYS.INDICATORS);

    if (filters?.projectId) {
      indicators = indicators.filter(i => i.projectId === filters.projectId);
    }
    if (filters?.type) {
      indicators = indicators.filter(i => i.type === filters.type);
    }
    if (filters?.status) {
      indicators = indicators.filter(i => i.status === filters.status);
    }

    return indicators.sort((a, b) => a.code.localeCompare(b.code));
  },

  // Get indicator by ID
  getIndicatorById(id: string): Indicator | null {
    const indicators = getFromStorage<Indicator>(STORAGE_KEYS.INDICATORS);
    return indicators.find(i => i.id === id) || null;
  },

  // Update indicator
  updateIndicator(id: string, updates: Partial<Indicator>, userId: string): Indicator {
    const indicators = getFromStorage<Indicator>(STORAGE_KEYS.INDICATORS);
    const index = indicators.findIndex(i => i.id === id);

    if (index === -1) {
      throw new Error('Indicator not found');
    }

    // Check for duplicate code if code is being updated
    if (updates.code && updates.code !== indicators[index].code) {
      const duplicate = indicators.find(
        i => i.id !== id && i.projectId === indicators[index].projectId && i.code.toLowerCase() === updates.code!.toLowerCase()
      );
      if (duplicate) {
        throw new Error('An indicator with this code already exists in the project');
      }
    }

    indicators[index] = {
      ...indicators[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    saveToStorage(STORAGE_KEYS.INDICATORS, indicators);
    logAudit('UPDATE', 'indicator', id, userId, updates);

    return indicators[index];
  },

  // Delete indicator
  deleteIndicator(id: string, userId: string): void {
    const indicators = getFromStorage<Indicator>(STORAGE_KEYS.INDICATORS);
    const index = indicators.findIndex(i => i.id === id);

    if (index === -1) {
      throw new Error('Indicator not found');
    }

    indicators.splice(index, 1);
    saveToStorage(STORAGE_KEYS.INDICATORS, indicators);

    // Also delete associated data entries
    const dataEntries = getFromStorage<IndicatorDataEntry>(STORAGE_KEYS.INDICATOR_DATA);
    const filtered = dataEntries.filter(d => d.indicatorId !== id);
    saveToStorage(STORAGE_KEYS.INDICATOR_DATA, filtered);

    logAudit('DELETE', 'indicator', id, userId);
  },

  // Get indicator progress
  getIndicatorProgress(id: string) {
    const indicator = this.getIndicatorById(id);
    if (!indicator) {
      throw new Error('Indicator not found');
    }

    const dataEntries = getFromStorage<IndicatorDataEntry>(STORAGE_KEYS.INDICATOR_DATA);
    const indicatorData = dataEntries.filter(d => d.indicatorId === id && d.verified);

    const totalActual = indicatorData.reduce((sum, d) => sum + d.value, 0);
    const progress = indicator.target > 0 ? (totalActual / indicator.target) * 100 : 0;

    return {
      baseline: indicator.baseline,
      target: indicator.target,
      current: totalActual,
      progress: Math.min(progress, 100),
      dataPoints: indicatorData.length,
    };
  },
};

// ============================================================================
// INDICATOR DATA ENTRY OPERATIONS
// ============================================================================

export const indicatorDataService = {
  // Add data entry
  addDataEntry(data: Omit<IndicatorDataEntry, 'id' | 'enteredAt' | 'verified' | 'verifiedBy' | 'verifiedAt'>, userId: string): IndicatorDataEntry {
    const dataEntries = getFromStorage<IndicatorDataEntry>(STORAGE_KEYS.INDICATOR_DATA);
    
    // Check for duplicate entry (same indicator + period)
    const duplicate = dataEntries.find(
      d => d.indicatorId === data.indicatorId && d.period === data.period
    );
    if (duplicate) {
      throw new Error('Data entry for this indicator and period already exists');
    }

    const newEntry: IndicatorDataEntry = {
      ...data,
      id: uuidv4(),
      enteredBy: userId,
      enteredAt: new Date().toISOString(),
      verified: false,
    };

    dataEntries.push(newEntry);
    saveToStorage(STORAGE_KEYS.INDICATOR_DATA, dataEntries);

    // Update indicator current value
    this.updateIndicatorCurrent(data.indicatorId);

    logAudit('CREATE', 'indicator_data', newEntry.id, userId, { indicatorId: data.indicatorId, period: data.period });

    return newEntry;
  },

  // Get all data entries
  getAllDataEntries(filters?: { indicatorId?: string; projectId?: string; period?: string }): IndicatorDataEntry[] {
    let dataEntries = getFromStorage<IndicatorDataEntry>(STORAGE_KEYS.INDICATOR_DATA);

    if (filters?.indicatorId) {
      dataEntries = dataEntries.filter(d => d.indicatorId === filters.indicatorId);
    }
    if (filters?.projectId) {
      dataEntries = dataEntries.filter(d => d.projectId === filters.projectId);
    }
    if (filters?.period) {
      dataEntries = dataEntries.filter(d => d.period === filters.period);
    }

    return dataEntries.sort((a, b) => b.period.localeCompare(a.period));
  },

  // Update data entry
  updateDataEntry(id: string, updates: Partial<IndicatorDataEntry>, userId: string): IndicatorDataEntry {
    const dataEntries = getFromStorage<IndicatorDataEntry>(STORAGE_KEYS.INDICATOR_DATA);
    const index = dataEntries.findIndex(d => d.id === id);

    if (index === -1) {
      throw new Error('Data entry not found');
    }

    dataEntries[index] = {
      ...dataEntries[index],
      ...updates,
    };

    saveToStorage(STORAGE_KEYS.INDICATOR_DATA, dataEntries);

    // Update indicator current value
    this.updateIndicatorCurrent(dataEntries[index].indicatorId);

    logAudit('UPDATE', 'indicator_data', id, userId, updates);

    return dataEntries[index];
  },

  // Verify data entry
  verifyDataEntry(id: string, userId: string): IndicatorDataEntry {
    return this.updateDataEntry(id, {
      verified: true,
      verifiedBy: userId,
      verifiedAt: new Date().toISOString(),
    }, userId);
  },

  // Delete data entry
  deleteDataEntry(id: string, userId: string): void {
    const dataEntries = getFromStorage<IndicatorDataEntry>(STORAGE_KEYS.INDICATOR_DATA);
    const index = dataEntries.findIndex(d => d.id === id);

    if (index === -1) {
      throw new Error('Data entry not found');
    }

    const entry = dataEntries[index];
    dataEntries.splice(index, 1);
    saveToStorage(STORAGE_KEYS.INDICATOR_DATA, dataEntries);

    // Update indicator current value
    this.updateIndicatorCurrent(entry.indicatorId);

    logAudit('DELETE', 'indicator_data', id, userId);
  },

  // Update indicator current value based on all verified data
  updateIndicatorCurrent(indicatorId: string): void {
    const dataEntries = this.getAllDataEntries({ indicatorId });
    const verifiedData = dataEntries.filter(d => d.verified);
    const total = verifiedData.reduce((sum, d) => sum + d.value, 0);

    const indicators = getFromStorage<Indicator>(STORAGE_KEYS.INDICATORS);
    const index = indicators.findIndex(i => i.id === indicatorId);

    if (index !== -1) {
      indicators[index].current = total;
      indicators[index].updatedAt = new Date().toISOString();
      saveToStorage(STORAGE_KEYS.INDICATORS, indicators);
    }
  },
};

// ============================================================================
// INITIALIZE SAMPLE DATA
// ============================================================================

export function initializeMEALSampleData(projectId: string, userId: string) {
  // Initialize only if no data exists
  const existingSurveys = surveyService.getAllSurveys({ projectId });
  const existingIndicators = indicatorService.getAllIndicators({ projectId });

  if (existingSurveys.length === 0 && existingIndicators.length === 0) {
    // Create sample survey
    const survey = surveyService.createSurvey({
      projectId,
      name: 'Beneficiary Satisfaction Survey',
      nameAr: 'استطلاع رضا المستفيدين',
      description: 'Post-Distribution Monitoring survey to assess beneficiary satisfaction',
      descriptionAr: 'استطلاع مراقبة ما بعد التوزيع لتقييم رضا المستفيدين',
      type: 'pdm',
      language: 'multi',
      targetGroup: 'Beneficiaries',
      consentRequired: true,
      status: 'published',
      publishedAt: new Date().toISOString(),
    }, userId);

    // Add sample questions
    surveyService.addQuestions(survey.id, [
      {
        order: 1,
        type: 'radio',
        question: 'How satisfied are you with the services provided?',
        questionAr: 'ما مدى رضاك عن الخدمات المقدمة؟',
        required: true,
        options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'],
        optionsAr: ['راضٍ جداً', 'راضٍ', 'محايد', 'غير راضٍ', 'غير راضٍ على الإطلاق'],
      },
      {
        order: 2,
        type: 'checkbox',
        question: 'Which services did you receive?',
        questionAr: 'ما هي الخدمات التي تلقيتها؟',
        required: true,
        options: ['Food Assistance', 'Cash Transfer', 'Medical Support', 'Educational Support', 'Other'],
        optionsAr: ['مساعدات غذائية', 'تحويلات نقدية', 'دعم طبي', 'دعم تعليمي', 'أخرى'],
      },
      {
        order: 3,
        type: 'textarea',
        question: 'Any additional comments or suggestions?',
        questionAr: 'أي تعليقات أو اقتراحات إضافية؟',
        required: false,
      },
    ], userId);

    // Create sample indicators
    const indicator1 = indicatorService.createIndicator({
      projectId,
      code: 'IND-001',
      name: 'Number of beneficiaries reached',
      nameAr: 'عدد المستفيدين الذين تم الوصول إليهم',
      description: 'Total number of unique beneficiaries who received at least one service',
      descriptionAr: 'إجمالي عدد المستفيدين الفريدين الذين تلقوا خدمة واحدة على الأقل',
      type: 'output',
      category: 'Reach',
      sector: 'Multi-sector',
      unit: 'number',
      dataSource: 'manual',
      collectionFrequency: 'monthly',
      baseline: 0,
      target: 1000,
      disaggregation: ['gender', 'age'],
      responsiblePerson: 'MEAL Officer',
      status: 'active',
    }, userId);

    const indicator2 = indicatorService.createIndicator({
      projectId,
      code: 'IND-002',
      name: 'Beneficiary satisfaction rate',
      nameAr: 'معدل رضا المستفيدين',
      description: 'Percentage of beneficiaries satisfied or very satisfied with services',
      descriptionAr: 'نسبة المستفيدين الراضين أو الراضين جداً عن الخدمات',
      type: 'outcome',
      category: 'Quality',
      sector: 'Multi-sector',
      unit: 'percentage',
      dataSource: 'survey',
      collectionFrequency: 'quarterly',
      baseline: 0,
      target: 80,
      disaggregation: ['gender', 'location'],
      responsiblePerson: 'MEAL Officer',
      status: 'active',
    }, userId);

    // ✅ Create a sample archived/deleted survey to demonstrate the Deleted Records feature
    const archivedSurvey = surveyService.createSurvey({
      projectId,
      name: 'Old Baseline Survey (Archived)',
      nameAr: 'استطلاع خط الأساس القديم (مؤرشف)',
      description: 'Initial baseline survey - replaced by new version',
      descriptionAr: 'استطلاع خط الأساس الأولي - تم استبداله بنسخة جديدة',
      type: 'baseline',
      language: 'multi',
      targetGroup: 'Households',
      consentRequired: true,
      status: 'draft',
    }, userId);
    
    // Archive this survey to demonstrate deleted records
    surveyService.deleteSurvey(archivedSurvey.id, userId);

    console.log('✅ MEAL sample data initialized');
  }
}

// ============================================================================
// DELETED RECORDS SERVICE
// ============================================================================

export const deletedRecordsService = {
  // ✅ Add record to deleted records archive
  addDeletedRecord(
    recordType: 'Survey' | 'Indicator' | 'Submission' | 'IndicatorData',
    recordId: string,
    recordName: string,
    originalData: any,
    userId: string,
    originalStatus?: string
  ): DeletedRecord {
    const deletedRecords = getFromStorage<DeletedRecord>(STORAGE_KEYS.DELETED_RECORDS);
    
    const newRecord: DeletedRecord = {
      id: uuidv4(),
      recordType,
      recordId,
      recordName,
      module: 'MEAL',
      deletedBy: userId,
      deletedAt: new Date().toISOString(),
      originalStatus,
      originalData,
    };

    deletedRecords.push(newRecord);
    saveToStorage(STORAGE_KEYS.DELETED_RECORDS, deletedRecords);
    logAudit('ARCHIVE', 'deleted_record', newRecord.id, userId, { recordType, recordId, recordName });

    return newRecord;
  },

  // ✅ Get all deleted records
  getAllDeletedRecords(): DeletedRecord[] {
    const records = getFromStorage<DeletedRecord>(STORAGE_KEYS.DELETED_RECORDS);
    return records.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  },

  // ✅ Restore deleted record
  restoreRecord(recordType: string, recordId: string, userId: string): boolean {
    const deletedRecords = getFromStorage<DeletedRecord>(STORAGE_KEYS.DELETED_RECORDS);
    const index = deletedRecords.findIndex(
      r => r.recordType === recordType && r.recordId === recordId
    );

    if (index === -1) {
      throw new Error('Deleted record not found');
    }

    const deletedRecord = deletedRecords[index];

    try {
      // Restore based on type
      switch (deletedRecord.recordType) {
        case 'Survey':
          const surveys = getFromStorage<Survey>(STORAGE_KEYS.SURVEYS);
          const surveyIndex = surveys.findIndex(s => s.id === recordId);
          if (surveyIndex !== -1) {
            surveys[surveyIndex].status = 'draft'; // Restore as draft
            surveys[surveyIndex].updatedAt = new Date().toISOString();
            saveToStorage(STORAGE_KEYS.SURVEYS, surveys);
          }
          break;

        case 'Indicator':
          // Restore indicator from original data
          const indicators = getFromStorage<Indicator>(STORAGE_KEYS.INDICATORS);
          indicators.push(deletedRecord.originalData);
          saveToStorage(STORAGE_KEYS.INDICATORS, indicators);
          break;

        case 'Submission':
          // Restore submission from original data
          const submissions = getFromStorage<SurveySubmission>(STORAGE_KEYS.SUBMISSIONS);
          submissions.push(deletedRecord.originalData);
          saveToStorage(STORAGE_KEYS.SUBMISSIONS, submissions);
          break;

        case 'IndicatorData':
          // Restore indicator data from original data
          const dataEntries = getFromStorage<IndicatorDataEntry>(STORAGE_KEYS.INDICATOR_DATA);
          dataEntries.push(deletedRecord.originalData);
          saveToStorage(STORAGE_KEYS.INDICATOR_DATA, dataEntries);
          break;
      }

      // Remove from deleted records
      deletedRecords.splice(index, 1);
      saveToStorage(STORAGE_KEYS.DELETED_RECORDS, deletedRecords);
      logAudit('RESTORE', 'deleted_record', deletedRecord.id, userId, { recordType, recordId });

      return true;
    } catch (error) {
      console.error('Error restoring record:', error);
      throw new Error('Failed to restore record');
    }
  },

  // ✅ Permanently delete record
  permanentDelete(recordType: string, recordId: string, userId: string): boolean {
    const deletedRecords = getFromStorage<DeletedRecord>(STORAGE_KEYS.DELETED_RECORDS);
    const index = deletedRecords.findIndex(
      r => r.recordType === recordType && r.recordId === recordId
    );

    if (index === -1) {
      throw new Error('Deleted record not found');
    }

    const deletedRecord = deletedRecords[index];

    // Remove from deleted records permanently
    deletedRecords.splice(index, 1);
    saveToStorage(STORAGE_KEYS.DELETED_RECORDS, deletedRecords);
    logAudit('PERMANENT_DELETE', 'deleted_record', deletedRecord.id, userId, { recordType, recordId });

    return true;
  },
};

export default {
  surveyService,
  submissionService,
  indicatorService,
  indicatorDataService,
  deletedRecordsService,
  initializeMEALSampleData,
};