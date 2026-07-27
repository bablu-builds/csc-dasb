import { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Trash2, Users, ShieldCheck, UserX, UserPlus, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  UserProfile, subscribeToStaff, createStaffAccount, revokeStaffAccess, updateStaffPermissions,
} from '@/lib/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { format } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function SettingsPage() {
  const { shopSettings, saveShopSettings, categories, createCategory, removeCategory } = useSettings();
  const { role, userProfile } = useAuth();
  const isOwner = role === 'owner';

  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [shopName, setShopName] = useState(shopSettings.shopName);
  const [address, setAddress] = useState(shopSettings.address);
  const [phone, setPhone] = useState(shopSettings.phone);
  const [newCat, setNewCat] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const { toast } = useToast();

  // Staff management state
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<UserProfile | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ email: string; name: string } | null>(null);
  const [resetLoadingUid, setResetLoadingUid] = useState<string | null>(null);
  const [newStaffFinancial, setNewStaffFinancial] = useState(false);
  const [financialToggleUid, setFinancialToggleUid] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwner) { setStaffLoading(false); return; }
    const unsub = subscribeToStaff((list) => {
      setStaffList(list);
      setStaffLoading(false);
    });
    return () => unsub();
  }, [isOwner]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInfo(true);
    try {
      await saveShopSettings({ shopName, address, phone });
      toast({ title: 'Settings saved' });
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    setIsAddingCat(true);
    try {
      await createCategory(newCat.trim());
      setNewCat('');
      toast({ title: 'Category added' });
    } finally {
      setIsAddingCat(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim() || !staffEmail.trim() || !staffPassword.trim()) return;
    setIsCreatingStaff(true);
    try {
      await createStaffAccount(
        staffName.trim(),
        staffEmail.trim(),
        staffPassword,
        userProfile?.email ?? '',
        newStaffFinancial,
      );
      setLastCreated({ email: staffEmail.trim(), name: staffName.trim() });
      setStaffName('');
      setStaffEmail('');
      setStaffPassword('');
      setNewStaffFinancial(false);
      toast({ title: 'Staff account created', description: `${staffName.trim()} can now log in.` });
    } catch (err: any) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'That email already has a Firebase account.'
        : err.message;
      toast({ variant: 'destructive', title: 'Error creating account', description: msg });
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const handleSendPasswordReset = async (staff: UserProfile) => {
    if (!auth) return;
    setResetLoadingUid(staff.uid!);
    try {
      await sendPasswordResetEmail(auth, staff.email);
      toast({ title: 'Password reset email sent', description: `A reset link was sent to ${staff.email}.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error sending reset email', description: err.message });
    } finally {
      setResetLoadingUid(null);
    }
  };

  const handleToggleFinancial = async (staff: UserProfile) => {
    if (!staff.uid) return;
    setFinancialToggleUid(staff.uid);
    const newVal = !staff.canAccessFinancialServices;
    try {
      await updateStaffPermissions(staff.uid, newVal);
      toast({
        title: newVal ? 'Financial access granted' : 'Financial access revoked',
        description: `${staff.displayName || staff.email} ${newVal ? 'can now' : 'can no longer'} access AEPS, Recharge & Money Transfer.`,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error updating permissions', description: err.message });
    } finally {
      setFinancialToggleUid(null);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!revokeTarget?.uid) return;
    setIsRevoking(true);
    try {
      await revokeStaffAccess(revokeTarget.uid);
      toast({ title: 'Access revoked', description: `${revokeTarget.displayName || revokeTarget.email} can no longer log in.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error revoking access', description: err.message });
    } finally {
      setIsRevoking(false);
      setRevokeTarget(null);
    }
  };

  const inp = "h-10 bg-background border-border";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage shop information, categories and staff</p>
      </div>

      <Tabs defaultValue="shop" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
          <TabsTrigger value="shop">Shop Info</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Staff
          </TabsTrigger>
        </TabsList>

        {/* Shop Info */}
        <TabsContent value="shop" className="mt-5">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Shop Information</CardTitle>
              <CardDescription>This name appears on the portal and sidebar.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveInfo} className="space-y-4">
                <div className="space-y-2">
                  <Label>Shop Name</Label>
                  <Input className={inp} value={shopName} onChange={e => setShopName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input className={inp} value={address} onChange={e => setAddress(e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input className={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" />
                </div>
                <Button type="submit" disabled={isSavingInfo} className="mt-2">
                  {isSavingInfo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories" className="mt-5">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Work Categories</CardTitle>
              <CardDescription>Manage the options in the "Work Category" dropdown.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCategory} className="flex gap-2 mb-5">
                <Input className={`${inp} flex-1 max-w-sm`} placeholder="New category name..."
                  value={newCat} onChange={e => setNewCat(e.target.value)} />
                <Button type="submit" disabled={isAddingCat || !newCat.trim()} className="gap-1.5">
                  {isAddingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add
                </Button>
              </form>

              <div className="border rounded-xl divide-y overflow-hidden">
                {categories.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">No categories found</div>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="px-4 py-3 flex justify-between items-center hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="font-medium text-sm">{cat.name}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeCategory(cat.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">{categories.length} categories configured</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff */}
        <TabsContent value="staff" className="mt-5 space-y-4">
          {!isOwner ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                  <p className="text-sm">Staff management is only accessible to the Owner.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Create staff account */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add Staff Member
                  </CardTitle>
                  <CardDescription>
                    Create a new staff account. Share the email and password with them directly.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateStaff} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input className={inp} placeholder="Staff member's name"
                          value={staffName} onChange={e => setStaffName(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input className={inp} type="email" placeholder="staff@example.com"
                          value={staffEmail} onChange={e => setStaffEmail(e.target.value)} required />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input
                          className={`${inp} pr-10`}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a password (min 6 chars)"
                          value={staffPassword}
                          onChange={e => setStaffPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(s => !s)}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">Share this password with the staff member verbally or on paper.</p>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/40">
                      <input
                        type="checkbox"
                        id="newStaffFinancial"
                        checked={newStaffFinancial}
                        onChange={e => setNewStaffFinancial(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-primary"
                      />
                      <div>
                        <label htmlFor="newStaffFinancial" className="text-sm font-medium cursor-pointer">
                          Allow access to AEPS, Recharge &amp; Money Transfer
                        </label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Enables this staff member to see and use the financial service modules.
                        </p>
                      </div>
                    </div>

                    <Button type="submit" disabled={isCreatingStaff || !staffName.trim() || !staffEmail.trim() || !staffPassword.trim()}>
                      {isCreatingStaff
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Account…</>
                        : <><UserPlus className="mr-2 h-4 w-4" />Create Staff Account</>}
                    </Button>
                  </form>

                  {lastCreated && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                      <p className="font-semibold mb-1">✓ Account created for {lastCreated.name}</p>
                      <p>Login email: <span className="font-mono">{lastCreated.email}</span></p>
                      <p className="mt-1 text-green-700">Remember to securely share the password with them.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Staff list */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Staff Members
                    {staffList.length > 0 && (
                      <Badge variant="secondary" className="ml-auto">{staffList.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {staffLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading staff…
                    </div>
                  ) : staffList.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No staff members yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {staffList.map(staff => (
                        <div key={staff.uid} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border bg-muted/20">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{staff.displayName || '(no name)'}</span>
                              {staff.canAccessFinancialServices && (
                                <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700">Financial</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{staff.email}</p>
                            {staff.createdAt && (
                              <p className="text-xs text-muted-foreground">
                                Added {format(staff.createdAt.toDate(), 'dd MMM yyyy')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleToggleFinancial(staff)}
                              disabled={financialToggleUid === staff.uid}
                            >
                              {financialToggleUid === staff.uid
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : staff.canAccessFinancialServices
                                  ? '✓ Financial Access'
                                  : 'Grant Financial Access'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-foreground text-xs"
                              onClick={() => handleSendPasswordReset(staff)}
                              disabled={resetLoadingUid === staff.uid}
                            >
                              {resetLoadingUid === staff.uid
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : 'Reset Password'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setRevokeTarget(staff)}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Revoke
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Revoke access confirmation dialog */}
      <AlertDialog open={!!revokeTarget} onOpenChange={open => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke access for {revokeTarget?.displayName || revokeTarget?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove their staff account from the portal. They will be signed out immediately and won't be able to log in again. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeConfirm}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
