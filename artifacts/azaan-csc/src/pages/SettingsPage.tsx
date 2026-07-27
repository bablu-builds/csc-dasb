import { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Trash2, ShieldAlert, Store, Tag, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { shopSettings, saveShopSettings, categories, createCategory, removeCategory } = useSettings();
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [shopName, setShopName] = useState(shopSettings.shopName);
  const [address, setAddress] = useState(shopSettings.address);
  const [phone, setPhone] = useState(shopSettings.phone);
  const [newCat, setNewCat] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const { toast } = useToast();

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

  const inp = "h-10 bg-background border-border";

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--app-font-display)' }}>Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage shop information and categories</p>
      </div>

      <Tabs defaultValue="shop">
        <TabsList className="bg-muted p-1 rounded-xl">
          <TabsTrigger value="shop" className="rounded-lg gap-1.5 data-[state=active]:shadow-sm">
            <Store className="h-3.5 w-3.5" /> Shop Info
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-lg gap-1.5 data-[state=active]:shadow-sm">
            <Tag className="h-3.5 w-3.5" /> Categories
          </TabsTrigger>
          <TabsTrigger value="staff" className="rounded-lg gap-1.5 data-[state=active]:shadow-sm">
            <Users className="h-3.5 w-3.5" /> Staff
          </TabsTrigger>
        </TabsList>

        {/* Shop Info */}
        <TabsContent value="shop" className="mt-5">
          <Card className="border shadow-card rounded-xl">
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
          <Card className="border shadow-card rounded-xl">
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
        <TabsContent value="staff" className="mt-5">
          <Card className="border shadow-card rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Staff Management</CardTitle>
              <CardDescription>Manage access to this portal.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-4 text-amber-800">
                <ShieldAlert className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <h4 className="font-semibold text-sm mb-2">Firebase Authentication</h4>
                  <p className="text-sm text-amber-700 mb-4">
                    Firebase doesn't allow client-side listing of all accounts for security reasons.
                    Create new staff accounts from the Register page (after logging out). To view or delete existing accounts, use the Firebase Console.
                  </p>
                  <Button variant="outline" size="sm" className="bg-white border-amber-200 hover:bg-amber-50"
                    onClick={() => window.open('https://console.firebase.google.com/', '_blank')}>
                    Open Firebase Console ↗
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
