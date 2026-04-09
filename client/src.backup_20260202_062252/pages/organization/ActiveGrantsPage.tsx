import { useState } from 'react';
import { Plus, Search, Download, Upload, Edit, Trash2, Eye, DollarSign, Calendar, Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { formatNumber } from '@/lib/utils/formatting';
import { Link } from 'wouter';
import { GrantFormModal } from '@/components/GrantFormModal';
import { GrantDetailsModal } from '@/components/GrantDetailsModal';
import toast, { Toaster } from 'react-hot-toast';
import ExcelJS from 'exceljs';

/**
 * Active Grants Page - Phase 1 Grant Management
 * Displays list of grants with filtering, search, and CRUD operations
 */
export default function ActiveGrantsPage() {
  const { isRTL } = useLanguage();
  const { currentOrganizationId } = useOrganization();
  const { currentOperatingUnitId } = useOperatingUnit();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'pending' | 'on_hold' | undefined>();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedGrant, setSelectedGrant] = useState<any>(null);

  const utils = trpc.useUtils();

  // Delete mutation
  const deleteMutation = trpc.grants.delete.useMutation({
    onSuccess: () => {
      utils.grants.list.invalidate();
      utils.grants.getDashboardKPIs.invalidate();
      toast.success('Grant deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete grant');
    },
  });

  // Fetch grants from tRPC
  const { data: grants, isLoading, refetch } = trpc.grants.list.useQuery({
    organizationId: currentOrganizationId || 1,
    operatingUnitId: currentOperatingUnitId || 1,
    status: statusFilter,
    searchTerm: searchTerm || undefined,
  }, {
    enabled: !!currentOrganizationId && !!currentOperatingUnitId,
  });

  // Fetch KPIs
  const { data: kpis } = trpc.grants.getDashboardKPIs.useQuery({
    organizationId: currentOrganizationId || 1,
    operatingUnitId: currentOperatingUnitId || 1,
  }, {
    enabled: !!currentOrganizationId && !!currentOperatingUnitId,
  });

  // Excel Export
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Grants');

      // Define columns
      worksheet.columns = [
        { header: 'Grant Number', key: 'grantNumber', width: 20 },
        { header: 'Grant Name', key: 'grantName', width: 40 },
        { header: 'Donor Name', key: 'donorName', width: 25 },
        { header: 'Donor Reference', key: 'donorReference', width: 20 },
        { header: 'Currency', key: 'currency', width: 10 },
        { header: 'Grant Amount', key: 'grantAmount', width: 15 },
        { header: 'Start Date', key: 'startDate', width: 15 },
        { header: 'End Date', key: 'endDate', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Sector', key: 'sector', width: 20 },
        { header: 'Responsible', key: 'responsible', width: 25 },
        { header: 'Reporting Frequency', key: 'reportingFrequency', width: 20 },
        { header: 'Co-Funding', key: 'coFunding', width: 12 },
        { header: 'Co-Funder Name', key: 'coFunderName', width: 25 },
        { header: 'Description', key: 'description', width: 50 },
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Add data
      grants?.forEach((grant) => {
        worksheet.addRow({
          grantNumber: grant.grantNumber,
          grantName: grant.grantName,
          donorName: grant.donorName,
          donorReference: grant.donorReference || '',
          currency: grant.currency,
          grantAmount: grant.grantAmount,
          startDate: new Date(grant.startDate).toLocaleDateString(),
          endDate: new Date(grant.endDate).toLocaleDateString(),
          status: grant.status,
          sector: grant.sector || '',
          responsible: grant.responsible || '',
          reportingFrequency: grant.reportingFrequency,
          coFunding: grant.coFunding ? 'Yes' : 'No',
          coFunderName: grant.coFunderName || '',
          description: grant.description || '',
        });
      });

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `grants_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('Grants exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export grants');
    }
  };

  // Excel Import
  const handleImportExcel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const workbook = new ExcelJS.Workbook();
        const buffer = await file.arrayBuffer();
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.getWorksheet('Grants');
        if (!worksheet) {
          toast.error('Invalid file format. Expected "Grants" worksheet.');
          return;
        }

        const importedGrants: any[] = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header

          const grant = {
            grantNumber: row.getCell(1).value?.toString() || '',
            grantName: row.getCell(2).value?.toString() || '',
            donorName: row.getCell(3).value?.toString() || '',
            donorReference: row.getCell(4).value?.toString() || '',
            currency: row.getCell(5).value?.toString() || 'USD',
            grantAmount: parseFloat(row.getCell(6).value?.toString() || '0'),
            startDate: row.getCell(7).value?.toString() || '',
            endDate: row.getCell(8).value?.toString() || '',
            status: (row.getCell(9).value?.toString() || 'pending') as any,
            sector: row.getCell(10).value?.toString() || '',
            responsible: row.getCell(11).value?.toString() || '',
            reportingFrequency: row.getCell(12).value?.toString() || 'quarterly',
            coFunding: row.getCell(13).value?.toString()?.toLowerCase() === 'yes',
            coFunderName: row.getCell(14).value?.toString() || '',
            description: row.getCell(15).value?.toString() || '',
          };

          if (grant.grantNumber && grant.grantName && grant.donorName) {
            importedGrants.push(grant);
          }
        });

        if (importedGrants.length === 0) {
          toast.error('No valid grants found in the file');
          return;
        }

        // TODO: Implement bulk create mutation
        toast.info(`Found ${importedGrants.length} grants. Bulk import coming soon!`);
        console.log('Imported grants:', importedGrants);
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Failed to import grants');
      }
    };
    input.click();
  };

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
      on_hold: 'bg-gray-100 text-gray-800',
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/organization/donor-crm">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Donor CRM Dashboard
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Active Grants</h1>
            <p className="text-gray-600 mt-1">Manage and track grants effectively</p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleImportExcel}>
              <Upload className="w-4 h-4 mr-2" />
              Import Excel
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Grant
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Grants</p>
                <p className="text-2xl font-bold">{kpis.totalGrants}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Grants</p>
                <p className="text-2xl font-bold">{kpis.activeGrants}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount (USD)</p>
                <p className="text-2xl font-bold">${formatNumber(kpis.totalAmountUSD)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Calendar className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold">{kpis.expiringSoon}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by grant number, name, or donor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={statusFilter === undefined ? 'default' : 'outline'}
              onClick={() => setStatusFilter(undefined)}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('active')}
            >
              Active
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('completed')}
            >
              Completed
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </Button>
          </div>
        </div>
      </Card>

      {/* Grants List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading grants...</p>
        </div>
      ) : grants && grants.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {grants.map((grant) => (
            <Card key={grant.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{grant.grantName}</h3>
                    <Badge className={getStatusBadge(grant.status)}>
                      {grant.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-600">Grant Number</p>
                      <p className="font-semibold">{grant.grantNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Donor</p>
                      <p className="font-semibold">{grant.donorName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Amount</p>
                      <p className="font-semibold">{grant.currency} {formatNumber(grant.grantAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Period</p>
                      <p className="font-semibold">
                        {new Date(grant.startDate).toLocaleDateString()} - {new Date(grant.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {grant.description && (
                    <p className="text-gray-600 mt-3 text-sm">{grant.description}</p>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    title="View Details"
                    onClick={() => {
                      setSelectedGrant(grant);
                      setShowDetailsModal(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    title="Edit Grant"
                    onClick={() => {
                      setSelectedGrant(grant);
                      setShowEditModal(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    title="Delete Grant"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this grant?')) {
                        deleteMutation.mutate({ id: grant.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Grants Found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter
              ? 'No grants match your search criteria. Try adjusting your filters.'
              : 'Get started by adding your first grant.'}
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Grant
          </Button>
        </Card>
      )}

      {/* Grant Form Modal */}
      <GrantFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refetch()}
      />

      <GrantFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedGrant(null);
        }}
        grant={selectedGrant}
        onSuccess={() => refetch()}
      />

      <GrantDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedGrant(null);
        }}
        grant={selectedGrant}
      />

      {/* Toast Notifications */}
      <Toaster position="top-right" />
    </div>
  );
}
