import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ShopSettings, getShopSettings, initCategoriesIfEmpty, getCategories, Category, subscribeToCategories, updateShopSettings, addCategory, deleteCategory } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SettingsContextType {
  shopSettings: ShopSettings;
  categories: Category[];
  loading: boolean;
  saveShopSettings: (settings: ShopSettings) => Promise<void>;
  createCategory: (name: string) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
}

const defaultSettings = { shopName: "AZAAN COMMUNICATION TOUR AND TRAVEL", address: "", phone: "" };

const SettingsContext = createContext<SettingsContextType>({
  shopSettings: defaultSettings,
  categories: [],
  loading: true,
  saveShopSettings: async () => {},
  createCategory: async () => {},
  removeCategory: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [shopSettings, setShopSettings] = useState<ShopSettings>(defaultSettings);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isConfigured } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isConfigured || !user) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        await initCategoriesIfEmpty();
        const [s, cats] = await Promise.all([getShopSettings(), getCategories()]);
        setShopSettings(s);
        // Seed the state immediately via getDocs so categories show even if
        // the real-time onSnapshot listener fails (e.g. transient network error).
        setCategories(cats);
      } catch (err: any) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    const unsubscribe = subscribeToCategories(setCategories);
    return () => unsubscribe();
  }, [user, isConfigured]);

  const saveShopSettings = async (settings: ShopSettings) => {
    try {
      await updateShopSettings(settings);
      setShopSettings(settings);
      toast({ title: "Settings Saved" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      throw err;
    }
  };

  const createCategory = async (name: string) => {
    try {
      const docRef = await addCategory(name);
      // Optimistically update local state so the UI reflects the new category
      // immediately, even if the real-time listener is slow or has failed.
      setCategories(prev => {
        const updated = [...prev, { id: docRef.id, name }];
        return updated.sort((a, b) => a.name.localeCompare(b.name));
      });
      toast({ title: "Category Added" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      throw err;
    }
  };

  const removeCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      // Optimistically remove from local state immediately.
      setCategories(prev => prev.filter(cat => cat.id !== id));
      toast({ title: "Category Deleted" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      throw err;
    }
  };

  return (
    <SettingsContext.Provider value={{ shopSettings, categories, loading, saveShopSettings, createCategory, removeCategory }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
