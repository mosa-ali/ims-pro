/**
 * ============================================================================
 * USER MANAGEMENT
 * ============================================================================
 * 
 * Converted from React Native to Web React
 * Complete user management system with CRUD operations
 * 
 * FEATURES:
 * - User listing with search
 * - Role-based filtering
 * - Add user modal with role selection
 * - Change user role
 * - Remove user with confirmation
 * - Status badges (Active/Inactive/Pending)
 * - Role badges (color-coded)
 * - Join date and last active display
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useLocation, useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { X, UserPlus } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'reviewer' | 'enumerator' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  joinedAt: Date;
  lastActive?: Date;
}

export function UserManagement() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const { language, isRTL } = useLanguage();
  
  const projectId = searchParams.get('projectId') || '';
  const projectName = searchParams.get('projectName') || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<User['role'] | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<User['role']>('enumerator');

  const t = {
    title: language === 'en' ? 'Users' : 'المستخدمون',
    subtitle: language === 'en' ? 'Manage team members and permissions' : 'إدارة أعضاء الفريق والصلاحيات',
    back: language === 'en' ? 'Back' : 'رجوع',
    inviteUser: language === 'en' ? '+ Invite User' : '+ دعوة مستخدم',
    searchPlaceholder: language === 'en' ? 'Search by name or email...' : 'البحث بالاسم أو البريد الإلكتروني...',
    all: language === 'en' ? 'All' : 'الكل',
    admin: language === 'en' ? 'Admin' : 'مسؤول',
    manager: language === 'en' ? 'Manager' : 'مدير',
    reviewer: language === 'en' ? 'Reviewer' : 'مراجع',
    enumerator: language === 'en' ? 'Enumerator' : 'معداد',
    viewer: language === 'en' ? 'Viewer' : 'مشاهد',
    users: language === 'en' ? 'Users' : 'مستخدمون',
    user: language === 'en' ? 'User' : 'مستخدم',
    noUsers: language === 'en' ? 'No users found' : 'لم يتم العثور على مستخدمين',
    active: language === 'en' ? 'Active' : 'نشط',
    inactive: language === 'en' ? 'Inactive' : 'غير نشط',
    pending: language === 'en' ? 'Pending' : 'قيد الانتظار',
    role: language === 'en' ? 'Role' : 'الدور',
    joined: language === 'en' ? 'Joined' : 'انضم',
    lastActive: language === 'en' ? 'Last Active' : 'آخر نشاط',
    never: language === 'en' ? 'Never' : 'أبداً',
    removeUser: language === 'en' ? 'Remove User' : 'إزالة المستخدم',
    inviteUserTitle: language === 'en' ? 'Invite User' : 'دعوة مستخدم',
    emailAddress: language === 'en' ? 'Email Address' : 'عنوان البريد الإلكتروني',
    emailPlaceholder: language === 'en' ? 'user@example.com' : 'user@example.com',
    roleSelection: language === 'en' ? 'Role' : 'الدور',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    sendInvite: language === 'en' ? 'Send Invite' : 'إرسال الدعوة',
    changeRole: language === 'en' ? 'Change Role' : 'تغيير الدور',
    selectNewRole: language === 'en' ? 'Select new role:' : 'اختر الدور الجديد:',
    removeConfirm: language === 'en' ? 'Remove User' : 'إزالة المستخدم',
    removeMessage: language === 'en' ? 'Are you sure you want to remove this user?' : 'هل أنت متأ��د من إزالة هذا المستخدم؟',
    remove: language === 'en' ? 'Remove' : 'إزالة',
    success: language === 'en' ? 'Success' : 'نجح',
    inviteSent: language === 'en' ? 'Invitation sent to' : 'تم إرسال الدعوة إلى',
    validationError: language === 'en' ? 'Validation Error' : 'خطأ في التحقق',
    enterEmail: language === 'en' ? 'Please enter email address' : 'يرجى إدخال عنوان البريد الإلكتروني',
  };

  // Mock users data
  const MOCK_USERS: User[] = [
    {
      id: 'user_001',
      name: language === 'en' ? 'Ahmed Hassan' : 'أحمد حسن',
      email: 'ahmed@example.com',
      role: 'admin',
      status: 'active',
      joinedAt: new Date('2024-01-15'),
      lastActive: new Date(),
    },
    {
      id: 'user_002',
      name: language === 'en' ? 'Fatima Ali' : 'فاطمة علي',
      email: 'fatima@example.com',
      role: 'manager',
      status: 'active',
      joinedAt: new Date('2024-02-01'),
      lastActive: new Date(Date.now() - 3600000),
    },
    {
      id: 'user_003',
      name: language === 'en' ? 'Mohammed Ibrahim' : 'محمد إبراهيم',
      email: 'mohammed@example.com',
      role: 'enumerator',
      status: 'active',
      joinedAt: new Date('2024-02-15'),
      lastActive: new Date(Date.now() - 7200000),
    },
    {
      id: 'user_004',
      name: language === 'en' ? 'Leila Ahmed' : 'ليلى أحمد',
      email: 'leila@example.com',
      role: 'reviewer',
      status: 'pending',
      joinedAt: new Date('2024-03-01'),
    },
  ];

  const [users, setUsers] = useState<User[]>(MOCK_USERS);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleAddUser = () => {
    if (!newUserEmail.trim()) {
      alert(t.enterEmail);
      return;
    }

    const newUser: User = {
      id: `user_${Date.now()}`,
      name: newUserEmail.split('@')[0],
      email: newUserEmail,
      role: newUserRole,
      status: 'pending',
      joinedAt: new Date(),
    };

    setUsers([...users, newUser]);
    setNewUserEmail('');
    setShowAddModal(false);
    alert(`${t.inviteSent} ${newUserEmail}`);
  };

  const handleChangeRole = (userId: string, newRole: User['role']) => {
    if (confirm(`${t.changeRole}\n${t.selectNewRole} ${newRole}`)) {
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    }
  };

  const handleRemoveUser = (userId: string) => {
    if (confirm(t.removeMessage)) {
      setUsers(users.filter((u) => u.id !== userId));
    }
  };

  const getRoleColor = (role: User['role']): string => {
    const colors: Record<User['role'], string> = {
      admin: '#C60C30',
      manager: '#3B82F6',
      reviewer: '#F59E0B',
      enumerator: '#22C55E',
      viewer: '#64748B',
    };
    return colors[role];
  };

  const getStatusColor = (status: User['status']): string => {
    const colors: Record<User['status'], string> = {
      active: '#22C55E',
      inactive: '#64748B',
      pending: '#F59E0B',
    };
    return colors[status];
  };

  const getRoleLabel = (role: User['role']): string => {
    const labels: Record<User['role'], string> = {
      admin: t.admin,
      manager: t.manager,
      reviewer: t.reviewer,
      enumerator: t.enumerator,
      viewer: t.viewer,
    };
    return labels[role];
  };

  const getStatusLabel = (status: User['status']): string => {
    const labels: Record<User['status'], string> = {
      active: t.active,
      inactive: t.inactive,
      pending: t.pending,
    };
    return labels[status];
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
        </div>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-900">{t.back}</span>
        </button>
      </div>

      {/* Add User Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full rounded-lg py-3 bg-blue-600 hover:bg-blue-700 transition-colors"
      >
        <span className="font-semibold text-white flex items-center justify-center gap-2">
          <UserPlus className="w-4 h-4" /> {t.inviteUser}
        </span>
      </button>

      {/* Search & Filter */}
      <div className="space-y-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            isRTL ? 'text-right' : 'text-left'
          }`}
        />

        {/* Role Filter */}
        <div className={`flex gap-2 overflow-x-auto pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {(['all', 'admin', 'manager', 'reviewer', 'enumerator', 'viewer'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                filterRole === role
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-xs font-semibold capitalize">
                {role === 'all' ? t.all : getRoleLabel(role as User['role'])}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        <h3 className={`text-lg font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
          {filteredUsers.length} {filteredUsers.length !== 1 ? t.users : t.user}
        </h3>

        {filteredUsers.length === 0 ? (
          <div className="p-6 rounded-lg bg-white border border-gray-200 text-center">
            <p className="text-lg font-semibold text-gray-500">{t.noUsers}</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className="p-4 rounded-lg bg-white border border-gray-200 space-y-3">
              {/* User Header */}
              <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <p className="text-base font-bold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{user.email}</p>
                </div>
                <span
                  className="px-2 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: getStatusColor(user.status) + '20', color: getStatusColor(user.status) }}
                >
                  {getStatusLabel(user.status)}
                </span>
              </div>

              {/* Role & Join Date */}
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-xs text-gray-600 mb-1">{t.role}</p>
                  <button
                    onClick={() => {
                      const roles: User['role'][] = ['admin', 'manager', 'reviewer', 'enumerator', 'viewer'];
                      const currentIndex = roles.indexOf(user.role);
                      const nextRole = roles[(currentIndex + 1) % roles.length];
                      handleChangeRole(user.id, nextRole);
                    }}
                    className="px-2 py-1 rounded transition-colors hover:opacity-80"
                    style={{ backgroundColor: getRoleColor(user.role) + '20', color: getRoleColor(user.role) }}
                  >
                    <span className="text-xs font-semibold capitalize">{getRoleLabel(user.role)}</span>
                  </button>
                </div>

                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-xs text-gray-600 mb-1">{t.joined}</p>
                  <p className="text-xs font-semibold text-gray-900">{user.joinedAt.toLocaleDateString()}</p>
                </div>

                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-xs text-gray-600 mb-1">{t.lastActive}</p>
                  <p className="text-xs font-semibold text-gray-900">
                    {user.lastActive ? user.lastActive.toLocaleTimeString() : t.never}
                  </p>
                </div>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveUser(user.id)}
                className="w-full py-2 rounded-lg bg-red-50 border border-red-500 hover:bg-red-100 transition-colors"
              >
                <span className="text-sm font-semibold text-red-600">{t.removeUser}</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 p-4">
          <div className="w-full max-w-2xl bg-white rounded-t-3xl p-6 space-y-4">
            {/* Header */}
            <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h2 className="text-2xl font-bold text-gray-900">{t.inviteUserTitle}</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5 text-gray-900" />
              </button>
            </div>

            {/* Email Input */}
            <div>
              <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.emailAddress}
              </label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isRTL ? 'text-right' : 'text-left'
                }`}
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.roleSelection}
              </label>
              <div className="space-y-2">
                {(['admin', 'manager', 'reviewer', 'enumerator', 'viewer'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setNewUserRole(role)}
                    className={`w-full p-3 rounded-lg flex items-center justify-between transition-colors ${
                      newUserRole === role
                        ? 'bg-blue-50 border-2 border-blue-600'
                        : 'bg-white border border-gray-300 hover:bg-gray-50'
                    } ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <span className="text-sm font-semibold text-gray-900 capitalize">{getRoleLabel(role)}</span>
                    {newUserRole === role && <span className="text-lg">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className={`flex gap-2 mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900">{t.cancel}</span>
              </button>
              <button
                onClick={handleAddUser}
                className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <span className="font-semibold text-white">{t.sendInvite}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
