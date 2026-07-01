/**
 * Finance Module Translation Schema & Keys
 * Supports English (en), Arabic (ar), and Italian (it).
 * Path: client/src/i18n/locales/finance.ts
 */
import { useLanguage } from '@/contexts/LanguageContext';

export interface IFinanceTranslations {
  dashboard: {
    title: string;
    portfolioOversight: string;
    realTimeIntelligence: string;
    masterFilter: string;
    applyFilters: string;
    activeProjects: string;
    navigation: {
      portfolioDetail: string;
      portfolioDesc: string;
      budgetLedger: string;
      budgetLedgerDesc: string;
      reportingCenter: string;
      reportingCenterDesc: string;
    };
    kpis: {
      totalPortfolioBudget: string;
      actualSpent: string;
      commitmentPercentage: string;
      avgBurnRate: string;
      cashOnHand: string;
      requiredBurnRate: string;
      remainingBalance: string;
      utilization: string;
      overForecast: string;
      onTrack: string;
      atRisk: string;
      critical: string;
    };
    predictiveAlerts: {
      title: string;
      severityCritical: string;
      projectedOverspend: string;
      escalate: string;
      noRisks: string;
    };
    healthMatrix: {
      title: string;
      projectIdentity: string;
      budgetTotal: string;
      actualsYTD: string;
      variance: string;
      status: string;
      exportMatrix: string;
    };
    waterfall: {
      title: string;
      openingCash: string;
      donorReceipts: string;
      internalTransfers: string;
      payroll: string;
      vendorPayments: string;
      advances: string;
      operationalExp: string;
      closingBalance: string;
    };
    p2pPipeline: {
      title: string;
      purchaseReqs: string;
      openPOs: string;
      goodsReceived: string;
      pendingInvoices: string;
      apAging: string;
      vendorPaid: string;
      outstandingComm: string;
      avgCycle: string;
    };
  };
  projectDetail: {
    title: string;
    returnToPortfolio: string;
    exportPdf: string;
    timeMargin: string;
    daysUntilExpiry: string;
    lifecycleCompletion: string;
    supportiveGrants: string;
    budgetConsumption: string;
    topCategories: string;
    transactionTimeline: string;
    viewAllTransactions: string;
  };
  ledger: {
    title: string;
    postingDate: string;
    description: string;
    reference: string;
    debit: string;
    credit: string;
    posted: string;
    voucher: string;
    auditTrail: string;
    workflowHistory: string;
  };
  reporting: {
    title: string;
    catalog: string;
    history: string;
    scheduled: string;
    newDistribution: string;
    identifier: string;
    classification: string;
    requestor: string;
    runtime: string;
    integrity: string;
  };
}

