import { describe, it, expect, beforeEach } from 'vitest';
import { exportOpportunities, parseCSVFile } from './exportOpportunities';

describe('Export Opportunities Utility', () => {
  const mockOpportunities = [
    {
      id: '1',
      donorName: 'UNICEF',
      donorType: 'UN',
      cfpLink: 'https://unicef.org/cfp',
      interestArea: ['Education', 'Health'],
      geographicAreas: 'Yemen, Syria',
      applicationDeadline: '2026-04-30',
      allocatedBudget: 100000,
      currency: 'USD',
      isCoFunding: false,
      applicationLink: 'https://unicef.org/apply',
      projectManagerName: 'John Doe',
      projectManagerEmail: 'john@example.com',
      notes: 'Priority funding',
    },
    {
      id: '2',
      donorName: 'EU',
      donorType: 'EU',
      cfpLink: 'https://eu.org/cfp',
      interestArea: ['WASH', 'Nutrition'],
      geographicAreas: 'Lebanon',
      applicationDeadline: '2026-05-15',
      allocatedBudget: 250000,
      currency: 'EUR',
      isCoFunding: true,
      applicationLink: 'https://eu.org/apply',
      projectManagerName: 'Jane Smith',
      projectManagerEmail: 'jane@example.com',
      notes: 'Co-funding required',
    },
  ];

  describe('exportOpportunities', () => {
    it('should export opportunities to Excel format', async () => {
      // Mock the download function
      const originalCreateElement = document.createElement;
      const mockLink = {
        setAttribute: () => {},
        style: {},
        click: () => {},
      };
      
      let createElementCalled = false;
      document.createElement = (tag: string) => {
        if (tag === 'a') {
          createElementCalled = true;
          return mockLink as any;
        }
        return originalCreateElement.call(document, tag);
      };

      await exportOpportunities(mockOpportunities, 'excel', 'en');

      expect(createElementCalled).toBe(true);

      // Restore original
      document.createElement = originalCreateElement;
    });

    it('should export opportunities to CSV format', async () => {
      const originalCreateElement = document.createElement;
      const mockLink = {
        setAttribute: () => {},
        style: {},
        click: () => {},
      };
      
      let createElementCalled = false;
      document.createElement = (tag: string) => {
        if (tag === 'a') {
          createElementCalled = true;
          return mockLink as any;
        }
        return originalCreateElement.call(document, tag);
      };

      await exportOpportunities(mockOpportunities, 'csv', 'en');

      expect(createElementCalled).toBe(true);

      // Restore original
      document.createElement = originalCreateElement;
    });

    it('should support Arabic language export', async () => {
      const originalCreateElement = document.createElement;
      const mockLink = {
        setAttribute: () => {},
        style: {},
        click: () => {},
      };
      
      document.createElement = (tag: string) => {
        if (tag === 'a') {
          return mockLink as any;
        }
        return originalCreateElement.call(document, tag);
      };

      await exportOpportunities(mockOpportunities, 'csv', 'ar');

      // Restore original
      document.createElement = originalCreateElement;
    });

    it('should handle empty opportunities array', async () => {
      const originalCreateElement = document.createElement;
      const mockLink = {
        setAttribute: () => {},
        style: {},
        click: () => {},
      };
      
      let createElementCalled = false;
      document.createElement = (tag: string) => {
        if (tag === 'a') {
          createElementCalled = true;
          return mockLink as any;
        }
        return originalCreateElement.call(document, tag);
      };

      await exportOpportunities([], 'csv', 'en');

      expect(createElementCalled).toBe(true);

      // Restore original
      document.createElement = originalCreateElement;
    });

    it('should handle opportunities with missing optional fields', async () => {
      const opportunitiesWithMissingFields = [
        {
          id: '1',
          donorName: 'UNICEF',
          donorType: 'UN',
          interestArea: ['Education'],
          geographicAreas: 'Yemen',
          applicationDeadline: '2026-04-30',
          currency: 'USD',
          isCoFunding: false,
        },
      ];

      const originalCreateElement = document.createElement;
      const mockLink = {
        setAttribute: () => {},
        style: {},
        click: () => {},
      };
      
      document.createElement = (tag: string) => {
        if (tag === 'a') {
          return mockLink as any;
        }
        return originalCreateElement.call(document, tag);
      };

      await exportOpportunities(opportunitiesWithMissingFields as any, 'csv', 'en');

      // Restore original
      document.createElement = originalCreateElement;
    });
  });

  describe('parseCSVFile', () => {
    it('should parse valid CSV file', async () => {
      const csvContent = `Donor Name,Donor Type,Interest Areas,Geographic Areas,Application Deadline,Allocated Budget,Currency,Co-Funding
UNICEF,UN,"Education; Health",Yemen,2026-04-30,100000,USD,No
EU,EU,"WASH; Nutrition",Lebanon,2026-05-15,250000,EUR,Yes`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const opportunities = await parseCSVFile(file);

      expect(opportunities).toHaveLength(2);
      expect(opportunities[0].donorName).toBe('UNICEF');
      expect(opportunities[0].donorType).toBe('UN');
      expect(opportunities[1].donorName).toBe('EU');
    });

    it('should handle CSV with quoted fields', async () => {
      const csvContent = `Donor Name,Donor Type,Interest Areas,Geographic Areas,Application Deadline,Allocated Budget,Currency,Co-Funding
"UNICEF, Inc.",UN,"Education; Health",Yemen,2026-04-30,100000,USD,No`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const opportunities = await parseCSVFile(file);

      expect(opportunities).toHaveLength(1);
      expect(opportunities[0].donorName).toBe('UNICEF, Inc.');
    });

    it('should filter out rows with missing donor name', async () => {
      const csvContent = `Donor Name,Donor Type,Interest Areas,Geographic Areas,Application Deadline,Allocated Budget,Currency,Co-Funding
UNICEF,UN,"Education; Health",Yemen,2026-04-30,100000,USD,No
,EU,"WASH; Nutrition",Lebanon,2026-05-15,250000,EUR,Yes`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const opportunities = await parseCSVFile(file);

      expect(opportunities).toHaveLength(1);
      expect(opportunities[0].donorName).toBe('UNICEF');
    });

    it('should parse multiple interest areas', async () => {
      const csvContent = `Donor Name,Donor Type,Interest Areas,Geographic Areas,Application Deadline,Allocated Budget,Currency,Co-Funding
UNICEF,UN,"Education; Health; Protection",Yemen,2026-04-30,100000,USD,No`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const opportunities = await parseCSVFile(file);

      expect(opportunities[0].interestArea).toHaveLength(3);
      expect(opportunities[0].interestArea).toContain('Education');
      expect(opportunities[0].interestArea).toContain('Health');
      expect(opportunities[0].interestArea).toContain('Protection');
    });

    it('should parse co-funding boolean correctly', async () => {
      const csvContent = `Donor Name,Donor Type,Interest Areas,Geographic Areas,Application Deadline,Allocated Budget,Currency,Co-Funding
UNICEF,UN,"Education",Yemen,2026-04-30,100000,USD,Yes
EU,EU,"WASH",Lebanon,2026-05-15,250000,EUR,No`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const opportunities = await parseCSVFile(file);

      expect(opportunities[0].isCoFunding).toBe(true);
      expect(opportunities[1].isCoFunding).toBe(false);
    });

    it('should parse budget as number', async () => {
      const csvContent = `Donor Name,Donor Type,Interest Areas,Geographic Areas,Application Deadline,Allocated Budget,Currency,Co-Funding
UNICEF,UN,"Education",Yemen,2026-04-30,100000.50,USD,No`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const opportunities = await parseCSVFile(file);

      expect(opportunities[0].allocatedBudget).toBe(100000.5);
      expect(typeof opportunities[0].allocatedBudget).toBe('number');
    });

    it('should handle file read errors', async () => {
      const file = new File([], 'test.csv', { type: 'text/csv' });

      // Mock FileReader to throw error
      const originalFileReader = global.FileReader;
      global.FileReader = class {
        readAsText() {
          setTimeout(() => {
            this.onerror?.();
          }, 0);
        }
        error = new Error('Read error');
      } as any;

      try {
        await parseCSVFile(file);
      } catch (error) {
        expect(error).toBeDefined();
      }

      global.FileReader = originalFileReader;
    });

    it('should generate unique IDs for parsed opportunities', async () => {
      const csvContent = `Donor Name,Donor Type,Interest Areas,Geographic Areas,Application Deadline,Allocated Budget,Currency,Co-Funding
UNICEF,UN,"Education",Yemen,2026-04-30,100000,USD,No
EU,EU,"WASH",Lebanon,2026-05-15,250000,EUR,Yes`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const opportunities = await parseCSVFile(file);

      expect(opportunities[0].id).not.toBe(opportunities[1].id);
      expect(opportunities[0].id).toMatch(/^temp_/);
    });

    it('should handle empty CSV file', async () => {
      const csvContent = `Donor Name,Donor Type,Interest Areas,Geographic Areas,Application Deadline,Allocated Budget,Currency,Co-Funding`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const opportunities = await parseCSVFile(file);

      expect(opportunities).toHaveLength(0);
    });
  });
});
