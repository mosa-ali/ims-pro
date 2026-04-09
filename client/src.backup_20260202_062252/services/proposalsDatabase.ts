/**
 * Proposals Database Service
 * 
 * Provides access to all proposals stored in the system
 * This is the AUTHORITATIVE source for pipeline-related APR metrics
 */

export interface Proposal {
  id: string;
  title: string;
  donor: string;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Shortlisted';
  stage: string;
  probability: string;
  requestedAmount: number;
  currency: string;
  submissionDate: string;
  responseDate?: string;
  sector: string;
  country: string;
  duration: string;
  leadWriter?: string;
  notes?: string;
  documents?: any[];
}

const PROPOSALS_STORAGE_KEY = 'proposals_pipeline';

/**
 * Proposals Database - Centralized access to all proposals
 */
export const proposalsDatabase = {
  /**
   * Get all proposals from localStorage
   */
  getAllProposals(): Proposal[] {
    try {
      const stored = localStorage.getItem(PROPOSALS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading proposals from database:', error);
      return [];
    }
  },

  /**
   * Get a single proposal by ID
   */
  getProposalById(id: string): Proposal | null {
    const proposals = this.getAllProposals();
    return proposals.find(p => p.id === id) || null;
  },

  /**
   * Get proposals filtered by year
   */
  getProposalsByYear(year: number): Proposal[] {
    const allProposals = this.getAllProposals();
    return allProposals.filter(proposal => {
      const proposalYear = new Date(proposal.submissionDate).getFullYear();
      return proposalYear === year;
    });
  },

  /**
   * Get proposals filtered by status
   */
  getProposalsByStatus(status: string): Proposal[] {
    const allProposals = this.getAllProposals();
    return allProposals.filter(p => p.status === status);
  },

  /**
   * Get proposals filtered by donor
   */
  getProposalsByDonor(donor: string): Proposal[] {
    const allProposals = this.getAllProposals();
    return allProposals.filter(p => p.donor === donor);
  },

  /**
   * Get proposals filtered by sector
   */
  getProposalsBySector(sector: string): Proposal[] {
    const allProposals = this.getAllProposals();
    return allProposals.filter(p => p.sector === sector);
  },

  /**
   * Calculate total pipeline value
   */
  getTotalPipelineValue(proposals?: Proposal[]): number {
    const targetProposals = proposals || this.getAllProposals();
    return targetProposals.reduce((sum, p) => sum + (p.requestedAmount || 0), 0);
  },

  /**
   * Calculate approval rate
   */
  getApprovalRate(proposals?: Proposal[]): number {
    const targetProposals = proposals || this.getAllProposals();
    const submitted = targetProposals.filter(p => 
      ['Submitted', 'Under Review', 'Approved', 'Rejected'].includes(p.status)
    );
    const approved = targetProposals.filter(p => p.status === 'Approved');
    return submitted.length > 0 ? Math.round((approved.length / submitted.length) * 100) : 0;
  },

  /**
   * Get proposals by probability band
   */
  getProposalsByProbability(probability: string): Proposal[] {
    const allProposals = this.getAllProposals();
    return allProposals.filter(p => p.probability === probability);
  },

  /**
   * Get pipeline value by probability
   */
  getPipelineValueByProbability(): { probability: string; value: number; count: number }[] {
    const allProposals = this.getAllProposals();
    const probabilities = ['High (>70%)', 'Medium (40-70%)', 'Low (<40%)'];
    
    return probabilities.map(prob => {
      const proposals = this.getProposalsByProbability(prob);
      return {
        probability: prob,
        value: this.getTotalPipelineValue(proposals),
        count: proposals.length
      };
    });
  }
};
