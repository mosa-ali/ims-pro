import { useState, useMemo } from 'react';
import { Edit2, X, Save, ChevronDown, ChevronRight, Check, Square, CheckSquare, Building2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type ActionType = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve' | 'submit';
const ALL_ACTIONS: ActionType[] = ['view', 'create', 'edit', 'delete', 'export', 'approve', 'submit'];

interface ActionPerms {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export?: boolean;
  approve?: boolean;
  submit?: boolean;
}

interface EditUserPermissionsModalProps {
  isOpen: boolean;
  user: { id: number; fullName: string; email: string; rbacRoleId: number | null } | null;
  roles: any[];
  permissionTree: any[];
  permissions: Record<string, ActionPerms>;
  roleId: number | null;
  language: string;
  isRTL: boolean;
  isPending: boolean;
  onClose: () => void;
  onPermissionsChange: (permissions: Record<string, ActionPerms>) => void;
  onRoleChange: (roleId: number | null) => void;
  onSave: () => void;
  t: any;
  // Operating Units
  operatingUnits?: { id: number; name: string; nameAr?: string; type?: string }[];
  selectedOUIds?: number[];
  onOUChange?: (ids: number[]) => void;
}

export function EditUserPermissionsModal({
  isOpen,
  user,
  roles,
  permissionTree,
  permissions,
  roleId,
  language,
  isRTL,
  isPending,
  onClose,
  onPermissionsChange,
  onRoleChange,
  onSave,
  t,
  operatingUnits = [],
  selectedOUIds = [],
  onOUChange,
}: EditUserPermissionsModalProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  if (!isOpen || !user) return null;

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const toggleAction = (moduleId: string, action: ActionType) => {
    const newPerms = { ...permissions };
    if (!newPerms[moduleId]) {
      newPerms[moduleId] = { view: false, create: false, edit: false, delete: false, export: false, approve: false, submit: false };
    }
    newPerms[moduleId][action] = !newPerms[moduleId][action];
    onPermissionsChange(newPerms);
  };

  const toggleAllActions = (moduleId: string, grant: boolean) => {
    const newPerms = { ...permissions };
    if (!newPerms[moduleId]) {
      newPerms[moduleId] = { view: false, create: false, edit: false, delete: false, export: false, approve: false, submit: false };
    }
    ALL_ACTIONS.forEach(action => {
      newPerms[moduleId][action] = grant;
    });
    onPermissionsChange(newPerms);
  };

  const handleApplyRole = (selectedRoleId: number) => {
    const role = roles.find(r => r.id === selectedRoleId);
    if (role && role.permissions) {
      const perms = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
      onPermissionsChange(perms);
      onRoleChange(selectedRoleId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Edit2 className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">{language === 'en' ? 'Edit User Permissions' : 'تعديل صلاحيات المستخدم'}</h2>
                <p className="text-sm text-gray-600">{user.fullName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">{t.fullName}</label>
              <input type="text" value={user.fullName} disabled className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">{t.email}</label>
              <input type="email" value={user.email} disabled className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50" />
            </div>
          </div>

          {/* Role Template Selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">{t.rolesPermissions?.selectRoleTemplate || 'Apply Role Template'}</label>
            <select
              value={roleId || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val) handleApplyRole(Number(val));
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">{t.selectRole || 'Select a role template'}</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{language === 'en' ? r.name : (r.nameAr || r.name)}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">{t.rolesPermissions?.roleTemplateDesc || 'Select a role to apply its permissions as a template, then customize below'}</p>
          </div>

          {/* Operating Units Section */}
          {operatingUnits.length > 0 && onOUChange && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-semibold text-gray-900">
                  {language === 'en' ? 'Operating Units' : 'الوحدات التشغيلية'}
                </h3>
                <span className="text-xs text-gray-400">
                  {language === 'en' ? '(select one or more)' : '(حدد وحدة أو أكثر)'}
                </span>
              </div>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {operatingUnits.map((ou) => (
                  <label
                    key={ou.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedOUIds.includes(ou.id)}
                      onChange={() => {
                        const next = selectedOUIds.includes(ou.id)
                          ? selectedOUIds.filter(id => id !== ou.id)
                          : [...selectedOUIds, ou.id];
                        onOUChange(next);
                      }}
                      className="w-4 h-4 rounded accent-purple-600"
                    />
                    <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-800">
                      {language === 'en' ? ou.name : (ou.nameAr || ou.name)}
                    </span>
                    {ou.type && (
                      <span className="text-xs text-gray-400 capitalize ml-auto">({ou.type})</span>
                    )}
                  </label>
                ))}
              </div>
              {selectedOUIds.length === 0 && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {language === 'en'
                    ? 'No operating unit selected — user will have no OU access'
                    : 'لم يتم تحديد وحدة تشغيلية — لن يكون للمستخدم صلاحية وصول'}
                </p>
              )}
            </div>
          )}

          {/* Permissions Tree */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.rolesPermissions?.permissions || 'Permissions'}</h3>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              {permissionTree.map((module: any) => {
                const modulePerms = permissions[module.id] || { view: false, create: false, edit: false, delete: false, export: false, approve: false, submit: false };
                const isExpanded = expandedModules.has(module.id);
                const allGranted = ALL_ACTIONS.every(a => modulePerms[a]);
                const someGranted = ALL_ACTIONS.some(a => modulePerms[a]);

                return (
                  <div key={module.id}>
                    {/* Module Row */}
                    <div className="p-3 hover:bg-gray-50 flex items-center gap-3">
                      <button
                        onClick={() => toggleModule(module.id)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      {/* Module Name */}
                      <span className="flex-1 text-sm font-medium text-gray-900">
                        {language === 'en' ? module.name : (module.nameAr || module.name)}
                      </span>

                      {/* Grant All / Revoke All */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleAllActions(module.id, true)}
                          className="text-xs px-2 py-1 text-green-600 bg-green-50 rounded hover:bg-green-100"
                        >
                          {t.rolesPermissions?.grantAll || 'Grant All'}
                        </button>
                        <button
                          onClick={() => toggleAllActions(module.id, false)}
                          className="text-xs px-2 py-1 text-red-600 bg-red-50 rounded hover:bg-red-100"
                        >
                          {t.rolesPermissions?.revokeAll || 'Revoke All'}
                        </button>
                      </div>

                      {/* Status Indicator */}
                      <div className="text-xs font-medium">
                        {allGranted ? (
                          <span className="text-green-600">All</span>
                        ) : someGranted ? (
                          <span className="text-amber-600">Partial</span>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </div>
                    </div>

                    {/* Action Checkboxes */}
                    {isExpanded && (
                      <div className="bg-gray-50 p-4 grid grid-cols-7 gap-2 border-t border-gray-100">
                        {ALL_ACTIONS.map(action => {
                          const isChecked = modulePerms[action] || false;
                          return (
                            <div key={action} className="flex flex-col items-center gap-1">
                              <button
                                onClick={() => toggleAction(module.id, action)}
                                className={`p-2 rounded-lg transition-colors ${
                                  isChecked
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-white border border-gray-200 text-gray-400 hover:border-gray-300'
                                }`}
                              >
                                {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                              </button>
                              <span className="text-[10px] font-medium text-gray-600 text-center capitalize">
                                {language === 'en' ? action : (t.rolesPermissions?.[action] || action)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {t.cancel}
          </button>
          <button
            onClick={onSave}
            disabled={isPending || Object.keys(permissions).length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isPending ? (language === 'en' ? 'Saving...' : 'جاري الحفظ...') : (language === 'en' ? 'Save Changes' : 'حفظ التغييرات')}
          </button>
        </div>
      </div>
    </div>
  );
}
