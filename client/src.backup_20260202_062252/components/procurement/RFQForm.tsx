// ============================================================================
// REQUEST FOR QUOTATION (RFQ) FORM
// Outbound supplier quotation request document
// Official procurement document for audit compliance
// Integrated Management System (IMS)
// ============================================================================

import { formatDate } from '@/utils/formatters';
import React, { useState } from 'react';
import { Plus, Trash2, Printer, Send, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { rfqService, type RequestForQuotation, type RFQSupplier } from '@/services/rfqService';
import { procurementWorkflowAutomationService } from '@/services/procurementWorkflowAutomationService';
import { useAuth } from '@/_core/hooks/useAuth';
import { RFQPrintModal } from './RFQPrintModal';

interface Props {
  rfq: RequestForQuotation;
  onUpdate: () => void;
}

export function RFQForm({ rfq, onUpdate }: Props) {
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();
  
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: ''
  });

  const handleAddSupplier = () => {
    if (!supplierForm.name || !supplierForm.email) {
      alert('Supplier name and email are required');
      return;
    }

    rfqService.addSupplier(
      rfq.id,
      supplierForm.name,
      supplierForm.contactPerson,
      supplierForm.email,
      supplierForm.phone,
      rfq.submissionDeadline
    );

    setSupplierForm({ name: '', contactPerson: '', email: '', phone: '' });
    setShowAddSupplier(false);
    onUpdate();
  };

  const handleMarkResponseReceived = (supplierId: string) => {
    rfqService.markSupplierResponseReceived(rfq.id, supplierId);
    onUpdate();
  };

  const handleSendRFQ = () => {
    if (rfq.suppliers.length < 2) {
      alert('You must add at least 2 suppliers before sending the RFQ');
      return;
    }

    if (confirm('Send RFQ to all suppliers? This will mark the RFQ as sent.')) {
      rfqService.markAsSent(rfq.id, user?.id || 'system');
      alert('RFQ marked as sent to all suppliers');
      onUpdate();
    }
  };

  const handleCreateAnalysis = () => {
    try {
      procurementWorkflowAutomationService.createAnalysisFromRFQ(rfq.id, user?.id || 'system');
      alert('✅ QA/BA document created! Switch to the Analysis tab to complete vendor evaluation.');
      onUpdate();
    } catch (error: any) {
      alert(`❌ ${error.message}`);
    }
  };

  const handlePrint = () => {
    setShowPrintModal(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
  };

  const statusBadge = () => {
    switch (rfq.status) {
      case 'draft':
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">Draft</span>;
      case 'sent':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Sent to Suppliers</span>;
      case 'responses_received':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">Responses Received</span>;
      case 'closed':
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">Closed</span>;
      default:
        return null;
    }
  };

  return (
    <div className={`bg-white ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-4 mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">Request for Quotation</h2>
          {statusBadge()}
        </div>
        
        <div className="flex items-center gap-2">
          {rfq.status === 'draft' && (
            <button
              onClick={handleSendRFQ}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
              Send RFQ to Suppliers
            </button>
          )}
          
          {rfq.status === 'sent' && (
            <button
              onClick={handleCreateAnalysis}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4" />
              Create QA/BA Document
            </button>
          )}
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Printer className="w-4 h-4" />
            Print RFQ
          </button>
        </div>
      </div>

      {/* Official RFQ Document */}
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        {/* Organization Header */}
        <div className="text-center border-b-2 border-gray-900 pb-4 mb-6">
          {rfq.organizationLogo && (
            <img src={rfq.organizationLogo} alt="Organization Logo" className="h-16 mx-auto mb-3" />
          )}
          <h1 className="text-2xl font-bold text-gray-900">{rfq.organizationName}</h1>
          <p className="text-sm text-gray-600 mt-1">{rfq.operatingUnitName} • {rfq.country}</p>
        </div>

        {/* RFQ Title */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 uppercase">Request for Quotation</h2>
          <p className="text-lg font-medium text-blue-600 mt-2">{rfq.rfqNumber}</p>
        </div>

        {/* RFQ Details Grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6 text-sm">
          <div>
            <span className="font-medium text-gray-700">RFQ Number:</span>
            <span className="ml-2 text-gray-900">{rfq.rfqNumber}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">PR Number:</span>
            <span className="ml-2 text-gray-900">{rfq.prNumber}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Issue Date:</span>
            <span className="ml-2 text-gray-900">{formatDate(rfq.issueDate)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Submission Deadline:</span>
            <span className="ml-2 font-bold text-red-600">{formatDate(rfq.submissionDeadline)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Procurement Method:</span>
            <span className="ml-2 text-gray-900">{rfq.procurementMethod === 'tender' ? 'Tender (> USD 25K)' : 'Quotation'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Currency:</span>
            <span className="ml-2 text-gray-900">{rfq.currency}</span>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Contact Information</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Contact Person:</span>
              <p className="text-gray-900 mt-1">{rfq.contactPerson}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Email:</span>
              <p className="text-gray-900 mt-1">{rfq.contactEmail}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Phone:</span>
              <p className="text-gray-900 mt-1">{rfq.contactPhone}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Items Requested</h3>
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left font-medium">#</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-medium">Item Description</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-medium">Specification</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-medium">Quantity</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-medium">Unit</th>
              </tr>
            </thead>
            <tbody>
              {rfq.items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2">{index + 1}</td>
                  <td className="border border-gray-300 px-3 py-2 font-medium">{item.itemName}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm text-gray-600">{item.specification}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center font-medium">{item.quantity}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Delivery Requirements */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-bold text-blue-900 mb-3">Delivery Requirements</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">Delivery Location:</span>
              <p className="text-blue-900 mt-1">{rfq.deliveryLocation}</p>
            </div>
            <div>
              <span className="font-medium text-blue-800">Required Delivery Date:</span>
              <p className="text-blue-900 mt-1">{formatDate(rfq.requiredDeliveryDate)}</p>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="border-t border-gray-300 pt-4 mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Terms & Conditions</h3>
          <div className="text-sm text-gray-700 whitespace-pre-line">{rfq.terms}</div>
        </div>

        {/* Signature Section */}
        <div className="border-t border-gray-300 pt-6 mt-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-8">Prepared By:</p>
              <div className="border-t border-gray-400 pt-2">
                <p className="text-sm font-medium">{rfq.contactPerson}</p>
                <p className="text-xs text-gray-600">{formatDate(rfq.issueDate)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-8">Approved By:</p>
              <div className="border-t border-gray-400 pt-2">
                <p className="text-sm text-gray-600">Logistics Manager</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Supplier Management Section (Not printed) */}
      <div className="mt-8 print:hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Suppliers / Bidders</h3>
          {rfq.status === 'draft' && (
            <button
              onClick={() => setShowAddSupplier(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Supplier
            </button>
          )}
        </div>

        {/* Add Supplier Form */}
        {showAddSupplier && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-3">Add Supplier</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Supplier Name *"
                value={supplierForm.name}
                onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Contact Person"
                value={supplierForm.contactPerson}
                onChange={e => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="email"
                placeholder="Email *"
                value={supplierForm.email}
                onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={supplierForm.phone}
                onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddSupplier}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddSupplier(false);
                  setSupplierForm({ name: '', contactPerson: '', email: '', phone: '' });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Suppliers List */}
        {rfq.suppliers.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ No suppliers added yet. Add at least 2 suppliers to send the RFQ.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rfq.suppliers.map(supplier => (
              <div key={supplier.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900">{supplier.supplierName}</h4>
                      {supplier.responseReceived ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Response Received
                        </span>
                      ) : rfq.status === 'sent' ? (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Awaiting Response
                        </span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Contact:</span> {supplier.contactPerson}
                      </div>
                      <div>
                        <span className="font-medium">Email:</span> {supplier.email}
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span> {supplier.phone}
                      </div>
                    </div>
                    {supplier.sentDate && (
                      <p className="text-xs text-gray-500 mt-2">
                        Sent: {new Date(supplier.sentDate).toLocaleDateString()}
                        {supplier.responseReceivedDate && ` • Response: ${new Date(supplier.responseReceivedDate).toLocaleDateString()}`}
                      </p>
                    )}
                  </div>
                  {rfq.status === 'sent' && !supplier.responseReceived && (
                    <button
                      onClick={() => handleMarkResponseReceived(supplier.id)}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm font-medium"
                    >
                      Mark Response Received
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workflow Instructions */}
      {rfq.status === 'sent' && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 print:hidden">
          <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Mark suppliers as "Response Received" when quotations arrive</li>
            <li>Click "Create QA/BA Document" to start vendor evaluation</li>
            <li>Enter supplier pricing in the QA/BA form</li>
            <li>Complete evaluation and select winning vendor</li>
          </ol>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && (
        <RFQPrintModal
          isOpen={showPrintModal}
          rfq={rfq}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}