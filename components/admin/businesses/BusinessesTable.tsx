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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Search,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Building2,
  Users,
  MapPin,
  Eye,
  Edit,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { Business } from '@/types';
import { BusinessForm } from './BusinessForm';
import { BusinessDetailPanel } from './BusinessDetailPanel';

interface BusinessWithDetails extends Omit<Business, 'enterpriseContract' | '_count'> {
  createdAt: string;
  enterpriseContract?: {
    id: string;
    contractNumber: string;
    status: string;
  } | null;
  _count?: {
    members: number;
    locations: number;
    athleteSubscriptions?: number;
  };
}

export function BusinessesTable() {
  const [businesses, setBusinesses] = useState<BusinessWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<BusinessWithDetails | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithDetails | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        ...(search && { search }),
      });

      const response = await fetch(`/api/admin/businesses?${params}`);
      const result = await response.json();

      if (result.success) {
        setBusinesses(result.data.businesses);
        setTotalPages(result.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    fetchBusinesses();
  };

  const handleEditSuccess = () => {
    setEditingBusiness(null);
    fetchBusinesses();
  };

  const handleViewBusiness = (business: BusinessWithDetails) => {
    setSelectedBusiness(business);
    setDetailOpen(true);
  };

  const getContractStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700';
      case 'DRAFT': return 'bg-gray-100 text-gray-700';
      case 'PENDING_APPROVAL': return 'bg-yellow-100 text-yellow-700';
      case 'SUSPENDED': return 'bg-orange-100 text-orange-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Organizations
              </CardTitle>
              <CardDescription>
                Manage businesses, their members, and locations
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Business
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Business</DialogTitle>
                  <DialogDescription>
                    Create a new business organization
                  </DialogDescription>
                </DialogHeader>
                <BusinessForm onSuccess={handleCreateSuccess} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search businesses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchBusinesses()}
              />
              <Button variant="outline" onClick={fetchBusinesses}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="icon" onClick={fetchBusinesses}>
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
                      <TableHead>Business</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Locations</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businesses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No businesses found
                        </TableCell>
                      </TableRow>
                    ) : (
                      businesses.map((business) => (
                        <TableRow key={business.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{business.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {business.slug}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {business.email && (
                                <p className="truncate max-w-[180px]">{business.email}</p>
                              )}
                              {business.phone && (
                                <p className="text-muted-foreground">{business.phone}</p>
                              )}
                              {!business.email && !business.phone && (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{business._count?.members || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{business._count?.locations || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {business.enterpriseContract ? (
                              <div className="flex items-center gap-1">
                                <Badge className={getContractStatusColor(business.enterpriseContract.status)}>
                                  {business.enterpriseContract.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {business.enterpriseContract.contractNumber}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No contract</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(business.createdAt), 'yyyy-MM-dd')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewBusiness(business)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Dialog
                                open={editingBusiness?.id === business.id}
                                onOpenChange={(open) => !open && setEditingBusiness(null)}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingBusiness(business)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Edit Business</DialogTitle>
                                    <DialogDescription>
                                      Update business details
                                    </DialogDescription>
                                  </DialogHeader>
                                  {editingBusiness && (
                                    <BusinessForm
                                      business={editingBusiness as Business}
                                      onSuccess={handleEditSuccess}
                                    />
                                  )}
                                </DialogContent>
                              </Dialog>
                              {business.enterpriseContract && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Navigate to contracts tab with this contract selected
                                    // For now, just show a tooltip or link
                                  }}
                                  title="View Contract"
                                >
                                  <FileText className="h-4 w-4 text-blue-600" />
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

      {/* Detail Panel */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedBusiness?.name}</SheetTitle>
            <SheetDescription>
              Business details and management
            </SheetDescription>
          </SheetHeader>
          {selectedBusiness && (
            <BusinessDetailPanel
              businessId={selectedBusiness.id}
              onUpdate={fetchBusinesses}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
