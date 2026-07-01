Finance Dashboard Additional Comments 
1. No need for new header title because already we have dashboard title in the header "Executive Financial Intelligence - Real-time intelligence across strategic operations” should remove. 
2. No need to have Search on Top of dashboard since there a filter. Same also for export button, must be removed. 
3. Currently filter does not work, not clickable and using Mock data instead of filter projects from projects tables, and the years must be between 2025 - 2035. Filter only the projects with active status should be appeared in the finance dashboard.
4. The Portfolio Oversight KPIs must be extend as page width, while Predictive Risk Alerts need to be moved under KPIs after extended. 
5. When filter and select one project, If the project currency = USD, then all data in the dashboard must be in USD, and similar to projects with currency EUR, CHF, KSA, YER, and GBP. If the all projects with same currency e.g 5 projects with EUR currency, the data will be in EUR. 
6. If 5 projects with many currencies e.g 2 projects EUR, 2 CHF, 1 KSA, 3 USD, in this case, when selectedProject = projectCurrency, but when filter “All Projects” with multi-currencies, then a global standard implemented based on the operatingUnit countryId, country e,g in Yemen the global standard is USD, but in Europe countries, and Ukraine is EUR. 
7. In the Financial Health Matrix, in addition to current design “good”, we need to add or update as following:
7.1 No need for Export button, no need for Search and Maximum project to be appears is 5, then View More to be added.
7.2 Grant Source should be Donor Name instead. 
7.3 Add Start and end date, remaining days until project end.
7.4 Project Financial Health Status, should be based on some trigger e.g “Total budget via spent compared to project timeline or remaining days”.
8. AI Insights, projectCode is not correct e.g “Grant ADIDAS-YEM 007-1776108981834-3hamo1”, while the correct is “ADIDAS-YEM 007”.
9. Currently Predictive Risk Alerts show No imminent risks detected, while in the next chart “Risk Distribution”, currently both is good designed, I have some comments and clarifications:
9.1 When the managers seen the risk chart with data e.g Critical (10), At Risk (8), On Track (7), so they are curious to know the details of those risks, what is it and ask to get details in order to mitigate or plan for it. 
9.2 My questions here, what are these risks, Is it same project Health risks, or financial risk is another specific risk from financial perspective. If so, can we develop and design financialHealthRiskRouter, Engine and Services “Similar to Organization Dashboard” to ensure these data calculated correctly. Also create new page to show full list of financial risks with supported of AI recommendation to mitigate, plan and take actions.
9.3 Once the new page developed, then in the dashboard it will be ok to show chart of risk then View Details button will be added to Navigate to that page and get full picture about the risks. While AI Insights and Recommendations should be maximum 5 then navigate for more details.
 10. Financial Compliance Scorecard Chart, this is very important and we need to make it correctly, I have some ideas and your support is required:
10.1 New Router, Engine and Services files for auto deduction and collection data supported by AI Insights and Recommendations based on several indicators and triggers such as 
Financial Compliance Scorecard "Audit readiness indicators"
•	Audit Compliance
•	lock of supporting documents or some documents missing or not provided.
•	Outstanding Advances
•	Budget Overruns
•	Budget line Overspent
•	Late Bank Reconciliations
•	Discrepancies between the accounting book, bank account, and other details.
•	Late of advance claim
•	Late of staff salaries until the 3 days of next months
•	Donor Compliance
•	Add more indicators, will be good.
10.2 New sub-page to be added and linked to Finance Dashboard “Same approach for the point 9 (Fianncial Health / Risks)”,
11. Finally, Procure-to-Pay Liability Pipeline, we already have good design on place inside the Logistics and Procurement Module “My PRs” – see screenshot 2. We need to get the data from “Procurement Progress” like PR, Qty, QA, BA, Contract, PO, GRN, SAC, and Payment”. So Procure-to-Pay Liability Pipeline need to be updated according to this structure and design.
Next Plan, in order to achieve all above correctly, I need your support by write new Full and comprehensive prompt: 
1.	To Address all my comments and feedback 1 – 11 above, and achieve them correctly, I need your support to develop new plan including phases and sub-phases, and revise the achievement phase by phase, Manus must share files code, routers and any update need or required on schema table in each phase.
2.	Implement the phase 3 – Enterprise Executive Dashboard Polish. The objective is to transform the current dashboard from a well-organized React application into a premium executive financial workspace comparable to Microsoft Power BI, SAP Analytics Cloud, Oracle Fusion Financials, or Dynamics 365 Finance. That phase should focus on:
•	Completing all remaining Recharts visualizations with production-quality interactions.
•	Enriching the right sidebar with executive intelligence widgets instead of leaving unused space.
•	Upgrading KPI cards to have unique layouts and embedded mini-visualizations.
•	Enhancing tables with enterprise features such as sticky headers, filtering, sorting, pagination, and drill-down actions.
•	Adding richer financial insights, forecasting, and operational metrics.
•	Refining spacing, typography, colors, animations, and interaction details until the interface feels cohesive and polished.


Any additional comment added.
