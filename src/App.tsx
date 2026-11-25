import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Loader2, Plus, Receipt, Sparkles, X } from 'lucide-react';
import { AssistantDrawer, type AssistantExpenseInput } from './components/AssistantDrawer';
import { AuthView } from './components/AuthView';
import { BudgetOnboardingView } from './components/BudgetOnboardingView';
import { DailySpendingChart } from './components/DailySpendingChart';
import { DetalleMovimientoView } from './components/DetalleMovimientoView';
import { FinancialSummary } from './components/FinancialSummary';
import { Header, type AppScreen, type ThemeMode } from './components/Header';
import { MovimientosView } from './components/MovimientosView';
import { RecentMovements } from './components/RecentMovements';
import { RegistrarGastoView } from './components/RegistrarGastoView';
import { RegistrarIngresoView } from './components/RegistrarIngresoView';
import {
  CATEGORIES,
  createEmptyMonthDatasets,
  formatCOP,
  getCurrentTimeString,
  parseIsoDateParts,
  type CategoryId,
  type ExpenseItem,
  type IncomeItem,
  type MonthDataset,
  type MovementItem,
} from './data/budgetData';
import { auth } from './firebase';
import {
  completeFirstTimeOnboarding,
  createExpenseInFirestore,
  createIncomeInFirestore,
  deleteExpenseInFirestore,
  saveMonthBudget,
  subscribeUserExpenses,
  subscribeUserIncomes,
  subscribeUserMonths,
  subscribeUserProfile,
  updateExpenseInFirestore,
  updateMonthCurrentDay,
  updateUserDisplayName,
  type PersistedExpenseRecord,
  type PersistedIncomeRecord,
  type PersistedMonthDoc,
  type UserProfileDoc,
} from './services/budgetFirestore';

type SavedNotice =
  | { kind: 'expense'; item: Omit<ExpenseItem, 'id'> & { id?: string } }
  | { kind: 'expense-updated'; item: ExpenseItem }
  | { kind: 'expense-deleted'; concept: string; amount: number }
  | { kind: 'income'; item: Omit<IncomeItem, 'id'> & { id?: string } };

