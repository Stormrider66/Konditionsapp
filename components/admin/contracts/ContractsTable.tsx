'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Power,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { EnterpriseContract, EnterpriseContractStatus } from '@/types';
import { ContractForm } from './ContractForm';

const statusColors: Record<EnterpriseContractStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-purple-100 text-purple-700',
};

interface ContractsTableProps {
  onViewContract?: (contract: EnterpriseContract) => void;
}

export function ContractsTable({ onViewContract }: ContractsTableProps) {
  const [contracts, setContracts] = useState<EnterpriseContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<EnterpriseContract | null>(null);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        ...(search && { search }),
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/contracts?${params}`);
      const result = await response.json();

      if (result.success) {
        setContracts(result.data.contracts);
        setTotalPages(result.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleActivate = async (contractId: string) => {
    try {
      const response = await fetch(`/api/admin/contracts/${contractId}/activate`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchContracts();
      }
    } catch (error) {
      console.error('Failed to activate contract:', error);
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    fetchContracts();
  };

  const handleEditSuccess = () => {
    setEditingContract(null);
    fetchContracts();
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Enterprise Contracts
            </CardTitle>
            <CardDescription>
              Manage enterprise contracts with businesses
            </CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Contract
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Enterprise Contract</DialogTitle>
                <DialogDescription>
                  Create a new enterprise contract for a business
                </DialogDescription>
              </DialogHeader>
              <ContractForm onSuccess={handleCreateSuccess} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Search contracts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchContracts()}
            />
            <Button variant="outline" onClick={fetchContracts}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchContracts}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract #</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Monthly Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No contracts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    contracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-mono text-sm">
                          {contract.contractNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{contract.business?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {contract.contractName}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(contract.monthlyFee, contract.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[contract.status]}>
                            {contract.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(contract.startDate), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell>
                          {contract.endDate
                            ? format(new Date(contract.endDate), 'yyyy-MM-dd')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {onViewContract && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onViewContract(contract)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Dialog
                              open={editingContract?.id === contract.id}
                              onOpenChange={(open) => !open && setEditingContract(null)}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingContract(contract)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Edit Contract</DialogTitle>
                                  <DialogDescription>
                                    Update contract details
                                  </DialogDescription>
                                </DialogHeader>
                                {editingContract && (
                                  <ContractForm
                                    contract={editingContract}
                                    onSuccess={handleEditSuccess}
                                  />
                                )}
                              </DialogContent>
                            </Dialog>
                            {['DRAFT', 'PENDING_APPROVAL'].includes(contract.status) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleActivate(contract.id)}
                              >
                                <Power className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
