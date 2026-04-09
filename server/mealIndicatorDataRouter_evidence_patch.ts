/**
 * MEAL Indicator Verification Evidence Generation - Implementation Guide
 * 
 * This file contains the code to add evidence generation to the MEAL indicator verify procedure.
 * 
 * LOCATION: server/mealIndicatorDataRouter.ts, verify procedure (around line 238)
 * 
 * IMPLEMENTATION STEPS:
 * 1. Add import at top of verify mutation:
 *    const { generatePDFEvidence } = await import('./evidenceGeneration');
 * 
 * 2. Fetch data entry details BEFORE updating (to get indicator data for evidence):
 *    const [dataEntry] = await db
 *      .select()
 *      .from(mealIndicatorDataEntries)
 *      .where(and(eq(mealIndicatorDataEntries.id, input.id), eq(mealIndicatorDataEntries.organizationId, organizationId)))
 *      .limit(1);
 *    
 *    if (!dataEntry) {
 *      throw new Error('Indicator data entry not found');
 *    }
 * 
 * 3. Add evidence generation AFTER the update (around line 259):
 */

// Evidence generation code to add:
const verifiedAt = new Date(); // Capture timestamp before update

// ... existing update code ...

// Generate evidence document
try {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>MEAL Indicator Verification</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #16a34a; }
        .header { background-color: #f0fdf4; padding: 15px; margin-bottom: 20px; border: 2px solid #16a34a; }
        .verification-badge { background-color: #16a34a; color: white; padding: 5px 10px; border-radius: 4px; }
        .field { margin: 10px 0; }
        .label { font-weight: bold; color: #666; }
        .value { color: #333; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>MEAL Indicator Verification <span class="verification-badge">VERIFIED</span></h1>
        <p><strong>Data Entry ID:</strong> \${input.id}</p>
        <p><strong>Verified:</strong> \${verifiedAt.toLocaleString()}</p>
        <p><strong>Verified By:</strong> User \${ctx.user?.id || 'Unknown'}</p>
      </div>
      <div class="field">
        <div class="label">Indicator ID:</div>
        <div class="value">\${dataEntry.indicatorId}</div>
      </div>
      <div class="field">
        <div class="label">Actual Value:</div>
        <div class="value">\${dataEntry.actualValue || 'N/A'}</div>
      </div>
      <div class="field">
        <div class="label">Reporting Period:</div>
        <div class="value">\${dataEntry.reportingPeriod || 'N/A'}</div>
      </div>
      \${input.verificationNotes ? \`
      <div class="field">
        <div class="label">Verification Notes:</div>
        <div class="value">\${input.verificationNotes}</div>
      </div>
      \` : ''}
    </body>
    </html>
  `;
  
  await generatePDFEvidence({
    module: 'meal',
    screen: 'indicators',
    triggerEvent: 'verify',
    entityType: 'IndicatorData',
    entityId: String(input.id),
    htmlContent,
    variables: { 
      dataEntryId: String(input.id), 
      entityId: String(input.id), 
      indicatorId: String(dataEntry.indicatorId) 
    },
    context: {
      organizationId,
      operatingUnitId: ctx.scope.operatingUnitId,
      userId: ctx.user?.id || 0,
    },
  });
} catch (error) {
  console.error('Failed to generate indicator verification evidence:', error);
}

/**
 * TESTING:
 * 1. Verify an indicator data entry via UI
 * 2. Check Evidence Panel in Indicator detail page
 * 3. Check Central Documents → MEAL → Indicators folder
 * 4. Verify PDF contains correct data entry details
 */
