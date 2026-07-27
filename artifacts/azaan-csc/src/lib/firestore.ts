import {
<<<<<<< HEAD
  collection, doc, getDoc, getDocs, setDoc, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, writeBatch, Timestamp, where, arrayUnion,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
=======
  collection, doc, getDoc, getDocs, setDoc, query, orderBy, where, limit,
  onSnapshot, addDoc, updateDoc, deleteDoc, writeBatch, Timestamp,
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { db, firebaseConfig } from '@/lib/firebase';

// ─── USER PROFILES ──────────────────────────────────────────────────────────

export interface UserProfile {
  uid?: string;
  email: string;
  displayName: string;
  role: 'owner' | 'staff';
  createdAt: Timestamp;
  invitedBy?: string; // owner email, only for staff
  canAccessFinancialServices?: boolean; // staff-only permission for AEPS, Money Transfer, Recharge
}

/** Fetch a user's profile document. Returns null if not found. */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as UserProfile;
};

/**
 * Called when a logged-in user has no `users/{uid}` document yet.
 * If no user docs exist at all → create this user as owner (first-time setup).
 * If user docs exist but this user isn't one of them → unauthorised (caller should sign out).
 * Returns the created profile or null if the user should be signed out.
 */
export const bootstrapUserProfile = async (
  uid: string,
  email: string,
  displayName: string,
): Promise<UserProfile | null> => {
  if (!db) return null;
  // Check if any user profiles exist
  const usersSnap = await getDocs(query(collection(db, 'users'), limit(1)));
  if (!usersSnap.empty) {
    // Users already exist — this account has no profile; shouldn't be here
    return null;
  }
  // First-ever user → owner
  const profile: UserProfile = {
    email,
    displayName,
    role: 'owner',
    createdAt: Timestamp.now(),
  };
  await setDoc(doc(db, 'users', uid), profile);
  return { uid, ...profile };
};

/** Subscribe to all staff members (role = 'staff'). */
export const subscribeToStaff = (callback: (staff: UserProfile[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'users'), where('role', '==', 'staff'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const staff: UserProfile[] = [];
    snap.forEach(d => staff.push({ uid: d.id, ...d.data() } as UserProfile));
    callback(staff);
  }, (err) => {
    console.error('[Firestore] Staff listener error:', err.code, err.message);
  });
};

/**
 * Create a staff Firebase Auth account + Firestore profile without interrupting the owner's session.
 * Uses a secondary (temporary) Firebase app instance so the owner stays signed in.
 */
