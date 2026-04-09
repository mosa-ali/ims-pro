// ============================================================================
// QUOTATION ANALYSIS (QA) PRINT LAYOUT
// Official A4 format for non-tender procurement
// Integrated Management System (IMS)
// ============================================================================

import React from 'react';
import type { QuotationAnalysis, ProcurementRequest } from '@/types/logistics.types';

interface Props {
  qa: QuotationAnalysis;
  pr: ProcurementRequest;
}

export function QuotationAnalysisPrint({ qa, pr }: Props) {
  const getSupplierName = (supplierId: string) => {
    const supplier = qa.suppliers.find(s => s.id === supplierId);
    return supplier?.supplierName || 'Unknown';
  };

  const getItemPrice = (itemId: string, supplierId: string): number => {
    const price = qa.itemPrices.find(p => p.itemId === itemId && p.supplierId === supplierId);
    return price?.unitPrice || 0;
  };

  const getItemTotal = (itemId: string, supplierId: string): number => {
    const item = pr.items.find(i => i.id === itemId);
    if (!item) return 0;
    const unitPrice = getItemPrice(itemId, supplierId);
    return item.quantity * unitPrice;
  };

  const getTechnicalScore = (supplierId: string) => {
    return qa.technicalScores.find(s => s.supplierId === supplierId);
  };

  const getFinancialScore = (supplierId: string) => {
    return qa.financialScores.find(s => s.supplierId === supplierId);
  };

  const getFinalScore = (supplierId: string) => {
    return qa.finalScores.find(s => s.supplierId === supplierId);
  };

  return (
    <div className="print-document bg-white p-8" style={{ width: '210mm', minHeight: '297mm' }}>
      {/* OFFICIAL HEADER - NGO LETTERHEAD */}
      <div className="mb-6">
        {/* Logo + Organization Name Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="text-left">
            <h2 className="text-xl font-bold text-black">{qa.organizationName}</h2>
            <h3 className="text-lg font-semibold text-black mt-1">Quotation Analysis (QA)</h3>
          </div>
          
          {qa.organizationLogo && (
            <img 
              src={qa.organizationLogo} 
              alt="Organization Logo" 
              className="h-16 w-auto object-contain flex-shrink-0"
            />
          )}
        </div>
        
        {/* Document Info Grid */}
        <div className="grid grid-cols-4 gap-3 pt-3 border-t-2 border-black text-xs">
          <div>
            <span className="font-semibold">QA Number:</span>
            <span className="ml-2">{qa.qaNumber}</span>
          </div>
          <div>
            <span className="font-semibold">PR Number:</span>
            <span className="ml-2">{qa.prNumber}</span>
          </div>
          <div>
            <span className="font-semibold">Date:</span>
            <span className="ml-2">{qa.analysisDate}</span>
          </div>
          <div>
            <span className="font-semibold">Currency:</span>
            <span className="ml-2">{qa.currency}</span>
          </div>
          {qa.projectName && (
            <div className="col-span-2">
              <span className="font-semibold">Project:</span>
              <span className="ml-2">{qa.projectName}</span>
            </div>
          )}
          <div>
            <span className="font-semibold">Budget Line:</span>
            <span className="ml-2">{qa.budgetLineName}</span>
          </div>
          <div>
            <span className="font-semibold">Total Amount:</span>
            <span className="ml-2 font-bold">{qa.currency} {qa.totalPRAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ITEM LINES */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-black border-b-2 border-black pb-1 mb-2">
          ITEM LINES
        </h3>
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-2 py-1 text-left font-bold w-8">#</th>
              <th className="border border-black px-2 py-1 text-left font-bold">Description</th>
              <th className="border border-black px-2 py-1 text-left font-bold">Specification</th>
              <th className="border border-black px-2 py-1 text-center font-bold w-16">Qty</th>
              <th className="border border-black px-2 py-1 text-center font-bold w-16">Unit</th>
            </tr>
          </thead>
          <tbody>
            {pr.items.map((item, index) => (
              <tr key={item.id}>
                <td className="border border-black px-2 py-1">{index + 1}</td>
                <td className="border border-black px-2 py-1 font-medium">{item.description}</td>
                <td className="border border-black px-2 py-1">{item.specification}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">{item.quantity}</td>
                <td className="border border-black px-2 py-1 text-center">{item.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SUPPLIER COMPARISON TABLE */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-black border-b-2 border-black pb-1 mb-2">
          SUPPLIER OFFER COMPARISON
        </h3>
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-2 py-1 text-left font-bold">Item</th>
              <th className="border border-black px-2 py-1 text-center font-bold w-12">Qty</th>
              {qa.suppliers.map(supplier => (
                <th key={supplier.id} className="border border-black px-2 py-1 text-center font-bold" colSpan={2}>
                  {supplier.supplierName}
                </th>
              ))}
            </tr>
            <tr className="bg-gray-50">
              <th className="border border-black px-2 py-1"></th>
              <th className="border border-black px-2 py-1"></th>
              {qa.suppliers.map(supplier => (
                <React.Fragment key={supplier.id}>
                  <th className="border border-black px-2 py-1 text-center text-xs font-semibold">Unit Price</th>
                  <th className="border border-black px-2 py-1 text-center text-xs font-semibold">Total</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {pr.items.map(item => (
              <tr key={item.id}>
                <td className="border border-black px-2 py-1 font-medium">{item.description}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">{item.quantity}</td>
                {qa.suppliers.map(supplier => {
                  const unitPrice = getItemPrice(item.id, supplier.id);
                  const itemTotal = getItemTotal(item.id, supplier.id);
                  return (
                    <React.Fragment key={supplier.id}>
                      <td className="border border-black px-2 py-1 text-center">
                        {qa.currency} {unitPrice.toLocaleString()}
                      </td>
                      <td className="border border-black px-2 py-1 text-center font-semibold">
                        {qa.currency} {itemTotal.toLocaleString()}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
            
            {/* Subtotals */}
            <tr className="bg-gray-100 font-bold">
              <td colSpan={2} className="border border-black px-2 py-1 text-right">SUBTOTAL</td>
              {qa.suppliers.map(supplier => {
                const finScore = getFinancialScore(supplier.id);
                return (
                  <td key={supplier.id} colSpan={2} className="border border-black px-2 py-1 text-center text-base">
                    {qa.currency} {finScore?.subtotal.toLocaleString() || '0.00'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* TECHNICAL EVALUATION */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-black border-b-2 border-black pb-1 mb-2">
          TECHNICAL & ADMINISTRATIVE EVALUATION
        </h3>
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-2 py-1 text-left font-bold">Criteria</th>
              <th className="border border-black px-2 py-1 text-center font-bold w-16">Weight</th>
              {qa.suppliers.map(supplier => (
                <th key={supplier.id} className="border border-black px-2 py-1 text-center font-bold">
                  {supplier.supplierName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {qa.technicalCriteria.map(criterion => (
              <tr key={criterion.id}>
                <td className="border border-black px-2 py-1 font-medium">{criterion.criterionName}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">{criterion.maxScore}</td>
                {qa.suppliers.map(supplier => {
                  const techScore = getTechnicalScore(supplier.id);
                  const score = techScore?.criterionScores[criterion.id] || 0;
                  return (
                    <td key={supplier.id} className="border border-black px-2 py-1 text-center">
                      {score.toFixed(1)}
                    </td>
                  );
                })}
              </tr>
            ))}
            
            {/* Technical Totals */}
            <tr className="bg-gray-100 font-bold">
              <td colSpan={2} className="border border-black px-2 py-1 text-right">TOTAL TECHNICAL</td>
              {qa.suppliers.map(supplier => {
                const techScore = getTechnicalScore(supplier.id);
                return (
                  <td key={supplier.id} className="border border-black px-2 py-1 text-center text-base">
                    {techScore?.totalTechnicalScore.toFixed(2) || '0.00'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* FINAL SCORES */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-black border-b-2 border-black pb-1 mb-2">
          FINAL SCORES & RANKING
        </h3>
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-2 py-1 text-center font-bold w-12">Rank</th>
              <th className="border border-black px-2 py-1 text-left font-bold">Supplier</th>
              <th className="border border-black px-2 py-1 text-center font-bold">Technical</th>
              <th className="border border-black px-2 py-1 text-center font-bold">Financial</th>
              <th className="border border-black px-2 py-1 text-center font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {qa.finalScores.map(score => {
              const supplier = qa.suppliers.find(s => s.id === score.supplierId);
              const isBestEvaluated = score.supplierId === qa.bestEvaluatedSupplierId;
              const isLowestPrice = score.supplierId === qa.lowestPriceSupplierId;
              
              return (
                <tr key={score.supplierId} className={score.rank === 1 ? 'bg-gray-100' : ''}>
                  <td className="border border-black px-2 py-1 text-center font-bold">#{score.rank}</td>
                  <td className="border border-black px-2 py-1 font-medium">
                    {supplier?.supplierName}
                    {isBestEvaluated && <span className="ml-2 text-xs font-bold">★ Best Evaluated</span>}
                    {isLowestPrice && <span className="ml-2 text-xs font-bold">💰 Lowest Price</span>}
                  </td>
                  <td className="border border-black px-2 py-1 text-center font-semibold">
                    {score.technicalScore.toFixed(2)}
                  </td>
                  <td className="border border-black px-2 py-1 text-center font-semibold">
                    {score.financialScore.toFixed(2)}
                  </td>
                  <td className="border border-black px-2 py-1 text-center font-bold text-base">
                    {score.totalScore.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SELECTION & JUSTIFICATION */}
      <div className="mb-8 border border-black p-3">
        <h3 className="text-sm font-bold text-black mb-3 border-b border-black pb-1">
          SUPPLIER SELECTION
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
          <div>
            <span className="font-semibold">Lowest Price Amount:</span>
            <span className="ml-2 text-base font-bold">
              {qa.currency} {qa.lowestPriceAmount.toLocaleString()}
            </span>
            {qa.lowestPriceSupplierId && (
              <div className="text-xs mt-1">
                ({getSupplierName(qa.lowestPriceSupplierId)})
              </div>
            )}
          </div>
          <div>
            <span className="font-semibold">Selected Supplier:</span>
            <span className="ml-2 text-base font-bold">
              {qa.selectedSupplierName || '-'}
            </span>
          </div>
        </div>

        {qa.selectionJustification && (
          <div className="text-xs">
            <div className="font-semibold mb-1">Justification:</div>
            <div className="p-2 whitespace-pre-wrap">
              {qa.selectionJustification}
            </div>
          </div>
        )}
      </div>

      {/* APPROVAL SIGNATURES - CLEAN FORMAT */}
      <div className="mt-12">
        <h3 className="text-sm font-bold text-black mb-4 border-b border-black pb-1">
          APPROVAL & SIGNATURES
        </h3>
        
        <div className="grid grid-cols-3 gap-8 text-sm">
          {qa.approvalSignatures.map((sig, index) => (
            <div key={index}>
              <p className="font-bold mb-1">{sig.role}:</p>
              <div className="border-t-2 border-black mt-8 pt-2">
                <p>{sig.name || '__________________'}</p>
                <p className="text-xs mt-1">Name</p>
                <p className="mt-4">{sig.date || '__________________'}</p>
                <p className="text-xs">Date</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
