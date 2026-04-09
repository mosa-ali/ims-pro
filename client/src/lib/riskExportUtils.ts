/**
 * Export utilities for Risk & Compliance module
 */

export function exportRisksToCSV(risks: any[]) {
 const headers = ['ID', 'Title', 'Category', 'Likelihood', 'Impact', 'Score', 'Level', 'Status', 'Review Date'];
 const csvRows = [headers.join(',')];
 
 risks.forEach(risk => {
 const row = [
 risk.id,
 `"${risk.title?.replace(/"/g, '""') || ''}"`,
 risk.category,
 risk.likelihood,
 risk.impact,
 risk.score,
 risk.level,
 risk.status,
 risk.reviewDate || 'N/A'
 ];
 csvRows.push(row.join(','));
 });
 
 const csvContent = csvRows.join('\n');
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const link = document.createElement('a');
 link.href = URL.createObjectURL(blob);
 link.download = `risks-export-${new Date().toISOString().split('T')[0]}.csv`;
 link.click();
}

export function exportIncidentsToCSV(incidents: any[]) {
 const headers = ['ID', 'Title', 'Category', 'Severity', 'Status', 'Incident Date', 'Reported Date'];
 const csvRows = [headers.join(',')];
 
 incidents.forEach(incident => {
 const row = [
 incident.id,
 `"${incident.title?.replace(/"/g, '""') || ''}"`,
 incident.category,
 incident.severity,
 incident.investigationStatus,
 incident.incidentDate || 'N/A',
 incident.reportedDate || 'N/A'
 ];
 csvRows.push(row.join(','));
 });
 
 const csvContent = csvRows.join('\n');
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const link = document.createElement('a');
 link.href = URL.createObjectURL(blob);
 link.download = `incidents-export-${new Date().toISOString().split('T')[0]}.csv`;
 link.click();
}