export const financeTranslations = {
  en: {
    dashboard: {
      title: "Executive Financial Intelligence",
      portfolioOversight: "Portfolio Oversight",
      realTimeIntelligence: "Real-time intelligence across strategic operations.",
      masterFilter: "Master Filter: Active Projects",
      applyFilters: "Apply Filters",
      activeProjects: "Active Projects",
      selectProject: "Select Project",
      navigation: {
        portfolioDetail: "Portfolio & Project Detail",
        portfolioDesc: "Drill down into individual workstream performance and historical BvA trends.",
        budgetLedger: "Budget Line & Ledger",
        budgetLedgerDesc: "Audit-ready transactional ledger mapping and General Ledger reconciliation.",
        reportingCenter: "Financial Reporting Center",
        reportingCenterDesc: "Standardized P&L, Balance Sheet, and donor-compliant automated exports."
      },
      kpis: {
        totalPortfolioBudget: "Total Portfolio Budget",
        actualSpent: "Actual Spent (YTD)",
        commitmentPercentage: "Commitment %",
        avgBurnRate: "Avg Burn Rate (MO)",
        cashOnHand: "Cash on Hand",
        requiredBurnRate: "Required Burn Rate",
        remainingBalance: "Remaining Balance",
        utilization: "Utilization",
        overForecast: "Over Forecast",
        onTrack: "On Track",
        atRisk: "At Risk",
        critical: "Critical"
      },
      predictiveAlerts: {
        title: "Predictive Risk Alerts",
        severityCritical: "Critical",
        projectedOverspend: "Projected overspend",
        escalate: "Escalate",
        noRisks: "No imminent risks detected."
      },
      healthMatrix: {
        title: "Financial Health Matrix",
        projectIdentity: "Project Identity",
        budgetTotal: "Budget (Total)",
        actualsYTD: "Actuals (YTD)",
        variance: "Variance %",
        status: "Health Status",
        exportMatrix: "Export Matrix Report"
      },
      waterfall: {
        title: "Cash flow Analysis (Waterfall)",
        openingCash: "Opening Cash",
        donorReceipts: "Donor Receipts",
        internalTransfers: "Internal Transfers",
        payroll: "Payroll",
        vendorPayments: "Vendor Payments",
        advances: "Advances",
        operationalExp: "Operational Exp",
        closingBalance: "Closing Balance"
      },
      p2pPipeline: {
        title: "Procure-to-Pay Liability Pipeline",
        purchaseReqs: "Purchase Reqs",
        openPOs: "Open POs",
        goodsReceived: "Goods Received",
        pendingInvoices: "Pending Inv.",
        apAging: "A/P Aging",
        vendorPaid: "Vend. Paid",
        outstandingComm: "Outst. Comm.",
        avgCycle: "Avg Cycle"
      },
      complianceScorecard: {
        title: "Financial Compliance Scorecard",
        auditFindings: "Audit Findings",
        lateReconciliations: "Late Reconciliations",
        outstandingAdvances: "Outstanding Advances",
        budgetOverruns: "Budget Overruns",
        pendingApprovals: "Pending Approvals"
      }
    },
    common: {
      loading: "Loading...",
      error: "Error",
      noData: "No data available",
      back: "← Back",
      export: "Export",
      filter: "Filter",
      search: "Search"
    }
  },
  ar: {
    dashboard: {
      title: "الذكاء المالي التنفيذي",
      portfolioOversight: "الإشراف على المحفظة",
      realTimeIntelligence: "ذكاء فوري عبر العمليات الاستراتيجية.",
      masterFilter: "الفلتر الرئيسي: المشاريع النشطة",
      applyFilters: "تطبيق الفلاتر",
      activeProjects: "المشاريع النشطة",
      selectProject: "اختر المشروع",
      navigation: {
        portfolioDetail: "تفاصيل المحفظة والمشروع",
        portfolioDesc: "التعمق في أداء سير العمل الفردي واتجاهات الميزانية مقابل الفعلي التاريخية.",
        budgetLedger: "بند الميزانية ودفتر الأستاذ",
        budgetLedgerDesc: "رسم خرائط دفتر الأستاذ المعاملاتي الجاهز للمراجعة وتسوية دفتر الأستاذ العام.",
        reportingCenter: "مركز التقارير المالية",
        reportingCenterDesc: "الأرباح والخسائر المعيارية، الميزانية العمومية، والصادرات الآلية المتوافقة مع المانحين."
      },
      kpis: {
        totalPortfolioBudget: "إجمالي ميزانية المحفظة",
        actualSpent: "الإنفاق الفعلي (منذ بداية العام)",
        commitmentPercentage: "نسبة الالتزام %",
        avgBurnRate: "متوسط معدل الإنفاق (شهرياً)",
        cashOnHand: "النقد المتوفر",
        requiredBurnRate: "معدل الإنفاق المطلوب",
        remainingBalance: "الرصيد المتبقي",
        utilization: "الاستخدام",
        overForecast: "تجاوز التوقعات",
        onTrack: "في المسار الصحيح",
        atRisk: "معرض للخطر",
        critical: "حرج"
      },
      predictiveAlerts: {
        title: "تنبيهات المخاطر التنبؤية",
        severityCritical: "حرج",
        projectedOverspend: "تجاوز التكلفة المتوقع",
        escalate: "تصعيد",
        noRisks: "لم يتم اكتشاف مخاطر وشيكة."
      },
      healthMatrix: {
        title: "مصفوفة الصحة المالية",
        projectIdentity: "هوية المشروع",
        budgetTotal: "الميزانية (الإجمالية)",
        actualsYTD: "الفعلي (منذ بداية العام)",
        variance: "نسبة التباين %",
        status: "حالة الصحة",
        exportMatrix: "تصدير تقرير المصفوفة"
      },
      waterfall: {
        title: "تحليل التدفق النقدي (شلال)",
        openingCash: "النقد الافتتاحي",
        donorReceipts: "إيصالات المانحين",
        internalTransfers: "التحويلات الداخلية",
        payroll: "كشوف المرتبات",
        vendorPayments: "مدفوعات الموردين",
        advances: "السلف",
        operationalExp: "المصاريف التشغيلية",
        closingBalance: "الرصيد الختامي"
      },
      p2pPipeline: {
        title: "خط أنابيب مسؤولية الشراء حتى الدفع",
        purchaseReqs: "طلبات الشراء",
        openPOs: "أوامر الشراء المفتوحة",
        goodsReceived: "البضائع المستلمة",
        pendingInvoices: "الفواتير المعلقة",
        apAging: "تقادم الحسابات الدائنة",
        vendorPaid: "المدفوع للموردين",
        outstandingComm: "الالتزامات القائمة",
        avgCycle: "متوسط الدورة"
      },
      complianceScorecard: {
        title: "بطاقة الامتثال المالي",
        auditFindings: "نتائج المراجعة",
        lateReconciliations: "التسويات المتأخرة",
        outstandingAdvances: "السلف القائمة",
        budgetOverruns: "تجاوزات الميزانية",
        pendingApprovals: "الموافقات المعلقة"
      }
    },
    common: {
      loading: "جاري التحميل...",
      error: "خطأ",
      noData: "لا توجد بيانات",
      back: "← رجوع",
      export: "تصدير",
      filter: "فلتر",
      search: "بحث"
    }
  },
  it: {
    dashboard: {
      title: "Intelligenza Finanziaria Esecutiva",
      portfolioOversight: "Supervisione del Portafoglio",
      realTimeIntelligence: "Intelligenza in tempo reale su tutte le operazioni strategiche.",
      masterFilter: "Filtro Principale: Progetti Attivi",
      applyFilters: "Applica Filtri",
      activeProjects: "Progetti Attivi",
      selectProject: "Seleziona Progetto",
      navigation: {
        portfolioDetail: "Dettagli Portafoglio e Progetto",
        portfolioDesc: "Analizza le prestazioni dei singoli flussi di lavoro e le tendenze storiche BvA.",
        budgetLedger: "Voce di Budget e Libro Mastro",
        budgetLedgerDesc: "Mappatura del registro transazionale pronta per la revisione e riconciliazione del Libro Mastro Generale.",
        reportingCenter: "Centro di Rendicontazione Finanziaria",
        reportingCenterDesc: "P&L standardizzato, Stato Patrimoniale ed esportazioni automatizzate conformi ai donatori."
      },
      kpis: {
        totalPortfolioBudget: "Budget Totale del Portafoglio",
        actualSpent: "Spesa Effettiva (YTD)",
        commitmentPercentage: "Percentuale di Impegno",
        avgBurnRate: "Tasso medio di consumo (MO)",
        cashOnHand: "Disponibilità Liquida",
        requiredBurnRate: "Tasso di consumo richiesto",
        remainingBalance: "Saldo Rimanente",
        utilization: "Utilizzo",
        overForecast: "Oltre le previsioni",
        onTrack: "In linea",
        atRisk: "A rischio",
        critical: "Critico"
      },
      predictiveAlerts: {
        title: "Avvisi di Rischio Predittivi",
        severityCritical: "Critico",
        projectedOverspend: "Sovraspesa prevista",
        escalate: "Intensificare",
        noRisks: "Nessun rischio imminente rilevato."
      },
      healthMatrix: {
        title: "Matrice della Salute Finanziaria",
        projectIdentity: "Identità del Progetto",
        budgetTotal: "Budget (Totale)",
        actualsYTD: "Effettivi (YTD)",
        variance: "Varianza %",
        status: "Stato di Salute",
        exportMatrix: "Esporta rapporto matrice"
      },
      waterfall: {
        title: "Analisi del Flusso di Cassa (Waterfall)",
        openingCash: "Liquidità Iniziale",
        donorReceipts: "Ricevute dai Donatori",
        internalTransfers: "Trasferimenti Interni",
        payroll: "Libro Paga",
        vendorPayments: "Pagamenti Fornitori",
        advances: "Anticipi",
        operationalExp: "Spese Operative",
        closingBalance: "Liquidità Finale"
      },
      p2pPipeline: {
        title: "Pipeline di Responsabilità Procure-to-Pay",
        purchaseReqs: "Richieste di Acquisto",
        openPOs: "Ordini Aperti",
        goodsReceived: "Merci Ricevute",
        pendingInvoices: "Fatture in Sospeso",
        apAging: "Invecchiamento AP",
        vendorPaid: "Fornitori Pagati",
        outstandingComm: "Impegni in Sospeso",
        avgCycle: "Ciclo Medio"
      },
      complianceScorecard: {
        title: "Scorecard di Conformità Finanziaria",
        auditFindings: "Risultati di Audit",
        lateReconciliations: "Riconciliazioni Tardive",
        outstandingAdvances: "Anticipi in Sospeso",
        budgetOverruns: "Sforamenti di Budget",
        pendingApprovals: "Approvazioni in Sospeso"
      }
    },
    common: {
      loading: "Caricamento...",
      error: "Errore",
      noData: "Nessun dato disponibile",
      back: "← Indietro",
      export: "Esporta",
      filter: "Filtro",
      search: "Ricerca"
    }
  }
};

export function useFinanceTranslation() {
  const { language } = useLanguage();
  return financeTranslations[language];
}
