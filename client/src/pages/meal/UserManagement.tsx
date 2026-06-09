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

import { useNavigate } from '@/lib/router-compat';
import { useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

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
 const { t } = useTranslation();
 const navigate = useNavigate();
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

 const labels = {
 title: t.meal.users,
 subtitle: t.meal.manageTeamMembersAndPermissions,
 back: t.meal.back,
 inviteUser: t.meal.inviteUser,
 searchPlaceholder: t.meal.searchByNameOrEmail,
 all: t.meal.all,
 admin: t.meal.admin,
 manager: t.meal.manager,
 reviewer: t.meal.reviewer,
 enumerator: t.meal.enumerator,
 viewer: t.meal.viewer,
 users: t.meal.users25,
 user: t.meal.user26,
 noUsers: t.meal.noUsersFound,
 active: t.meal.active,
 inactive: t.meal.inactive,
 pending: t.meal.pending,
 role: t.meal.role,
 joined: t.meal.joined,
 lastActive: t.meal.lastActive,
 never: t.meal.never,
 removeUser: t.meal.removeUser,
 inviteUserTitle: t.meal.inviteUser27,
 emailAddress: t.meal.emailAddress,
 emailPlaceholder: 'user@example.com',
 roleSelection: t.meal.role,
 cancel: t.meal.cancel,
 sendInvite: t.meal.sendInvite,
 changeRole: t.meal.changeRole,
 selectNewRole: t.meal.selectNewRole,
 removeConfirm: t.meal.removeUser,
 removeMessage: t.meal.areYouSureYouWantTo28,
 remove: t.meal.remove,
 success: t.meal.success,
 inviteSent: t.meal.invitationSentTo,
 validationError: t.meal.validationError,
 enterEmail: t.meal.pleaseEnterEmailAddress,
 };

 // Mock users data
 const MOCK_USERS: User[] = [
 {
 id: 'user_001',
 name: t.meal.ahmedHassan,
 email: 'ahmed@example.com',
 role: 'admin',
 status: 'active',
 joinedAt: new Date('2024-01-15'),
 lastActive: new Date(),
 },
 {
 id: 'user_002',
 name: t.meal.fatimaAli,
 email: 'fatima@example.com',
 role: 'manager',
 status: 'active',
 joinedAt: new Date('2024-02-01'),
 lastActive: new Date(Date.now() - 3600000),
 },
 {
 id: 'user_003',
 name: t.meal.mohammedIbrahim,
 email: 'mohammed@example.com',
 role: 'enumerator',
 status: 'active',
 joinedAt: new Date('2024-02-15'),
 lastActive: new Date(Date.now() - 7200000),
 },
 {
 id: 'user_004',
 name: t.meal.leilaAhmed,
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
 alert(labels.enterEmail);
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
 alert(`${labels.inviteSent} ${newUserEmail}`);
 };

 const handleChangeRole = (userId: string, newRole: User['role']) => {
 if (confirm(`${labels.changeRole}\n${labels.selectNewRole} ${newRole}`)) {
 setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
 }
 };

 const handleRemoveUser = (userId: string) => {
 if (confirm(labels.removeMessage)) {
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
 admin: labels.admin,
 manager: labels.manager,
 reviewer: labels.reviewer,
 enumerator: labels.enumerator,
 viewer: labels.viewer,
 };
 return labels[role];
 };

 const getStatusLabel = (status: User['status']): string => {
 const labels: Record<User['status'], string> = {
 active: labels.active,
 inactive: labels.inactive,
 pending: labels.pending,
 };
 return labels[status];
 };

 return (
 <div className="p-6 space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal/survey/settings')} label={t.meal.backToSettings} />
 {/* Header */}
 <div className={`flex items-center justify-between mb-2`}>
 <div className={`flex-1 text-start`}>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-sm text-gray-600 mt-1">{labels.subtitle}</p>
 </div>
 </div>

 {/* Add User Button */}
 <button
 onClick={() => setShowAddModal(true)}
 className="w-full rounded-lg py-3 bg-blue-600 hover:bg-blue-700 transition-colors"
 >
 <span className="font-semibold text-white flex items-center justify-center gap-2">
 <UserPlus className="w-4 h-4" /> {labels.inviteUser}
 </span>
 </button>

 {/* Search & Filter */}
 <div className="space-y-3">
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={labels.searchPlaceholder}
 className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />

 {/* Role Filter */}
 <div className={`flex gap-2 overflow-x-auto pb-2`}>
 {(['all', 'admin', 'manager', 'reviewer', 'enumerator', 'viewer'] as const).map((role) => (
 <button
 key={role}
 onClick={() => setFilterRole(role)}
 className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${ filterRole === role ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50' }`}
 >
 <span className="text-xs font-semibold capitalize">
 {role === 'all' ? labels.all : getRoleLabel(role as User['role'])}
 </span>
 </button>
 ))}
 </div>
 </div>

 {/* Users List */}
 <div className="space-y-3">
 <h3 className={`text-lg font-bold text-gray-900 text-start`}>
 {filteredUsers.length} {filteredUsers.length !== 1 ? labels.users : labels.user}
 </h3>

 {filteredUsers.length === 0 ? (
 <div className="p-6 rounded-lg bg-white border border-gray-200 text-center">
 <p className="text-lg font-semibold text-gray-500">{labels.noUsers}</p>
 </div>
 ) : (
 filteredUsers.map((user) => (
 <div key={user.id} className="p-4 rounded-lg bg-white border border-gray-200 space-y-3">
 {/* User Header */}
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
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
 <div className={`flex justify-between`}>
 <div className={'text-start'}>
 <p className="text-xs text-gray-600 mb-1">{labels.role}</p>
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

 <div className={'text-start'}>
 <p className="text-xs text-gray-600 mb-1">{labels.joined}</p>
 <p className="text-xs font-semibold text-gray-900">{user.joinedAt.toLocaleDateString()}</p>
 </div>

 <div className={'text-start'}>
 <p className="text-xs text-gray-600 mb-1">{labels.lastActive}</p>
 <p className="text-xs font-semibold text-gray-900">
 {user.lastActive ? user.lastActive.toLocaleTimeString() : labels.never}
 </p>
 </div>
 </div>

 {/* Remove Button */}
 <button
 onClick={() => handleRemoveUser(user.id)}
 className="w-full py-2 rounded-lg bg-red-50 border border-red-500 hover:bg-red-100 transition-colors"
 >
 <span className="text-sm font-semibold text-red-600">{labels.removeUser}</span>
 </button>
 </div>
 ))
 )}
 </div>

 {/* Add User Modal */}
 {showAddModal && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-end justify-center z-50 p-4">
 <div className="w-full max-w-2xl bg-white rounded-t-3xl p-6 space-y-4">
 {/* Header */}
 <div className={`flex items-center justify-between mb-2`}>
 <h2 className="text-2xl font-bold text-gray-900">{labels.inviteUserTitle}</h2>
 <button
 onClick={() => setShowAddModal(false)}
 className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
 >
 <X className="w-5 h-5 text-gray-900" />
 </button>
 </div>

 {/* Email Input */}
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.emailAddress}
 </label>
 <input
 type="email"
 value={newUserEmail}
 onChange={(e) => setNewUserEmail(e.target.value)}
 placeholder={labels.emailPlaceholder}
 className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ 'text-start' }`}
 />
 </div>

 {/* Role Selection */}
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.roleSelection}
 </label>
 <div className="space-y-2">
 {(['admin', 'manager', 'reviewer', 'enumerator', 'viewer'] as const).map((role) => (
 <button
 key={role}
 onClick={() => setNewUserRole(role)}
 className={`w-full p-3 rounded-lg flex items-center justify-between transition-colors ${ newUserRole === role ? 'bg-blue-50 border-2 border-blue-600' : 'bg-white border border-gray-300 hover:bg-gray-50' }`}
 >
 <span className="text-sm font-semibold text-gray-900 capitalize">{getRoleLabel(role)}</span>
 {newUserRole === role && <span className="text-lg">✓</span>}
 </button>
 ))}
 </div>
 </div>

 {/* Action Buttons */}
 <div className={`flex gap-2 mt-4`}>
 <button
 onClick={() => setShowAddModal(false)}
 className="flex-1 py-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
 >
 <span className="font-semibold text-gray-900">{labels.cancel}</span>
 </button>
 <button
 onClick={handleAddUser}
 className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
 >
 <span className="font-semibold text-white">{labels.sendInvite}</span>
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
