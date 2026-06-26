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
  contractStartDate?: Date;
  contractEndDate?: Date;
}

export function EmployeesAnnualLeaveView() {
  const { language, isRTL } = useLanguage();
  const t = hrAnnualLeaveTranslations[language];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingEmployee, setEditingEmployee] = useState<EditingEmployee | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Get tRPC utilities at component top level (required for hooks)
  const utils = trpc.useUtils();

  // Fetch employees annual leave data
  const { data: employees = [], isLoading, error } = trpc.hrAnnualLeave.getEmployeesAnnualLeave.useQuery({
    year: selectedYear,
  });

  // Mutation for updating annual leave record
  const updateMutation = trpc.hrAnnualLeave.updateAnnualLeaveRecord.useMutation({
    onSuccess: () => {
      setIsEditModalOpen(false);
      setEditingEmployee(null);
      // Invalidate query to refresh data
      utils.hrAnnualLeave.getEmployeesAnnualLeave.invalidate({ year: selectedYear });
    },
    onError: (error) => {
      console.error('Error updating annual leave record:', error);
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

  // Calculate pro-rata entitlement based on contract duration
  const calculateProRataEntitlement = (monthlyRate: number, contractStart?: Date, contractEnd?: Date): number => {
    if (!contractStart || !contractEnd) {
      // If no contract dates, assume full year (12 months)
      return monthlyRate * 12;
    }

    // Calculate months between contract start and end
    const startDate = new Date(contractStart);
    const endDate = new Date(contractEnd);
    
    const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                       (endDate.getMonth() - startDate.getMonth());
    
    // Add 1 to include both start and end months
    const totalMonths = Math.max(1, monthsDiff + 1);
    
    return Number((monthlyRate * totalMonths).toFixed(2));
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
      contractStartDate: employee.contractStartDate ? new Date(employee.contractStartDate) : undefined,
      contractEndDate: employee.contractEndDate ? new Date(employee.contractEndDate) : undefined,
    });
    setIsEditModalOpen(true);
  };

  const handleMonthlyRateChange = (newRate: number) => {
    if (!editingEmployee) return;
    
    const proRataEntitlement = calculateProRataEntitlement(
      newRate,
      editingEmployee.contractStartDate,
      editingEmployee.contractEndDate
    );
    
    setEditingEmployee({
      ...editingEmployee,
      monthlyAccrualRate: newRate,
      annualEntitlement: proRataEntitlement,
    });
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

  // Handle errors from mutation
  if (updateMutation.isError) {
    console.error('Mutation error:', updateMutation.error);
  }

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
        <DialogContent className={`${isRTL ? 'rtl' : 'ltr'} max-w-md`} dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t.employeesAnnualLeaveView.editModal.title}</DialogTitle>
            <DialogDescription>
              {editingEmployee?.firstName} {editingEmployee?.lastName}
            </DialogDescription>
          </DialogHeader>

          {editingEmployee && (
            <div className="space-y-4">
              {/* Contract Period Display */}
              {editingEmployee.contractStartDate && editingEmployee.contractEndDate && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-medium text-blue-900 mb-1">{t.employeeInfo.contractPeriod}</p>
                  <p className="text-sm text-blue-800">
                    {new Date(editingEmployee.contractStartDate).toLocaleDateString()} - {new Date(editingEmployee.contractEndDate).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Monthly Accrual Rate Input */}
              <div>
                <label className="text-sm font-medium">{t.employeesAnnualLeaveView.editModal.monthlyAccrualRate}</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    value={editingEmployee.monthlyAccrualRate}
                    onChange={(e) => handleMonthlyRateChange(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.1"
                    className="flex-1"
                  />
                  <span className="flex items-center text-sm text-muted-foreground">{t.units.days}/{t.units.month}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.employeesAnnualLeaveView.editModal.monthlyAccrualRate}</p>
              </div>

              {/* Annual Entitlement Display (Auto-calculated) */}
              <div>
                <label className="text-sm font-medium">{t.employeesAnnualLeaveView.editModal.annualEntitlement}</label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <p className="text-lg font-semibold text-foreground">
                    {editingEmployee.annualEntitlement.toFixed(2)} {t.units.days}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{t.statistics.totalAccrual}</p>
                </div>
              </div>

              {/* Carry Forward Days Input */}
              <div>
                <label className="text-sm font-medium">{t.employeesAnnualLeaveView.editModal.carryForwardDays}</label>
                <Input
                  type="number"
                  value={editingEmployee.carryForwardDays}
                  onChange={(e) =>
                    setEditingEmployee({
                      ...editingEmployee,
                      carryForwardDays: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="0.5"
                  className="mt-1"
                />
              </div>

              {/* Notes Input */}
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
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground mt-1"
                  rows={3}

                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4">
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
