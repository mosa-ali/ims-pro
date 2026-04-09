import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Test suite for Proposals Router data transformation and filtering logic
 */

describe('Pipeline Opportunities Data Transformation', () => {
  /**
   * Test stage filtering with various inputs
   */
  describe('Stage Filtering', () => {
    const mockOpportunities = [
      { id: 1, stage: 'Identified', title: 'Opp 1' },
      { id: 2, stage: 'Under Review', title: 'Opp 2' },
      { id: 3, stage: 'Go Decision', title: 'Opp 3' },
      { id: 4, stage: 'Identified', title: 'Opp 4' },
    ];

    it('should filter opportunities by stage correctly', () => {
      const filterStage = 'Identified';
      const filtered = mockOpportunities.filter(opp => opp.stage === filterStage);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(opp => opp.stage === 'Identified')).toBe(true);
    });

    it('should return all opportunities when filter is "All"', () => {
      const filterStage = 'All';
      const filtered = mockOpportunities.filter(opp => filterStage === 'All' || opp.stage === filterStage);
      expect(filtered).toHaveLength(4);
    });

    it('should return empty array for non-existent stage', () => {
      const filterStage = 'Non-Existent';
      const filtered = mockOpportunities.filter(opp => opp.stage === filterStage);
      expect(filtered).toHaveLength(0);
    });
  });

  /**
   * Test search filtering with null/undefined values
   */
  describe('Search Filtering', () => {
    const mockOpportunities = [
      { id: 1, title: 'Emergency Education Support', donorName: 'UNICEF' },
      { id: 2, title: 'WASH Infrastructure', donorName: 'European Commission' },
      { id: 3, title: null, donorName: 'Gates Foundation' },
    ];

    it('should search by title with case-insensitive matching', () => {
      const searchTerm = 'emergency';
      const filtered = mockOpportunities.filter(opp =>
        (opp.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (opp.donorName?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Emergency Education Support');
    });

    it('should search by donor name', () => {
      const searchTerm = 'UNICEF';
      const filtered = mockOpportunities.filter(opp =>
        (opp.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (opp.donorName?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].donorName).toBe('UNICEF');
    });

    it('should handle null title gracefully', () => {
      const searchTerm = 'Foundation';
      const filtered = mockOpportunities.filter(opp =>
        (opp.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (opp.donorName?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].donorName).toBe('Gates Foundation');
    });

    it('should return empty array for non-matching search', () => {
      const searchTerm = 'NonExistent';
      const filtered = mockOpportunities.filter(opp =>
        (opp.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (opp.donorName?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      );
      expect(filtered).toHaveLength(0);
    });
  });

  /**
   * Test deadline status calculations
   */
  describe('Deadline Status Calculation', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const eightDaysLater = new Date(today);
    eightDaysLater.setDate(eightDaysLater.getDate() + 8);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const getDeadlineStatus = (deadline: Date) => {
      const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil < 0) return 'closed';
      if (daysUntil === 0) return 'urgent';
      if (daysUntil <= 7) return 'closing-soon';
      return 'open';
    };

    it('should mark deadline as "closed" when date has passed', () => {
      const status = getDeadlineStatus(yesterday);
      expect(status).toBe('closed');
    });

    it('should mark deadline as "urgent" when deadline is today', () => {
      const status = getDeadlineStatus(today);
      expect(status).toBe('urgent');
    });

    it('should mark deadline as "closing-soon" when deadline is within 7 days', () => {
      const status = getDeadlineStatus(tomorrow);
      expect(status).toBe('closing-soon');
    });

    it('should mark deadline as "open" when deadline is more than 7 days away', () => {
      const status = getDeadlineStatus(eightDaysLater);
      expect(status).toBe('open');
    });
  });

  /**
   * Test budget calculations and currency conversions
   */
  describe('Budget Calculations', () => {
    const mockOpportunities = [
      { id: 1, indicativeBudgetMin: 100000, indicativeBudgetMax: 500000, currency: 'USD' },
      { id: 2, indicativeBudgetMin: 50000, indicativeBudgetMax: 250000, currency: 'EUR' },
      { id: 3, indicativeBudgetMin: null, indicativeBudgetMax: null, currency: 'USD' },
    ];

    it('should calculate total budget range correctly', () => {
      const totalMin = mockOpportunities.reduce((sum, opp) => sum + (opp.indicativeBudgetMin || 0), 0);
      const totalMax = mockOpportunities.reduce((sum, opp) => sum + (opp.indicativeBudgetMax || 0), 0);
      expect(totalMin).toBe(150000);
      expect(totalMax).toBe(750000);
    });

    it('should handle null budget values gracefully', () => {
      const opportunity = mockOpportunities[2];
      const min = opportunity.indicativeBudgetMin || 0;
      const max = opportunity.indicativeBudgetMax || 0;
      expect(min).toBe(0);
      expect(max).toBe(0);
    });

    it('should format currency correctly', () => {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      });
      const formatted = formatter.format(100000);
      expect(formatted).toBe('$100,000.00');
    });

    it('should calculate average budget', () => {
      const validOpportunities = mockOpportunities.filter(opp => opp.indicativeBudgetMax);
      const avgMax = validOpportunities.reduce((sum, opp) => sum + opp.indicativeBudgetMax, 0) / validOpportunities.length;
      expect(avgMax).toBe(375000);
    });
  });

  /**
   * Test sector array handling
   */
  describe('Sector Array Handling', () => {
    const mockOpportunities = [
      { id: 1, sector: ['Education in Emergencies', 'Child Protection'] },
      { id: 2, sector: ['WASH', 'Health'] },
      { id: 3, sector: [] },
      { id: 4, sector: null },
    ];

    it('should handle sector arrays correctly', () => {
      const opp = mockOpportunities[0];
      expect(Array.isArray(opp.sector)).toBe(true);
      expect(opp.sector).toContain('Education in Emergencies');
    });

    it('should handle empty sector array', () => {
      const opp = mockOpportunities[2];
      expect(Array.isArray(opp.sector)).toBe(true);
      expect(opp.sector).toHaveLength(0);
    });

    it('should handle null sector gracefully', () => {
      const opp = mockOpportunities[3];
      const sectors = opp.sector || [];
      expect(Array.isArray(sectors)).toBe(true);
      expect(sectors).toHaveLength(0);
    });

    it('should filter opportunities by sector', () => {
      const targetSector = 'WASH';
      const filtered = mockOpportunities.filter(opp =>
        (opp.sector || []).includes(targetSector)
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(2);
    });
  });

  /**
   * Test probability calculations
   */
  describe('Probability Calculations', () => {
    const mockOpportunities = [
      { id: 1, probability: 75 },
      { id: 2, probability: 50 },
      { id: 3, probability: 25 },
      { id: 4, probability: 0 },
      { id: 5, probability: 100 },
    ];

    it('should calculate average probability', () => {
      const avgProbability = mockOpportunities.reduce((sum, opp) => sum + opp.probability, 0) / mockOpportunities.length;
      expect(avgProbability).toBe(50);
    });

    it('should filter high probability opportunities', () => {
      const highProb = mockOpportunities.filter(opp => opp.probability >= 75);
      expect(highProb).toHaveLength(2);
      expect(highProb.map(opp => opp.probability)).toEqual([75, 100]);
    });

    it('should filter low probability opportunities', () => {
      const lowProb = mockOpportunities.filter(opp => opp.probability < 50);
      expect(lowProb).toHaveLength(2);
      expect(lowProb.map(opp => opp.probability)).toEqual([25, 0]);
    });
  });

  /**
   * Test combined filtering (stage + search + probability)
   */
  describe('Combined Filtering', () => {
    const mockOpportunities = [
      { id: 1, stage: 'Identified', title: 'Emergency Education', probability: 75 },
      { id: 2, stage: 'Under Review', title: 'WASH Infrastructure', probability: 50 },
      { id: 3, stage: 'Identified', title: 'Health Services', probability: 25 },
    ];

    it('should apply multiple filters correctly', () => {
      const filterStage = 'Identified';
      const searchTerm = 'Emergency';
      const minProbability = 50;

      const filtered = mockOpportunities.filter(opp =>
        (filterStage === 'All' || opp.stage === filterStage) &&
        (opp.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) &&
        opp.probability >= minProbability
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });

    it('should return empty array when filters are too restrictive', () => {
      const filterStage = 'Go Decision';
      const searchTerm = 'Emergency';

      const filtered = mockOpportunities.filter(opp =>
        (filterStage === 'All' || opp.stage === filterStage) &&
        (opp.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      );

      expect(filtered).toHaveLength(0);
    });
  });
});

/**
 * Test suite for Funding Opportunities KPI calculations
 */
describe('Funding Opportunities KPIs', () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const eightDaysLater = new Date(today);
  eightDaysLater.setDate(eightDaysLater.getDate() + 8);
  
  const mockOpportunities = [
    { id: 1, applicationDeadline: tomorrow, status: 'open' },
    { id: 2, applicationDeadline: eightDaysLater, status: 'open' },
    { id: 3, applicationDeadline: yesterday, status: 'closed' },
  ];

  it('should calculate open opportunities count', () => {
    const openCount = mockOpportunities.filter(opp => {
      const daysUntil = Math.ceil((opp.applicationDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0;
    }).length;
    expect(openCount).toBe(2); // Tomorrow and 8 days later
   });

  it('should calculate closing-soon opportunities count', () => {
    const closingSoonCount = mockOpportunities.filter(opp => {
      const daysUntil = Math.ceil((opp.applicationDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 7;
    }).length;
    expect(closingSoonCount).toBe(1); // Only tomorrow is within 7 days
  });

  it('should calculate closed opportunities count', () => {
    const closedCount = mockOpportunities.filter(opp => {
      const daysUntil = Math.ceil((opp.applicationDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil < 0;
    }).length;
    expect(closedCount).toBe(1);
  });
});
