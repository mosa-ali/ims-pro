import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { hrAnnualLeaveTranslations } from '@/i18n/hrAnnualLeave-i18n';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Search, Edit, AlertCircle } from 'lucide-react';

interface EditingEmployee {
  id: number;
  employeeId: number;
  firstName: string;
  lastName: string;
  annualEntitlement: number;
  monthlyAccrualRate: number;
  carryForwardDays: number;
  notes?: string;
}

export function EmployeesAnnualLeaveView() {
  const { language, isRTL } = useLanguage();
  const t = hrAnnualLeaveTranslations[language];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingEmployee, setEditingEmployee] = useState<EditingEmployee | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch employees annual leave data
  const { data: employees = [], isLoading, error } = trpc.hrAnnualLeave.getEmployeesAnnualLeave.useQuery({
    year: selectedYear,
  });

  // Mutation for updating annual leave record
  const updateMutation = trpc.hrAnnualLeave.updateAnnualLeaveRecord.useMutation({
    onSuccess: () => {
      setIsEditModalOpen(false);
      setEditingEmployee(null);
    },
  });

  // Filter employees based on search term
  const filteredEmployees = employees?.filter((emp) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      emp.employeeCode?.toLowerCase().includes(searchLower) ||
      emp.firstName?.toLowerCase().includes(searchLower) ||
      emp.lastName?.toLowerCase().includes(searchLower) ||
      emp.department?.toLowerCase().includes(searchLower) ||
      emp.jobTitle?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Calculate statistics
  const stats = {
    totalActiveStaff: filteredEmployees.length,
    avgAccrualRate: filteredEmployees.length > 0
      ? (filteredEmployees.reduce((sum, emp) => sum + (emp.monthlyAccrualRate ? Number(emp.monthlyAccrualRate) : 0), 0) / filteredEmployees.length).toFixed(2)
      : 0,
    totalEntitlements: filteredEmployees.reduce((sum, emp) => sum + (emp.annualEntitlement ? Number(emp.annualEntitlement) : 0), 0),
  };

  const handleEditClick = (employee: any) => {
    setEditingEmployee({
      id: employee.id,
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      annualEntitlement: Number(employee.annualEntitlement),
      monthlyAccrualRate: Number(employee.monthlyAccrualRate),
      carryForwardDays: Number(employee.carryForwardDays),
      notes: employee.notes,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!editingEmployee) return;

    try {
      await updateMutation.mutateAsync({
        employeeId: editingEmployee.employeeId,
        year: selectedYear,
        annualEntitlement: editingEmployee.annualEntitlement,
        monthlyAccrualRate: editingEmployee.monthlyAccrualRate,
        carryForwardDays: editingEmployee.carryForwardDays,
        notes: editingEmployee.notes,
      });
    } catch (err) {
      console.error('Error updating annual leave record:', err);
    }
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t.annualLeaveView.title}</h2>
        <p className="text-sm text-muted-foreground">{t.annualLeaveView.description}</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.statistics.totalActiveStaff}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActiveStaff}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.annualLeaveView.avgAccrualRate}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgAccrualRate} {t.units.days}/{t.units.month}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.annualLeaveView.totalEntitlements}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEntitlements} {t.units.days}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.dateTime.thisYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedYear}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t.employeesAnnualLeaveView.employeeList}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t.leaveBalanceView.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${isRTL ? 'pr-10' : 'pl-10'}`}
              />
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
            >
              {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Employees Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className={`${isRTL ? 'mr-2' : 'ml-2'}`}>{t.messages.loading}</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{t.messages.fetchError}</span>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t.search.noEmployeesFound}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className={`text-left py-2 px-4 font-medium ${isRTL ? 'text-right' : ''}`}>
                      {t.tableColumns.staffId}
                    </th>
                    <th className={`text-left py-2 px-4 font-medium ${isRTL ? 'text-right' : ''}`}>
                      {t.tableColumns.name}
                    </th>
                    <th className={`text-left py-2 px-4 font-medium ${isRTL ? 'text-right' : ''}`}>
                      {t.tableColumns.department}
                    </th>
                    <th className={`text-left py-2 px-4 font-medium ${isRTL ? 'text-right' : ''}`}>
                      {t.tableColumns.annualEntitlement}
                    </th>
                    <th className={`text-left py-2 px-4 font-medium ${isRTL ? 'text-right' : ''}`}>
                      {t.tableColumns.monthlyRate}
                    </th>
                    <th className={`text-left py-2 px-4 font-medium ${isRTL ? 'text-right' : ''}`}>
                      {t.tableColumns.carryForward}
                    </th>
                    <th className={`text-left py-2 px-4 font-medium ${isRTL ? 'text-right' : ''}`}>
                      {t.tableColumns.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="border-b border-border hover:bg-accent/50">
                      <td className="py-2 px-4">{emp.employeeCode}</td>
                      <td className="py-2 px-4">
                        {emp.firstName} {emp.lastName}
                      </td>
                      <td className="py-2 px-4">{emp.department || '-'}</td>
                      <td className="py-2 px-4 text-right">{emp.annualEntitlement} {t.units.days}</td>
                      <td className="py-2 px-4 text-right">{emp.monthlyAccrualRate} {t.units.days}/{t.units.month}</td>
                      <td className="py-2 px-4 text-right">{emp.carryForwardDays} {t.units.days}</td>
                      <td className="py-2 px-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(emp)}
                            title={t.buttons.edit}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className={`${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t.employeesAnnualLeaveView.editModal.title}</DialogTitle>
            <DialogDescription>
              {editingEmployee?.firstName} {editingEmployee?.lastName}
            </DialogDescription>
          </DialogHeader>

          {editingEmployee && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t.employeesAnnualLeaveView.editModal.annualEntitlement}</label>
                <Input
                  type="number"
                  value={editingEmployee.annualEntitlement}
                  onChange={(e) =>
                    setEditingEmployee({
                      ...editingEmployee,
                      annualEntitlement: parseFloat(e.target.value),
                    })
                  }
                  min="0"
                  step="0.5"
                />
              </div>

              <div>
                <label className="text-sm font-medium">{t.employeesAnnualLeaveView.editModal.monthlyAccrualRate}</label>
                <Input
                  type="number"
                  value={editingEmployee.monthlyAccrualRate}
                  onChange={(e) =>
                    setEditingEmployee({
                      ...editingEmployee,
                      monthlyAccrualRate: parseFloat(e.target.value),
                    })
                  }
                  min="0"
                  step="0.1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">{t.employeesAnnualLeaveView.editModal.carryForwardDays}</label>
                <Input
                  type="number"
                  value={editingEmployee.carryForwardDays}
                  onChange={(e) =>
                    setEditingEmployee({
                      ...editingEmployee,
                      carryForwardDays: parseFloat(e.target.value),
                    })
                  }
                  min="0"
                  step="0.5"
                />
              </div>

              <div>
                <label className="text-sm font-medium">{t.employeesAnnualLeaveView.editModal.notes}</label>
                <textarea
                  value={editingEmployee.notes || ''}
                  onChange={(e) =>
                    setEditingEmployee({
                      ...editingEmployee,
                      notes: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={updateMutation.isPending}
                >
                  {t.employeesAnnualLeaveView.editModal.cancel}
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {t.messages.saving}
                    </>
                  ) : (
                    t.employeesAnnualLeaveView.editModal.save
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
