import {
  collection, doc, getDoc, getDocs, setDoc, query, orderBy, where, limit,
  onSnapshot, addDoc, updateDoc, deleteDoc, writeBatch, Timestamp, arrayUnion,
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { db, firebaseConfig } from '@/lib/firebase';
import { PaymentMode, PaymentStatus, SettlementMode, deriveStatus } from '@/lib/payments';

// ─── USER PROFILES ───────────────────────────────────────────────────────────

export interface UserProfile {
  uid?: string;
  email: string;
  displayName?: string;
  role: 'owner' | 'staff';
  createdAt: Timestamp;
  invitedBy?: string;
  canAccessFinancialServices?: boolean;
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
 */
export const bootstrapUserProfile = async (
  uid: string,
  email: string,
  displayName?: string,
): Promise<UserProfile | null> => {
  if (!db) return null;
  const usersSnap = await getDocs(query(collection(db, 'users'), limit(1)));
  if (!usersSnap.empty) return null; // Users exist — this account has no profile
  const profile: UserProfile = {
    email,
    displayName: displayName || email.split('@')[0],
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
  const tempAppName = `staff-creation-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, tempAppName);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      displayName: name,
      role: 'staff',
      createdAt: Timestamp.now(),
      invitedBy: ownerEmail,
      canAccessFinancialServices,
    });
  } finally {
    await firebaseSignOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }
};

/** Toggle whether a staff member can access financial service modules. */
export const updateStaffPermissions = async (uid: string, canAccessFinancialServices: boolean): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  await updateDoc(doc(db, 'users', uid), { canAccessFinancialServices });
};

/** Revoke a staff member's access by removing their Firestore profile. */
export const revokeStaffAccess = async (uid: string): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  await deleteDoc(doc(db, 'users', uid));
};

// ─── WORK ENTRIES ────────────────────────────────────────────────────────────

export interface PaymentRecord {
  amount: number;
  paidAt?: Timestamp;
  addedBy?: string;
  /** How the payment was received. Defaults to 'Cash' for backward compatibility. */
  paymentMode?: SettlementMode;
}

export interface WorkEntry {
  id?: string;
  customerName: string;
  mobile: string;
  category: string;
  workDetail?: string;
  date: Timestamp;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  challanAmount?: number;
  payments?: PaymentRecord[];
  status: 'Pending' | 'Completed' | 'Rejected';
  address?: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  rejectedAt?: Timestamp;
  rejectionReason?: string;
  refundAmount?: number;
  isDeleted?: boolean;
  deletedAt?: Timestamp;
  addedBy?: string;
  /** Entry-level initial payment intent. Does NOT affect paidAmount/dueAmount/payments[] logic. */
  paymentMode?: PaymentMode;
  /**
   * Denormalized running sum of all adjustment.amountChange values.
   * Updated atomically by addAdjustment(). NEVER modify directly.
   * finalTotal = totalAmount + netAdjustmentAmount
   */
  netAdjustmentAmount?: number;
  /**
   * Denormalized running sum of all adjustment.challanChange values.
   * Updated atomically by addAdjustment(). NEVER modify directly.
   */
  netAdjustmentChallan?: number;
}

// ─── DEAL ADJUSTMENTS ────────────────────────────────────────────────────────

export interface DealAdjustment {
  id?: string;
  /** Foreign key to workEntries/{id} */
  entryId: string;
  /** Change to totalAmount — positive = increase, negative = decrease */
  amountChange: number;
  /** Change to challanAmount — positive = increase, negative = decrease */
  challanChange: number;
  /** Required human-readable reason for the change */
  reason: string;
  recordedBy: string;
  createdAt: Timestamp;
}

/**
 * Record a deal adjustment and keep the parent WorkEntry's denormalized
 * fields (netAdjustmentAmount, netAdjustmentChallan, dueAmount) in sync.
 *
 * Uses two sequential writes (sub-collection + parent update). Safe in both
 * real Firestore and the in-memory mock.
 */
export const addAdjustment = async (
  entryId: string,
  data: { amountChange: number; challanChange: number; reason: string; recordedBy: string },
  currentEntry: { totalAmount: number; paidAmount: number; netAdjustmentAmount?: number; netAdjustmentChallan?: number },
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  const now = Timestamp.now();

  // 1. Write to flat workAdjustments collection (works in mock + real Firestore)
  await addDoc(collection(db, 'workAdjustments'), {
    entryId,
    amountChange: data.amountChange,
    challanChange: data.challanChange,
    reason: data.reason,
    recordedBy: data.recordedBy,
    createdAt: now,
  });

  // 2. Update denormalized fields + recalculate dueAmount on parent entry
  const newNetAmount = (currentEntry.netAdjustmentAmount ?? 0) + data.amountChange;
  const newNetChallan = (currentEntry.netAdjustmentChallan ?? 0) + data.challanChange;
  const finalTotal = currentEntry.totalAmount + newNetAmount;
  const newDueAmount = finalTotal - currentEntry.paidAmount;

  await updateDoc(doc(db, 'workEntries', entryId), {
    netAdjustmentAmount: newNetAmount,
    netAdjustmentChallan: newNetChallan,
    dueAmount: newDueAmount,
  });
};

/** Subscribe to all adjustments for a given work entry, oldest-first. */
export const subscribeToAdjustments = (
  entryId: string,
  callback: (adjustments: DealAdjustment[]) => void,
) => {
  if (!db) return () => {};
  const q = query(
    collection(db, 'workAdjustments'),
    where('entryId', '==', entryId),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    const list: DealAdjustment[] = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() } as DealAdjustment));
    callback(list);
  }, (err) => console.error('[Firestore] workAdjustments error:', err.message));
};

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
) => {
  if (!db) throw new Error("Firebase not configured");
  const now = Timestamp.now();
  const dueAmount = data.status === 'Rejected' ? 0 : data.totalAmount - data.paidAmount;
  const timestamps: Partial<WorkEntry> = { createdAt: now };
  if (data.status === 'Completed') timestamps.completedAt = now;
  if (data.status === 'Rejected') timestamps.rejectedAt = now;

  const { rejectionReason, refundAmount, ...rest } = data;
  const rejectionFields = data.status === 'Rejected'
    ? stripUndefined({ rejectionReason, refundAmount } as Record<string, unknown>)
    : {};

  // Only create initial payment record for Cash/Online (not Due/None)
  const mode = data.paymentMode ?? 'Cash';
  const initialPayments: PaymentRecord[] = (data.paidAmount > 0 && (mode === 'Cash' || mode === 'Online'))
    ? [{ amount: data.paidAmount, paidAt: now, addedBy: data.addedBy ?? 'Unknown', paymentMode: mode as SettlementMode }]
    : [];

  return addDoc(collection(db, 'workEntries'), {
    ...rest,
    ...timestamps,
    dueAmount,
    ...rejectionFields,
    payments: initialPayments,
  });
};

export const updateWorkEntry = async (
  id: string,
  data: Partial<Omit<WorkEntry, 'id' | 'dueAmount' | 'createdAt' | 'completedAt' | 'rejectedAt'>>,
  /** Pass the current Firestore paidAmount when NOT sending paidAmount in data,
   *  so dueAmount can still be recalculated correctly when totalAmount changes. */
  currentPaidAmount?: number
) => {
  if (!db) throw new Error("Firebase not configured");

  const { rejectionReason, refundAmount, ...rest } = data;
  const rejectionFields = data.status === 'Rejected'
    ? stripUndefined({ rejectionReason, refundAmount } as Record<string, unknown>)
    : {};

  const updates: Record<string, unknown> = { ...stripUndefined(rest as Record<string, unknown>), ...rejectionFields };

  // Use the explicitly-passed paidAmount (new entries) or the currentPaidAmount from Firestore (edit form)
  const effectivePaidAmount = data.paidAmount ?? currentPaidAmount;

  if (data.status === 'Rejected') {
    updates.rejectedAt = Timestamp.now();
    updates.dueAmount = 0;
  } else if (data.status === 'Completed') {
    updates.completedAt = Timestamp.now();
    if (data.totalAmount !== undefined && effectivePaidAmount !== undefined) {
      updates.dueAmount = data.totalAmount - effectivePaidAmount;
    }
  } else {
    if (data.totalAmount !== undefined && effectivePaidAmount !== undefined) {
      updates.dueAmount = data.totalAmount - effectivePaidAmount;
    }
  }

  return updateDoc(doc(db, 'workEntries', id), updates);
};

/** Soft-delete: marks the entry as deleted instead of removing it from Firestore. */
export const deleteWorkEntry = async (id: string) => {
  if (!db) throw new Error("Firebase not configured");
  return updateDoc(doc(db, 'workEntries', id), { isDeleted: true, deletedAt: Timestamp.now() });
};

/** Restore a soft-deleted entry back to the active list. */
export const restoreWorkEntry = async (id: string) => {
  if (!db) throw new Error("Firebase not configured");
  return updateDoc(doc(db, 'workEntries', id), { isDeleted: false, deletedAt: null });
};

/**
 * Record an additional payment against a work entry.
 * Appends to the `payments` array and keeps `paidAmount` in sync.
 */
export const addPaymentToEntry = async (
  id: string,
  payment: { amount: number; addedBy?: string; paymentMode?: SettlementMode },
  totalAmount: number,
  currentPaidAmount: number
): Promise<void> => {
  if (!db) throw new Error("Firebase not configured");
  const newPaidAmount = currentPaidAmount + payment.amount;
  // Allow negative dueAmount to represent overpayment — do NOT clamp at 0
  const newDueAmount = totalAmount - newPaidAmount;
  const paymentRecord: PaymentRecord = {
    amount: payment.amount,
    paidAt: Timestamp.now(),
    addedBy: payment.addedBy,
    paymentMode: payment.paymentMode ?? 'Cash',
  };
  await updateDoc(doc(db, 'workEntries', id), {
    payments: arrayUnion(paymentRecord),
    paidAmount: newPaidAmount,
    dueAmount: newDueAmount,
  });
};

/** Active entries only — excludes any document with isDeleted === true. */
export const subscribeToWorkEntries = (callback: (entries: WorkEntry[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'workEntries'), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const entries: WorkEntry[] = [];
    snapshot.forEach(doc => {
      const data = { id: doc.id, ...doc.data() } as WorkEntry;
      if (!data.isDeleted) entries.push(data);
    });
    callback(entries);
  });
};

/** Deleted entries only — for the Recycle Bin page. */
export const subscribeToDeletedEntries = (callback: (entries: WorkEntry[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'workEntries'), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const entries: WorkEntry[] = [];
    snapshot.forEach(doc => {
      const data = { id: doc.id, ...doc.data() } as WorkEntry;
      if (data.isDeleted) entries.push(data);
    });
    entries.sort((a, b) => (b.deletedAt?.toMillis() ?? 0) - (a.deletedAt?.toMillis() ?? 0));
    callback(entries);
  });
};

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

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

// ─── SETTINGS ────────────────────────────────────────────────────────────────

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

// ─── AEPS WITHDRAWALS ────────────────────────────────────────────────────────

export interface AepsWithdrawal {
  id?: string;
  customerName: string;
  bankName: string;
  mobile?: string;
  amount: number;
  profitMargin: number;
  /** Full 4-option payment mode selected at creation time. */
  paymentMode?: PaymentMode;
  /** Derived from paymentMode; 'paid' for legacy entries without this field. */
  paymentStatus?: PaymentStatus;
  /** Set when a 'Due' entry is settled — which mode was used. */
  settledVia?: SettlementMode;
  settledAt?: Timestamp;
  settledBy?: string;
  createdAt: Timestamp;
  addedBy: string;
}

export const createAepsWithdrawal = async (data: Omit<AepsWithdrawal, 'id' | 'createdAt'>): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  const paymentStatus: PaymentStatus = deriveStatus(data.paymentMode ?? 'Cash');
  await addDoc(collection(db, 'aepsWithdrawals'), {
    ...stripUndefined(data as Record<string, unknown>),
    paymentStatus,
    createdAt: Timestamp.now(),
  });
};

export const subscribeToAepsWithdrawals = (callback: (entries: AepsWithdrawal[]) => void) => {
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
  mobile?: string;
  rechargeAmount: number;
  profitMargin: number;
  paymentMode?: PaymentMode;
  paymentStatus?: PaymentStatus;
  settledVia?: SettlementMode;
  settledAt?: Timestamp;
  settledBy?: string;
  createdAt: Timestamp;
  addedBy: string;
}

export const createElectricRecharge = async (data: Omit<ElectricRecharge, 'id' | 'createdAt'>): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  const paymentStatus: PaymentStatus = deriveStatus(data.paymentMode ?? 'Cash');
  await addDoc(collection(db, 'electricRecharges'), {
    ...stripUndefined(data as Record<string, unknown>),
    paymentStatus,
    createdAt: Timestamp.now(),
  });
};

export const subscribeToElectricRecharges = (callback: (entries: ElectricRecharge[]) => void) => {
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
  paymentMode?: PaymentMode;
  paymentStatus?: PaymentStatus;
  settledVia?: SettlementMode;
  settledAt?: Timestamp;
  settledBy?: string;
  createdAt: Timestamp;
  addedBy: string;
}

export const createMoneyTransfer = async (data: Omit<MoneyTransfer, 'id' | 'createdAt'>): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  const paymentStatus: PaymentStatus = deriveStatus(data.paymentMode ?? 'Cash');
  await addDoc(collection(db, 'moneyTransfers'), {
    ...stripUndefined(data as Record<string, unknown>),
    paymentStatus,
    createdAt: Timestamp.now(),
  });
};

export const subscribeToMoneyTransfers = (callback: (entries: MoneyTransfer[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'moneyTransfers'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const entries: MoneyTransfer[] = [];
    snap.forEach(d => entries.push({ id: d.id, ...d.data() } as MoneyTransfer));
    callback(entries);
  }, (err) => console.error('[Firestore] moneyTransfers error:', err.message));
};

// ─── QUICK ACTION WORK ───────────────────────────────────────────────────────

export type QuickActionCategory =
  | 'Printout' | 'Lamination' | 'Xerox' | 'PVC' | 'Print' | 'Photo Print' | 'Other';

export const QUICK_ACTION_CATEGORIES: QuickActionCategory[] = [
  'Printout', 'Lamination', 'Xerox', 'PVC', 'Print', 'Photo Print', 'Other',
];

export interface QuickActionEntry {
  id?: string;
  category: QuickActionCategory;
  customerName?: string;
  amount: number;
  paymentMode?: PaymentMode;
  paymentStatus?: PaymentStatus;
  settledVia?: SettlementMode;
  settledAt?: Timestamp;
  settledBy?: string;
  createdAt: Timestamp;
  addedBy: string;
}

export const createQuickAction = async (
  data: Omit<QuickActionEntry, 'id' | 'createdAt'>,
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  const paymentStatus: PaymentStatus = deriveStatus(data.paymentMode ?? 'Cash');
  await addDoc(collection(db, 'quickActionWork'), {
    ...stripUndefined(data as Record<string, unknown>),
    paymentStatus,
    createdAt: Timestamp.now(),
  });
};

export const subscribeToQuickActions = (callback: (entries: QuickActionEntry[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'quickActionWork'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const entries: QuickActionEntry[] = [];
    snap.forEach(d => entries.push({ id: d.id, ...d.data() } as QuickActionEntry));
    callback(entries);
  }, (err) => console.error('[Firestore] quickActionWork error:', err.message));
};

// ─── PAYMENT HISTORY ─────────────────────────────────────────────────────────

export type PaymentHistoryEntryType = 'aeps' | 'recharge' | 'transfer' | 'quickWork' | 'work';

export interface PaymentHistoryRecord {
  id?: string;
  entryType: PaymentHistoryEntryType;
  entryId: string;
  amount: number;
  /** The settlement method (Cash/Online — always a SettlementMode, never Due/None) */
  mode: SettlementMode;
  originalMode: 'Due';
  settledAt: Timestamp;
  settledBy: string;
  customerName?: string;
  category?: string;
}

const COLLECTION_MAP: Record<PaymentHistoryEntryType, string> = {
  aeps: 'aepsWithdrawals',
  recharge: 'electricRecharges',
  transfer: 'moneyTransfers',
  quickWork: 'quickActionWork',
  work: 'workEntries',
};

/**
 * Settle a pending (Due) entry atomically:
 * 1. Updates the entry: paymentStatus='paid', settledVia, settledAt, settledBy
 * 2. Creates a record in `paymentHistory`
 *
 * Safe for both real Firestore and the in-memory mock.
 */
export const settlePendingEntry = async (
  entryType: PaymentHistoryEntryType,
  entryId: string,
  mode: SettlementMode,
  settledBy: string,
  meta: {
    amount: number;
    customerName?: string;
    category?: string;
  },
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  const now = Timestamp.now();

  // 1. Update the entry itself
  const colName = COLLECTION_MAP[entryType];
  await updateDoc(doc(db, colName, entryId), {
    paymentStatus: 'paid' as PaymentStatus,
    settledVia: mode,
    settledAt: now,
    settledBy,
  });

  // 2. Create paymentHistory record
  const record: Omit<PaymentHistoryRecord, 'id'> = {
    entryType,
    entryId,
    amount: meta.amount,
    mode,
    originalMode: 'Due',
    settledAt: now,
    settledBy,
    ...(meta.customerName ? { customerName: meta.customerName } : {}),
    ...(meta.category ? { category: meta.category } : {}),
  };
  await addDoc(collection(db, 'paymentHistory'), record);
};

/** Subscribe to all payment history records, newest first. */
export const subscribeToPaymentHistory = (callback: (records: PaymentHistoryRecord[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'paymentHistory'), orderBy('settledAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const records: PaymentHistoryRecord[] = [];
    snap.forEach(d => records.push({ id: d.id, ...d.data() } as PaymentHistoryRecord));
    callback(records);
  }, (err) => console.error('[Firestore] paymentHistory error:', err.message));
};
