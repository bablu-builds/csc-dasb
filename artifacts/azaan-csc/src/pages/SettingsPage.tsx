import { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Trash2, ShieldAlert } from 'lucide-react';
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
          <TabsTrigger value="staff">Staff</TabsTrigger>
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

        <TabsContent value="staff" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Staff Management</CardTitle>
              <CardDescription>Manage access to this portal.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-md flex gap-4 text-amber-800">
                <ShieldAlert className="h-6 w-6 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Firebase Authentication</h4>
                  <p className="text-sm mb-4">
                    Firebase does not allow client-side listing of all user accounts for security reasons. 
                    You can create new staff accounts from the Register page (after logging out), but to view or delete existing accounts, you must use the Firebase Console.
                  </p>
                  <Button variant="outline" className="bg-white" onClick={() => window.open('https://console.firebase.google.com/', '_blank')}>
                    Open Firebase Console
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
