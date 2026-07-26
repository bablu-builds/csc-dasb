import { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Trash2, Users, ShieldCheck, UserX, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserProfile, subscribeToStaff, createStaffAccount, revokeStaffAccess } from '@/lib/firestore';
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
  
  const { toast } = useToast();

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
    } finally {
      setIsAddingCat(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim() || !staffEmail.trim() || !staffPassword.trim()) return;
    if (staffPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Password too short', description: 'Password must be at least 6 characters.' });
      return;
    }
    setIsCreatingStaff(true);
    try {
      await createStaffAccount(staffName.trim(), staffEmail.trim(), staffPassword, userProfile?.email ?? '');
      setLastCreated({ email: staffEmail.trim(), name: staffName.trim() });
      setStaffName('');
      setStaffEmail('');
      setStaffPassword('');
      toast({ title: 'Staff account created', description: `${staffName.trim()} can now log in with the email and password you set.` });
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

  const handleRevokeConfirm = async () => {
    if (!revokeTarget?.uid) return;
    setIsRevoking(true);
    try {
      await revokeStaffAccess(revokeTarget.uid);
      toast({ title: 'Access revoked', description: `${revokeTarget.displayName} can no longer log in.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error revoking access', description: err.message });
    } finally {
      setIsRevoking(false);
      setRevokeTarget(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage shop information and categories</p>
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
        
        <TabsContent value="shop" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Shop Information</CardTitle>
              <CardDescription>This information is displayed on the portal and receipts.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveInfo} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shopName">Shop Name</Label>
                  <Input 
                    id="shopName" 
                    value={shopName} 
                    onChange={(e) => setShopName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input 
                    id="address" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Contact Phone</Label>
                  <Input 
                    id="phone" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isSavingInfo}>
                  {isSavingInfo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Work Categories</CardTitle>
              <CardDescription>Manage the options available in the "Work Category" dropdown.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
                <Input 
                  placeholder="New category name..." 
                  value={newCat} 
                  onChange={(e) => setNewCat(e.target.value)}
                  className="max-w-[300px]"
                />
                <Button type="submit" disabled={isAddingCat || !newCat.trim()}>
                  {isAddingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Category
                </Button>
              </form>

              <div className="border rounded-md divide-y">
                {categories.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">No categories found</div>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="p-3 flex justify-between items-center bg-card hover:bg-muted/50">
                      <span className="font-medium">{cat.name}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeCategory(cat.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="mt-6 space-y-6">
          {/* Non-owners see a "no access" message */}
          {!isOwner ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-3">
                  <ShieldCheck className="h-10 w-10 opacity-30" />
                  <p className="font-medium">Staff Management is only available to the Owner.</p>
                  <p className="text-sm">Contact your owner to add or change staff accounts.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Add Staff form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Add New Staff Member
                  </CardTitle>
                  <CardDescription>
                    You set the email and password directly. Share the credentials with the staff member however you prefer.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateStaff} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="staffName">Full Name *</Label>
                        <Input
                          id="staffName"
                          placeholder="e.g. Rahul Kumar"
                          value={staffName}
                          onChange={e => setStaffName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="staffEmail">Email Address *</Label>
                        <Input
                          id="staffEmail"
                          type="email"
                          placeholder="staff@example.com"
                          value={staffEmail}
                          onChange={e => setStaffEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="staffPassword">Password *</Label>
                      <div className="relative max-w-sm">
                        <Input
                          id="staffPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Minimum 6 characters"
                          value={staffPassword}
                          onChange={e => setStaffPassword(e.target.value)}
                          required
                          minLength={6}
                          className="pr-10"
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
                    <Button type="submit" disabled={isCreatingStaff || !staffName.trim() || !staffEmail.trim() || !staffPassword.trim()}>
                      {isCreatingStaff
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Account…</>
                        : <><UserPlus className="mr-2 h-4 w-4" />Create Staff Account</>}
                    </Button>
                  </form>

                  {/* Success confirmation */}
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
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Current Staff Members
                  </CardTitle>
                  <CardDescription>
                    Staff members can manage work entries but cannot see income reports.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {staffLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : staffList.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No staff members added yet.</p>
                      <p className="text-xs mt-1">Use the form above to create your first staff account.</p>
                    </div>
                  ) : (
                    <div className="border rounded-md divide-y">
                      {staffList.map(staff => (
                        <div key={staff.uid} className="p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{staff.displayName}</p>
                            <p className="text-xs text-muted-foreground truncate">{staff.email}</p>
                            {staff.createdAt && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Added {format(staff.createdAt.toDate(), 'dd MMM yyyy')}
                                {staff.invitedBy ? ` by ${staff.invitedBy}` : ''}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => handleSendPasswordReset(staff)}
                              disabled={resetLoadingUid === staff.uid}
                              title="Send password reset email to this staff member"
                            >
                              {resetLoadingUid === staff.uid
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <span className="text-xs">Reset Password</span>}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setRevokeTarget(staff)}
                            >
                              <UserX className="h-4 w-4 mr-1.5" />
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
            <AlertDialogTitle>Revoke access for {revokeTarget?.displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove their staff account from the portal. They will be signed out immediately and won't be able to log in again. This cannot be undone — you would need to create a new account for them.
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
