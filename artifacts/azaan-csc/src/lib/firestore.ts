import { collection, doc, getDoc, getDocs, setDoc, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, writeBatch, Timestamp } from 'firebase/firestore';
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
  status: 'Pending' | 'Completed' | 'Rejected';
  address: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;   // set automatically when status → Completed
  rejectedAt?: Timestamp;    // set automatically when status → Rejected
  rejectionReason?: string;  // optional text reason for rejection
  refundAmount?: number;     // amount refunded to customer on rejection
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
export const createWorkEntry = async (
  data: Omit<WorkEntry, 'id' | 'dueAmount' | 'createdAt' | 'completedAt' | 'rejectedAt'>
) => {
  if (!db) throw new Error("Firebase not configured");
  const dueAmount = data.status === 'Rejected' ? 0 : data.totalAmount - data.paidAmount;
  const timestamps: Partial<WorkEntry> = { createdAt: Timestamp.now() };
  if (data.status === 'Completed') timestamps.completedAt = Timestamp.now();
  if (data.status === 'Rejected') timestamps.rejectedAt = Timestamp.now();
  return addDoc(collection(db, 'workEntries'), { ...data, ...timestamps, dueAmount });
};

export const updateWorkEntry = async (
  id: string,
  data: Partial<Omit<WorkEntry, 'id' | 'dueAmount' | 'createdAt' | 'completedAt' | 'rejectedAt'>>
) => {
  if (!db) throw new Error("Firebase not configured");

  const updates: any = { ...data };

  if (data.status === 'Rejected') {
    // Rejected: work cancelled — nothing owed; track the refund separately
    updates.rejectedAt = Timestamp.now();
    updates.dueAmount = 0;
  } else if (data.status === 'Completed') {
    updates.completedAt = Timestamp.now();
    if (data.totalAmount !== undefined && data.paidAmount !== undefined) {
      updates.dueAmount = data.totalAmount - data.paidAmount;
    }
  } else {
    // Pending (or no status change)
    if (data.totalAmount !== undefined && data.paidAmount !== undefined) {
      updates.dueAmount = data.totalAmount - data.paidAmount;
    }
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

  // Use a sentinel document so concurrent calls (race condition on auth state)
  // don't each seed 15 categories, producing hundreds of duplicates.
  const sentinelRef = doc(firestoreDb, 'settings', 'categoriesSeeded');
  const sentinel = await getDoc(sentinelRef);
  if (sentinel.exists()) return;

  // Atomic batch: write all default categories + the sentinel in one commit.
  // If two calls race, the second batch.commit() will still succeed but the
  // sentinel check above will skip re-seeding on the next mount.
  const batch = writeBatch(firestoreDb);
  defaultCategories.forEach(name => {
    const ref = doc(collection(firestoreDb, 'categories'));
    batch.set(ref, { name });
  });
  batch.set(sentinelRef, { seededAt: Timestamp.now() });
  try {
    await batch.commit();
  } catch {
    // A concurrent init already committed — that's fine, categories exist.
  }
};

/** Deduplify by lower-cased name — guards against duplicate Firestore docs. */
function deduplicateCategories(cats: Category[]): Category[] {
  const seen = new Set<string>();
  return cats.filter(cat => {
    const key = cat.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const getCategories = async (): Promise<Category[]> => {
  if (!db) return [];
  const firestoreDb = db; // narrowed to non-null
  const q = query(collection(firestoreDb, 'categories'), orderBy('name', 'asc'));
  const snap = await getDocs(q);
  const categories: Category[] = [];
  snap.forEach(docSnap => {
    categories.push({ id: docSnap.id, ...docSnap.data() } as Category);
  });
  return deduplicateCategories(categories);
};

export const subscribeToCategories = (callback: (categories: Category[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const categories: Category[] = [];
      snapshot.forEach(docSnap => {
        categories.push({ id: docSnap.id, ...docSnap.data() } as Category);
      });
      callback(deduplicateCategories(categories));
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
