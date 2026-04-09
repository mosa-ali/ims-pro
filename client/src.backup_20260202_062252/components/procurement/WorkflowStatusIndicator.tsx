// ============================================================================
// WORKFLOW STATUS INDICATOR
// Shows current workflow progress and next action
// Integrated Management System (IMS)
// ============================================================================

import React, { useState } from 'react';
import { CheckCircle, Clock, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { procurementWorkflowAutomationService } from '@/services/procurementWorkflowAutomationService';
import { analysisFormService } from '@/services/analysisFormService';

interface Props {
  prId: string;
  onRefresh?: () => void; // Callback to refresh parent component
}

export function WorkflowStatusIndicator({ prId, onRefresh }: Props) {
  const [creating, setCreating] = useState(false);
  const status = procurementWorkflowAutomationService.getWorkflowStatus(prId);

  const steps = status.isTender ? [
    {
      id: 'pr',
      label: 'PR Approved',
      completed: status.prApproved,
      icon: status.prApproved ? CheckCircle : Clock
    },
    {
      id: 'tender',
      label: 'Tender Announced',
      completed: status.tenderAnnounced,
      icon: status.tenderAnnounced ? CheckCircle : Clock
    },
    {
      id: 'closed',
      label: 'Announcement Closed',
      completed: status.announcementClosed,
      icon: status.announcementClosed ? CheckCircle : Clock
    },
    {
      id: 'analysis',
      label: 'BA Created',
      completed: status.analysisCreated,
      icon: status.analysisCreated ? CheckCircle : Clock
    },
    {
      id: 'po',
      label: 'PO Created',
      completed: status.poCreated,
      icon: status.poCreated ? CheckCircle : Clock
    }
  ] : [
    {
      id: 'pr',
      label: 'PR Approved',
      completed: status.prApproved,
      icon: status.prApproved ? CheckCircle : Clock
    },
    {
      id: 'rfq',
      label: 'RFQ Created',
      completed: status.rfqCreated,
      icon: status.rfqCreated ? CheckCircle : Clock
    },
    {
      id: 'rfq-sent',
      label: 'RFQ Sent',
      completed: status.rfqSent,
      icon: status.rfqSent ? CheckCircle : Clock
    },
    {
      id: 'analysis',
      label: 'QA/BA Created',
      completed: status.analysisCreated,
      icon: status.analysisCreated ? CheckCircle : Clock
    },
    {
      id: 'po',
      label: 'PO Created',
      completed: status.poCreated,
      icon: status.poCreated ? CheckCircle : Clock
    }
  ];

  const handleNextAction = () => {
    if (status.nextAction.includes('Manual')) {
      setCreating(true);
      try {
        if (status.isTender) {
          analysisFormService.autoCreateFromPR(prId, 'system');
        } else {
          procurementWorkflowAutomationService.createAnalysisFromRFQByPR(prId, 'system');
        }
        if (onRefresh) onRefresh();
        alert(`✅ ${status.isTender ? 'BA' : 'QA'} document created! You can now manage it in the Analysis tab.`);
      } catch (error: any) {
        alert(`❌ Error: ${error.message}`);
      } finally {
        setCreating(false);
      }
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          {status.isTender ? 'Tender Workflow Progress' : 'Quotation Workflow Progress'}
        </h3>
        <button 
          onClick={handleNextAction}
          disabled={creating || status.nextAction === 'Workflow Complete' || status.nextAction === 'Unknown' || status.nextAction.includes('Wait')}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
            status.nextAction.includes('Manual') 
              ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700 cursor-pointer shadow-sm' 
              : 'bg-blue-50 border-blue-200 text-blue-900 cursor-default'
          }`}
        >
          {creating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <AlertCircle className="w-4 h-4 text-current opacity-80" />
          )}
          <span className="text-sm font-bold">
            {creating ? 'Creating...' : `Next: ${status.nextAction}`}
          </span>
          {status.nextAction.includes('Manual') && !creating && (
            <ArrowRight className="w-4 h-4 ml-1" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isLastStep = index === steps.length - 1;
          
          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    step.completed
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span
                  className={`text-xs font-medium text-center ${
                    step.completed ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {!isLastStep && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    step.completed ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {!status.prApproved && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ Waiting for PR approval. {status.isTender ? 'Tender process' : 'RFQ'} will trigger after approval.
          </p>
        </div>
      )}

      {status.prApproved && status.isTender && !status.tenderAnnounced && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            📢 PR approved for Tender. Please proceed to the **Tender Information** tab to announce the tender.
          </p>
        </div>
      )}

      {status.tenderAnnounced && !status.announcementClosed && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⏳ Tender announcement period is active. Bid Analysis (BA) can be created after the end date.
          </p>
        </div>
      )}

      {status.prApproved && !status.isTender && !status.rfqCreated && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✅ PR approved! RFQ will be auto-created.
          </p>
        </div>
      )}

      {status.rfqCreated && !status.rfqSent && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            📄 RFQ created. Add suppliers and send RFQ to proceed.
          </p>
        </div>
      )}

      {(status.rfqSent || status.announcementClosed) && !status.analysisCreated && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            {status.isTender 
              ? '🏁 Announcement period closed. Create Bid Analysis (BA) to evaluate submissions.'
              : '📨 RFQ sent to suppliers. Create Quotation Analysis (QA) when responses are received.'
            }
          </p>
        </div>
      )}
    </div>
  );
}