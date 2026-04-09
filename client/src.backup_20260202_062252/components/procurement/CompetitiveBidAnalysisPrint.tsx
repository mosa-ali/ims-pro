// ============================================================================
// COMPETITIVE BID ANALYSIS (CBA) PRINT LAYOUT
// Official A4 format - Audit-critical document
// Integrated Management System (IMS)
// ============================================================================

import React from 'react';
import type { CompetitiveBidAnalysis } from '@/types/logistics.types';
import { competitiveBidAnalysisService } from '@/services/competitiveBidAnalysisService';

interface Props {
  cba: CompetitiveBidAnalysis;
}

export function CompetitiveBidAnalysisPrint({ cba }: Props) {
  const getBidderName = (bidderId: string) => {
    return competitiveBidAnalysisService.getBidderName(cba, bidderId);
  };

  const getTechnicalScore = (bidderId: string) => {
    return cba.technicalScores.find(s => s.bidderId === bidderId);
  };

  const getFinancialScore = (bidderId: string) => {
    return cba.financialScores.find(s => s.bidderId === bidderId);
  };

  const getFinalScore = (bidderId: string) => {
    return cba.finalScores.find(s => s.bidderId === bidderId);
  };

  return (
    <div className="print-document bg-white p-8" style={{ width: '210mm', minHeight: '297mm' }}>
      {/* OFFICIAL HEADER - NGO LETTERHEAD */}
      <div className="mb-6">
        {/* Logo + Organization Name Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="text-left">
            <h2 className="text-xl font-bold text-black">{cba.organizationName}</h2>
            <h3 className="text-lg font-semibold text-black mt-1">Competitive Bid Analysis (CBA)</h3>
          </div>
          
          {cba.organizationLogo && (
            <img 
              src={cba.organizationLogo} 
              alt="Organization Logo" 
              className="h-16 w-auto object-contain flex-shrink-0"
            />
          )}
        </div>
        
        {/* Document Info Grid */}
        <div className="grid grid-cols-4 gap-3 pt-3 border-t-2 border-black text-xs">
          <div>
            <span className="font-semibold">CBA Number:</span>
            <span className="ml-2">{cba.cbaNumber}</span>
          </div>
          <div>
            <span className="font-semibold">PR Number:</span>
            <span className="ml-2">{cba.prNumber}</span>
          </div>
          <div>
            <span className="font-semibold">Date:</span>
            <span className="ml-2">{cba.cbaDate}</span>
          </div>
          <div>
            <span className="font-semibold">Currency:</span>
            <span className="ml-2">{cba.currency}</span>
          </div>
          {cba.country && (
            <div>
              <span className="font-semibold">Country:</span>
              <span className="ml-2">{cba.country}</span>
            </div>
          )}
          <div className="col-span-2">
            <span className="font-semibold">Budget Line:</span>
            <span className="ml-2">{cba.budgetLineName}</span>
          </div>
          <div>
            <span className="font-semibold">Budget Amount:</span>
            <span className="ml-2 font-bold">{cba.currency} {cba.budgetAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* BIDDERS LIST */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-black mb-2 border-b border-black pb-1">
          BIDDERS / APPLICANTS
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {cba.bidders.map((bidder, index) => (
            <div key={bidder.id} className="px-2 py-1">
              <span className="font-semibold">{index + 1}. </span>
              {bidder.companyName}
            </div>
          ))}
        </div>
      </div>

      {/* TECHNICAL EVALUATION TABLE */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-black border-b-2 border-black px-2 py-1 mb-2">
          TECHNICAL EVALUATION (50 Points) - Threshold: {cba.technicalThresholdPercentage}%
        </h3>
        
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-2 py-2 text-left font-bold">
                Criteria
              </th>
              <th className="border border-black px-2 py-2 text-center font-bold w-20">
                Max Score
              </th>
              {cba.bidders.map(bidder => (
                <th
                  key={bidder.id}
                  className="border border-black px-2 py-2 text-center font-bold"
                >
                  {bidder.companyName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cba.technicalCriteria.map(criterion => (
              <tr key={criterion.id}>
                <td className="border border-black px-2 py-2 font-medium">
                  {criterion.criterionName}
                </td>
                <td className="border border-black px-2 py-2 text-center font-semibold">
                  {criterion.maxScore}
                </td>
                {cba.bidders.map(bidder => {
                  const techScore = getTechnicalScore(bidder.id);
                  const score = techScore?.criterionScores[criterion.id] || 0;
                  return (
                    <td
                      key={bidder.id}
                      className="border border-black px-2 py-2 text-center"
                    >
                      {score.toFixed(1)}
                    </td>
                  );
                })}
              </tr>
            ))}
            
            {/* Technical Totals */}
            <tr className="bg-gray-100 font-bold">
              <td className="border border-black px-2 py-2 text-right">
                TOTAL TECHNICAL SCORE
              </td>
              <td className="border border-black px-2 py-2 text-center">
                50
              </td>
              {cba.bidders.map(bidder => {
                const techScore = getTechnicalScore(bidder.id);
                return (
                  <td
                    key={bidder.id}
                    className="border border-black px-2 py-2 text-center"
                  >
                    <div>{techScore?.totalTechnicalScore.toFixed(2) || '0.00'}</div>
                    <div className="text-xs">({techScore?.technicalPercentage.toFixed(1) || '0.0'}%)</div>
                    <div className="text-xs font-semibold mt-1">
                      {techScore?.qualifiedForFinancial ? 'QUALIFIED' : 'NOT QUALIFIED'}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* FINANCIAL EVALUATION TABLE */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-black border-b-2 border-black px-2 py-1 mb-2">
          FINANCIAL EVALUATION (50 Points)
        </h3>
        
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-2 py-2 text-left font-bold">
                Bidder
              </th>
              <th className="border border-black px-2 py-2 text-right font-bold">
                Offered Price
              </th>
              <th className="border border-black px-2 py-2 text-center font-bold">
                Financial Score (50)
              </th>
            </tr>
          </thead>
          <tbody>
            {cba.bidders.map(bidder => {
              const techScore = getTechnicalScore(bidder.id);
              const finScore = getFinancialScore(bidder.id);
              const isQualified = techScore?.qualifiedForFinancial || false;
              
              return (
                <tr key={bidder.id}>
                  <td className="border border-black px-2 py-2 font-medium">
                    {bidder.companyName}
                    {!isQualified && (
                      <span className="ml-2 text-xs">(Not Qualified)</span>
                    )}
                  </td>
                  <td className="border border-black px-2 py-2 text-right font-semibold">
                    {cba.currency} {finScore?.offeredPrice.toLocaleString() || '0.00'}
                  </td>
                  <td className="border border-black px-2 py-2 text-center font-bold">
                    {isQualified ? finScore?.financialScore.toFixed(2) || '0.00' : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FINAL SCORES TABLE */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-black border-b-2 border-black px-2 py-1 mb-2">
          FINAL SCORE (100 Points)
        </h3>
        
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-2 py-2 text-center font-bold w-12">
                Rank
              </th>
              <th className="border border-black px-2 py-2 text-left font-bold">
                Bidder
              </th>
              <th className="border border-black px-2 py-2 text-center font-bold">
                Technical (50)
              </th>
              <th className="border border-black px-2 py-2 text-center font-bold">
                Financial (50)
              </th>
              <th className="border border-black px-2 py-2 text-center font-bold">
                Total (100)
              </th>
            </tr>
          </thead>
          <tbody>
            {cba.finalScores.map(score => {
              const bidder = cba.bidders.find(b => b.id === score.bidderId);
              return (
                <tr
                  key={score.bidderId}
                  className={score.rank === 1 ? 'bg-gray-100' : ''}
                >
                  <td className="border border-black px-2 py-2 text-center font-bold">
                    #{score.rank}
                  </td>
                  <td className="border border-black px-2 py-2 font-medium">
                    {bidder?.companyName}
                    {score.rank === 1 && (
                      <span className="ml-2 text-xs font-bold">★ HIGHEST SCORE</span>
                    )}
                  </td>
                  <td className="border border-black px-2 py-2 text-center font-semibold">
                    {score.technicalScore.toFixed(2)}
                  </td>
                  <td className="border border-black px-2 py-2 text-center font-semibold">
                    {score.financialScore.toFixed(2)}
                  </td>
                  <td className="border border-black px-2 py-2 text-center font-bold text-base">
                    {score.totalScore.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* DECISION & JUSTIFICATION */}
      <div className="mb-8 border border-black p-3">
        <h3 className="text-sm font-bold text-black mb-3 border-b border-black pb-1">
          DECISION & JUSTIFICATION
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
          <div>
            <span className="font-semibold">Lowest Bid Amount:</span>
            <span className="ml-2 text-base font-bold">
              {cba.currency} {cba.lowestBidAmount.toLocaleString()}
            </span>
            {cba.lowestBidderId && (
              <div className="text-xs mt-1">
                ({getBidderName(cba.lowestBidderId)})
              </div>
            )}
          </div>
          <div>
            <span className="font-semibold">Selected Supplier:</span>
            <span className="ml-2 text-base font-bold">
              {cba.selectedSupplierName || '-'}
            </span>
          </div>
        </div>

        {cba.selectionJustification && (
          <div className="text-xs">
            <div className="font-semibold mb-1">Justification:</div>
            <div className="p-2 whitespace-pre-wrap">
              {cba.selectionJustification}
            </div>
          </div>
        )}
      </div>

      {/* APPROVAL SIGNATURES - CLEAN FORMAT */}
      <div className="mt-12">
        <h3 className="text-sm font-bold text-black mb-4 border-b border-black pb-1">
          APPROVAL & SIGNATURES
        </h3>
        
        <div className="grid grid-cols-2 gap-8 text-sm">
          {cba.approvalSignatures.map((sig, index) => (
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