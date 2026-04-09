// ============================================================================
// BID EVALUATION CRITERIA PRINT LAYOUT
// A4 printable format - Excel-like table structure
// Integrated Management System (IMS)
// ============================================================================

import React from 'react';
import type { BidEvaluationCriteria } from '@/types/logistics.types';
import { bidEvaluationCriteriaService } from '@/services/bidEvaluationCriteriaService';

interface Props {
  criteria: BidEvaluationCriteria;
}

export function BidEvaluationCriteriaPrint({ criteria }: Props) {
  const groupedRequirements = bidEvaluationCriteriaService.getRequirementsBySection(criteria);
  const totalWeight = bidEvaluationCriteriaService.getTotalWeight(criteria);

  const getBidderTotal = (bidderId: string): number => {
    return criteria.bidderTotals[bidderId] || 0;
  };

  const getScore = (requirementId: string, bidderId: string): number => {
    const scoreEntry = criteria.scores.find(
      s => s.requirementId === requirementId && s.bidderId === bidderId
    );
    return scoreEntry?.score || 0;
  };

  return (
    <div className="print-document bg-white p-8" style={{ width: '210mm', minHeight: '297mm' }}>
      {/* OFFICIAL HEADER - NGO LETTERHEAD */}
      <div className="mb-6">
        {/* Logo + Organization Name Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="text-left">
            <h2 className="text-xl font-bold text-black">{criteria.organizationName}</h2>
            <h3 className="text-lg font-semibold text-black mt-1">Bid Evaluation Criteria / Checklist</h3>
          </div>
          
          {criteria.organizationLogo && (
            <img 
              src={criteria.organizationLogo} 
              alt="Organization Logo" 
              className="h-16 w-auto object-contain flex-shrink-0"
            />
          )}
        </div>
        
        {/* Document Info Grid */}
        <div className="grid grid-cols-3 gap-4 pt-3 border-t-2 border-black text-sm">
          <div>
            <span className="font-semibold">PR Number:</span>
            <span className="ml-2">{criteria.prNumber}</span>
          </div>
          <div>
            <span className="font-semibold">Tender/RFQ Number:</span>
            <span className="ml-2">{criteria.tenderRfqNumber || '-'}</span>
          </div>
          <div>
            <span className="font-semibold">Evaluation Date:</span>
            <span className="ml-2">{criteria.evaluationDate}</span>
          </div>
          <div>
            <span className="font-semibold">Operating Unit:</span>
            <span className="ml-2">{criteria.operatingUnitName}</span>
          </div>
        </div>
      </div>

      {/* EVALUATION MATRIX - EXCEL-LIKE TABLE */}
      <table className="w-full border-collapse border border-black mb-6 text-xs">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black px-2 py-2 text-left font-bold">
              Section
            </th>
            <th className="border border-black px-2 py-2 text-left font-bold">
              Requirement
            </th>
            <th className="border border-black px-2 py-2 text-left font-bold">
              Details
            </th>
            <th className="border border-black px-2 py-2 text-center font-bold w-16">
              Weight
            </th>
            {criteria.bidders.map(bidder => (
              <th
                key={bidder.id}
                className="border border-black px-2 py-2 text-center font-bold"
              >
                {bidder.bidderName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedRequirements).map(([section, requirements]) => (
            <React.Fragment key={section}>
              {/* Section Header */}
              <tr className="bg-gray-100">
                <td
                  colSpan={4 + criteria.bidders.length}
                  className="border border-black px-2 py-1 font-bold"
                >
                  {section}
                </td>
              </tr>
              
              {/* Requirements */}
              {requirements.map((req) => (
                <tr key={req.id}>
                  <td className="border border-black px-2 py-2">
                    {section}
                  </td>
                  <td className="border border-black px-2 py-2 font-medium">
                    {req.requirementName}
                  </td>
                  <td className="border border-black px-2 py-2">
                    {req.details}
                  </td>
                  <td className="border border-black px-2 py-2 text-center font-semibold">
                    {req.weight}
                  </td>
                  
                  {/* Score cells */}
                  {criteria.bidders.map(bidder => (
                    <td
                      key={bidder.id}
                      className="border border-black px-2 py-2 text-center font-semibold"
                    >
                      {getScore(req.id, bidder.id).toFixed(1)}
                    </td>
                  ))}
                </tr>
              ))}
            </React.Fragment>
          ))}
          
          {/* Totals Row */}
          <tr className="bg-gray-100 font-bold">
            <td colSpan={3} className="border border-black px-2 py-2 text-right">
              TOTAL WEIGHT
            </td>
            <td className="border border-black px-2 py-2 text-center">
              {totalWeight}
            </td>
            {criteria.bidders.map(bidder => (
              <td
                key={bidder.id}
                className="border border-black px-2 py-2 text-center text-base"
              >
                {getBidderTotal(bidder.id).toFixed(1)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* APPROVAL SECTION - CLEAN FORMAT */}
      <div className="mt-12">
        <h3 className="text-sm font-bold text-black mb-4 border-b border-black pb-1">
          APPROVAL
        </h3>
        
        <div className="grid grid-cols-3 gap-8 text-sm">
          <div>
            <p className="font-bold mb-1">Prepared By:</p>
            <div className="border-t-2 border-black mt-8 pt-2">
              <p>{criteria.preparedByName || '__________________'}</p>
              <p className="text-xs mt-1">Name</p>
              <p className="mt-4">{criteria.preparedDate || '__________________'}</p>
              <p className="text-xs">Date</p>
            </div>
          </div>

          <div>
            <p className="font-bold mb-1">Reviewed By:</p>
            <div className="border-t-2 border-black mt-8 pt-2">
              <p>{criteria.reviewedByName || '__________________'}</p>
              <p className="text-xs mt-1">Name</p>
              <p className="mt-4">{criteria.reviewedDate || '__________________'}</p>
              <p className="text-xs">Date</p>
            </div>
          </div>

          <div>
            <p className="font-bold mb-1">Approved By:</p>
            <div className="border-t-2 border-black mt-8 pt-2">
              <p>{criteria.approvedByName || '__________________'}</p>
              <p className="text-xs mt-1">Name</p>
              <p className="mt-4">{criteria.approvedDate || '__________________'}</p>
              <p className="text-xs">Date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}