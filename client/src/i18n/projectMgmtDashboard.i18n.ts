export const dashboardTranslations = {
  en: {
    title: 'Programs Management Dashboard',
    subtitle: 'Overview of all projects, budgets, and performance metrics',

    activeProjects: {
      title: 'Active Projects',
      description: 'View all active projects in portfolio',
      linkText: 'View Projects',
    },

    reportingSchedule: {
      title: 'Projects Reporting Schedule',
      description: 'Track reporting cycles and compliance',
      linkText: 'View Schedule',
    },

    annualReport: {
      title: 'Annual Programs Report',
      description: 'Generate and view annual reports',
      linkText: 'View Report',
    },

    programsOverviewReport: {
      title: 'Programs Overview Report',
      description: 'Executive dashboard with project health, budget analytics, and compliance metrics',
      linkText: 'View Report',
    },

    // ── KPI strip ────────────────────────────────────────────────────────────
    kpi: {
      activeProjects: 'Active Projects',
      portfolioBudget: 'Portfolio Budget',
      burnRate: 'Burn Rate',
      projectsAtRisk: 'Projects at Risk',
      overdueReports: 'Overdue Reports',
      expiringGrants: 'Expiring in 30d',
      complianceScore: 'Compliance Score',
      totalAlerts: 'Total Alerts',
    },

    // ── Legacy portfolio health cards ────────────────────────────────────────
    portfolioHealth: {
      title: 'Portfolio Health',
      totalBudget: 'Total Budget',
      spent: 'Total Spent',
      balance: 'Balance',
    },

    performance: {
      title: 'Performance',
      avgCompletionRate: 'Avg. Completion Rate',
      onTrack: 'On Track',
    },

    compliance: {
      title: 'Compliance',
      reportingComplianceRate: 'Reporting Compliance',
      pendingApprovals: 'Pending Approvals',
    },

    // ── Alerts ───────────────────────────────────────────────────────────────
    alerts: {
      title: 'Executive Alerts',
      atRisk: 'Projects at Risk',
      overBudget: 'Over-Budget Projects',
      expiringSoon: 'Expiring Soon',
      overdueReports: 'Overdue Reports',
      noAlerts: 'No active alerts',
    },

    // ── Charts ───────────────────────────────────────────────────────────────
    budgetBurnTrend: 'Budget Burn Trend (12 Months)',
    statusDistribution: 'Project Status Distribution',
    projectSnapshot: 'Project Snapshot',

    // ── Compliance overview ──────────────────────────────────────────────────
    complianceOverview: {
      title: 'Reporting Compliance',
      submitted: 'Submitted to Donor',
      inReview: 'In Review',
      pending: 'Pending',
      overdue: 'Overdue',
      total: 'Total Schedules',
      complianceRate: 'Compliance Rate',
    },

    // ── Beneficiary progress ─────────────────────────────────────────────────
    beneficiaryProgress: {
      title: 'Beneficiary Reach',
      reached: 'Reached',
      target: 'Target',
      noData: 'Beneficiary data not available',
    },

    // ── Risk table ───────────────────────────────────────────────────────────
    riskTable: 'Project Risk Overview',
    noRiskData: 'No active projects found',

    // ── Snapshot table ───────────────────────────────────────────────────────
    projectName: 'Project Name',
    status: 'Status',
    donor: 'Donor',
    budgetUtil: 'Budget Util.',
    risk: 'Risk',
    endDate: 'End Date',
    riskLevel: 'Risk',
    overdueReports: 'Overdue Rpts',
    daysRemaining: 'Days Left',
    burnHealth: 'Burn Health',

    noDataAvailable: 'No data available',

    // ── Executive Alerts (hardcoded strings) ────────────────────────────────
    complianceRiskAlerts: 'Compliance & Risk Alerts',
    overBudget: 'OVER BUDGET',
    projectsAtRisk: 'PROJECTS AT RISK',
    expiringSoon30: 'EXPIRING IN 30 DAYS',

    // ── Beneficiary Portfolio ────────────────────────────────────────────────
    beneficiaryPortfolio: 'Beneficiary Portfolio',

    // ── Reporting Compliance ─────────────────────────────────────────────────
    reportingCompliance: 'Reporting Compliance',

    // ── KPI subtexts ────────────────────────────────────────────────────────
    atRisk: 'at-risk',
    submitted: 'submitted',
    expiringSoon: 'expiring soon',
    pending: 'pending',
    remaining: 'remaining',
    spent: 'spent',
    total: 'total',

    // ── Top Grants ──────────────────────────────────────────────────────────
    topGrants: 'Top Grants',

    // ── Upcoming Reporting Deadlines ─────────────────────────────────────────
    upcomingReportingDeadlines: 'Upcoming Reporting Deadlines',

    // ── Expiring Projects ────────────────────────────────────────────────────
    expiringProjects: 'Expiring Projects',

    // ── Project Overview Table ──────────────────────────────────────────────
    projectOverview: 'Project Overview',
    colProjectName: 'Project Name',
    colStatus: 'Status',
    colDonor: 'Donor',
    colRisk: 'Risk',
    colBudgetUtil: 'Budget Util.',
    colOverdueReports: 'Overdue Rpts',
    colDaysLeft: 'Days Left',
    colBurnHealth: 'Burn Health',
    colEndDate: 'End Date',
    noProjects: 'No projects found',
    none: 'None',
    dOverdue: 'd overdue',
    dLeft: 'd',
    burnHealth_critical: 'Critical',
    burnHealth_warning: 'Warning',
    burnHealth_healthy: 'Healthy',

    // ── Burn Rate Analytics ───────────────────────────────────────────────────────────────────
    burnRateAnalytics: {
      title: 'Budget Burn Analytics (12 Months)',
      noData: 'No financial data available',
      hint: 'Budget allocations and expenses will appear here once recorded',
      totalBudget: 'Total Budget',
      totalSpent: 'Total Spent',
      remaining: 'Remaining',
      forecast: 'Forecast',
    },

    // ── Portfolio Financial Snapshot ───────────────────────────────────────────────────────────────────
    portfolioFinancialSnapshot: 'Portfolio Financial Snapshot',
    highUtilization: 'High utilization — review remaining funds',
    onTrack: 'On track',
    budgetAvailable: 'budget available',
    activeGrantsValue: 'Active Grants Value',
    avgRemainingPerProject: 'Avg. remaining per project',
    noFinancialData: 'No financial data available',
    across: 'Across',
    inPortfolio: 'in portfolio',
  },

  ar: {
    title: 'لوحة معلومات إدارة البرامج',
    subtitle: 'نظرة شاملة على جميع المشاريع والميزانيات ومقاييس الأداء',

    activeProjects: {
      title: 'المشاريع النشطة',
      description: 'عرض جميع المشاريع النشطة في المحفظة',
      linkText: 'عرض المشاريع',
    },

    reportingSchedule: {
      title: 'جدول تقارير المشاريع',
      description: 'تتبع دورات التقارير والامتثال',
      linkText: 'عرض الجدول',
    },

    annualReport: {
      title: 'تقرير البرامج السنوي',
      description: 'إنشاء وعرض التقارير السنوية',
      linkText: 'عرض التقرير',
    },

    programsOverviewReport: {
      title: 'تقرير البرامج التلقائي',
      description: 'لوحة معلومات تنفيذية مع صحة المشروع وتحليلات الميزانية ومقاييس الامتثال',
      linkText: 'عرض التقرير',
    },

    // ── KPI strip ────────────────────────────────────────────────────────────
    kpi: {
      activeProjects: 'المشاريع النشطة',
      portfolioBudget: 'ميزانية المحفظة',
      burnRate: 'معدل الحرق',
      projectsAtRisk: 'مشاريع في خطر',
      overdueReports: 'تقارير متأخرة',
      expiringGrants: 'تنتهي خلال 30 يوماً',
      complianceScore: 'درجة الامتثال',
      totalAlerts: 'إجمالي التنبيهات',
    },

    // ── Legacy portfolio health cards ────────────────────────────────────────
    portfolioHealth: {
      title: 'صحة المحفظة',
      totalBudget: 'إجمالي الميزانية',
      spent: 'إجمالي المصروف',
      balance: 'الرصيد',
    },

    performance: {
      title: 'الأداء',
      avgCompletionRate: 'متوسط معدل الإنجاز',
      onTrack: 'على المسار',
    },

    compliance: {
      title: 'الامتثال',
      reportingComplianceRate: 'امتثال التقارير',
      pendingApprovals: 'الموافقات المعلقة',
    },

    // ── Alerts ───────────────────────────────────────────────────────────────
    alerts: {
      title: 'التنبيهات التنفيذية',
      atRisk: 'مشاريع معرضة للخطر',
      overBudget: 'مشاريع تتجاوز الميزانية',
      expiringSoon: 'تنتهي قريباً',
      overdueReports: 'تقارير متأخرة',
      noAlerts: 'لا توجد تنبيهات نشطة',
    },

    // ── Charts ───────────────────────────────────────────────────────────────
    budgetBurnTrend: 'اتجاه حرق الميزانية (12 شهراً)',
    statusDistribution: 'توزيع حالة المشروع',
    projectSnapshot: 'لقطة المشروع',

    // ── Compliance overview ──────────────────────────────────────────────────
    complianceOverview: {
      title: 'امتثال التقارير',
      submitted: 'مقدّم للمانح',
      inReview: 'قيد المراجعة',
      pending: 'معلق',
      overdue: 'متأخر',
      total: 'إجمالي الجداول',
      complianceRate: 'معدل الامتثال',
    },

    // ── Beneficiary progress ─────────────────────────────────────────────────
    beneficiaryProgress: {
      title: 'وصول المستفيدين',
      reached: 'تم الوصول',
      target: 'المستهدف',
      noData: 'بيانات المستفيدين غير متاحة',
    },

    // ── Risk table ───────────────────────────────────────────────────────────
    riskTable: 'نظرة عامة على مخاطر المشروع',
    noRiskData: 'لا توجد مشاريع نشطة',

    // ── Snapshot table ───────────────────────────────────────────────────────
    projectName: 'اسم المشروع',
    status: 'الحالة',
    donor: 'المانح',
    budgetUtil: 'استخدام الميزانية',
    risk: 'المخاطر',
    endDate: 'تاريخ الانتهاء',
    riskLevel: 'المخاطر',
    overdueReports: 'تقارير متأخرة',
    daysRemaining: 'الأيام المتبقية',
    burnHealth: 'صحة الحرق',

    noDataAvailable: 'لا توجد بيانات متاحة',

    // ── Executive Alerts (hardcoded strings) ────────────────────────────────
    complianceRiskAlerts: 'تنبيهات الامتثال والمخاطر',
    overBudget: 'تجاوز الميزانية',
    projectsAtRisk: 'مشاريع معرضة للخطر',
    expiringSoon30: 'تنتهي خلال 30 يوماً',

    // ── Beneficiary Portfolio ────────────────────────────────────────────────
    beneficiaryPortfolio: 'محفظة المستفيدين',

    // ── Reporting Compliance ─────────────────────────────────────────────────
    reportingCompliance: 'امتثال التقارير',

    // ── KPI subtexts ────────────────────────────────────────────────────────
    atRisk: 'معرضة للخطر',
    submitted: 'مقدمة',
    expiringSoon: 'تنتهي قريباً',
    pending: 'معلقة',
    remaining: 'متبقية',
    spent: 'مصروفة',
    total: 'الإجمالي',

    // ── Top Grants ──────────────────────────────────────────────────────────
    topGrants: 'أفضل المنح',

    // ── Upcoming Reporting Deadlines ─────────────────────────────────────────
    upcomingReportingDeadlines: 'مواعيد التقارير القادمة',

    // ── Expiring Projects ────────────────────────────────────────────────────
    expiringProjects: 'المشاريع المنتهية',

    // ── Project Overview Table ──────────────────────────────────────────────
    projectOverview: 'نظرة عامة على المشاريع',
    colProjectName: 'اسم المشروع',
    colStatus: 'الحالة',
    colDonor: 'المانح',
    colRisk: 'المخاطر',
    colBudgetUtil: 'استخدام الميزانية',
    colOverdueReports: 'تقارير متأخرة',
    colDaysLeft: 'الأيام المتبقية',
    colBurnHealth: 'صحة الحرق',
    colEndDate: 'تاريخ الانتهاء',
    noProjects: 'لم يتم العثور على مشاريع',
    none: 'لا شيء',
    dOverdue: 'يوم متأخر',
    dLeft: 'يوم',
    burnHealth_critical: 'حرج',
    burnHealth_warning: 'تحذير',
    burnHealth_healthy: 'صحي',

    // ── Burn Rate Analytics ──────────────────────────────────────────
    burnRateAnalytics: {
      title: 'تحليل حرق الميزانية (12 شهر)',
      noData: 'لا توجد بيانات مالية متاحة',
      hint: 'ستظهر تخصيصات الميزانية والنفقات هنا بمجرد تسجيلها',
      totalBudget: 'إجمالي الميزانية',
      totalSpent: 'إجمالي المبلغ المنفق',
      remaining: 'المتبقي',
      forecast: 'التوقعات',
    },

    // ── لقطة المالية للمحفظة ──────────────────────────────────────────
    portfolioFinancialSnapshot: 'لقطة المالية للمحفظة',
    highUtilization: 'استخدام مرتفع — راجع الأموال المتبقية',
    onTrack: 'على المسار',
    budgetAvailable: 'ميزانية متاحة',
    activeGrantsValue: 'قيمة المنح النشطة',
    avgRemainingPerProject: 'متوسط المتبقي لكل مشروع',
    noFinancialData: 'لا توجد بيانات مالية متاحة',
    across: 'عبر',
    inPortfolio: 'في المحفظة',
  },

  it: {
    title: 'Cruscotto Gestione Programmi',
    subtitle: 'Panoramica di tutti i progetti, bilanci e metriche di performance',

    activeProjects: {
      title: 'Progetti Attivi',
      description: 'Visualizza tutti i progetti attivi nel portafoglio',
      linkText: 'Visualizza Progetti',
    },

    reportingSchedule: {
      title: 'Calendario Reporting Progetti',
      description: 'Traccia i cicli di reporting e la conformità',
      linkText: 'Visualizza Calendario',
    },

    annualReport: {
      title: 'Rapporto Annuale Programmi',
      description: 'Genera e visualizza i rapporti annuali',
      linkText: 'Visualizza Rapporto',
    },

    programsOverviewReport: {
      title: 'Rapporto Panoramica Programmi',
      description: 'Dashboard esecutivo con salute del progetto, analisi di bilancio e metriche di conformità',
      linkText: 'Visualizza Rapporto',
    },

    // ── KPI strip ────────────────────────────────────────────────────────────
    kpi: {
      activeProjects: 'Progetti Attivi',
      portfolioBudget: 'Bilancio Portafoglio',
      burnRate: 'Tasso di Consumo',
      projectsAtRisk: 'Progetti a Rischio',
      overdueReports: 'Rapporti Scaduti',
      expiringGrants: 'Scadenza in 30d',
      complianceScore: 'Punteggio Conformità',
      totalAlerts: 'Totale Avvisi',
    },

    // ── Legacy portfolio health cards ────────────────────────────────────────
    portfolioHealth: {
      title: 'Salute Portafoglio',
      totalBudget: 'Bilancio Totale',
      spent: 'Importo Speso',
      balance: 'Saldo',
    },

    performance: {
      title: 'Performance',
      avgCompletionRate: 'Tasso Medio di Completamento',
      onTrack: 'In Corso',
    },

    compliance: {
      title: 'Conformità',
      reportingComplianceRate: 'Conformità Reporting',
      pendingApprovals: 'Approvazioni in Sospeso',
    },

    // ── Alerts ───────────────────────────────────────────────────────────────
    alerts: {
      title: 'Avvisi Esecutivi',
      atRisk: 'Progetti a Rischio',
      overBudget: 'Progetti Oltre Budget',
      expiringSoon: 'Scadenza Imminente',
      overdueReports: 'Rapporti Scaduti',
      noAlerts: 'Nessun avviso attivo',
    },

    // ── Charts ───────────────────────────────────────────────────────────────
    budgetBurnTrend: 'Tendenza Consumo Bilancio (12 Mesi)',
    statusDistribution: 'Distribuzione Stato Progetti',
    projectSnapshot: 'Istantanea Progetto',

    // ── Compliance overview ──────────────────────────────────────────────────
    complianceOverview: {
      title: 'Conformità Reporting',
      submitted: 'Sottomesso al Donante',
      inReview: 'In Revisione',
      pending: 'In Sospeso',
      overdue: 'Scaduto',
      total: 'Totale Calendari',
      complianceRate: 'Tasso Conformità',
    },

    // ── Beneficiary progress ─────────────────────────────────────────────────
    beneficiaryProgress: {
      title: 'Copertura Beneficiari',
      reached: 'Raggiunti',
      target: 'Obiettivo',
      noData: 'Dati beneficiari non disponibili',
    },

    // ── Risk table ───────────────────────────────────────────────────────────
    riskTable: 'Panoramica Rischi Progetto',
    noRiskData: 'Nessun progetto attivo trovato',

    // ── Snapshot table ───────────────────────────────────────────────────────
    projectName: 'Nome Progetto',
    status: 'Stato',
    donor: 'Donante',
    budgetUtil: 'Utilizzo Bilancio',
    risk: 'Rischio',
    endDate: 'Data Fine',
    riskLevel: 'Livello Rischio',
    overdueReports: 'Rapporti Scaduti',
    daysRemaining: 'Giorni Rimanenti',
    burnHealth: 'Salute Consumo',

    noDataAvailable: 'Nessun dato disponibile',

    // ── Executive Alerts (hardcoded strings) ────────────────────────────────
    complianceRiskAlerts: 'Avvisi Conformità e Rischi',
    overBudget: 'OLTRE BUDGET',
    projectsAtRisk: 'PROGETTI A RISCHIO',
    expiringSoon30: 'SCADENZA IN 30 GIORNI',

    // ── Beneficiary Portfolio ────────────────────────────────────────────────
    beneficiaryPortfolio: 'Portafoglio Beneficiari',

    // ── Reporting Compliance ─────────────────────────────────────────────────
    reportingCompliance: 'Conformità Reporting',

    // ── KPI subtexts ────────────────────────────────────────────────────────
    atRisk: 'a-rischio',
    submitted: 'sottomesso',
    expiringSoon: 'scadenza imminente',
    pending: 'in-sospeso',
    remaining: 'rimanente',
    spent: 'speso',
    total: 'totale',

    // ── Top Grants ──────────────────────────────────────────────────────────
    topGrants: 'Principali Sovvenzioni',

    // ── Upcoming Reporting Deadlines ─────────────────────────────────────────
    upcomingReportingDeadlines: 'Prossime Scadenze Reporting',

    // ── Expiring Projects ────────────────────────────────────────────────────
    expiringProjects: 'Progetti in Scadenza',

    // ── Project Overview Table ──────────────────────────────────────────────
    projectOverview: 'Panoramica Progetti',
    colProjectName: 'Nome Progetto',
    colStatus: 'Stato',
    colDonor: 'Donante',
    colRisk: 'Rischio',
    colBudgetUtil: 'Utilizzo Bilancio',
    colOverdueReports: 'Rapporti Scaduti',
    colDaysLeft: 'Giorni Rimanenti',
    colBurnHealth: 'Salute Consumo',
    colEndDate: 'Data Fine',
    noProjects: 'Nessun progetto trovato',
    none: 'Nessuno',
    dOverdue: 'g scaduto',
    dLeft: 'g',
    burnHealth_critical: 'Critico',
    burnHealth_warning: 'Avviso',
    burnHealth_healthy: 'Salutare',

    // ── Burn Rate Analytics ───────────────────────────────────────────────────────────────────
    burnRateAnalytics: {
      title: 'Analisi Consumo Bilancio (12 Mesi)',
      noData: 'Nessun dato finanziario disponibile',
      hint: 'Le allocazioni di bilancio e le spese appariranno qui una volta registrate',
      totalBudget: 'Bilancio Totale',
      totalSpent: 'Importo Totale Speso',
      remaining: 'Rimanente',
      forecast: 'Previsione',
    },

    // ── Portfolio Financial Snapshot ───────────────────────────────────────────────────────────────────
    portfolioFinancialSnapshot: 'Istantanea Finanziaria Portafoglio',
    highUtilization: 'Utilizzo elevato — rivedi i fondi rimanenti',
    onTrack: 'In corso',
    budgetAvailable: 'bilancio disponibile',
    activeGrantsValue: 'Valore Sovvenzioni Attive',
    avgRemainingPerProject: 'Media rimanente per progetto',
    noFinancialData: 'Nessun dato finanziario disponibile',
    across: 'Su',
    inPortfolio: 'nel portafoglio',
  },
};
