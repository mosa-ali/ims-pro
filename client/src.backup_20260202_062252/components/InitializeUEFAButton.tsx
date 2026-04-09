/**
 * ============================================================================
 * INITIALIZE UEFA PROJECT BUTTON
 * ============================================================================
 * 
 * Quick button to initialize UEFA project with complete data for testing
 * Central Documents auto-sync functionality
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { Database, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { initializeUEFADocuments } from '@/services/InitializeUEFADocuments';
import { AllTabsExcelService } from '@/services/AllTabsExcelGenerationService';

export function InitializeUEFAButton() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyExists, setAlreadyExists] = useState(false);

  const handleInitialize = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setAlreadyExists(false);

    try {
      // Check if already exists
      const existing = AllTabsExcelService.getProjectDocuments('UEFA-FOUND-001');
      if (existing.length > 0) {
        setAlreadyExists(true);
        setLoading(false);
        return;
      }

      // Initialize
      await initializeUEFADocuments();
      
      setSuccess(true);
      
      // Reload page after 2 seconds to show new documents
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Initialization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Database className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Initialize UEFA Test Project
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            Generate sample UEFA project with activities, tasks, budget, forecast, and auto-sync to Central Documents.
          </p>

          {/* Success Message */}
          {success && (
            <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-green-700">
                <strong>Success!</strong> UEFA project initialized with 7 documents. Page will reload...
              </div>
            </div>
          )}

          {/* Already Exists Message */}
          {alreadyExists && (
            <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-700">
                UEFA documents already exist. Use "Sync Data" button to regenerate.
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-700">
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}

          {/* Initialize Button */}
          <button
            onClick={handleInitialize}
            disabled={loading || success}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Initializing...
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Initialized!
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                Initialize UEFA Project
              </>
            )}
          </button>

          {/* What will be created */}
          {!success && !alreadyExists && (
            <div className="mt-3 text-xs text-gray-500">
              <strong>Will create:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>5 Activities (€750,000 total budget)</li>
                <li>5 Tasks with assignments</li>
                <li>Budget breakdown (5 categories)</li>
                <li>12 months forecast data</li>
                <li>3 Procurement items</li>
                <li>3 Indicators with targets</li>
                <li>Sample beneficiaries data</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InitializeUEFAButton;
