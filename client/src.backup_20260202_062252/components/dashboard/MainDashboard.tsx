// ============================================================================
// MAIN DASHBOARD
// Welcome screen showing user info, org info, and permissions
// ============================================================================

import React from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRoleDisplayName, useModulePermissions } from '@/hooks/usePermissions';

export function MainDashboard() {
  const { user, logout } = useAuth();
  const { currentOrganization, currentRole, availableOrganizations, switchOrganization } = useOrganization();
  const { isRTL } = useLanguage();
  const roleDisplayName = useRoleDisplayName();

  const projectsPerms = useModulePermissions('PROJECTS');
  const grantsPerms = useModulePermissions('GRANTS');
  const financePerms = useModulePermissions('FINANCE');
  const mealPerms = useModulePermissions('MEAL');
  const surveysPerms = useModulePermissions('SURVEYS');
  const casesPerms = useModulePermissions('CASES');

  if (!user || !currentOrganization) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const formatPermissions = (perms: ReturnType<typeof useModulePermissions>) => {
    const actions = [];
    if (perms.canView) actions.push('View');
    if (perms.canCreate) actions.push('Create');
    if (perms.canEdit) actions.push('Edit');
    if (perms.canDelete) actions.push('Delete');
    return actions.length > 0 ? actions.join(', ') : 'No Access';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Integrated Management System (IMS)
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {isRTL ? 'نظام الإدارة المتكامل' : 'Integrated Management System'}
              </p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {user.name}!
          </h2>
          <p className="text-blue-100">
            You are logged in as <strong>{roleDisplayName}</strong> in <strong>{currentOrganization.name}</strong>
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* User Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Your Profile
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Name:</span>
                <p className="font-medium text-gray-900">{user.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Email:</span>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Role:</span>
                <p className="font-medium text-gray-900">{roleDisplayName}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Language:</span>
                <p className="font-medium text-gray-900">
                  {user.languagePreference === 'ar' ? 'Arabic (العربية)' : 'English'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Last Sign In:</span>
                <p className="font-medium text-gray-900">
                  {new Date(user.lastSignedIn).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Organization Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Organization
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Organization:</span>
                <p className="font-medium text-gray-900">{currentOrganization.name}</p>
                {currentOrganization.nameAr && (
                  <p className="text-sm text-gray-600">{currentOrganization.nameAr}</p>
                )}
              </div>
              <div>
                <span className="text-sm text-gray-500">Code:</span>
                <p className="font-medium text-gray-900">{currentOrganization.code}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Country:</span>
                <p className="font-medium text-gray-900">{currentOrganization.country}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Currency:</span>
                <p className="font-medium text-gray-900">{currentOrganization.defaultCurrency}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Contact:</span>
                <p className="font-medium text-gray-900">{currentOrganization.contactEmail}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Organization Switcher */}
        {availableOrganizations.length > 1 && (
          <div className="bg-white rounded-lg shadow p-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Switch Organization
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              You have access to {availableOrganizations.length} organizations. Click to switch:
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableOrganizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => switchOrganization(org.id)}
                  disabled={org.id === currentOrganization.id}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    org.id === currentOrganization.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{org.name}</div>
                  {org.nameAr && (
                    <div className="text-sm text-gray-600 mt-1">{org.nameAr}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">{org.code}</div>
                  {org.id === currentOrganization.id && (
                    <div className="text-xs text-blue-600 font-medium mt-2">
                      ✓ Currently Active
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Module Permissions */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Permissions
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Based on your role as <strong>{roleDisplayName}</strong>, you have the following access:
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Projects', perms: projectsPerms, icon: '📋' },
              { name: 'Grants', perms: grantsPerms, icon: '💰' },
              { name: 'Finance', perms: financePerms, icon: '💵' },
              { name: 'MEAL', perms: mealPerms, icon: '📊' },
              { name: 'Surveys', perms: surveysPerms, icon: '📝' },
              { name: 'Cases', perms: casesPerms, icon: '👥' }
            ].map((module) => (
              <div
                key={module.name}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{module.icon}</span>
                  <span className="font-semibold text-gray-900">{module.name}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {formatPermissions(module.perms)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            System Status
          </h3>
          <p className="text-sm text-blue-800">
            ✅ Authentication: Active<br />
            ✅ Organization Context: Loaded<br />
            ✅ Role-Based Permissions: Configured<br />
            ℹ️ This is a frontend demo with mock data. Ready for backend integration.
          </p>
        </div>
      </main>
    </div>
  );
}