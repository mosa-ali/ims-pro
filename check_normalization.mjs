import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get criteria for bid analysis 150001
const [criteria] = await conn.execute(
  'SELECT id, name, sectionNumber, maxScore, criteriaType, isApplicable, optionGroup FROM bid_evaluation_criteria WHERE bidAnalysisId = 150001 ORDER BY sectionNumber, id'
);

// Calculate rawTechnicalMax exactly as the scoring service does
const optionGroups = new Map();
let rawTechnicalMax = 0;

for (const c of criteria) {
  if (c.criteriaType !== 'technical' || c.isApplicable === 0) continue;
  
  const maxScore = Number(c.maxScore || 0);
  
  if (c.optionGroup) {
    const currentMax = optionGroups.get(c.optionGroup) || 0;
    if (maxScore > currentMax) {
      optionGroups.set(c.optionGroup, maxScore);
    }
    console.log(`  Option group "${c.optionGroup}": ${c.name} (maxScore: ${maxScore})`);
  } else {
    rawTechnicalMax += maxScore;
    console.log(`  Regular: ${c.name} (section ${c.sectionNumber}, maxScore: ${maxScore})`);
  }
}

optionGroups.forEach((maxVal, group) => {
  rawTechnicalMax += maxVal;
  console.log(`  Option group "${group}" contributes max: ${maxVal}`);
});

console.log(`\nrawTechnicalMax = ${rawTechnicalMax}`);
console.log(`technicalMaxScore = 50`);
console.log(`Normalization needed: ${rawTechnicalMax !== 50}`);

if (rawTechnicalMax !== 50) {
  console.log(`\nNormalization formula: (rawTotal / ${rawTechnicalMax}) * 50`);
  
  // Show for each bidder
  const [bidders] = await conn.execute(
    'SELECT id, bidderName FROM bid_analysis_bidders WHERE bidAnalysisId = 150001'
  );
  
  for (const bidder of bidders) {
    const [scores] = await conn.execute(
      `SELECT s.score, s.criterionId, c.sectionNumber, c.name, c.optionGroup, c.criteriaType, c.isApplicable
       FROM bid_evaluation_scores s 
       JOIN bid_evaluation_criteria c ON s.criterionId = c.id 
       WHERE s.bidderId = ? 
       ORDER BY c.sectionNumber`, [bidder.id]
    );
    
    let rawTotal = 0;
    const optGroupScores = new Map();
    
    for (const s of scores) {
      if (s.criteriaType !== 'technical' || s.isApplicable === 0) continue;
      const score = Number(s.score || 0);
      if (s.optionGroup) {
        const cur = optGroupScores.get(s.optionGroup) || 0;
        if (score > 0) optGroupScores.set(s.optionGroup, Math.max(cur, score));
      } else {
        rawTotal += Math.max(0, score);
      }
    }
    optGroupScores.forEach(score => { rawTotal += score; });
    
    const normalized = (rawTotal / rawTechnicalMax) * 50;
    const rounded = Math.min(Math.round(normalized * 100) / 100, 50);
    
    console.log(`\n${bidder.bidderName}: rawTotal=${rawTotal}, normalized=(${rawTotal}/${rawTechnicalMax})*50 = ${rounded}`);
  }
}

await conn.end();