export const createStaffAccount = async (
  name: string,
  email: string,
  password: string,
  ownerEmail: string,
  canAccessFinancialServices = false,
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');

  // Spin up a temporary second Firebase app
  const tempAppName = `staff-creation-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, tempAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = cred.user.uid;

    // Write Firestore profile as owner's client (owner is still logged in on primary app)
    await setDoc(doc(db, 'users', uid), {
      email,
      displayName: name,
      role: 'staff',
      createdAt: Timestamp.now(),
      invitedBy: ownerEmail,
      canAccessFinancialServices,
    });
  } finally {
    // Always clean up — sign out from secondary app and destroy it
    await firebaseSignOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }
};

/** Toggle whether a staff member can access financial service modules. */
export const updateStaffPermissions = async (uid: string, canAccessFinancialServices: boolean): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  await updateDoc(doc(db, 'users', uid), { canAccessFinancialServices });
};

/**
 * Revoke a staff member's access by removing their Firestore profile.
 * They can still authenticate with Firebase Auth, but the app will log them out
 * because their profile no longer exists.
 */
export const revokeStaffAccess = async (uid: string): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  await deleteDoc(doc(db, 'users', uid));
};

// ─── WORK ENTRIES ────────────────────────────────────────────────────────────
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466

// ══════════════════════════════════════════════════════════════════
// WORK ENTRIES
// ══════════════════════════════════════════════════════════════════

export interface PaymentRecord {
  amount: number;
  paidAt: Timestamp;
  addedBy: string;
}

export interface WorkEntry {
  id?: string;
  customerName: string;
  mobile: string;
  category: string;
  workDetail?: string;
  date: Timestamp;
  totalAmount: number;
  paidAmount: number;     // sum of all payments (kept in sync)
  dueAmount: number;      // totalAmount - paidAmount
  challanAmount?: number; // government fee/challan paid by shop
  payments?: PaymentRecord[];
  status: 'Pending' | 'Completed' | 'Rejected';
  address?: string;
  createdAt: Timestamp;
<<<<<<< HEAD
  completedAt?: Timestamp;
  rejectedAt?: Timestamp;
  rejectionReason?: string;
  refundAmount?: number;
  addedBy?: string;
  isDeleted?: boolean;
  deletedAt?: Timestamp;
=======
  completedAt?: Timestamp;   // set automatically when status → Completed
  rejectedAt?: Timestamp;    // set automatically when status → Rejected
  rejectionReason?: string;  // optional text reason for rejection
  refundAmount?: number;     // amount refunded to customer on rejection
  isDeleted?: boolean;       // soft-delete flag
  deletedAt?: Timestamp;     // when it was soft-deleted
  addedBy?: string;          // display name / email of who created it (immutable after creation)
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
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

/** Remove keys whose value is undefined — Firestore rejects undefined values. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

export const createWorkEntry = async (
  data: Omit<WorkEntry, 'id' | 'dueAmount' | 'createdAt' | 'completedAt' | 'rejectedAt'>,
  addedByName?: string
) => {
  if (!db) throw new Error("Firebase not configured");
  const now = Timestamp.now();
  const dueAmount = data.status === 'Rejected' ? 0 : data.totalAmount - data.paidAmount;
  const timestamps: Partial<WorkEntry> = { createdAt: now };
  if (data.status === 'Completed') timestamps.completedAt = now;
  if (data.status === 'Rejected') timestamps.rejectedAt = now;

  // Initial payment record
  const payments: PaymentRecord[] = data.paidAmount > 0 ? [{
    amount: data.paidAmount,
    paidAt: now,
    addedBy: addedByName || 'Staff',
  }] : [];

  const { rejectionReason, refundAmount, challanAmount, ...rest } = data;
  const rejectionFields = data.status === 'Rejected'
    ? stripUndefined({ rejectionReason, refundAmount })
    : {};
  const challanFields = challanAmount !== undefined && challanAmount > 0
    ? { challanAmount }
    : {};

  return addDoc(collection(db, 'workEntries'), {
<<<<<<< HEAD
    ...rest, ...timestamps, dueAmount, payments, ...rejectionFields, ...challanFields,
=======
    ...stripUndefined(rest as Record<string, unknown>),
    ...timestamps,
    dueAmount,
    ...rejectionFields,
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
  });
};

export const updateWorkEntry = async (
  id: string,
  data: Partial<Omit<WorkEntry, 'id' | 'dueAmount' | 'createdAt' | 'completedAt' | 'rejectedAt' | 'addedBy'>>
) => {
  if (!db) throw new Error("Firebase not configured");

  const { rejectionReason, refundAmount, challanAmount, ...rest } = data;
  const rejectionFields = data.status === 'Rejected'
    ? stripUndefined({ rejectionReason, refundAmount } as Record<string, unknown>)
    : {};
  const challanFields = challanAmount !== undefined ? { challanAmount } : {};

  const updates: Record<string, unknown> = {
    ...stripUndefined(rest as Record<string, unknown>),
    ...rejectionFields,
    ...challanFields,
  };

  if (data.status === 'Rejected') {
    updates.rejectedAt = Timestamp.now();
    updates.dueAmount = 0;
  } else if (data.status === 'Completed') {
    updates.completedAt = Timestamp.now();
    if (data.totalAmount !== undefined && data.paidAmount !== undefined) {
      updates.dueAmount = data.totalAmount - data.paidAmount;
    }
  } else {
    if (data.totalAmount !== undefined && data.paidAmount !== undefined) {
      updates.dueAmount = data.totalAmount - data.paidAmount;
    }
  }

  return updateDoc(doc(db, 'workEntries', id), updates);
};

/** Add a new partial payment to an existing work entry. */
export const addPaymentToEntry = async (
  entryId: string,
  payment: { amount: number; addedBy: string },
  currentTotal: number,
  currentPaid: number
) => {
  if (!db) throw new Error("Firebase not configured");
  const paymentRecord: PaymentRecord = {
    amount: payment.amount,
    paidAt: Timestamp.now(),
    addedBy: payment.addedBy,
  };
  const newPaid = currentPaid + payment.amount;
  const newDue = Math.max(0, currentTotal - newPaid);
  return updateDoc(doc(db, 'workEntries', entryId), {
    payments: arrayUnion(paymentRecord),
    paidAmount: newPaid,
    dueAmount: newDue,
  });
};

export const deleteWorkEntry = async (id: string) => {
  if (!db) throw new Error("Firebase not configured");
  return updateDoc(doc(db, 'workEntries', id), {
    isDeleted: true,
    deletedAt: Timestamp.now(),
  });
};

export const restoreWorkEntry = async (id: string) => {
  if (!db) throw new Error("Firebase not configured");
  return updateDoc(doc(db, 'workEntries', id), {
    isDeleted: false,
    deletedAt: null,
  });
};

export const subscribeToWorkEntries = (callback: (entries: WorkEntry[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'workEntries'), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const entries: WorkEntry[] = [];
    snapshot.forEach(d => {
      const data = { id: d.id, ...d.data() } as WorkEntry;
      if (!data.isDeleted) entries.push(data);
    });
    callback(entries);
  });
};

export const subscribeToDeletedEntries = (callback: (entries: WorkEntry[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'workEntries'), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const entries: WorkEntry[] = [];
    snapshot.forEach(d => {
      const data = { id: d.id, ...d.data() } as WorkEntry;
      if (data.isDeleted) entries.push(data);
    });
    entries.sort((a, b) => (b.deletedAt?.toMillis() ?? 0) - (a.deletedAt?.toMillis() ?? 0));
    callback(entries);
  });
};

// ══════════════════════════════════════════════════════════════════
// AEPS WITHDRAWALS
// ══════════════════════════════════════════════════════════════════

export interface AepsWithdrawal {
  id?: string;
  customerName: string;
  bankName: string;
  mobile?: string;
  amount: number;
  profitMargin: number;
  createdAt: Timestamp;
  addedBy?: string;
}

export const createAepsWithdrawal = async (data: Omit<AepsWithdrawal, 'id' | 'createdAt'>) => {
  if (!db) throw new Error("Firebase not configured");
  return addDoc(collection(db, 'aepsWithdrawals'), {
    ...stripUndefined(data as Record<string, unknown>),
    createdAt: Timestamp.now(),
  });
};

export const subscribeToAepsWithdrawals = (callback: (entries: AepsWithdrawal[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'aepsWithdrawals'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const entries: AepsWithdrawal[] = [];
    snapshot.forEach(d => entries.push({ id: d.id, ...d.data() } as AepsWithdrawal));
    callback(entries);
  });
};

// ══════════════════════════════════════════════════════════════════
// ELECTRIC RECHARGES
// ══════════════════════════════════════════════════════════════════

export interface ElectricRecharge {
  id?: string;
  customerName: string;
  consumerNumber: string;
  mobile?: string;
  rechargeAmount: number;
  profitMargin: number;
  createdAt: Timestamp;
  addedBy?: string;
}

export const createElectricRecharge = async (data: Omit<ElectricRecharge, 'id' | 'createdAt'>) => {
  if (!db) throw new Error("Firebase not configured");
  return addDoc(collection(db, 'electricRecharges'), {
    ...stripUndefined(data as Record<string, unknown>),
    createdAt: Timestamp.now(),
  });
};

export const subscribeToElectricRecharges = (callback: (entries: ElectricRecharge[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'electricRecharges'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const entries: ElectricRecharge[] = [];
    snapshot.forEach(d => entries.push({ id: d.id, ...d.data() } as ElectricRecharge));
    callback(entries);
  });
};

// ══════════════════════════════════════════════════════════════════
// MONEY TRANSFERS
// ══════════════════════════════════════════════════════════════════

export interface MoneyTransfer {
  id?: string;
  name: string;
  mobileOrAccount: string;
  amount: number;
  profitMargin: number;
  createdAt: Timestamp;
  addedBy?: string;
}

export const createMoneyTransfer = async (data: Omit<MoneyTransfer, 'id' | 'createdAt'>) => {
  if (!db) throw new Error("Firebase not configured");
  return addDoc(collection(db, 'moneyTransfers'), {
    ...stripUndefined(data as Record<string, unknown>),
    createdAt: Timestamp.now(),
  });
};

export const subscribeToMoneyTransfers = (callback: (entries: MoneyTransfer[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'moneyTransfers'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const entries: MoneyTransfer[] = [];
    snapshot.forEach(d => entries.push({ id: d.id, ...d.data() } as MoneyTransfer));
    callback(entries);
  });
};

// ══════════════════════════════════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════════════════════════════════

export const initCategoriesIfEmpty = async () => {
  if (!db) return;
  const firestoreDb = db;
  const sentinelRef = doc(firestoreDb, 'settings', 'categoriesSeeded');
  const sentinel = await getDoc(sentinelRef);
  if (sentinel.exists()) return;

  const batch = writeBatch(firestoreDb);
  defaultCategories.forEach(name => {
    const ref = doc(collection(firestoreDb, 'categories'));
    batch.set(ref, { name });
  });
  batch.set(sentinelRef, { seededAt: Timestamp.now() });
  try {
    await batch.commit();
  } catch {
    // concurrent init already ran
  }
};

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
  const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
  const snap = await getDocs(q);
  const cats: Category[] = [];
  snap.forEach(d => cats.push({ id: d.id, ...d.data() } as Category));
  return deduplicateCategories(cats);
};

export const subscribeToCategories = (callback: (categories: Category[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
  return onSnapshot(q, (snap) => {
    const cats: Category[] = [];
    snap.forEach(d => cats.push({ id: d.id, ...d.data() } as Category));
    callback(deduplicateCategories(cats));
  }, (err) => {
    console.error('[Firestore] Categories listener error:', err.code, err.message);
  });
};

export const addCategory = async (name: string) => {
  if (!db) throw new Error("Firebase not configured");
  return addDoc(collection(db, 'categories'), { name });
};

export const deleteCategory = async (id: string) => {
  if (!db) throw new Error("Firebase not configured");
  return deleteDoc(doc(db, 'categories', id));
};

<<<<<<< HEAD
// ══════════════════════════════════════════════════════════════════
// SHOP SETTINGS
// ══════════════════════════════════════════════════════════════════

=======
// ─── AEPS WITHDRAWALS ────────────────────────────────────────────────────────

export interface AepsWithdrawal {
  id?: string;
  customerName: string;
  bankName: string;
  mobile?: string;       // optional
  amount: number;
  createdAt: Timestamp;
  addedBy: string;
}

export const createAepsWithdrawal = async (
  data: Omit<AepsWithdrawal, 'id' | 'createdAt'>,
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  await addDoc(collection(db, 'aepsWithdrawals'), {
    ...stripUndefined(data as Record<string, unknown>),
    createdAt: Timestamp.now(),
  });
};

export const subscribeToAepsWithdrawals = (
  callback: (entries: AepsWithdrawal[]) => void,
) => {
  if (!db) return () => {};
  const q = query(collection(db, 'aepsWithdrawals'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const entries: AepsWithdrawal[] = [];
    snap.forEach(d => entries.push({ id: d.id, ...d.data() } as AepsWithdrawal));
    callback(entries);
  }, (err) => console.error('[Firestore] aepsWithdrawals error:', err.message));
};

// ─── ELECTRIC RECHARGES ───────────────────────────────────────────────────────

export interface ElectricRecharge {
  id?: string;
  customerName: string;
  consumerNumber: string;
  mobile?: string;       // optional
  rechargeAmount: number;
  profitMargin: number;
  createdAt: Timestamp;
  addedBy: string;
}

export const createElectricRecharge = async (
  data: Omit<ElectricRecharge, 'id' | 'createdAt'>,
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  await addDoc(collection(db, 'electricRecharges'), {
    ...stripUndefined(data as Record<string, unknown>),
    createdAt: Timestamp.now(),
  });
};

export const subscribeToElectricRecharges = (
  callback: (entries: ElectricRecharge[]) => void,
) => {
  if (!db) return () => {};
  const q = query(collection(db, 'electricRecharges'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const entries: ElectricRecharge[] = [];
    snap.forEach(d => entries.push({ id: d.id, ...d.data() } as ElectricRecharge));
    callback(entries);
  }, (err) => console.error('[Firestore] electricRecharges error:', err.message));
};

// ─── MONEY TRANSFERS ──────────────────────────────────────────────────────────

export interface MoneyTransfer {
  id?: string;
  name: string;
  mobileOrAccount: string;
  amount: number;
  profitMargin: number;
  createdAt: Timestamp;
  addedBy: string;
}

export const createMoneyTransfer = async (
  data: Omit<MoneyTransfer, 'id' | 'createdAt'>,
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  await addDoc(collection(db, 'moneyTransfers'), {
    ...data,
    createdAt: Timestamp.now(),
  });
};

export const subscribeToMoneyTransfers = (
  callback: (entries: MoneyTransfer[]) => void,
) => {
  if (!db) return () => {};
  const q = query(collection(db, 'moneyTransfers'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const entries: MoneyTransfer[] = [];
    snap.forEach(d => entries.push({ id: d.id, ...d.data() } as MoneyTransfer));
    callback(entries);
  }, (err) => console.error('[Firestore] moneyTransfers error:', err.message));
};

// SETTINGS
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
export const getShopSettings = async (): Promise<ShopSettings> => {
  if (!db) return { shopName: "AZAAN COMMUNICATION TOUR AND TRAVEL", address: "", phone: "" };
  const d = await getDoc(doc(db, 'settings', 'shopSettings'));
  if (d.exists()) return d.data() as ShopSettings;
  const def = { shopName: "AZAAN COMMUNICATION TOUR AND TRAVEL", address: "", phone: "" };
  await setDoc(doc(db, 'settings', 'shopSettings'), def);
  return def;
};

export const updateShopSettings = async (data: ShopSettings) => {
  if (!db) throw new Error("Firebase not configured");
  return setDoc(doc(db, 'settings', 'shopSettings'), data);
};
