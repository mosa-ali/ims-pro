/**
 * ============================================================================
 * SEED TEST SURVEY DATA
 * ============================================================================
 * 
 * Creates the "test" survey with sample questions and submissions
 * to demonstrate the Data Table functionality
 * 
 * ============================================================================
 */

import { v4 as uuidv4 } from 'uuid';

export function seedTestSurvey(projectId: string) {
  const SURVEYS_KEY = 'meal_surveys';
  const SUBMISSIONS_KEY = 'meal_submissions';
  
  // Check if test survey already exists
  const existingSurveys = JSON.parse(localStorage.getItem(SURVEYS_KEY) || '[]');
  const testSurvey = existingSurveys.find((s: any) => s.name === 'test' && s.projectId === projectId);
  
  if (testSurvey) {
    console.log('✅ Test survey already exists');
    return testSurvey;
  }
  
  // Create test survey
  const surveyId = uuidv4();
  const newSurvey = {
    id: surveyId,
    projectId: projectId,
    name: 'test',
    nameAr: 'اختبار',
    description: 'Test survey with sample questions',
    descriptionAr: 'استطلاع تجريبي مع أسئلة عينة',
    type: 'custom',
    language: 'multi',
    targetGroup: 'General',
    consentRequired: false,
    status: 'published',
    questions: [],
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    version: 1,
    submissionsCount: 1,
  };
  
  // Add to surveys list
  existingSurveys.push(newSurvey);
  localStorage.setItem(SURVEYS_KEY, JSON.stringify(existingSurveys));
  
  // Create questions (matching scr 1)
  const questionId1 = uuidv4();
  const questionId2 = uuidv4();
  const questionId3 = uuidv4();
  
  const questions = [
    {
      id: questionId1,
      surveyId: surveyId,
      order: 1,
      type: 'text',
      question: 'Country',
      questionAr: 'الدولة',
      label: 'Country',
      required: true,
    },
    {
      id: questionId2,
      surveyId: surveyId,
      order: 2,
      type: 'date',
      question: 'Add date',
      questionAr: 'أضف التاريخ',
      label: 'Add date',
      required: false,
    },
    {
      id: questionId3,
      surveyId: surveyId,
      order: 3,
      type: 'text',
      question: 'governorate',
      questionAr: 'المحافظة',
      label: 'governorate',
      required: false,
    },
  ];
  
  // Save questions to separate storage
  const questionsKey = `survey_questions_${surveyId}`;
  localStorage.setItem(questionsKey, JSON.stringify({
    formId: surveyId,
    projectId: projectId,
    title: 'test',
    questions: questions,
    lastModified: new Date().toISOString(),
  }));
  
  // Create a sample submission (matching scr 2)
  const submissionId = uuidv4();
  const submission = {
    id: submissionId,
    surveyId: surveyId,
    projectId: projectId,
    submittedBy: 'Sarah Johnson',
    submittedAt: '2026-01-21T00:00:00.000Z',
    responses: [
      {
        questionId: questionId1,
        value: 'Jordan',
      },
      {
        questionId: questionId2,
        value: '2026-01-15',
      },
      {
        questionId: questionId3,
        value: 'Amman',
      },
    ],
    status: 'completed',
    syncStatus: 'synced',
    validationStatus: 'pending',
    metadata: {
      startTime: '2026-01-21T05:36:00.000Z',
      endTime: '2026-01-21T06:24:00.000Z',
      duration: 48,
      deviceId: 'web-app-001',
    },
  };
  
  // Add submission to storage
  const existingSubmissions = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '[]');
  existingSubmissions.push(submission);
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(existingSubmissions));
  
  console.log('✅ Test survey created with sample data');
  console.log('Survey ID:', surveyId);
  console.log('Questions:', questions.length);
  console.log('Submissions:', 1);
  
  return newSurvey;
}