function getDefaultDisplayName(user: FirebaseUser | null): string {
  if (!user) return 'Usuario';
  if (user.displayName && user.displayName.trim()) {
    return user.displayName.trim().slice(0, 60);
  }
  if (user.email && user.email.includes('@')) {
    return user.email.split('@')[0].slice(0, 60) || 'Usuario';
  }
  return 'Usuario';
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      return localStorage.getItem('mi-presupuesto-theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('mi-presupuesto-theme', theme);
    } catch {
      // Ignore storage quota errors
    }
  }, [theme]);

  // Auth & Firestore sync state
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileDoc | null>(null);
  const [persistedMonths, setPersistedMonths] = useState<Record<string, PersistedMonthDoc>>({});
  const [persistedExpenses, setPersistedExpenses] = useState<PersistedExpenseRecord[]>([]);
  const [persistedIncomes, setPersistedIncomes] = useState<PersistedIncomeRecord[]>([]);

  const [profileLoaded, setProfileLoaded] = useState(false);
  const [monthsLoaded, setMonthsLoaded] = useState(false);
  const [expensesLoaded, setExpensesLoaded] = useState(false);
  const [incomesLoaded, setIncomesLoaded] = useState(false);
  const [firestoreError, setFirestoreError] = useState<Error | null>(null);

  // Navigation & UI state
  const [selectedMonthId, setSelectedMonthId] = useState<MonthDataset['id']>('nov-2026');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [activeScreen, setActiveScreen] = useState<AppScreen>('dashboard');
  const [returnScreen, setReturnScreen] = useState<'dashboard' | 'movimientos'>('dashboard');
  const [editReturnScreen, setEditReturnScreen] = useState<
    'dashboard' | 'movimientos' | 'detalle'
  >('dashboard');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<SavedNotice | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);

  if (firestoreError) {
    throw firestoreError;
  }

  // Listen to Firebase Auth state and clear local view state whenever user switches or logs out
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);

      // Reset account-scoped UI & data state immediately on auth transitions
      setUserProfile(null);
      setPersistedMonths({});
      setPersistedExpenses([]);
      setPersistedIncomes([]);
      setProfileLoaded(false);
      setMonthsLoaded(false);
      setExpensesLoaded(false);
      setIncomesLoaded(false);
      setFirestoreError(null);

      setSelectedMonthId('nov-2026');
      setSelectedCategory('all');
      setActiveScreen('dashboard');
      setSelectedMovementId(null);
      setEditingExpenseId(null);
      setSavedNotice(null);
      setAssistantOpen(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Attach user-scoped Firestore real-time listeners only after authentication
  useEffect(() => {
    if (!authReady || !currentUser) return;
    const uid = currentUser.uid;

    let unsubProfile: (() => void) | undefined;
    let unsubMonths: (() => void) | undefined;
    let unsubExpenses: (() => void) | undefined;
    let unsubIncomes: (() => void) | undefined;

    try {
      unsubProfile = subscribeUserProfile(uid, (profile) => {
        setUserProfile(profile);
        setProfileLoaded(true);
      });

      unsubMonths = subscribeUserMonths(uid, (months) => {
        setPersistedMonths(months);
        setMonthsLoaded(true);
      });

      unsubExpenses = subscribeUserExpenses(uid, (expenses) => {
        setPersistedExpenses(expenses);
        setExpensesLoaded(true);
      });

      unsubIncomes = subscribeUserIncomes(uid, (incomes) => {
        setPersistedIncomes(incomes);
        setIncomesLoaded(true);
      });
    } catch (err) {
      setFirestoreError(err instanceof Error ? err : new Error(String(err)));
    }

    return () => {
      unsubProfile?.();
      unsubMonths?.();
      unsubExpenses?.();
      unsubIncomes?.();
    };
  }, [authReady, currentUser]);

  // Build month datasets starting strictly from zero + user's persisted Firestore data
  const monthsData = useMemo<Record<MonthDataset['id'], MonthDataset>>(() => {
    const base = createEmptyMonthDatasets();

    for (const monthId of ['nov-2026', 'oct-2026'] as const) {
      const monthDoc = persistedMonths[monthId];
      if (monthDoc) {
        base[monthId].monthlyBudget = monthDoc.monthlyBudget;
        base[monthId].currentDay = monthDoc.currentDay;
      }
      base[monthId].expenses = persistedExpenses.filter((e) => e.monthId === monthId);
      base[monthId].incomes = persistedIncomes.filter((i) => i.monthId === monthId);
    }

    return base;
  }, [persistedMonths, persistedExpenses, persistedIncomes]);

  const activeMonth = monthsData[selectedMonthId];
  const hasExpenses = activeMonth.expenses.length > 0;
  const hasIncomes = activeMonth.incomes.length > 0;

  const totalSpent = useMemo(
    () => activeMonth.expenses.reduce((sum, item) => sum + item.amount, 0),
    [activeMonth.expenses]
  );

  const totalIncome = useMemo(
    () => activeMonth.incomes.reduce((sum, item) => sum + item.amount, 0),
    [activeMonth.incomes]
  );

  const effectiveBudget = activeMonth.monthlyBudget + totalIncome;
  const availableBalance = effectiveBudget - totalSpent;

  const allMovements = useMemo<MovementItem[]>(() => {
    const taggedExpenses: MovementItem[] = activeMonth.expenses.map((exp, idx) => ({
      ...exp,
      type: 'expense',
      _seq: idx,
    })) as Array<MovementItem & { _seq?: number }>;

    const taggedIncomes: MovementItem[] = activeMonth.incomes.map((inc, idx) => ({
      ...inc,
      type: 'income',
      _seq: 10000 + idx,
    })) as Array<MovementItem & { _seq?: number }>;

    const combined = [...taggedExpenses, ...taggedIncomes] as Array<
      MovementItem & { _seq: number }
    >;

    combined.sort((a, b) => {
      if (b.day !== a.day) return b.day - a.day;
      if (b.time !== a.time) return b.time.localeCompare(a.time);
      return b._seq - a._seq;
    });

    return combined;
  }, [activeMonth.expenses, activeMonth.incomes]);

  const recentFiveMovements = useMemo(() => allMovements.slice(0, 5), [allMovements]);

  const selectedMovement = useMemo(
    () => allMovements.find((m) => m.id === selectedMovementId) ?? null,
    [allMovements, selectedMovementId]
  );

  const selectedExpenseDayTotal = useMemo(() => {
    if (!selectedMovement || selectedMovement.type !== 'expense') return 0;
    return activeMonth.expenses
      .filter((e) => e.day === selectedMovement.day)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [activeMonth.expenses, selectedMovement]);

  const editingExpense = useMemo(
    () =>
      editingExpenseId
        ? persistedExpenses.find((exp) => exp.id === editingExpenseId) ?? null
        : null,
    [persistedExpenses, editingExpenseId]
  );

  const userName = userProfile?.displayName || getDefaultDisplayName(currentUser);
  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      setFirestoreError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleCompleteOnboarding = async (params: {
    displayName: string;
    monthlyBudget: number;
  }) => {
    if (!currentUser) return;
    await completeFirstTimeOnboarding({
      uid: currentUser.uid,
      email: currentUser.email || '',
      displayName: params.displayName,
      monthlyBudget: params.monthlyBudget,
      profileExists: Boolean(userProfile),
      existingMonths: persistedMonths,
    });
  };

  const handleMonthChange = (monthId: MonthDataset['id']) => {
    setSelectedMonthId(monthId);
    setSelectedCategory('all');
    setSavedNotice(null);
    setSelectedMovementId(null);
    setEditingExpenseId(null);
  };

  const handleOpenMovementDetail = (movementId: string, from: 'dashboard' | 'movimientos') => {
    setSelectedMovementId(movementId);
    setReturnScreen(from);
    setActiveScreen('detalle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveExpenseForm = (expenseData: Omit<ExpenseItem, 'id'>) => {
    if (!currentUser) return;
    const uid = currentUser.uid;

    if (editingExpenseId) {
      const updatedExpense: ExpenseItem = {
        ...expenseData,
        type: 'expense',
        id: editingExpenseId,
      };

      void updateExpenseInFirestore({
        uid,
        monthId: selectedMonthId,
        expenseId: editingExpenseId,
        expense: expenseData,
      }).catch((err) => {
        setFirestoreError(err instanceof Error ? err : new Error(String(err)));
      });

      setSavedNotice({ kind: 'expense-updated', item: updatedExpense });
      setEditingExpenseId(null);
      setActiveScreen(editReturnScreen);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    void createExpenseInFirestore(uid, selectedMonthId, expenseData)
      .then((newId) => {
        setSavedNotice({
          kind: 'expense',
          item: { ...expenseData, type: 'expense', id: newId },
        });
      })
      .catch((err) => {
        setFirestoreError(err instanceof Error ? err : new Error(String(err)));
      });

    setSavedNotice({ kind: 'expense', item: { ...expenseData, type: 'expense' } });
    setSelectedCategory('all');
    setActiveScreen('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartEditExpense = (
    expenseId: string,
    from: 'dashboard' | 'movimientos' | 'detalle'
  ) => {
    setSavedNotice(null);
    setEditingExpenseId(expenseId);
    setEditReturnScreen(from);
    setActiveScreen('registrar');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteExpense = (
    expenseId: string,
    from: 'dashboard' | 'movimientos' | 'detalle'
  ) => {
    if (!currentUser) return;
    const target = activeMonth.expenses.find((exp) => exp.id === expenseId);
    if (!target) return;

    void deleteExpenseInFirestore(currentUser.uid, expenseId).catch((err) => {
      setFirestoreError(err instanceof Error ? err : new Error(String(err)));
    });

    if (selectedMovementId === expenseId) {
      setSelectedMovementId(null);
    }
    if (editingExpenseId === expenseId) {
      setEditingExpenseId(null);
    }

    setSavedNotice({
      kind: 'expense-deleted',
      concept: target.concept,
      amount: target.amount,
    });

    if (from === 'detalle') {
      setActiveScreen(returnScreen);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveNewIncome = (newIncomeData: Omit<IncomeItem, 'id'>) => {
    if (!currentUser) return;
    const uid = currentUser.uid;

    void createIncomeInFirestore(uid, selectedMonthId, newIncomeData)
      .then((newId) => {
        setSavedNotice({
          kind: 'income',
          item: { ...newIncomeData, type: 'income', id: newId },
        });
      })
      .catch((err) => {
        setFirestoreError(err instanceof Error ? err : new Error(String(err)));
      });

    setSavedNotice({ kind: 'income', item: { ...newIncomeData, type: 'income' } });
    setActiveScreen('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateMonthlyBudget = (newBudget: number) => {
    if (!currentUser) return;
    void saveMonthBudget({
      uid: currentUser.uid,
      monthId: selectedMonthId,
      monthlyBudget: newBudget,
      currentDay: activeMonth.currentDay,
      existsInDb: Boolean(persistedMonths[selectedMonthId]),
    }).catch((err) => {
      setFirestoreError(err instanceof Error ? err : new Error(String(err)));
    });
  };

  const handleUpdateUserName = (newName: string) => {
    if (!currentUser) return;
    void updateUserDisplayName(currentUser.uid, newName).catch((err) => {
      setFirestoreError(err instanceof Error ? err : new Error(String(err)));
    });
  };

  const openRegisterExpense = () => {
    setSavedNotice(null);
    setEditingExpenseId(null);
    setEditReturnScreen('dashboard');
    setActiveScreen('registrar');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openRegisterIncome = () => {
    setSavedNotice(null);
    setEditingExpenseId(null);
    setActiveScreen('registrar-ingreso');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const mapAssistantCategory = (rawCategory: string): CategoryId => {
    const normalized = rawCategory
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    if (
      normalized.includes('aliment') ||
      normalized.includes('comida') ||
      normalized.includes('mercado') ||
      normalized.includes('restaur')
    ) {
      return 'alimentacion';
    }
    if (
      normalized.includes('transport') ||
      normalized.includes('taxi') ||
      normalized.includes('bus') ||
      normalized.includes('gasolina')
    ) {
      return 'transporte';
    }
    if (
      normalized.includes('servicio') ||
      normalized.includes('agua') ||
      normalized.includes('luz') ||
      normalized.includes('internet') ||
      normalized.includes('gas')
    ) {
      return 'servicios';
    }
    if (
      normalized.includes('entreten') ||
      normalized.includes('ocio') ||
      normalized.includes('cine') ||
      normalized.includes('suscrip')
    ) {
      return 'entretenimiento';
    }
    if (
      normalized.includes('ropa') ||
      normalized.includes('compra') ||
      normalized.includes('hogar') ||
      normalized.includes('farmacia')
    ) {
      return 'compras';
    }
    return 'alimentacion';
  };

  const handleAssistantRegisterExpense = (input: AssistantExpenseInput) => {
    const categoryId = mapAssistantCategory(input.category);
    const { day, dateLabel, shortDate } = parseIsoDateParts(input.date);

    const newExpensePayload: Omit<ExpenseItem, 'id'> = {
      type: 'expense',
      day,
      dateLabel,
      shortDate,
      time: getCurrentTimeString(),
      categoryId,
      concept: input.description,
      notes: 'Registrado mediante asistente inteligente',
      amount: Math.round(input.amount),
    };

    if (currentUser) {
      const uid = currentUser.uid;
      void createExpenseInFirestore(uid, selectedMonthId, newExpensePayload)
        .then((newId) => {
          setSavedNotice({
            kind: 'expense',
            item: { ...newExpensePayload, id: newId },
          });
        })
        .catch((err) => {
          setFirestoreError(err instanceof Error ? err : new Error(String(err)));
        });

      const nextCurrentDay = Math.min(
        activeMonth.totalDays,
        Math.max(activeMonth.currentDay, day)
      );
      if (nextCurrentDay !== activeMonth.currentDay || !persistedMonths[selectedMonthId]) {
        void updateMonthCurrentDay({
          uid,
          monthId: selectedMonthId,
          currentDay: nextCurrentDay,
          monthlyBudget: activeMonth.monthlyBudget,
          existsInDb: Boolean(persistedMonths[selectedMonthId]),
        }).catch((err) => {
          setFirestoreError(err instanceof Error ? err : new Error(String(err)));
        });
      }
    }

    setSavedNotice({ kind: 'expense', item: newExpensePayload });
    setSelectedCategory('all');

    return {
      categoryLabel: CATEGORIES[categoryId].label,
      dateLabel,
      amount: newExpensePayload.amount,
      description: newExpensePayload.concept,
    };
  };

  // Gate 1: Waiting for Firebase Auth initialization
  if (!authReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-700 dark:text-slate-300">
        <Loader2 className="w-7 h-7 animate-spin text-[#5B3DF5]" aria-hidden="true" />
        <p className="text-sm font-medium">Cargando sesión...</p>
      </div>
    );
  }

  // Gate 2: Unauthenticated -> Email/Password & Quick Google Sign-In
  if (!currentUser) {
    return <AuthView theme={theme} onToggleTheme={toggleTheme} />;
  }

  // Gate 3: Loading this account's private Firestore data
  if (!profileLoaded || !monthsLoaded || !expensesLoaded || !incomesLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-700 dark:text-slate-300">
        <Loader2 className="w-7 h-7 animate-spin text-[#5B3DF5]" aria-hidden="true" />
        <p className="text-sm font-medium">Cargando tu presupuesto personal...</p>
      </div>
    );
  }

  // Gate 4: First-time account -> Starts from zero and asks for monthly budget
  if (!userProfile || !userProfile.onboardingCompleted) {
    return (
      <BudgetOnboardingView
        initialName={getDefaultDisplayName(currentUser)}
        userEmail={currentUser.email || ''}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSignOut={() => void handleSignOut()}
        onComplete={handleCompleteOnboarding}
      />
    );
  }

  // Gate 5: Authenticated & onboarded user workspace (strictly isolated to currentUser.uid)
  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 flex flex-col">
      <Header
        months={monthsData}
        selectedMonthId={selectedMonthId}
        onSelectMonth={handleMonthChange}
        activeScreen={activeScreen}
        onNavigate={(screen) => {
          setEditingExpenseId(null);
          setActiveScreen(screen);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        userName={userName}
        userEmail={currentUser.email || undefined}
        onSignOut={() => void handleSignOut()}
      />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {savedNotice && activeScreen !== 'registrar' && activeScreen !== 'registrar-ingreso' && (
          <div
            role="status"
            className={`mb-6 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm border ${
              savedNotice.kind === 'income'
                ? 'bg-[#F3F1FF] dark:bg-[#12132B] border-[#5B3DF5]/35 dark:border-[#5B3DF5]/50'
                : savedNotice.kind === 'expense-deleted'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/35'
                  : 'bg-emerald-50 dark:bg-[#0B2320] border-emerald-200 dark:border-emerald-500/40'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2
                className={`w-4 h-4 shrink-0 ${
                  savedNotice.kind === 'income'
                    ? 'text-[#5B3DF5] dark:text-[#8B75FF]'
                    : savedNotice.kind === 'expense-deleted'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                }`}
                aria-hidden="true"
              />
              {savedNotice.kind === 'income' ? (
                <p className="text-slate-700 dark:text-slate-200 truncate">
                  Ingreso registrado correctamente:{' '}
                  <strong className="text-emerald-700 dark:text-[#14E19D] font-mono tabular-nums">
                    +{formatCOP(savedNotice.item.amount)}
                  </strong>{' '}
                  ({savedNotice.item.concept} · {savedNotice.item.incomeCategory}).
                </p>
              ) : savedNotice.kind === 'expense-deleted' ? (
                <p className="text-slate-700 dark:text-slate-200 truncate">
                  Gasto eliminado:{' '}
                  <strong className="text-slate-900 dark:text-white font-mono tabular-nums">
                    {formatCOP(savedNotice.amount)}
                  </strong>{' '}
                  ({savedNotice.concept}).
                </p>
              ) : (
                <p className="text-slate-700 dark:text-slate-200 truncate">
                  {savedNotice.kind === 'expense-updated' ? 'Gasto actualizado:' : 'Gasto guardado:'}{' '}
                  <strong className="text-slate-900 dark:text-white font-mono tabular-nums">
                    {formatCOP(savedNotice.item.amount)}
                  </strong>{' '}
                  en{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {CATEGORIES[savedNotice.item.categoryId].label}
                  </strong>{' '}
                  ({savedNotice.item.concept}).
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {savedNotice.kind !== 'expense-deleted' && savedNotice.item.id && (
                <button
                  type="button"
                  onClick={() => handleOpenMovementDetail(savedNotice.item.id!, 'dashboard')}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200 underline underline-offset-2 cursor-pointer whitespace-nowrap"
                >
                  Ver detalle
                </button>
              )}
              <button
                type="button"
                onClick={() => setSavedNotice(null)}
                aria-label="Cerrar aviso"
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Screen 1: Dashboard principal */}
          {activeScreen === 'dashboard' && (
            <motion.div
              key="screen-dashboard"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <FinancialSummary
                month={activeMonth}
                hasExpenses={hasExpenses}
                totalIncome={totalIncome}
                effectiveBudget={effectiveBudget}
                totalSpent={totalSpent}
                availableBalance={availableBalance}
                onUpdateMonthlyBudget={handleUpdateMonthlyBudget}
                onStartRegisterExpense={openRegisterExpense}
                onStartRegisterIncome={openRegisterIncome}
              />

              {hasExpenses ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  <div className="lg:col-span-7">
                    <DailySpendingChart
                      month={activeMonth}
                      selectedCategory={selectedCategory}
                      onSelectCategory={setSelectedCategory}
                    />
                  </div>

                  <div className="lg:col-span-5">
                    <RecentMovements
                      recentMovements={recentFiveMovements}
                      totalMovementsCount={allMovements.length}
                      currentDay={activeMonth.currentDay}
                      allExpenses={activeMonth.expenses}
                      totalSpent={totalSpent}
                      selectedCategory={selectedCategory}
                      onSelectCategory={setSelectedCategory}
                      onSelectMovement={(id) => handleOpenMovementDetail(id, 'dashboard')}
                      onEditExpense={(id) => handleStartEditExpense(id, 'dashboard')}
                      onDeleteExpense={(id) => handleDeleteExpense(id, 'dashboard')}
                      onViewAllMovements={() => {
                        setActiveScreen('movimientos');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  </div>
                </div>
              ) : hasIncomes ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  <section
                    aria-labelledby="dashboard-vacio-heading"
                    className="lg:col-span-7 bg-white dark:bg-[#0D1424]/95 rounded-2xl border border-slate-200 dark:border-white/[0.08] px-6 py-12 sm:py-14 text-center shadow-sm dark:shadow-lg dark:shadow-black/20 flex flex-col items-center justify-center"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#5B3DF5]/10 dark:bg-[#5B3DF5]/15 border border-[#5B3DF5]/25 dark:border-[#5B3DF5]/30 flex items-center justify-center mx-auto mb-4">
                      <Receipt
                        className="w-6 h-6 text-[#5B3DF5] dark:text-[#8B75FF]"
                        aria-hidden="true"
                      />
                    </div>
                    <h2
                      id="dashboard-vacio-heading"
                      className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white text-balance"
                    >
                      Aún no hay gastos este mes
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto">
                      Registra el primero y empieza a ver en qué se va la plata
                    </p>
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={openRegisterExpense}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#5B3DF5] hover:bg-[#6D52F7] text-white text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shadow-lg shadow-[#5B3DF5]/25 dark:shadow-[#5B3DF5]/30 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B75FF]"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                        Registrar tu primer gasto
                      </button>
                    </div>
                  </section>

                  <div className="lg:col-span-5">
                    <RecentMovements
                      recentMovements={recentFiveMovements}
                      totalMovementsCount={allMovements.length}
                      currentDay={activeMonth.currentDay}
                      allExpenses={activeMonth.expenses}
                      totalSpent={totalSpent}
                      selectedCategory={selectedCategory}
                      onSelectCategory={setSelectedCategory}
                      onSelectMovement={(id) => handleOpenMovementDetail(id, 'dashboard')}
                      onEditExpense={(id) => handleStartEditExpense(id, 'dashboard')}
                      onDeleteExpense={(id) => handleDeleteExpense(id, 'dashboard')}
                      onViewAllMovements={() => {
                        setActiveScreen('movimientos');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  </div>
                </div>
              ) : (
                <section
                  aria-labelledby="dashboard-vacio-heading"
                  className="bg-white dark:bg-[#0D1424]/95 rounded-2xl border border-slate-200 dark:border-white/[0.08] px-6 py-12 sm:py-14 text-center shadow-sm dark:shadow-lg dark:shadow-black/20"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#5B3DF5]/10 dark:bg-[#5B3DF5]/15 border border-[#5B3DF5]/25 dark:border-[#5B3DF5]/30 flex items-center justify-center mx-auto mb-4">
                    <Receipt
                      className="w-6 h-6 text-[#5B3DF5] dark:text-[#8B75FF]"
                      aria-hidden="true"
                    />
                  </div>
                  <h2
                    id="dashboard-vacio-heading"
                    className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white text-balance"
                  >
                    Aún no hay gastos este mes
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto">
                    Registra el primero y empieza a ver en qué se va la plata
                  </p>
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={openRegisterExpense}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#5B3DF5] hover:bg-[#6D52F7] text-white text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shadow-lg shadow-[#5B3DF5]/25 dark:shadow-[#5B3DF5]/30 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B75FF]"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                      Registrar tu primer gasto
                    </button>
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {/* Screen 2: Movimientos */}
          {activeScreen === 'movimientos' && (
            <motion.div
              key="screen-movimientos"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <MovimientosView
                month={activeMonth}
                allMovements={allMovements}
                onBackToDashboard={() => setActiveScreen('dashboard')}
                onSelectMovement={(id) => handleOpenMovementDetail(id, 'movimientos')}
                onEditExpense={(id) => handleStartEditExpense(id, 'movimientos')}
                onDeleteExpense={(id) => handleDeleteExpense(id, 'movimientos')}
                onStartRegisterExpense={openRegisterExpense}
                onStartRegisterIncome={openRegisterIncome}
              />
            </motion.div>
          )}

          {/* Screen 3: Detalle */}
          {activeScreen === 'detalle' && (
            <motion.div
              key="screen-detalle"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <DetalleMovimientoView
                key={selectedMovement?.id ?? 'empty'}
                movement={selectedMovement}
                month={activeMonth}
                effectiveBudget={effectiveBudget}
                totalSpent={totalSpent}
                dayTotal={selectedExpenseDayTotal}
                onBack={() => setActiveScreen(returnScreen)}
                onEditExpense={(id) => handleStartEditExpense(id, 'detalle')}
                onDeleteExpense={(id) => handleDeleteExpense(id, 'detalle')}
              />
            </motion.div>
          )}

          {/* Screen 4: Registrar o editar gasto */}
          {activeScreen === 'registrar' && (
            <motion.div
              key="screen-registrar-gasto"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <RegistrarGastoView
                key={editingExpense?.id ?? 'new'}
                month={activeMonth}
                availableBalance={availableBalance}
                initialExpense={editingExpense}
                onCancel={() => {
                  const target = editingExpense ? editReturnScreen : 'dashboard';
                  setEditingExpenseId(null);
                  setActiveScreen(target);
                }}
                onSaveExpense={handleSaveExpenseForm}
              />
            </motion.div>
          )}

          {/* Screen 5: Registrar Nuevo Ingreso */}
          {activeScreen === 'registrar-ingreso' && (
            <motion.div
              key="screen-registrar-ingreso"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <RegistrarIngresoView
                month={activeMonth}
                effectiveBudget={effectiveBudget}
                availableBalance={availableBalance}
                onCancel={() => setActiveScreen('dashboard')}
                onSaveIncome={handleSaveNewIncome}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Botón flotante para abrir el Asistente Inteligente */}
      <button
        type="button"
        onClick={() => setAssistantOpen(true)}
        aria-label="Abrir asistente de gastos"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#5B3DF5] hover:bg-[#6D52F7] text-white text-sm font-semibold shadow-xl shadow-[#5B3DF5]/35 border border-white/15 transition-all duration-150 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B75FF]"
      >
        <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>Asistente</span>
      </button>

      <AssistantDrawer
        key={currentUser.uid}
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        userName={userName}
        onUpdateUserName={handleUpdateUserName}
        month={activeMonth}
        totalIncome={totalIncome}
        effectiveBudget={effectiveBudget}
        totalSpent={totalSpent}
        availableBalance={availableBalance}
        onRegisterExpense={handleAssistantRegisterExpense}
      />
    </div>
  );
}
