/**
 * Vendor Qualification Checklist (Layer 1)
 * 
 * This is the VENDOR MASTER level qualification checklist.
 * It evaluates whether a vendor is eligible to participate in procurement.
 * 
 * 4 Default Sections (Total: 30 points):
 *   Section 1: Legal & Administrative (12 pts)
 *   Section 2: Experience & Technical Capacity (10 pts)
 *   Section 3: Operational Presence (2 pts)
 *   Section 4: References (6 pts)
 * 
 * Organizations can extend the checklist by adding custom sections and criteria.
 * Custom sections/criteria are stored as JSON in the vendor_qualification_scores table.
 * 
 * These scores auto-load into Bid Evaluation (Layer 2) as read-only.
 */
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { trpc } from '@/lib/trpc';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ClipboardCheck,
  Save,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  FileDown,
  FileSpreadsheet,
  Plus,
  Trash2,
} from 'lucide-react';
import { BackButton } from "@/components/BackButton";
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useParams } from 'wouter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// ── Default Vendor Qualification Sections (matching the Excel template exactly) ──
const DEFAULT_SECTIONS = [
  {
    section: 1,
    key: 'legal_admin',
    label: 'Legal & Administrative',
    labelAr: 'القانونية والإدارية',
    maxTotal: 12,
    isDefault: true,
    items: [
      { key: 's1_companyRegistration', label: 'Valid company registration (Mandatory)', labelAr: 'تسجيل الشركة الساري (إلزامي)', maxScore: 2, mandatory: true, details: 'Submission of valid and current commercial registration document.', detailsAr: 'تقديم وثيقة تسجيل تجاري سارية وحالية.' },
      { key: 's1_taxCard', label: 'Tax Card (Mandatory)', labelAr: 'البطاقة الضريبية (إلزامي)', maxScore: 2, mandatory: true, details: 'Submission of valid tax registration card.', detailsAr: 'تقديم بطاقة ضريبية سارية.' },
      { key: 's1_insuranceCard', label: 'Insurance Card', labelAr: 'بطاقة التأمين', maxScore: 2, mandatory: false, details: 'Submission of valid insurance coverage documentation.', detailsAr: 'تقديم وثائق تغطية التأمين السارية.' },
      { key: 's1_signedDeclarations', label: 'Signed declarations (Mandatory)', labelAr: 'الإقرارات الموقعة (إلزامي)', maxScore: 3, mandatory: true, details: 'Submission of all required signed declarations regarding debarment, anti-corruption, and conflict of interest.', detailsAr: 'تقديم جميع الإقرارات الموقعة المطلوبة بشأن الحرمان ومكافحة الفساد وتضارب المصالح.' },
      { key: 's1_sanctionsScreening', label: 'Sanctions screening (Mandatory)', labelAr: 'فحص العقوبات (إلزامي)', maxScore: 3, mandatory: true, details: 'Successful clearance from terrorism and sanctions screening checks.', detailsAr: 'اجتياز فحوصات الإرهاب والعقوبات بنجاح.' },
    ],
  },
  {
    section: 2,
    key: 'experience_technical',
    label: 'Experience & Technical Capacity',
    labelAr: 'الخبرة والقدرة التقنية',
    maxTotal: 10,
    isDefault: true,
    items: [
      { key: 's2_companyProfile', label: 'Company profile document', labelAr: 'وثيقة ملف الشركة', maxScore: 3, mandatory: false, details: 'Submission of a complete and up-to-date company profile and annual report.', detailsAr: 'تقديم ملف شركة كامل ومحدث وتقرير سنوي.' },
      { key: 's2_yearsExperience', label: 'Years of Experience (Mandatory)', labelAr: 'سنوات الخبرة (إلزامي)', maxScore: 4, mandatory: true, details: 'More than 3 years of experience with documented proof (registration and contracts).', detailsAr: 'أكثر من 3 سنوات خبرة مع إثبات موثق (تسجيل وعقود).' },
      { key: 's2_ingoExperience', label: 'I/NGO experience', labelAr: 'خبرة مع المنظمات الدولية/غير الحكومية', maxScore: 3, mandatory: false, details: 'Verifiable experience with at least two I/NGOs on similar projects.', detailsAr: 'خبرة يمكن التحقق منها مع منظمتين دوليتين/غير حكوميتين على الأقل في مشاريع مماثلة.' },
    ],
  },
  {
    section: 3,
    key: 'operational_presence',
    label: 'Operational & Financial Capacity',
    labelAr: 'القدرة التشغيلية والمالية',
    maxTotal: 2,
    isDefault: true,
    items: [
      { key: 's3_targetGeography', label: 'Target geography presence', labelAr: 'التواجد في المنطقة الجغرافية المستهدفة', maxScore: 1, mandatory: false, details: 'Registered and operational office with verifiable proof of presence in the target area.', detailsAr: 'مكتب مسجل وعامل مع إثبات يمكن التحقق منه للتواجد في المنطقة المستهدفة.' },
      { key: 's3_bankAccountDetails', label: 'Bank account details', labelAr: 'تفاصيل الحساب البنكي', maxScore: 1, mandatory: false, details: 'Submission of complete and verified bank account details.', detailsAr: 'تقديم تفاصيل حساب بنكي كاملة ومتحقق منها.' },
    ],
  },
  {
    section: 4,
    key: 'references',
    label: 'References',
    labelAr: 'المراجع',
    maxTotal: 6,
    isDefault: true,
    items: [
      { key: 's4_references', label: 'References (Mandatory)', labelAr: 'المراجع (إلزامي)', maxScore: 6, mandatory: true, details: 'Contact details / letters, ideally from UN/INGOs or local NGOs.', detailsAr: 'تفاصيل الاتصال / خطابات، ويفضل من الأمم المتحدة / المنظمات الدولية أو المنظمات المحلية.' },
    ],
  },
];

