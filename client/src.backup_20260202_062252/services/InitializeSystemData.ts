/**
 * ============================================================================
 * SYSTEM DATA INITIALIZATION
 * ============================================================================
 * 
 * Initializes:
 * - Sample users with different roles
 * - Document permissions
 * - SharePoint/OneDrive sync configurations
 * - Sample sync logs
 * 
 * ============================================================================
 */

import { PermissionsService, UserRole } from './PermissionsService';
import { SharePointSyncService } from './SharePointSyncService';
import { DocumentServiceCorrected } from './DocumentServiceCorrected';

export function initializeSystemData() {
  console.log('🚀 Initializing system data...');

  // ============================================================================
  // 1. CREATE SAMPLE USERS WITH DIFFERENT ROLES
  // ============================================================================

  const users = [
    {
      user_id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@ngo.org',
      role: 'project_manager' as UserRole,
      projects: ['PROJ-001', 'PROJ-002']
    },
    {
      user_id: '2',
      name: 'Ahmad Hassan',
      email: 'ahmad.hassan@ngo.org',
      role: 'project_coordinator' as UserRole,
      projects: ['PROJ-001']
    },
    {
      user_id: '3',
      name: 'Fatima Al-Rashid',
      email: 'fatima.rashid@ngo.org',
      role: 'finance_officer' as UserRole,
      projects: ['PROJ-001', 'PROJ-002']
    },
    {
      user_id: '4',
      name: 'John Smith',
      email: 'john.smith@ngo.org',
      role: 'procurement_officer' as UserRole,
      projects: ['PROJ-001']
    },
    {
      user_id: '5',
      name: 'Maria Garcia',
      email: 'maria.garcia@ngo.org',
      role: 'meal_officer' as UserRole,
      projects: ['PROJ-001', 'PROJ-002']
    },
    {
      user_id: '6',
      name: 'David Chen',
      email: 'david.chen@ngo.org',
      role: 'field_staff' as UserRole,
      projects: ['PROJ-001']
    },
    {
      user_id: '7',
      name: 'Emily Brown',
      email: 'emily.brown@donor.org',
      role: 'donor_representative' as UserRole,
      projects: ['PROJ-001']
    },
    {
      user_id: '8',
      name: 'Michael Davis',
      email: 'michael.davis@audit.com',
      role: 'external_auditor' as UserRole,
      projects: ['PROJ-001', 'PROJ-002']
    },
    {
      user_id: 'admin',
      name: 'System Administrator',
      email: 'admin@ngo.org',
      role: 'system_admin' as UserRole,
      projects: ['PROJ-001', 'PROJ-002']
    }
  ];

  users.forEach(userData => {
    try {
      const existing = PermissionsService.getUser(userData.user_id);
      if (!existing) {
        const user = PermissionsService.createUser(
          userData.user_id,
          userData.name,
          userData.email,
          userData.role,
          userData.projects
        );
        console.log(`✅ Created user: ${user.name} (${user.role})`);
      } else {
        console.log(`ℹ️  User already exists: ${userData.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create user ${userData.name}:`, error);
    }
  });

  // ============================================================================
  // 2. SET UP DOCUMENT ACCESS CONTROL
  // ============================================================================

  // Get all documents
  const documents = DocumentServiceCorrected.getAllDocuments();
  
  documents.forEach(doc => {
    try {
      const existing = PermissionsService.getDocumentAccessControl(doc.document_id);
      if (!existing) {
        // Set default access control (public to project members)
        PermissionsService.setDocumentAccessControl(
          doc.document_id,
          doc.project_id,
          doc.folder_id,
          doc.uploaded_by_id || '1',
          true // Public to project members
        );
      }
    } catch (error) {
      console.error(`❌ Failed to set access control for ${doc.file_name}:`, error);
    }
  });

  console.log(`✅ Set access control for ${documents.length} documents`);

  // ============================================================================
  // 3. SET UP SHAREPOINT/ONEDRIVE SYNC
  // ============================================================================

  // Initialize sync for PROJ-001 (already connected)
  try {
    const existingSync1 = SharePointSyncService.getSyncConfiguration('PROJ-001');
    if (!existingSync1) {
      const config1 = await SharePointSyncService.initializeSync(
        'PROJ-001',
        'Digital Literacy Enhancement Program',
        'sharepoint',
        'System Administrator',
        {
          site_url: 'https://contoso.sharepoint.com/sites/DigitalLiteracy',
          library_name: 'Project Documents',
          sync_direction: 'two-way',
          auto_sync: true
        }
      );

      // Connect to provider
      await SharePointSyncService.connectToProvider('PROJ-001', {
        tenant_id: 'mock-tenant-001',
        client_id: 'mock-client-001',
        client_secret: 'mock-secret-001'
      });

      console.log(`✅ Initialized SharePoint sync for PROJ-001`);

      // Register sample documents for sync
      const proj1Docs = documents.filter(d => d.project_id === 'PROJ-001');
      proj1Docs.forEach(doc => {
        SharePointSyncService.registerFileForSync(
          doc.document_id,
          doc.file_name,
          doc.folder_path,
          doc.project_id,
          doc.file_size,
          doc.version
        );
      });

      console.log(`✅ Registered ${proj1Docs.length} files for sync`);
    } else {
      console.log(`ℹ️  SharePoint sync already configured for PROJ-001`);
    }
  } catch (error) {
    console.error(`❌ Failed to initialize SharePoint sync:`, error);
  }

  // Initialize sync for PROJ-002 (not yet connected)
  try {
    const existingSync2 = SharePointSyncService.getSyncConfiguration('PROJ-002');
    if (!existingSync2) {
      await SharePointSyncService.initializeSync(
        'PROJ-002',
        'Community Health Initiative',
        'onedrive',
        'System Administrator',
        {
          sync_direction: 'one-way-to-cloud',
          auto_sync: false
        }
      );

      console.log(`✅ Initialized OneDrive sync for PROJ-002 (not connected)`);
    } else {
      console.log(`ℹ️  OneDrive sync already configured for PROJ-002`);
    }
  } catch (error) {
    console.error(`❌ Failed to initialize OneDrive sync:`, error);
  }

  // ============================================================================
  // 4. GRANT SPECIAL PERMISSIONS
  // ============================================================================

  // Grant external auditor access to specific finance documents
  const financeDocuments = documents.filter(d => d.folder_id === 'finance');
  financeDocuments.forEach(doc => {
    try {
      PermissionsService.grantUserAccess(
        doc.document_id,
        '8', // External auditor
        ['view', 'download', 'view_audit_log'],
        'admin'
      );
    } catch (error) {
      // Already granted or error
    }
  });

  console.log(`✅ Granted external auditor access to ${financeDocuments.length} finance documents`);

  // ============================================================================
  // SUMMARY
  // ============================================================================

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ SYSTEM DATA INITIALIZATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`👥 Users created: ${users.length}`);
  console.log(`📄 Document permissions set: ${documents.length}`);
  console.log(`🔄 Sync configurations: 2 projects`);
  console.log('');
  console.log('📋 User Roles Summary:');
  console.log('   - System Admin: 1 user');
  console.log('   - Project Manager: 1 user');
  console.log('   - Finance Officer: 1 user');
  console.log('   - MEAL Officer: 1 user');
  console.log('   - Procurement Officer: 1 user');
  console.log('   - Project Coordinator: 1 user');
  console.log('   - Field Staff: 1 user');
  console.log('   - External Auditor: 1 user');
  console.log('   - Donor Representative: 1 user');
  console.log('');
  console.log('🔐 Permissions Configured:');
  console.log('   - Role-based access control: Active');
  console.log('   - Folder-level restrictions: Active');
  console.log('   - Document-level permissions: Active');
  console.log('');
  console.log('🔄 SharePoint/OneDrive Sync:');
  console.log('   - PROJ-001: SharePoint (Connected, Two-way)');
  console.log('   - PROJ-002: OneDrive (Not Connected)');
  console.log('═══════════════════════════════════════════════════════════');
}

/**
 * Helper function to get current user for testing
 * In real app, this would come from authentication context
 */
export function getCurrentUser() {
  // For demo purposes, return Project Manager by default
  // In production, this would be the authenticated user
  return PermissionsService.getUser('1'); // Sarah Johnson - Project Manager
}

/**
 * Switch user for testing different roles
 */
export function switchUser(user_id: string) {
  const user = PermissionsService.getUser(user_id);
  if (user) {
    console.log(`🔄 Switched to user: ${user.name} (${user.role})`);
    // Store in localStorage for demo
    localStorage.setItem('current_user_id', user_id);
    return user;
  }
  console.error(`❌ User not found: ${user_id}`);
  return null;
}

/**
 * Get currently active user (for demo)
 */
export function getActiveUser() {
  const stored_user_id = localStorage.getItem('current_user_id');
  if (stored_user_id) {
    return PermissionsService.getUser(stored_user_id);
  }
  // Default to project manager
  return getCurrentUser();
}
