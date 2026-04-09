// ============================================================================
// WORKSPACE DOCUMENTS SERVICE
// Document management within procurement workspace
// ============================================================================

const STORAGE_KEY = 'workspace_documents_v1';

export type DocumentCategory = 
  | 'PR'
  | 'Evaluation Criteria'
  | 'Quotation/Bid'
  | 'Analysis'
  | 'PO'
  | 'GRN'
  | 'Delivery Note'
  | 'Invoice'
  | 'Payment Proof'
  | 'Contract'
  | 'Other';

export interface WorkspaceDocument {
  id: string;
  prId: string;
  prNumber: string;
  
  fileName: string;
  fileType: string;
  fileSize: number;
  category: DocumentCategory;
  
  description?: string;
  version: number;
  
  // Mock file data (in real system, would be URL or blob)
  fileData?: string; // Base64 or URL
  
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
  
  organizationId: string;
  operatingUnitId: string;
}

export const workspaceDocumentsService = {
  
  uploadDocument(
    prId: string,
    prNumber: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    category: DocumentCategory,
    organizationId: string,
    operatingUnitId: string,
    userId: string,
    userName: string,
    description?: string,
    fileData?: string
  ): WorkspaceDocument {
    // Check for existing file with same name and category
    const existing = this.getDocumentsByPRId(prId).find(
      doc => doc.fileName === fileName && doc.category === category
    );

    const version = existing ? existing.version + 1 : 1;

    const document: WorkspaceDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      prId,
      prNumber,
      fileName,
      fileType,
      fileSize,
      category,
      description,
      version,
      fileData,
      uploadedBy: userId,
      uploadedByName: userName,
      uploadedAt: new Date().toISOString(),
      organizationId,
      operatingUnitId
    };

    this.saveDocument(document);
    return document;
  },

  updateDocument(
    documentId: string,
    updates: Partial<WorkspaceDocument>
  ): { success: boolean; error?: string } {
    const doc = this.getDocumentById(documentId);
    if (!doc) {
      return { success: false, error: 'Document not found' };
    }

    Object.assign(doc, updates);
    this.saveDocument(doc);
    return { success: true };
  },

  deleteDocument(documentId: string): { success: boolean; error?: string } {
    const all = this.getAllDocuments();
    const filtered = all.filter(d => d.id !== documentId);
    
    if (all.length === filtered.length) {
      return { success: false, error: 'Document not found' };
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return { success: true };
  },

  getDocumentById(documentId: string): WorkspaceDocument | null {
    const all = this.getAllDocuments();
    return all.find(d => d.id === documentId) || null;
  },

  getDocumentsByPRId(prId: string): WorkspaceDocument[] {
    const all = this.getAllDocuments();
    return all
      .filter(d => d.prId === prId)
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  },

  getDocumentsByCategory(prId: string, category: DocumentCategory): WorkspaceDocument[] {
    return this.getDocumentsByPRId(prId).filter(d => d.category === category);
  },

  getAllDocuments(): WorkspaceDocument[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveDocument(document: WorkspaceDocument): void {
    const all = this.getAllDocuments();
    const index = all.findIndex(d => d.id === document.id);

    if (index >= 0) {
      all[index] = document;
    } else {
      all.push(document);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
};