const DEFAULT_MAX_SCORE = 30;

type ScoreMap = Record<string, number>;

interface CustomItem {
  id: string;
  label: string;
  labelAr: string;
  maxScore: number;
  score: number;
  mandatory: boolean;
  details: string;
  detailsAr: string;
}

interface CustomSection {
  id: string;
  label: string;
  labelAr: string;
  items: CustomItem[];
}

export default function EvaluationChecklist() {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const params = useParams<{ vendorId?: string }>();

  // Parse mode from URL query string (?mode=view or ?mode=edit)
  const urlMode = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('mode')
    : null;
  const isViewMode = urlMode === 'view';
  const isReadOnly = isViewMode;

  // Pre-select vendor from URL param if available
  const [selectedVendorId, setSelectedVendorId] = useState<string>(params.vendorId || '');
  const [scores, setScores] = useState<ScoreMap>({});
  const [notes, setNotes] = useState('');
  const [evaluationDate, setEvaluationDate] = useState(new Date().toISOString().split('T')[0]);

  // Custom sections state
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);

  // Dialog states
  const [showAddSection, setShowAddSection] = useState(false);
  const [showAddCriteria, setShowAddCriteria] = useState<string | null>(null); // section id or null
  const [newSectionLabel, setNewSectionLabel] = useState('');
  const [newSectionLabelAr, setNewSectionLabelAr] = useState('');
  const [newCriteriaLabel, setNewCriteriaLabel] = useState('');
  const [newCriteriaLabelAr, setNewCriteriaLabelAr] = useState('');
  const [newCriteriaMaxScore, setNewCriteriaMaxScore] = useState(1);
  const [newCriteriaMandatory, setNewCriteriaMandatory] = useState(false);
  const [newCriteriaDetails, setNewCriteriaDetails] = useState('');
  const [newCriteriaDetailsAr, setNewCriteriaDetailsAr] = useState('');

  // Fetch vendors for dropdown
  const vendorsQuery = trpc.vendors.list.useQuery({});
  const vendorList = vendorsQuery.data?.vendors || [];

  // Fetch existing qualification when vendor is selected
  const qualQuery = trpc.vendors.getQualification.useQuery(
    { vendorId: Number(selectedVendorId) },
    { enabled: !!selectedVendorId }
  );

  // Load existing scores when vendor changes
  useEffect(() => {
    if (qualQuery.data) {
      const q = qualQuery.data;
      setScores({
        s1_companyRegistration: Number(q.s1_companyRegistration) || 0,
        s1_taxCard: Number(q.s1_taxCard) || 0,
        s1_insuranceCard: Number(q.s1_insuranceCard) || 0,
        s1_signedDeclarations: Number(q.s1_signedDeclarations) || 0,
        s1_sanctionsScreening: Number(q.s1_sanctionsScreening) || 0,
        s2_companyProfile: Number(q.s2_companyProfile) || 0,
        s2_yearsExperience: Number(q.s2_yearsExperience) || 0,
        s2_ingoExperience: Number(q.s2_ingoExperience) || 0,
        s3_targetGeography: Number(q.s3_targetGeography) || 0,
        s3_bankAccountDetails: Number(q.s3_bankAccountDetails) || 0,
        s4_references: Number(q.s4_references) || 0,
      });
      setNotes(q.notes || '');
      if (q.evaluationDate) {
        setEvaluationDate(q.evaluationDate.split('T')[0]);
      }
      // Load custom sections from saved data
      if (q.customSections) {
        try {
          const parsed = typeof q.customSections === 'string'
            ? JSON.parse(q.customSections)
            : q.customSections;
          if (Array.isArray(parsed)) {
            setCustomSections(parsed);
          }
        } catch {
          setCustomSections([]);
        }
      } else {
        setCustomSections([]);
      }
    } else if (selectedVendorId && !qualQuery.isLoading) {
      // Reset scores for new vendor with no qualification
      setScores({});
      setNotes('');
      setEvaluationDate(new Date().toISOString().split('T')[0]);
      setCustomSections([]);
    }
  }, [qualQuery.data, selectedVendorId]);

  // Save qualification mutation
  const saveQual = trpc.vendors.saveQualification.useMutation({
    onSuccess: (result) => {
      toast.success(
        isRTL
          ? `تم حفظ تأهيل المورد بنجاح — ${result.qualificationStatus === 'qualified' ? 'مؤهل' : result.qualificationStatus === 'conditional' ? 'مشروط' : 'غير مؤهل'}`
          : `Vendor qualification saved — ${result.qualificationStatus} (${result.totalScore}/30)`
      );
      qualQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const setScore = (itemKey: string, value: number, maxScore: number) => {
    setScores(prev => ({ ...prev, [itemKey]: Math.min(maxScore, Math.max(0, value)) }));
  };

  // Calculate section totals for default sections
  const sectionScores = useMemo(() => {
    return DEFAULT_SECTIONS.map(section => {
      const total = section.items.reduce((sum, item) => sum + (scores[item.key] || 0), 0);
      const percentage = section.maxTotal > 0 ? (total / section.maxTotal) * 100 : 0;
      return { section: section.section, total, max: section.maxTotal, percentage };
    });
  }, [scores]);

  // Calculate custom section totals
  const customSectionScores = useMemo(() => {
    return customSections.map(section => {
      const total = section.items.reduce((sum, item) => sum + (item.score || 0), 0);
      const max = section.items.reduce((sum, item) => sum + item.maxScore, 0);
      const percentage = max > 0 ? (total / max) * 100 : 0;
      return { id: section.id, total, max, percentage };
    });
  }, [customSections]);

  const defaultTotalScore = useMemo(() => {
    return sectionScores.reduce((sum, s) => sum + s.total, 0);
  }, [sectionScores]);

  const customTotalScore = useMemo(() => {
    return customSectionScores.reduce((sum, s) => sum + s.total, 0);
  }, [customSectionScores]);

  const customMaxScore = useMemo(() => {
    return customSectionScores.reduce((sum, s) => sum + s.max, 0);
  }, [customSectionScores]);

  // The qualification status is based on the default 30-point scale only
  const totalScore = defaultTotalScore;

  const qualificationStatus = useMemo(() => {
    if (totalScore >= 20) return { label: 'Qualified', labelAr: 'مؤهل', color: 'text-green-700', bg: 'bg-green-50', icon: CheckCircle2 };
    if (totalScore >= 15) return { label: 'Conditional', labelAr: 'مشروط', color: 'text-yellow-700', bg: 'bg-yellow-50', icon: AlertTriangle };
    return { label: 'Not Qualified', labelAr: 'غير مؤهل', color: 'text-red-700', bg: 'bg-red-50', icon: XCircle };
  }, [totalScore]);

  // ── Custom Section/Criteria Handlers ──
  const handleAddSection = () => {
    if (!newSectionLabel.trim()) {
      toast.error(isRTL ? 'يرجى إدخال اسم القسم' : 'Please enter a section name');
      return;
    }
    const newSection: CustomSection = {
      id: `custom_${Date.now()}`,
      label: newSectionLabel.trim(),
      labelAr: newSectionLabelAr.trim() || newSectionLabel.trim(),
      items: [],
    };
    setCustomSections(prev => [...prev, newSection]);
    setNewSectionLabel('');
    setNewSectionLabelAr('');
    setShowAddSection(false);
    toast.success(isRTL ? 'تم إضافة القسم بنجاح' : 'Section added successfully');
  };

  const handleRemoveSection = (sectionId: string) => {
    setCustomSections(prev => prev.filter(s => s.id !== sectionId));
    toast.success(isRTL ? 'تم حذف القسم' : 'Section removed');
  };

  const handleAddCriteria = () => {
    if (!newCriteriaLabel.trim() || !showAddCriteria) {
      toast.error(isRTL ? 'يرجى إدخال اسم المعيار' : 'Please enter a criteria name');
      return;
    }
    if (newCriteriaMaxScore < 1) {
      toast.error(isRTL ? 'يجب أن تكون الدرجة القصوى 1 على الأقل' : 'Max score must be at least 1');
      return;
    }
    const newItem: CustomItem = {
      id: `item_${Date.now()}`,
      label: newCriteriaLabel.trim(),
      labelAr: newCriteriaLabelAr.trim() || newCriteriaLabel.trim(),
      maxScore: newCriteriaMaxScore,
      score: 0,
      mandatory: newCriteriaMandatory,
      details: newCriteriaDetails.trim(),
      detailsAr: newCriteriaDetailsAr.trim(),
    };
    setCustomSections(prev => prev.map(s =>
      s.id === showAddCriteria ? { ...s, items: [...s.items, newItem] } : s
    ));
    setNewCriteriaLabel('');
    setNewCriteriaLabelAr('');
    setNewCriteriaMaxScore(1);
    setNewCriteriaMandatory(false);
    setNewCriteriaDetails('');
    setNewCriteriaDetailsAr('');
    setShowAddCriteria(null);
    toast.success(isRTL ? 'تم إضافة المعيار بنجاح' : 'Criteria added successfully');
  };

  const handleRemoveCriteria = (sectionId: string, itemId: string) => {
    setCustomSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s
    ));
  };

  const setCustomScore = useCallback((sectionId: string, itemId: string, value: number, maxScore: number) => {
    setCustomSections(prev => prev.map(s =>
      s.id === sectionId
        ? {
            ...s,
            items: s.items.map(i =>
              i.id === itemId ? { ...i, score: Math.min(maxScore, Math.max(0, value)) } : i
            ),
          }
        : s
    ));
  }, []);

  // ── Export Functions ──
  const getSelectedVendorName = () => {
    const vendor = vendorList.find((v: any) => v.id.toString() === selectedVendorId);
    return vendor ? `${vendor.name} (${vendor.vendorCode})` : 'Unknown';
  };

  const handleExportPDF = () => {
    const vendorName = getSelectedVendorName();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(isRTL ? 'يرجى السماح بالنوافذ المنبثقة' : 'Please allow popups to export PDF');
      return;
    }

    const sectionsHtml = DEFAULT_SECTIONS.map(section => {
      const sectionScore = sectionScores.find(s => s.section === section.section);
      const rowsHtml = section.items.map(item => {
        const score = scores[item.key] || 0;
        return `<tr>
          <td style="padding:8px;border:1px solid #ddd;">${item.mandatory ? '<strong>' : ''}${isRTL ? item.labelAr : item.label}${item.mandatory ? '</strong>' : ''}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.maxScore}</td>
          <td style="padding:8px;border:1px solid #ddd;font-size:12px;">${isRTL ? item.detailsAr : item.details}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:bold;">${score}</td>
        </tr>`;
      }).join('');

      return `
        <tr style="background:#e8f4fd;">
          <td colspan="4" style="padding:10px;border:1px solid #ddd;font-weight:bold;">
            ${isRTL ? 'القسم' : 'Section'} ${section.section}: ${isRTL ? section.labelAr : section.label}
          </td>
        </tr>
        ${rowsHtml}
        <tr style="background:#f0f0f0;font-weight:bold;">
          <td colspan="3" style="padding:8px;border:1px solid #ddd;">${isRTL ? 'مجموع القسم' : 'Section Total'}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;color:${(sectionScore?.percentage || 0) >= 70 ? 'green' : (sectionScore?.percentage || 0) >= 50 ? 'orange' : 'red'};">${sectionScore?.total || 0} / ${section.maxTotal}</td>
        </tr>`;
    }).join('');

    // Add custom sections to PDF
    const customSectionsHtml = customSections.map((section, idx) => {
      const ss = customSectionScores[idx];
      const rowsHtml = section.items.map(item => {
        return `<tr>
          <td style="padding:8px;border:1px solid #ddd;">${item.mandatory ? '<strong>' : ''}${isRTL ? item.labelAr : item.label}${item.mandatory ? '</strong>' : ''}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.maxScore}</td>
          <td style="padding:8px;border:1px solid #ddd;font-size:12px;">${isRTL ? item.detailsAr : item.details}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:bold;">${item.score}</td>
        </tr>`;
      }).join('');

      return `
        <tr style="background:#f0e6ff;">
          <td colspan="4" style="padding:10px;border:1px solid #ddd;font-weight:bold;">
            ${isRTL ? 'القسم' : 'Section'} ${DEFAULT_SECTIONS.length + idx + 1} (${isRTL ? 'مخصص' : 'Custom'}): ${isRTL ? section.labelAr : section.label}
          </td>
        </tr>
        ${rowsHtml}
        <tr style="background:#f0f0f0;font-weight:bold;">
          <td colspan="3" style="padding:8px;border:1px solid #ddd;">${isRTL ? 'مجموع القسم' : 'Section Total'}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${ss?.total || 0} / ${ss?.max || 0}</td>
        </tr>`;
    }).join('');

    const statusLabel = isRTL ? qualificationStatus.labelAr : qualificationStatus.label;
    const statusColor = totalScore >= 20 ? 'green' : totalScore >= 15 ? 'orange' : 'red';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <title>${isRTL ? 'تأهيل المورد' : 'Vendor Qualification'} - ${vendorName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; font-size: 14px; }
          h1 { color: #1e40af; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #1e40af; color: white; padding: 10px; border: 1px solid #ddd; text-align: ${isRTL ? 'right' : 'left'}; }
          .summary { margin-top: 20px; padding: 15px; border: 2px solid ${statusColor}; border-radius: 8px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>${isRTL ? 'قائمة تأهيل المورد' : 'Vendor Qualification Checklist'}</h1>
        <p><strong>${isRTL ? 'المورد' : 'Vendor'}:</strong> ${vendorName}</p>
        <p><strong>${isRTL ? 'تاريخ التقييم' : 'Evaluation Date'}:</strong> ${evaluationDate}</p>
        <p><strong>${isRTL ? 'الإصدار' : 'Version'}:</strong> ${qualQuery.data?.version || 1}</p>
        
        <table>
          <thead>
            <tr>
              <th>${isRTL ? 'المتطلب' : 'Requirement'}</th>
              <th style="text-align:center;width:80px;">${isRTL ? 'الحد الأقصى' : 'Max Score'}</th>
              <th>${isRTL ? 'التفاصيل' : 'Details'}</th>
              <th style="text-align:center;width:80px;">${isRTL ? 'الدرجة' : 'Score'}</th>
            </tr>
          </thead>
          <tbody>
            ${sectionsHtml}
            ${customSectionsHtml}
          </tbody>
        </table>
        
        <div class="summary">
          <h2 style="color:${statusColor};margin:0;">
            ${isRTL ? 'المجموع الأساسي' : 'Base Total'}: ${totalScore} / ${DEFAULT_MAX_SCORE}
            — ${statusLabel}
          </h2>
          ${customTotalScore > 0 ? `<p style="margin-top:8px;">${isRTL ? 'المجموع المخصص' : 'Custom Total'}: ${customTotalScore} / ${customMaxScore}</p>` : ''}
        </div>
        
        ${notes ? `<div style="margin-top:15px;"><strong>${isRTL ? 'ملاحظات' : 'Notes'}:</strong><p>${notes}</p></div>` : ''}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const handleExportExcel = () => {
    const vendorName = getSelectedVendorName();
    
    const BOM = '\uFEFF';
    const headers = [isRTL ? 'القسم' : 'Section', isRTL ? 'المتطلب' : 'Requirement', isRTL ? 'إلزامي' : 'Mandatory', isRTL ? 'الحد الأقصى' : 'Max Score', isRTL ? 'الدرجة' : 'Score', isRTL ? 'التفاصيل' : 'Details'];
    
    const rows: string[][] = [];
    DEFAULT_SECTIONS.forEach(section => {
      section.items.forEach(item => {
        rows.push([
          `${isRTL ? 'القسم' : 'Section'} ${section.section}: ${isRTL ? section.labelAr : section.label}`,
          isRTL ? item.labelAr : item.label,
          item.mandatory ? (isRTL ? 'نعم' : 'Yes') : (isRTL ? 'لا' : 'No'),
          item.maxScore.toString(),
          (scores[item.key] || 0).toString(),
          isRTL ? item.detailsAr : item.details,
        ]);
      });
      const sectionScore = sectionScores.find(s => s.section === section.section);
      rows.push([
        `${isRTL ? 'القسم' : 'Section'} ${section.section}: ${isRTL ? section.labelAr : section.label}`,
        isRTL ? 'مجموع القسم' : 'Section Total',
        '', section.maxTotal.toString(), (sectionScore?.total || 0).toString(), '',
      ]);
    });

    // Add custom sections to CSV
    customSections.forEach((section, idx) => {
      const ss = customSectionScores[idx];
      section.items.forEach(item => {
        rows.push([
          `${isRTL ? 'القسم' : 'Section'} ${DEFAULT_SECTIONS.length + idx + 1} (${isRTL ? 'مخصص' : 'Custom'}): ${isRTL ? section.labelAr : section.label}`,
          isRTL ? item.labelAr : item.label,
          item.mandatory ? (isRTL ? 'نعم' : 'Yes') : (isRTL ? 'لا' : 'No'),
          item.maxScore.toString(),
          item.score.toString(),
          isRTL ? item.detailsAr : item.details,
        ]);
      });
      rows.push([
        `${isRTL ? 'القسم' : 'Section'} ${DEFAULT_SECTIONS.length + idx + 1}: ${isRTL ? section.labelAr : section.label}`,
        isRTL ? 'مجموع القسم' : 'Section Total',
        '', (ss?.max || 0).toString(), (ss?.total || 0).toString(), '',
      ]);
    });
    
    rows.push([
      '', isRTL ? 'المجموع الأساسي' : 'BASE TOTAL', '',
      DEFAULT_MAX_SCORE.toString(), totalScore.toString(),
      `${isRTL ? qualificationStatus.labelAr : qualificationStatus.label}`,
    ]);
    if (customTotalScore > 0) {
      rows.push([
        '', isRTL ? 'المجموع المخصص' : 'CUSTOM TOTAL', '',
        customMaxScore.toString(), customTotalScore.toString(), '',
      ]);
    }

    const csvContent = BOM + [headers, ...rows].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Vendor_Qualification_${vendorName.replace(/[^a-zA-Z0-9]/g, '_')}_${evaluationDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'تم تصدير الملف بنجاح' : 'File exported successfully');
  };

  const handleSave = () => {
    if (!selectedVendorId) {
      toast.error(isRTL ? 'يرجى اختيار المورد' : 'Please select a vendor');
      return;
    }

    saveQual.mutate({
      vendorId: Number(selectedVendorId),
      evaluationDate,
      s1_companyRegistration: scores.s1_companyRegistration || 0,
      s1_taxCard: scores.s1_taxCard || 0,
      s1_insuranceCard: scores.s1_insuranceCard || 0,
      s1_signedDeclarations: scores.s1_signedDeclarations || 0,
      s1_sanctionsScreening: scores.s1_sanctionsScreening || 0,
      s2_companyProfile: scores.s2_companyProfile || 0,
      s2_yearsExperience: scores.s2_yearsExperience || 0,
      s2_ingoExperience: scores.s2_ingoExperience || 0,
      s3_targetGeography: scores.s3_targetGeography || 0,
      s3_bankAccountDetails: scores.s3_bankAccountDetails || 0,
      s4_references: scores.s4_references || 0,
      notes,
      customSections: customSections.map(s => ({
        label: s.label,
        labelAr: s.labelAr,
        maxTotal: s.items.reduce((sum, i) => sum + i.maxScore, 0),
        items: s.items.map(i => ({
          label: i.label,
          labelAr: i.labelAr,
          maxScore: i.maxScore,
          score: i.score,
          mandatory: i.mandatory,
          details: i.details,
          detailsAr: i.detailsAr,
        })),
      })),
    });
  };

  const StatusIcon = qualificationStatus.icon;

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-4 mb-4">
            <BackButton
              href="/organization/logistics/evaluation-performance/qualification-list"
              label={isRTL ? 'العودة لقائمة التأهيل' : 'Back to Qualification List'}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-3 rounded-lg text-white">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {isRTL ? 'قائمة تأهيل المورد' : 'Vendor Qualification Checklist'}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {isRTL
                    ? 'المستوى الأول: تقييم أهلية المورد للمشاركة في المشتريات (30 نقطة)'
                    : 'Layer 1: Evaluate vendor eligibility to participate in procurement (30 points)'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedVendorId && qualQuery.data && (
                <>
                  <Button variant="outline" size="lg" onClick={handleExportPDF}>
                    <FileDown className="h-4 w-4 me-2" />
                    {isRTL ? 'تصدير PDF' : 'Export PDF'}
                  </Button>
                  <Button variant="outline" size="lg" onClick={handleExportExcel}>
                    <FileSpreadsheet className="h-4 w-4 me-2" />
                    {isRTL ? 'تصدير Excel' : 'Export Excel'}
                  </Button>
                </>
              )}
              {!isReadOnly && (
                <Button onClick={handleSave} disabled={saveQual.isPending || !selectedVendorId} size="lg">
                  <Save className="h-4 w-4 me-2" />
                  {saveQual.isPending
                    ? (isRTL ? 'جاري الحفظ...' : 'Saving...')
                    : (isRTL ? 'حفظ التأهيل' : 'Save Qualification')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Architecture Info Banner */}
        <Alert className="mb-6 border-blue-200 bg-blue-50/50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-800">
            {isRTL
              ? 'هذه القائمة خاصة بتأهيل المورد عند التسجيل. الدرجات ستُحمّل تلقائياً في تقييم العطاءات (للقراءة فقط). البنود الخاصة بالمناقصة (خطة العمل، وقت التسليم، العينات، إلخ) تُقيّم في مساحة عمل المشتريات.'
              : 'This checklist is for vendor registration qualification. Scores will auto-load into Bid Evaluation (read-only). Tender-specific items (Work & Safety Plan, Delivery Time, Samples, etc.) are evaluated in the Procurement Workspace.'}
          </AlertDescription>
        </Alert>

        {/* Vendor Selection + Qualification Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">{isRTL ? 'اختيار المورد' : 'Select Vendor'}</CardTitle>
              <CardDescription>
                {isRTL ? 'اختر المورد لتقييم تأهيله' : 'Choose the vendor to evaluate qualification'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId} disabled={isReadOnly || !!params.vendorId}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'اختر المورد...' : 'Choose vendor...'} />
                </SelectTrigger>
                <SelectContent>
                  {vendorList.map((v: any) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.vendorCode} — {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isViewMode && (
                <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
                  {isRTL ? 'وضع العرض — للقراءة فقط' : 'View Mode — Read Only'}
                </Badge>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  {isRTL ? 'تاريخ التقييم' : 'Evaluation Date'}
                </label>
                <Input
                  type="date"
                  value={evaluationDate}
                  onChange={(e) => setEvaluationDate(e.target.value)}
                  className="w-48"
                  disabled={isReadOnly}
                />
              </div>
              {qualQuery.data && (
                <div className="text-xs text-muted-foreground">
                  {isRTL ? `آخر تحديث: الإصدار ${qualQuery.data.version}` : `Last updated: Version ${qualQuery.data.version}`}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`${qualificationStatus.bg} border-2`}>
            <CardContent className="pt-6 text-center">
              <StatusIcon className={`h-10 w-10 mx-auto mb-2 ${qualificationStatus.color}`} />
              <div className={`text-4xl font-bold ${qualificationStatus.color}`}>
                {totalScore} <span className="text-lg font-normal">/ {DEFAULT_MAX_SCORE}</span>
              </div>
              <Badge className={`mt-2 ${qualificationStatus.bg} ${qualificationStatus.color} border`}>
                {isRTL ? qualificationStatus.labelAr : qualificationStatus.label}
              </Badge>
              <p className="text-xs text-muted-foreground mt-3">
                {isRTL ? '≥20 مؤهل | ≥15 مشروط | <15 غير مؤهل' : '≥20 Qualified | ≥15 Conditional | <15 Not Qualified'}
              </p>
              {customTotalScore > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'الأقسام المخصصة' : 'Custom Sections'}
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {customTotalScore} / {customMaxScore}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Default Qualification Sections */}
        {DEFAULT_SECTIONS.map((section, sIdx) => {
          const ss = sectionScores[sIdx];
          return (
            <Card key={section.key} className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {isRTL
                        ? `القسم ${section.section}: ${section.labelAr}`
                        : `Section ${section.section}: ${section.label}`}
                    </CardTitle>
                    <CardDescription>
                      {isRTL
                        ? `الحد الأقصى: ${section.maxTotal} نقطة`
                        : `Maximum: ${section.maxTotal} points`}
                    </CardDescription>
                  </div>
                  <div className="text-end">
                    <div className={`text-2xl font-bold ${
                      ss.percentage >= 70 ? 'text-green-600' : ss.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {ss.total} / {ss.max}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isRTL ? 'المجموع الفرعي' : 'Section Total'}
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      ss.percentage >= 70 ? 'bg-green-500' : ss.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${ss.percentage}%` }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.items.map(item => (
                    <div key={item.key} className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-transparent hover:border-border transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{isRTL ? item.labelAr : item.label}</p>
                          {item.mandatory && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-300 text-red-600">
                              {isRTL ? 'إلزامي' : 'Mandatory'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isRTL ? item.detailsAr : item.details}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          type="number"
                          min={0}
                          max={item.maxScore}
                          step={1}
                          value={scores[item.key] ?? 0}
                          onChange={(e) => setScore(item.key, Number(e.target.value), item.maxScore)}
                          className="w-20 text-center font-medium"
                          disabled={isReadOnly}
                        />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">/ {item.maxScore}</span>
                      </div>
                    </div>
                  ))}
                </div>

                  {/* Custom criteria added to this built-in section */}
                  {(() => {
                    const ext = customSections.find(s => s.id === `ext_${section.key}`);
                    if (!ext || ext.items.length === 0) return null;
                    return (
                      <>
                        <div className="mt-4 pt-3 border-t border-dashed border-purple-200">
                          <p className="text-xs font-medium text-purple-600 mb-3">
                            {isRTL ? 'معايير إضافية مخصصة' : 'Additional Custom Criteria'}
                          </p>
                        </div>
                        {ext.items.map(item => (
                          <div key={item.id} className="flex items-start gap-4 p-4 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{isRTL ? item.labelAr : item.label}</p>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-300 text-purple-600">
                                  {isRTL ? 'مخصص' : 'Custom'}
                                </Badge>
                                {item.mandatory && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-300 text-red-600">
                                    {isRTL ? 'إلزامي' : 'Mandatory'}
                                  </Badge>
                                )}
                              </div>
                              {(item.details || item.detailsAr) && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {isRTL ? item.detailsAr : item.details}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Input
                                type="number"
                                min={0}
                                max={item.maxScore}
                                step={1}
                                value={item.score || 0}
                                onChange={(e) => setCustomScore(`ext_${section.key}`, item.id, Number(e.target.value), item.maxScore)}
                                className="w-20 text-center font-medium"
                                disabled={isReadOnly}
                              />
                              <span className="text-sm text-muted-foreground whitespace-nowrap">/ {item.maxScore}</span>
                              {!isReadOnly && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                                  onClick={() => handleRemoveCriteria(`ext_${section.key}`, item.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}

                  {/* Add Criteria button for built-in section */}
                  {!isReadOnly && (
                    <div className="mt-4 pt-3 border-t border-dashed border-muted-foreground/20">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-2"
                        onClick={() => {
                          // Ensure extension section exists for this built-in section
                          const extId = `ext_${section.key}`;
                          if (!customSections.find(s => s.id === extId)) {
                            setCustomSections(prev => [...prev, {
                              id: extId,
                              label: section.label,
                              labelAr: section.labelAr,
                              items: [],
                            }]);
                          }
                          setShowAddCriteria(extId);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        {isRTL ? 'إضافة معيار' : 'Add Criteria'}
                      </Button>
                    </div>
                  )}
              </CardContent>
            </Card>
          );
        })}

        {/* Custom Sections */}
        {customSections.filter(s => !s.id.startsWith('ext_')).map((section) => {
          const cIdx = customSections.findIndex(s => s.id === section.id);
          const ss = customSectionScores[cIdx];
          const standaloneIdx = customSections.filter(s => !s.id.startsWith('ext_')).indexOf(section);
          return (
            <Card key={section.id} className="mb-6 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {isRTL
                          ? `القسم ${DEFAULT_SECTIONS.length + standaloneIdx + 1}: ${section.labelAr}`
                          : `Section ${DEFAULT_SECTIONS.length + standaloneIdx + 1}: ${section.label}`}
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-300 text-purple-600">
                        {isRTL ? 'مخصص' : 'Custom'}
                      </Badge>
                    </div>
                    <CardDescription>
                      {isRTL
                        ? `الحد الأقصى: ${ss?.max || 0} نقطة`
                        : `Maximum: ${ss?.max || 0} points`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-end">
                      <div className={`text-2xl font-bold ${
                        (ss?.percentage || 0) >= 70 ? 'text-green-600' : (ss?.percentage || 0) >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {ss?.total || 0} / {ss?.max || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isRTL ? 'المجموع الفرعي' : 'Section Total'}
                      </div>
                    </div>
                    {!isReadOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveSection(section.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {(ss?.max || 0) > 0 && (
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        (ss?.percentage || 0) >= 70 ? 'bg-green-500' : (ss?.percentage || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${ss?.percentage || 0}%` }}
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.items.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      {isRTL ? 'لا توجد معايير بعد. أضف معياراً جديداً.' : 'No criteria yet. Add a new criteria.'}
                    </div>
                  )}
                  {section.items.map(item => (
                    <div key={item.id} className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-transparent hover:border-border transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{isRTL ? item.labelAr : item.label}</p>
                          {item.mandatory && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-300 text-red-600">
                              {isRTL ? 'إلزامي' : 'Mandatory'}
                            </Badge>
                          )}
                        </div>
                        {(item.details || item.detailsAr) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {isRTL ? item.detailsAr : item.details}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          type="number"
                          min={0}
                          max={item.maxScore}
                          step={1}
                          value={item.score}
                          onChange={(e) => setCustomScore(section.id, item.id, Number(e.target.value), item.maxScore)}
                          className="w-20 text-center font-medium"
                          disabled={isReadOnly}
                        />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">/ {item.maxScore}</span>
                        {!isReadOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-600 h-8 w-8"
                            onClick={() => handleRemoveCriteria(section.id, item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Add Criteria button inside each custom section */}
                {!isReadOnly && (
                  <div className="mt-4 pt-3 border-t border-dashed border-purple-200">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-purple-300 text-purple-600 hover:bg-purple-50"
                      onClick={() => setShowAddCriteria(section.id)}
                    >
                      <Plus className="w-4 h-4" />
                      {isRTL ? 'إضافة معيار' : 'Add Criteria'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Add New Section Button */}
        {!isReadOnly && (
          <Card className="mb-6 border-dashed border-2 border-purple-300 bg-purple-50/30 hover:bg-purple-50/50 transition-colors cursor-pointer"
            onClick={() => setShowAddSection(true)}
          >
            <CardContent className="py-8 flex flex-col items-center justify-center gap-2">
              <div className="p-3 bg-purple-100 rounded-full">
                <Plus className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-purple-700">
                {isRTL ? 'إضافة قسم جديد' : 'Add New Section'}
              </p>
              <p className="text-xs text-purple-500">
                {isRTL ? 'أضف أقساماً مخصصة لتوسيع قائمة التأهيل' : 'Add custom sections to extend the qualification checklist'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Overall Notes */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">{isRTL ? 'ملاحظات عامة' : 'Overall Notes'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isRTL ? 'أدخل ملاحظات التأهيل العامة...' : 'Enter overall qualification notes...'}
              rows={4}
              disabled={isReadOnly}
            />
          </CardContent>
        </Card>

        {/* Score Summary Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">{isRTL ? 'ملخص الدرجات' : 'Score Summary'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-start py-2 font-medium">{isRTL ? 'القسم' : 'Section'}</th>
                    <th className="text-center py-2 font-medium">{isRTL ? 'الدرجة' : 'Score'}</th>
                    <th className="text-center py-2 font-medium">{isRTL ? 'الحد الأقصى' : 'Max'}</th>
                    <th className="text-center py-2 font-medium">{isRTL ? 'النسبة' : 'Percentage'}</th>
                  </tr>
                </thead>
                <tbody>
                  {DEFAULT_SECTIONS.map((section, idx) => {
                    const ss = sectionScores[idx];
                    const ext = customSections.find(s => s.id === `ext_${section.key}`);
                    const extTotal = ext ? ext.items.reduce((sum, i) => sum + (i.score || 0), 0) : 0;
                    const extMax = ext ? ext.items.reduce((sum, i) => sum + i.maxScore, 0) : 0;
                    const combinedTotal = ss.total + extTotal;
                    const combinedMax = ss.max + extMax;
                    const combinedPct = combinedMax > 0 ? (combinedTotal / combinedMax) * 100 : 0;
                    return (
                      <tr key={section.key} className="border-b">
                        <td className="py-2">
                          {isRTL ? section.labelAr : section.label}
                          {extMax > 0 && <span className="text-[10px] text-purple-500 ml-1">(+{extMax})</span>}
                        </td>
                        <td className="text-center py-2 font-medium">{combinedTotal}</td>
                        <td className="text-center py-2 text-muted-foreground">{combinedMax}</td>
                        <td className="text-center py-2">
                          <span className={`font-medium ${
                            combinedPct >= 70 ? 'text-green-600' : combinedPct >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {combinedPct.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="font-bold border-t-2">
                    <td className="py-3">{isRTL ? 'المجموع الأساسي' : 'Base Total'}</td>
                    <td className={`text-center py-3 ${qualificationStatus.color}`}>{totalScore}</td>
                    <td className="text-center py-3">{DEFAULT_MAX_SCORE}</td>
                    <td className="text-center py-3">
                      <Badge className={`${qualificationStatus.bg} ${qualificationStatus.color} border`}>
                        {isRTL ? qualificationStatus.labelAr : qualificationStatus.label}
                      </Badge>
                    </td>
                  </tr>
                  {customSections.filter(s => !s.id.startsWith('ext_')).length > 0 && (
                    <>
                      <tr>
                        <td colSpan={4} className="py-2 pt-4 text-xs text-purple-600 font-semibold uppercase tracking-wider">
                          {isRTL ? 'الأقسام المخصصة' : 'Custom Sections'}
                        </td>
                      </tr>
                      {customSections.filter(s => !s.id.startsWith('ext_')).map((section) => {
                        const idx = customSections.findIndex(s => s.id === section.id);
                        const ss = customSectionScores[idx];
                        return (
                          <tr key={section.id} className="border-b">
                            <td className="py-2">
                              <span className="flex items-center gap-1">
                                {isRTL ? section.labelAr : section.label}
                                <Badge variant="outline" className="text-[9px] px-1 py-0 border-purple-300 text-purple-500">
                                  {isRTL ? 'مخصص' : 'Custom'}
                                </Badge>
                              </span>
                            </td>
                            <td className="text-center py-2 font-medium">{ss.total}</td>
                            <td className="text-center py-2 text-muted-foreground">{ss.max}</td>
                            <td className="text-center py-2">
                              <span className={`font-medium ${
                                ss.percentage >= 70 ? 'text-green-600' : ss.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {ss.max > 0 ? ss.percentage.toFixed(0) : 0}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="font-bold border-t">
                        <td className="py-3 text-purple-700">{isRTL ? 'مجموع المخصص' : 'Custom Total'}</td>
                        <td className="text-center py-3">{customTotalScore}</td>
                        <td className="text-center py-3">{customMaxScore}</td>
                        <td className="text-center py-3">
                          {customMaxScore > 0 ? ((customTotalScore / customMaxScore) * 100).toFixed(0) : 0}%
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Add Section Dialog ── */}
      <Dialog open={showAddSection} onOpenChange={setShowAddSection}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? 'إضافة قسم جديد' : 'Add New Section'}</DialogTitle>
            <DialogDescription>
              {isRTL
                ? 'أضف قسماً مخصصاً لتوسيع قائمة تأهيل المورد. يمكنك إضافة معايير بعد إنشاء القسم.'
                : 'Add a custom section to extend the vendor qualification checklist. You can add criteria after creating the section.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{isRTL ? 'اسم القسم (إنجليزي)' : 'Section Name (English)'}</Label>
              <Input
                value={newSectionLabel}
                onChange={(e) => setNewSectionLabel(e.target.value)}
                placeholder={isRTL ? 'مثال: الامتثال البيئي' : 'e.g., Environmental Compliance'}
              />
            </div>
            <div>
              <Label>{isRTL ? 'اسم القسم (عربي)' : 'Section Name (Arabic)'}</Label>
              <Input
                value={newSectionLabelAr}
                onChange={(e) => setNewSectionLabelAr(e.target.value)}
                placeholder={isRTL ? 'مثال: الامتثال البيئي' : 'e.g., الامتثال البيئي'}
                dir="rtl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSection(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleAddSection} className="gap-2">
              <Plus className="w-4 h-4" />
              {isRTL ? 'إضافة القسم' : 'Add Section'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Criteria Dialog ── */}
      <Dialog open={!!showAddCriteria} onOpenChange={(open) => !open && setShowAddCriteria(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? 'إضافة معيار جديد' : 'Add New Criteria'}</DialogTitle>
            <DialogDescription>
              {isRTL
                ? 'أضف معياراً جديداً للتقييم في هذا القسم.'
                : 'Add a new evaluation criteria to this section.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{isRTL ? 'اسم المعيار (إنجليزي)' : 'Criteria Name (English)'}</Label>
              <Input
                value={newCriteriaLabel}
                onChange={(e) => setNewCriteriaLabel(e.target.value)}
                placeholder={isRTL ? 'مثال: شهادة ISO' : 'e.g., ISO Certification'}
              />
            </div>
            <div>
              <Label>{isRTL ? 'اسم المعيار (عربي)' : 'Criteria Name (Arabic)'}</Label>
              <Input
                value={newCriteriaLabelAr}
                onChange={(e) => setNewCriteriaLabelAr(e.target.value)}
                placeholder={isRTL ? 'مثال: شهادة ISO' : 'e.g., شهادة ISO'}
                dir="rtl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{isRTL ? 'الدرجة القصوى' : 'Max Score'}</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={newCriteriaMaxScore}
                  onChange={(e) => setNewCriteriaMaxScore(Number(e.target.value))}
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCriteriaMandatory}
                    onChange={(e) => setNewCriteriaMandatory(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{isRTL ? 'إلزامي' : 'Mandatory'}</span>
                </label>
              </div>
            </div>
            <div>
              <Label>{isRTL ? 'التفاصيل (إنجليزي)' : 'Details (English)'}</Label>
              <Textarea
                value={newCriteriaDetails}
                onChange={(e) => setNewCriteriaDetails(e.target.value)}
                placeholder={isRTL ? 'وصف المعيار...' : 'Describe the criteria...'}
                rows={2}
              />
            </div>
            <div>
              <Label>{isRTL ? 'التفاصيل (عربي)' : 'Details (Arabic)'}</Label>
              <Textarea
                value={newCriteriaDetailsAr}
                onChange={(e) => setNewCriteriaDetailsAr(e.target.value)}
                placeholder={isRTL ? 'وصف المعيار...' : 'وصف المعيار...'}
                rows={2}
                dir="rtl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCriteria(null)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleAddCriteria} className="gap-2">
              <Plus className="w-4 h-4" />
              {isRTL ? 'إضافة المعيار' : 'Add Criteria'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
