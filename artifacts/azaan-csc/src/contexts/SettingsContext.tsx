import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ShopSettings, getShopSettings, initCategoriesIfEmpty, Category, subscribeToCategories, updateShopSettings, addCategory, deleteCategory } from '@/lib/firestore';
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
        const s = await getShopSettings();
        setShopSettings(s);
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
      toast({ title: "सेटिंग्स सहेजी गईं (Settings Saved)" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      throw err;
    }
  };

  const createCategory = async (name: string) => {
    try {
      await addCategory(name);
      toast({ title: "श्रेणी जोड़ी गई (Category Added)" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      throw err;
    }
  };

  const removeCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      toast({ title: "श्रेणी हटाई गई (Category Deleted)" });
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
