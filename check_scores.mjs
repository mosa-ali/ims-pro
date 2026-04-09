import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get criteria grouped by section for bid analysis 150001
const [criteria] = await conn.execute(
  'SELECT id, name, sectionNumber, maxScore FROM bid_evaluation_criteria WHERE bidAnalysisId = 150001 ORDER BY sectionNumber, id'
);

// Get section totals
const sections = {};
criteria.forEach(c => {
  const sec = c.sectionNumber;
  if (!sections[sec]) sections[sec] = { count: 0, maxScore: 0 };
  sections[sec].count++;
  sections[sec].maxScore += parseFloat(c.maxScore || '0');
});
console.log('Sections:', JSON.stringify(sections, null, 2));

// Get all bidders
const [bidders] = await conn.execute(
  'SELECT id, bidderName FROM bid_analysis_bidders WHERE bidAnalysisId = 150001'
);
console.log('Bidders:', bidders.map(b => b.bidderName + ' (ID:' + b.id + ')').join(', '));

// For each bidder, get section scores
for (const bidder of bidders) {
  const [scores] = await conn.execute(
    `SELECT s.score, c.sectionNumber, c.name 
     FROM bid_evaluation_scores s 
     JOIN bid_evaluation_criteria c ON s.criterionId = c.id 
     WHERE s.bidderId = ? 
     ORDER BY c.sectionNumber`, [bidder.id]
  );
  
  const sectionScores = {};
  let totalAll = 0;
  scores.forEach(s => {
    const sec = s.sectionNumber;
    if (!sectionScores[sec]) sectionScores[sec] = 0;
    sectionScores[sec] += parseFloat(s.score || '0');
    totalAll += parseFloat(s.score || '0');
  });
  
  const totalSec1to5 = Object.entries(sectionScores)
    .filter(([k]) => parseInt(k) <= 5)
    .reduce((sum, [, v]) => sum + v, 0);
  
  console.log(`\n${bidder.bidderName}:`);
  console.log('  Section scores:', JSON.stringify(sectionScores));
  console.log('  Total ALL sections:', totalAll);
  console.log('  Total sections 1-5:', totalSec1to5);
}

await conn.end();
