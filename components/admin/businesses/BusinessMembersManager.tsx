'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  UserPlus,
  Trash2,
  Crown,
  Shield,
  User,
  Beaker,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';

type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'TESTER';

interface BusinessMember {
  id: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

interface BusinessMembersManagerProps {
  businessId: string;
  members: BusinessMember[];
  onUpdate: () => void;
}

const roleIcons: Record<MemberRole, React.ReactNode> = {
  OWNER: <Crown className="h-4 w-4 text-amber-500" />,
  ADMIN: <Shield className="h-4 w-4 text-blue-500" />,
  MEMBER: <User className="h-4 w-4 text-gray-500" />,
  TESTER: <Beaker className="h-4 w-4 text-purple-500" />,
};

const roleColors: Record<MemberRole, string> = {
  OWNER: 'bg-amber-100 text-amber-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MEMBER: 'bg-gray-100 text-gray-700',
  TESTER: 'bg-purple-100 text-purple-700',
};

export function BusinessMembersManager({
  businessId,
  members,
  onUpdate,
}: BusinessMembersManagerProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newMember, setNewMember] = useState({
    userEmail: '',
    role: 'MEMBER' as MemberRole,
  });
  const [editingMember, setEditingMember] = useState<BusinessMember | null>(null);
  const [editRole, setEditRole] = useState<MemberRole>('MEMBER');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAddMember = async () => {
    if (!newMember.userEmail) return;

    setAddLoading(true);
    setAddError(null);

    try {
      const response = await fetch(`/api/admin/businesses/${businessId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add member');
      }

      setIsAddOpen(false);
      setNewMember({ userEmail: '', role: 'MEMBER' });
      onUpdate();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdateRole = async (memberId: string) => {
    setActionLoading(memberId);
    try {
      const response = await fetch(
        `/api/admin/businesses/${businessId}/members/${memberId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: editRole }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update member');
      }

      setEditingMember(null);
      onUpdate();
    } catch (err) {
      console.error('Failed to update member:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setActionLoading(memberId);
    try {
      const response = await fetch(
        `/api/admin/businesses/${businessId}/members/${memberId}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove member');
      }

      onUpdate();
    } catch (err) {
      console.error('Failed to remove member:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const ownerCount = members.filter((m) => m.role === 'OWNER').length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Members</CardTitle>
            <CardDescription>Manage business team members</CardDescription>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Member</DialogTitle>
                <DialogDescription>
                  Add an existing user to this business
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {addError && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {addError}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="userEmail">User Email</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={newMember.userEmail}
                    onChange={(e) =>
                      setNewMember((prev) => ({ ...prev, userEmail: e.target.value }))
                    }
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newMember.role}
                    onValueChange={(value) =>
                      setNewMember((prev) => ({ ...prev, role: value as MemberRole }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNER">Owner</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="TESTER">Tester</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMember} disabled={addLoading || !newMember.userEmail}>
                  {addLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Add Member
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No members in this business
          </p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const isOnlyOwner = member.role === 'OWNER' && ownerCount <= 1;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                      {roleIcons[member.role as MemberRole]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {member.user.name || member.user.email}
                      </p>
                      {member.user.name && (
                        <p className="text-xs text-muted-foreground">{member.user.email}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Joined {format(new Date(member.createdAt), 'yyyy-MM-dd')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Role Editor */}
                    <Dialog
                      open={editingMember?.id === member.id}
                      onOpenChange={(open) => {
                        if (!open) setEditingMember(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto py-1 px-2"
                          onClick={() => {
                            setEditingMember(member);
                            setEditRole(member.role as MemberRole);
                          }}
                        >
                          <Badge className={roleColors[member.role as MemberRole]}>
                            {member.role}
                          </Badge>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Change Role</DialogTitle>
                          <DialogDescription>
                            Update the role for {member.user.name || member.user.email}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Label htmlFor="editRole">Role</Label>
                          <Select
                            value={editRole}
                            onValueChange={(value) => setEditRole(value as MemberRole)}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OWNER">Owner</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="MEMBER">Member</SelectItem>
                              <SelectItem value="TESTER">Tester</SelectItem>
                            </SelectContent>
                          </Select>
                          {isOnlyOwner && editRole !== 'OWNER' && (
                            <p className="text-xs text-amber-600 mt-2">
                              Cannot remove the last owner from a business
                            </p>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditingMember(null)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={() => handleUpdateRole(member.id)}
                            disabled={
                              actionLoading === member.id ||
                              (isOnlyOwner && editRole !== 'OWNER')
                            }
                          >
                            {actionLoading === member.id && (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Update Role
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* Remove Button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-600"
                          disabled={isOnlyOwner}
                          title={isOnlyOwner ? 'Cannot remove the last owner' : 'Remove member'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Member</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove{' '}
                            <strong>{member.user.name || member.user.email}</strong> from this
                            business? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveMember(member.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {actionLoading === member.id && (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
