import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  type CategoryId,
  type ExpenseItem,
  type IncomeCategory,
  type IncomeItem,
  type MonthDataset,
  type PaymentMethod,
} from '../data/budgetData';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface UserProfileDoc {
  uid: string;
  email: string;
  displayName: string;
  onboardingCompleted: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PersistedMonthDoc {
  monthId: MonthDataset['id'];
  monthlyBudget: number;
  currentDay: number;
}

export interface PersistedExpenseRecord extends ExpenseItem {
  monthId: MonthDataset['id'];
  createdAt?: Timestamp;
}

export interface PersistedIncomeRecord extends IncomeItem {
  monthId: MonthDataset['id'];
  createdAt?: Timestamp;
}

const VALID_MONTH_IDS: MonthDataset['id'][] = ['nov-2026', 'oct-2026'];
const VALID_CATEGORIES: CategoryId[] = [
  'alimentacion',
  'transporte',
  'servicios',
  'compras',
  'entretenimiento',
];

function sanitizeDisplayName(rawName: string, fallbackEmail?: string | null): string {
  const trimmed = rawName.trim();
  if (trimmed) return trimmed.slice(0, 60);
  if (fallbackEmail && fallbackEmail.includes('@')) {
    return fallbackEmail.split('@')[0].slice(0, 60) || 'Usuario';
  }
  return 'Usuario';
}

function sanitizeTime(rawTime: string): string {
  return /^\d{2}:\d{2}$/.test(rawTime) ? rawTime : '12:00';
}

function sanitizeIsoDate(rawDate: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : '2026-11-24';
}

function createSafeDocId(prefix: 'exp' | 'inc'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfileDoc | null) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const data = snap.data();
      onData({
        uid: String(data.uid || uid),
        email: String(data.email || ''),
        displayName: String(data.displayName || 'Usuario'),
        onboardingCompleted: Boolean(data.onboardingCompleted),
        createdAt: data.createdAt as Timestamp | undefined,
        updatedAt: data.updatedAt as Timestamp | undefined,
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeUserMonths(
  uid: string,
  onData: (months: Record<string, PersistedMonthDoc>) => void
): Unsubscribe {
  const path = `users/${uid}/months`;
  const q = query(collection(db, 'users', uid, 'months'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const result: Record<string, PersistedMonthDoc> = {};
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const monthId = data.monthId as MonthDataset['id'];
        if (!VALID_MONTH_IDS.includes(monthId)) continue;
        result[monthId] = {
          monthId,
          monthlyBudget: typeof data.monthlyBudget === 'number' ? data.monthlyBudget : 0,
          currentDay: typeof data.currentDay === 'number' ? data.currentDay : 24,
        };
      }
      onData(result);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeUserExpenses(
  uid: string,
  onData: (expenses: PersistedExpenseRecord[]) => void
): Unsubscribe {
  const path = `users/${uid}/expenses`;
  const q = query(collection(db, 'users', uid, 'expenses'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: PersistedExpenseRecord[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const monthId = data.monthId as MonthDataset['id'];
        const categoryId = data.categoryId as CategoryId;
        if (!VALID_MONTH_IDS.includes(monthId) || !VALID_CATEGORIES.includes(categoryId)) continue;
        list.push({
          id: docSnap.id,
          type: 'expense',
          monthId,
          day: Number(data.day) || 1,
          dateLabel: String(data.dateLabel || ''),
          shortDate: String(data.shortDate || ''),
          time: String(data.time || '00:00'),
          categoryId,
          concept: String(data.concept || ''),
          notes: typeof data.notes === 'string' && data.notes.trim() ? data.notes : undefined,
          amount: Number(data.amount) || 0,
          createdAt: data.createdAt as Timestamp | undefined,
        });
      }
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeUserIncomes(
  uid: string,
  onData: (incomes: PersistedIncomeRecord[]) => void
): Unsubscribe {
  const path = `users/${uid}/incomes`;
  const q = query(collection(db, 'users', uid, 'incomes'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: PersistedIncomeRecord[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const monthId = data.monthId as MonthDataset['id'];
        if (!VALID_MONTH_IDS.includes(monthId)) continue;
        const incCat = INCOME_CATEGORIES.includes(data.incomeCategory as IncomeCategory)
          ? (data.incomeCategory as IncomeCategory)
          : 'Otro';
        const payMethod = PAYMENT_METHODS.includes(data.paymentMethod as PaymentMethod)
          ? (data.paymentMethod as PaymentMethod)
          : 'Otro';

        list.push({
          id: docSnap.id,
          type: 'income',
          monthId,
          day: Number(data.day) || 1,
          isoDate: String(data.isoDate || '2026-11-24'),
          dateLabel: String(data.dateLabel || ''),
          shortDate: String(data.shortDate || ''),
          time: String(data.time || '00:00'),
          incomeCategory: incCat,
          paymentMethod: payMethod,
          concept: String(data.concept || ''),
          notes: typeof data.notes === 'string' && data.notes.trim() ? data.notes : undefined,
          amount: Number(data.amount) || 0,
          createdAt: data.createdAt as Timestamp | undefined,
        });
      }
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function completeFirstTimeOnboarding(params: {
  uid: string;
  email: string;
  displayName: string;
  monthlyBudget: number;
  profileExists: boolean;
  existingMonths: Record<string, PersistedMonthDoc>;
}): Promise<void> {
  const { uid, email, displayName, monthlyBudget, profileExists, existingMonths } = params;
  const safeBudget = Math.min(1000000000, Math.max(1, Math.round(monthlyBudget)));
  const safeName = sanitizeDisplayName(displayName, email);
  const safeEmail = email.trim().slice(0, 160);

  const batch = writeBatch(db);
  const userRef = doc(db, 'users', uid);

  if (profileExists) {
    batch.update(userRef, {
      displayName: safeName,
      onboardingCompleted: true,
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.set(userRef, {
      uid,
      email: safeEmail,
      displayName: safeName,
      onboardingCompleted: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  const novRef = doc(db, 'users', uid, 'months', 'nov-2026');
  if (existingMonths['nov-2026']) {
    batch.update(novRef, {
      monthlyBudget: safeBudget,
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.set(novRef, {
      ownerId: uid,
      monthId: 'nov-2026',
      monthlyBudget: safeBudget,
      currentDay: 24,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  if (!existingMonths['oct-2026']) {
    const octRef = doc(db, 'users', uid, 'months', 'oct-2026');
    batch.set(octRef, {
      ownerId: uid,
      monthId: 'oct-2026',
      monthlyBudget: 0,
      currentDay: 31,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export async function updateUserDisplayName(uid: string, displayName: string): Promise<void> {
  const safeName = sanitizeDisplayName(displayName);
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: safeName,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveMonthBudget(params: {
  uid: string;
  monthId: MonthDataset['id'];
  monthlyBudget: number;
  currentDay: number;
  existsInDb: boolean;
}): Promise<void> {
  const { uid, monthId, monthlyBudget, currentDay, existsInDb } = params;
  const safeBudget = Math.min(1000000000, Math.max(0, Math.round(monthlyBudget)));
  const safeDay = Math.min(31, Math.max(1, Math.round(currentDay)));
  const path = `users/${uid}/months/${monthId}`;
  const monthRef = doc(db, 'users', uid, 'months', monthId);

  try {
    if (existsInDb) {
      await updateDoc(monthRef, {
        monthlyBudget: safeBudget,
        currentDay: safeDay,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(monthRef, {
        ownerId: uid,
        monthId,
        monthlyBudget: safeBudget,
        currentDay: safeDay,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, existsInDb ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function updateMonthCurrentDay(params: {
  uid: string;
  monthId: MonthDataset['id'];
  currentDay: number;
  monthlyBudget: number;
  existsInDb: boolean;
}): Promise<void> {
  return saveMonthBudget(params);
}

export async function createExpenseInFirestore(
  uid: string,
  monthId: MonthDataset['id'],
  expense: Omit<ExpenseItem, 'id'>
): Promise<string> {
  const id = createSafeDocId('exp');
  const path = `users/${uid}/expenses/${id}`;
  const cleanNotes = expense.notes?.trim().slice(0, 250);

  const payload: Record<string, unknown> = {
    ownerId: uid,
    monthId,
    day: Math.min(31, Math.max(1, Math.round(expense.day))),
    dateLabel: expense.dateLabel.trim().slice(0, 32) || '24 nov 2026',
    shortDate: expense.shortDate.trim().slice(0, 20) || '24 nov',
    time: sanitizeTime(expense.time),
    categoryId: VALID_CATEGORIES.includes(expense.categoryId)
      ? expense.categoryId
      : 'alimentacion',
    concept: expense.concept.trim().slice(0, 80) || 'Gasto',
    amount: Math.min(500000000, Math.max(1, Math.round(expense.amount))),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (cleanNotes) {
    payload.notes = cleanNotes;
  }

  try {
    await setDoc(doc(db, 'users', uid, 'expenses', id), payload);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateExpenseInFirestore(params: {
  uid: string;
  monthId: MonthDataset['id'];
  expenseId: string;
  expense: Omit<ExpenseItem, 'id'>;
}): Promise<void> {
  const { uid, monthId, expenseId, expense } = params;
  const path = `users/${uid}/expenses/${expenseId}`;
  const cleanNotes = expense.notes?.trim().slice(0, 250);

  const payload: Record<string, unknown> = {
    monthId,
    day: Math.min(31, Math.max(1, Math.round(expense.day))),
    dateLabel: expense.dateLabel.trim().slice(0, 32) || '24 nov 2026',
    shortDate: expense.shortDate.trim().slice(0, 20) || '24 nov',
    time: sanitizeTime(expense.time),
    categoryId: VALID_CATEGORIES.includes(expense.categoryId)
      ? expense.categoryId
      : 'alimentacion',
    concept: expense.concept.trim().slice(0, 80) || 'Gasto',
    notes: cleanNotes ? cleanNotes : deleteField(),
    amount: Math.min(500000000, Math.max(1, Math.round(expense.amount))),
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(doc(db, 'users', uid, 'expenses', expenseId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteExpenseInFirestore(uid: string, expenseId: string): Promise<void> {
  const path = `users/${uid}/expenses/${expenseId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'expenses', expenseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createIncomeInFirestore(
  uid: string,
  monthId: MonthDataset['id'],
  income: Omit<IncomeItem, 'id'>
): Promise<string> {
  const id = createSafeDocId('inc');
  const path = `users/${uid}/incomes/${id}`;
  const cleanNotes = income.notes?.trim().slice(0, 250);

  const payload: Record<string, unknown> = {
    ownerId: uid,
    monthId,
    day: Math.min(31, Math.max(1, Math.round(income.day))),
    isoDate: sanitizeIsoDate(income.isoDate),
    dateLabel: income.dateLabel.trim().slice(0, 32) || '24 nov 2026',
    shortDate: income.shortDate.trim().slice(0, 20) || '24 nov',
    time: sanitizeTime(income.time),
    incomeCategory: INCOME_CATEGORIES.includes(income.incomeCategory)
      ? income.incomeCategory
      : 'Otro',
    paymentMethod: PAYMENT_METHODS.includes(income.paymentMethod)
      ? income.paymentMethod
      : 'Otro',
    concept: income.concept.trim().slice(0, 80) || 'Ingreso',
    amount: Math.min(500000000, Math.max(1, Math.round(income.amount))),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (cleanNotes) {
    payload.notes = cleanNotes;
  }

  try {
    await setDoc(doc(db, 'users', uid, 'incomes', id), payload);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
