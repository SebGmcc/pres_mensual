import { useState, type FormEvent } from 'react';
import { AlertCircle, ArrowLeft, Check } from 'lucide-react';
import {
  CATEGORIES,
  CATEGORY_LIST,
  formatCOP,
  getCurrentTimeString,
  type CategoryId,
  type ExpenseItem,
  type MonthDataset,
} from '../data/budgetData';
import { CategoryIcon } from './CategoryIcon';

interface RegistrarGastoViewProps {
  month: MonthDataset;
  availableBalance: number;
  initialExpense?: ExpenseItem | null;
  onCancel: () => void;
  onSaveExpense: (newExpense: Omit<ExpenseItem, 'id'>) => void;
}

const QUICK_AMOUNTS = [15000, 25000, 50000, 100000];

export function RegistrarGastoView({
  month,
  availableBalance,
  initialExpense = null,
  onCancel,
  onSaveExpense,
}: RegistrarGastoViewProps) {
  const isEditing = Boolean(initialExpense);
  const [amountInput, setAmountInput] = useState<string>(
    initialExpense ? String(initialExpense.amount) : ''
  );
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>(
    initialExpense ? initialExpense.categoryId : 'alimentacion'
  );
  const [concept, setConcept] = useState<string>(
    initialExpense ? initialExpense.concept : ''
  );
  const [day, setDay] = useState<number>(
    initialExpense ? initialExpense.day : month.currentDay
  );
  const [notes, setNotes] = useState<string>(
    initialExpense?.notes ? initialExpense.notes : ''
  );
  const [errors, setErrors] = useState<{
    amount?: string;
    concept?: string;
    day?: string;
  }>({});

  const numericAmount = Number(amountInput.replace(/\D/g, '')) || 0;
  const balanceBeforeExpense = initialExpense
    ? availableBalance + initialExpense.amount
    : availableBalance;
  const projectedBalance = balanceBeforeExpense - numericAmount;
  const activeCategoryMeta = CATEGORIES[selectedCategory];

  const handleAmountChange = (rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, '').slice(0, 9);
    setAmountInput(digitsOnly);
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: undefined }));
    }
  };

  const handleQuickAmount = (value: number) => {
    setAmountInput(String(value));
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: undefined }));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const nextErrors: { amount?: string; concept?: string; day?: string } = {};

    if (!numericAmount || numericAmount <= 0) {
      nextErrors.amount = 'Ingresa un monto válido mayor a $0 COP.';
    } else if (numericAmount > 50000000) {
      nextErrors.amount = 'El monto no puede superar $50.000.000 COP.';
    }

    if (concept.trim().length < 2) {
      nextErrors.concept = 'Escribe un concepto breve (ej. Almuerzo, Transporte).';
    }

    const maxAllowedDay = Math.max(month.currentDay, initialExpense?.day ?? month.currentDay);
    if (day < 1 || day > maxAllowedDay) {
      nextErrors.day = `El día debe estar entre 1 y ${maxAllowedDay} de ${month.label.toLowerCase()}.`;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSaveExpense({
      day,
      dateLabel: `${day} ${month.shortMonth} ${month.year}`,
      shortDate: `${day} ${month.shortMonth}`,
      time: initialExpense ? initialExpense.time : getCurrentTimeString(),
      categoryId: selectedCategory,
      concept: concept.trim(),
      notes: notes.trim() ? notes.trim() : undefined,
      amount: numericAmount,
    });
  };

  const maxDayOption = Math.max(month.currentDay, initialExpense?.day ?? month.currentDay);
  const dayOptions = Array.from({ length: maxDayOption }, (_, idx) => maxDayOption - idx);

  return (
    <section aria-labelledby="registrar-gasto-heading" className="max-w-xl mx-auto space-y-5">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {isEditing ? 'Volver' : 'Volver al Dashboard'}
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {isEditing ? `Edición · ${month.label}` : `Registro rápido · ${month.label}`}
        </span>
      </div>

      {/* Main Fast Entry Form Card */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white dark:bg-[#0D1424]/95 rounded-2xl border border-slate-200 dark:border-white/[0.08] p-5 sm:p-7 space-y-6 shadow-sm dark:shadow-none"
      >
        <div>
          <h1
            id="registrar-gasto-heading"
            className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
          >
            {isEditing ? 'Editar gasto' : 'Registrar nuevo gasto'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            {isEditing
              ? 'Modifica el monto, categoría, fecha o concepto para actualizar tu presupuesto.'
              : 'Completa el monto, categoría y concepto para actualizar tu saldo al instante.'}
          </p>
        </div>

        {/* 1. Monto en COP */}
        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="expense-amount" className="text-sm font-medium text-slate-800 dark:text-slate-200">
              1. ¿Cuánto pagaste?
            </label>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {numericAmount > 0 ? formatCOP(numericAmount) : '$0 COP'}
            </span>
          </div>

          <div className="relative">
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-mono font-semibold text-slate-400 pointer-events-none"
              aria-hidden="true"
            >
              $
            </span>
            <input
              id="expense-amount"
              type="text"
              inputMode="numeric"
              autoFocus
              value={amountInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="Ej: 35000"
              aria-invalid={Boolean(errors.amount)}
              className={`w-full pl-9 pr-16 py-3.5 rounded-xl bg-slate-50 dark:bg-[#121B30] border text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none transition-colors ${
                errors.amount
                  ? 'border-rose-500/70 focus:border-rose-500 dark:focus:border-rose-400'
                  : 'border-slate-200 dark:border-white/[0.1] focus:border-emerald-500 dark:focus:border-emerald-400/70'
              }`}
            />
            <span
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-medium text-slate-400 pointer-events-none"
              aria-hidden="true"
            >
              COP
            </span>
          </div>

          {/* 1-Tap Quick Amounts */}
          <div className="flex flex-wrap items-center gap-2">
            {QUICK_AMOUNTS.map((val) => {
              const isMatch = numericAmount === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmount(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer tabular-nums ${
                    isMatch
                      ? 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/50 dark:border-emerald-400/50 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-[#121A2D] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {formatCOP(val)}
                </button>
              );
            })}
          </div>

          {errors.amount && (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {errors.amount}
            </p>
          )}
        </div>

        {/* 2. Categoría (1-tap selection) */}
        <div className="space-y-2.5">
          <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">
            2. Categoría
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CATEGORY_LIST.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-[#15223D] border-sky-500 dark:border-sky-400/60 text-slate-900 dark:text-white'
                      : 'bg-slate-50 dark:bg-[#11192C] border-slate-200 dark:border-white/[0.07] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cat.iconBg} ${cat.iconText}`}
                  >
                    <CategoryIcon categoryId={cat.id} className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium leading-snug">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Concepto y Fecha */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="expense-concept" className="block text-sm font-medium text-slate-800 dark:text-slate-200">
              3. ¿En qué gastaste?
            </label>
            <input
              id="expense-concept"
              type="text"
              maxLength={60}
              value={concept}
              onChange={(e) => {
                setConcept(e.target.value);
                if (errors.concept) {
                  setErrors((prev) => ({ ...prev, concept: undefined }));
                }
              }}
              placeholder="Ej: Almuerzo del día, Recarga transporte..."
              aria-invalid={Boolean(errors.concept)}
              className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#121B30] border text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-colors ${
                errors.concept
                  ? 'border-rose-500/70 focus:border-rose-500 dark:focus:border-rose-400'
                  : 'border-slate-200 dark:border-white/[0.1] focus:border-sky-500 dark:focus:border-sky-400/70'
              }`}
            />

            {/* Quick Concept Chips based on chosen category */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {activeCategoryMeta.quickConcepts.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setConcept(suggestion);
                    if (errors.concept) {
                      setErrors((prev) => ({ ...prev, concept: undefined }));
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#121A2D] border border-slate-200 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-white/20 text-[11px] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {errors.concept && (
              <p role="alert" className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                {errors.concept}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="expense-day" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Fecha
              </label>
              <select
                id="expense-day"
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#121B30] border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 dark:focus:border-sky-400/70 cursor-pointer"
              >
                {dayOptions.map((d) => (
                  <option key={d} value={d} className="bg-white text-slate-900 dark:bg-[#0F172A] dark:text-white">
                    {d === month.currentDay
                      ? `Hoy (${d} ${month.shortMonth} ${month.year})`
                      : `${d} ${month.shortMonth} ${month.year}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="expense-notes" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Nota adicional (opcional)
              </label>
              <input
                id="expense-notes"
                type="text"
                maxLength={120}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Pago rápido en tienda"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#121B30] border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400/70"
              />
            </div>
          </div>
        </div>

        {/* Live Balance Impact Strip */}
        <div className="rounded-xl bg-slate-50 dark:bg-[#0B1726] border border-slate-200 dark:border-white/[0.07] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-slate-600 dark:text-slate-400">
            Saldo actual:{' '}
            <strong className="text-slate-900 dark:text-slate-200 font-mono tabular-nums">
              {formatCOP(availableBalance)}
            </strong>
          </span>
          <span className="text-slate-600 dark:text-slate-400">
            Saldo tras guardar:{' '}
            <strong
              className={`font-mono tabular-nums ${
                projectedBalance < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-[#14E19D]'
              }`}
            >
              {formatCOP(projectedBalance)}
            </strong>
          </span>
        </div>

        {/* Action Row */}
        <div className="pt-1 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.11] text-slate-800 dark:text-slate-200 text-sm font-medium transition-colors cursor-pointer text-center"
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-slate-950 text-sm font-semibold transition-colors cursor-pointer shadow-md shadow-emerald-600/20 dark:shadow-lg dark:shadow-emerald-950/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            <Check className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
            {isEditing ? 'Guardar cambios' : 'Guardar gasto'}
          </button>
        </div>
      </form>
    </section>
  );
}
