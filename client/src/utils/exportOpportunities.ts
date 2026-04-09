interface Opportunity {
  id: string;
  donorName: string;
  donorType: string;
  cfpLink?: string;
  interestArea: string[];
  geographicAreas: string;
  applicationDeadline: string;
  allocatedBudget?: number;
  currency: string;
  isCoFunding: boolean;
  applicationLink?: string;
  projectManagerName?: string;
  projectManagerEmail?: string;
  notes?: string;
}

type ExportFormat = 'excel' | 'csv';

export async function exportOpportunities(
  opportunities: Opportunity[],
  format: ExportFormat = 'excel',
  language: 'en' | 'ar' = 'en'
) {
  const headers = getHeaders(language);
  
  if (format === 'excel') {
    return exportToExcel(opportunities, headers, language);
  } else {
    return exportToCSV(opportunities, headers, language);
  }
}

function getHeaders(language: 'en' | 'ar') {
  const headerMap = {
    en: {
      donorName: 'Donor Name',
      donorType: 'Donor Type',
      interestArea: 'Interest Areas',
      geographicAreas: 'Geographic Areas',
      applicationDeadline: 'Application Deadline',
      allocatedBudget: 'Allocated Budget',
      currency: 'Currency',
      isCoFunding: 'Co-Funding',
      cfpLink: 'CFP Link',
      applicationLink: 'Application Link',
      projectManagerName: 'Project Manager Name',
      projectManagerEmail: 'Project Manager Email',
      notes: 'Notes',
    },
    ar: {
      donorName: 'اسم المانح',
      donorType: 'نوع المانح',
      interestArea: 'مجالات الاهتمام',
      geographicAreas: 'المناطق الجغرافية',
      applicationDeadline: 'موعد التقديم',
      allocatedBudget: 'الميزانية المخصصة',
      currency: 'العملة',
      isCoFunding: 'تمويل مشترك',
      cfpLink: 'رابط CFP',
      applicationLink: 'رابط التقديم',
      projectManagerName: 'اسم مدير المشروع',
      projectManagerEmail: 'بريد مدير المشروع',
      notes: 'ملاحظات',
    },
  };

  return headerMap[language];
}

async function exportToExcel(
  opportunities: Opportunity[],
  headers: Record<string, string>,
  language: 'en' | 'ar'
) {
  // Create CSV format (Excel can open CSV files)
  const headerRow = Object.values(headers).join('\t');
  
  const dataRows = opportunities.map((opp) => {
    const row = [
      opp.donorName,
      opp.donorType,
      opp.interestArea.join('; '),
      opp.geographicAreas,
      new Date(opp.applicationDeadline).toLocaleDateString(
        language === 'ar' ? 'ar-SA' : 'en-US'
      ),
      opp.allocatedBudget || 0,
      opp.currency,
      opp.isCoFunding ? 'Yes' : 'No',
      opp.cfpLink || '',
      opp.applicationLink || '',
      opp.projectManagerName || '',
      opp.projectManagerEmail || '',
      opp.notes || '',
    ];
    return row.join('\t');
  });

  const tsv = [headerRow, ...dataRows].join('\n');
  const blob = new Blob([tsv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  downloadFile(blob, `opportunities_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function exportToCSV(
  opportunities: Opportunity[],
  headers: Record<string, string>,
  language: 'en' | 'ar'
) {
  const headerRow = Object.values(headers).join(',');
  
  const dataRows = opportunities.map((opp) => {
    const row = [
      `"${opp.donorName}"`,
      `"${opp.donorType}"`,
      `"${opp.interestArea.join('; ')}"`,
      `"${opp.geographicAreas}"`,
      `"${new Date(opp.applicationDeadline).toLocaleDateString(
        language === 'ar' ? 'ar-SA' : 'en-US'
      )}"`,
      opp.allocatedBudget || 0,
      `"${opp.currency}"`,
      opp.isCoFunding ? 'Yes' : 'No',
      `"${opp.cfpLink || ''}"`,
      `"${opp.applicationLink || ''}"`,
      `"${opp.projectManagerName || ''}"`,
      `"${opp.projectManagerEmail || ''}"`,
      `"${opp.notes || ''}"`,
    ];
    return row.join(',');
  });

  const csv = [headerRow, ...dataRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `opportunities_${new Date().toISOString().split('T')[0]}.csv`);
}

function downloadFile(blob: Blob, filename: string) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseCSVFile(file: File): Promise<Opportunity[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
        
        const opportunities: Opportunity[] = lines.slice(1)
          .filter((line) => line.trim())
          .map((line) => {
            const values = parseCSVLine(line);
            return {
              id: `temp_${Date.now()}_${Math.random()}`,
              donorName: values[headers.indexOf('donor name')] || '',
              donorType: values[headers.indexOf('donor type')] || 'Other',
              interestArea: (values[headers.indexOf('interest areas')] || '')
                .split(';')
                .map((s) => s.trim())
                .filter((s) => s),
              geographicAreas: values[headers.indexOf('geographic areas')] || '',
              applicationDeadline: values[headers.indexOf('application deadline')] || '',
              allocatedBudget: parseFloat(values[headers.indexOf('allocated budget')] || '0'),
              currency: values[headers.indexOf('currency')] || 'USD',
              isCoFunding: values[headers.indexOf('co-funding')]?.toLowerCase() === 'yes',
              cfpLink: values[headers.indexOf('cfp link')] || undefined,
              applicationLink: values[headers.indexOf('application link')] || undefined,
              projectManagerName: values[headers.indexOf('project manager name')] || undefined,
              projectManagerEmail: values[headers.indexOf('project manager email')] || undefined,
              notes: values[headers.indexOf('notes')] || undefined,
            };
          });

        resolve(opportunities.filter((opp) => opp.donorName));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}
