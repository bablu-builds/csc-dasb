import { collection, doc, getDoc, getDocs, setDoc, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface WorkEntry {
  id?: string;
  customerName: string;
  mobile: string;
  category: string;
  workDetail: string;
  date: Timestamp;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: 'Pending' | 'Completed';
  address: string;
  createdAt: Timestamp;
}

export interface Category {
  id: string;
  name: string;
}

export interface ShopSettings {
  shopName: string;
  address: string;
  phone: string;
}

export const defaultCategories = [
  "PAN Card", "Aadhar Card", "Voter ID Card", "Driving Licence (DL)", "Ration Card",
  "Jati Praman Patra", "Aay Praman Patra", "Niwas Praman Patra",
  "Bijli Bill Payment", "Pani Bill Payment", "Bank Related Work", "Insurance",
  "Railway/Bus Ticket Booking", "Photocopy / Print / Photo", "Other"
];

// WORK ENTRIES
export const createWorkEntry = async (data: Omit<WorkEntry, 'id' | 'dueAmount' | 'createdAt'>) => {
  if (!db) throw new Error("Firebase not configured");
  const dueAmount = data.totalAmount - data.paidAmount;
  return addDoc(collection(db, 'workEntries'), {
    ...data,
    dueAmount,
    createdAt: Timestamp.now()
  });
};

export const updateWorkEntry = async (id: string, data: Partial<Omit<WorkEntry, 'id' | 'dueAmount' | 'createdAt'>>) => {
  if (!db) throw new Error("Firebase not configured");
  
  let updates: any = { ...data };
  
  // If either totalAmount or paidAmount is provided, we should probably recalculate dueAmount
  // To keep it simple, if both are in data, update it.
  if (data.totalAmount !== undefined && data.paidAmount !== undefined) {
    updates.dueAmount = data.totalAmount - data.paidAmount;
  }
  
  return updateDoc(doc(db, 'workEntries', id), updates);
};

export const deleteWorkEntry = async (id: string) => {
  if (!db) throw new Error("Firebase not configured");
  return deleteDoc(doc(db, 'workEntries', id));
};

export const subscribeToWorkEntries = (callback: (entries: WorkEntry[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'workEntries'), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const entries: WorkEntry[] = [];
    snapshot.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() } as WorkEntry);
    });
    callback(entries);
  });
};

// CATEGORIES
export const initCategoriesIfEmpty = async () => {
  if (!db) return;
  const firestoreDb = db; // narrowed to non-null for use inside callbacks
  const snap = await getDocs(collection(firestoreDb, 'categories'));
  if (snap.empty) {
    const promises = defaultCategories.map(name =>
      addDoc(collection(firestoreDb, 'categories'), { name })
    );
    await Promise.all(promises);
  }
};

export const getCategories = async (): Promise<Category[]> => {
  if (!db) return [];
  const firestoreDb = db; // narrowed to non-null
  const q = query(collection(firestoreDb, 'categories'), orderBy('name', 'asc'));
  const snap = await getDocs(q);
  const categories: Category[] = [];
  snap.forEach(doc => {
    categories.push({ id: doc.id, ...doc.data() } as Category);
  });
  return categories;
};

export const subscribeToCategories = (callback: (categories: Category[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const categories: Category[] = [];
      snapshot.forEach(doc => {
        categories.push({ id: doc.id, ...doc.data() } as Category);
      });
      callback(categories);
    },
    (error) => {
      console.error('[Firestore] Categories listener error:', error.code, error.message);
    }
  );
};

export const addCategory = async (name: string) => {
  if (!db) throw new Error("Firebase not configured");
  return addDoc(collection(db, 'categories'), { name });
};

export const deleteCategory = async (id: string) => {
  if (!db) throw new Error("Firebase not configured");
  return deleteDoc(doc(db, 'categories', id));
};

// SETTINGS
export const getShopSettings = async (): Promise<ShopSettings> => {
  if (!db) return { shopName: "AZAAN COMMUNICATION TOUR AND TRAVEL", address: "", phone: "" };
  const d = await getDoc(doc(db, 'settings', 'shopSettings'));
  if (d.exists()) {
    return d.data() as ShopSettings;
  }
  // Default if not exists
  const defaultSettings = { shopName: "AZAAN COMMUNICATION TOUR AND TRAVEL", address: "", phone: "" };
  await setDoc(doc(db, 'settings', 'shopSettings'), defaultSettings);
  return defaultSettings;
};

export const updateShopSettings = async (data: ShopSettings) => {
  if (!db) throw new Error("Firebase not configured");
  return setDoc(doc(db, 'settings', 'shopSettings'), data);
};
