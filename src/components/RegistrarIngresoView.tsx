import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Sparkles } from 'lucide-react';
import {
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  formatCOP,
  formatCOPDigits,
  getCurrentTimeString,
  getDefaultIsoDateForMonth,
  parseIsoDateParts,
  type IncomeCategory,
  type IncomeItem,
  type MonthDataset,
  type PaymentMethod,
} from '../data/budgetData';

interface RegistrarIngresoViewProps {
  month: MonthDataset;
  effectiveBudget: number;
  availableBalance: number;
  onCancel: () => void;
  onSaveIncome: (newIncome: Omit<IncomeItem, 'id'>) => void;
}

const QUICK_INCOME_AMOUNTS = [250000, 500000, 800000, 1500000, 2500000];
const DESCRIPTION_SUGGESTIONS = [
  'Salario',
  'Freelance',
  'Venta de computador',
  'Bonificación',
  'Reembolso',
];

export function RegistrarIngresoView({
  month,
  effectiveBudget,
  availableBalance,
  onCancel,
  onSaveIncome,
}: RegistrarIngresoViewProps) {
  const [amountDigits, setAmountDigits] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory>('Salario');
  const [isoDate, setIsoDate] = useState<string>(() => getDefaultIsoDateForMonth(month));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cuenta bancaria');
  const [notes, setNotes] = useState<string>('');
  const [isSavedAnimation, setIsSavedAnimation] = useState(false);

  const [errors, setErrors] = useState<{
    amount?: string;
    description?: string;
    category?: string;
    date?: string;
    paymentMethod?: string;
  }>({});

  const numericAmount = Number(amountDigits) || 0;
  const formattedInputDisplay = formatCOPDigits(amountDigits);
  const projectedBudget = effectiveBudget + numericAmount;
  const projectedBalance = availableBalance + numericAmount;

  const handleAmountChange = (rawValue: string) => {
    if (rawValue.includes('-')) {
      setErrors((prev) => ({
        ...prev,
        amount: 'No se permiten valores negativos. Ingresa un valor positivo en COP.',
      }));
      return;
    }

    const digits = rawValue.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10);
    setAmountDigits(digits);

    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: undefined }));
    }
  };

  const handleQuickAmount = (val: number) => {
    setAmountDigits(String(val));
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: undefined }));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isSavedAnimation) return;

    const nextErrors: typeof errors = {};

    if (!amountDigits || numericAmount <= 0) {
      nextErrors.amount = 'Ingresa un valor de ingreso válido mayor a $0 COP.';
    } else if (numericAmount > 500000000) {
      nextErrors.amount = 'El valor ingresado supera el límite permitido.';
    }

    if (description.trim().length < 2) {
      nextErrors.description =
        'La descripción es obligatoria (ej. Salario, Freelance o Reembolso).';
    }

    if (!incomeCategory) {
      nextErrors.category = 'Selecciona una categoría válida.';
    }

    if (!isoDate) {
      nextErrors.date = 'Selecciona la fecha del ingreso.';
    }

    if (!paymentMethod) {
      nextErrors.paymentMethod = 'Selecciona un medio de pago.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const { day, dateLabel, shortDate } = parseIsoDateParts(isoDate);

    setIsSavedAnimation(true);

    const payload: Omit<IncomeItem, 'id'> = {
      type: 'income',
      day,
      isoDate,
      dateLabel,
      shortDate,
      time: getCurrentTimeString(),
      incomeCategory,
      paymentMethod,
      concept: description.trim(),
      notes: notes.trim() ? notes.trim() : undefined,
      amount: numericAmount,
    };

    window.setTimeout(() => {
      onSaveIncome(payload);
    }, 650);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      aria-labelledby="registrar-ingreso-heading"
      className="max-w-2xl mx-auto space-y-5"
    >
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Volver al Dashboard
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Nuevo ingreso · {month.label}
        </span>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-[#0D1424]/95 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-sm dark:shadow-2xl dark:shadow-black/40 overflow-hidden">
        {/* Accent Header Strip */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/[0.08] bg-gradient-to-r from-[#5B3DF5]/10 via-[#5B3DF5]/5 to-transparent dark:from-[#5B3DF5]/15 dark:via-[#5B3DF5]/5 dark:to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5B3DF5]/15 dark:bg-[#5B3DF5]/20 border border-[#5B3DF5]/30 dark:border-[#5B3DF5]/40 flex items-center justify-center shrink-0">
              <span className="text-lg leading-none" aria-hidden="true">
                💵
              </span>
            </div>
            <div>
              <h1
                id="registrar-ingreso-heading"
                className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
              >
                Registrar Nuevo Ingreso
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                Registra cualquier dinero recibido en el mes para aumentar tu saldo disponible.
              </p>
            </div>
          </div>
        </div>

        {/* Success Feedback Banner inside Form during Save Transition */}
        {isSavedAnimation ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="p-10 sm:p-12 text-center space-y-4"
            role="status"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/35 dark:border-emerald-400/40 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                ✅ Ingreso registrado correctamente.
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-mono font-semibold tabular-nums">
                +{formatCOP(numericAmount)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                Actualizando tu presupuesto y regresando al Dashboard...
              </p>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="p-5 sm:p-7 space-y-5">
            {/* 1. Valor del ingreso (obligatorio) */}
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="income-amount"
                  className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
                >
                  <span aria-hidden="true">💰</span>
                  Valor del ingreso <span className="text-[#5B3DF5] dark:text-[#8B75FF]">*</span>
                </label>
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {numericAmount > 0 ? `+${formatCOP(numericAmount)}` : '$0 COP'}
                </span>
              </div>

              <div className="relative">
                <input
                  id="income-amount"
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={formattedInputDisplay}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="$850.000"
                  aria-invalid={Boolean(errors.amount)}
                  className={`w-full pl-4 pr-16 py-3.5 rounded-xl bg-slate-50 dark:bg-[#121B30] border text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none transition-colors ${
                    errors.amount
                      ? 'border-rose-500/70 focus:border-rose-500 dark:focus:border-rose-400'
                      : 'border-slate-200 dark:border-white/[0.1] focus:border-[#5B3DF5]'
                  }`}
                />
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-medium text-slate-400 pointer-events-none"
                  aria-hidden="true"
                >
                  COP
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {QUICK_INCOME_AMOUNTS.map((val) => {
                  const isMatch = numericAmount === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleQuickAmount(val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer tabular-nums ${
                        isMatch
                          ? 'bg-[#5B3DF5]/15 dark:bg-[#5B3DF5]/25 border-[#5B3DF5] text-[#4C2EE0] dark:text-white'
                          : 'bg-slate-100 dark:bg-[#121A2D] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:border-[#5B3DF5]/50 hover:text-slate-900 dark:hover:text-white'
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

            {/* 2. Descripción (obligatorio) */}
            <div className="space-y-2">
              <label
                htmlFor="income-description"
                className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
              >
                <span aria-hidden="true">📝</span>
                Descripción <span className="text-[#5B3DF5] dark:text-[#8B75FF]">*</span>
              </label>
              <input
                id="income-description"
                type="text"
                maxLength={70}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) {
                    setErrors((prev) => ({ ...prev, description: undefined }));
                  }
                }}
                placeholder="Ej: Salario, Freelance, Venta de computador, Bonificación..."
                aria-invalid={Boolean(errors.description)}
                className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#121B30] border text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-colors ${
                  errors.description
                    ? 'border-rose-500/70 focus:border-rose-500 dark:focus:border-rose-400'
                    : 'border-slate-200 dark:border-white/[0.1] focus:border-[#5B3DF5]'
                }`}
              />

              <div className="flex flex-wrap items-center gap-1.5">
                {DESCRIPTION_SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setDescription(item);
                      if (errors.description) {
                        setErrors((prev) => ({ ...prev, description: undefined }));
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#121A2D] border border-slate-200 dark:border-white/[0.07] hover:border-[#5B3DF5]/50 text-[11px] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
              </div>

              {errors.description && (
                <p role="alert" className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* 3. Categoría & Fecha del ingreso */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="income-category"
                  className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
                >
                  <span aria-hidden="true">📂</span>
                  Categoría <span className="text-[#5B3DF5] dark:text-[#8B75FF]">*</span>
                </label>
                <select
                  id="income-category"
                  value={incomeCategory}
                  onChange={(e) => {
                    setIncomeCategory(e.target.value as IncomeCategory);
                    if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#121B30] border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#5B3DF5] cursor-pointer"
                >
                  {INCOME_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-white text-slate-900 dark:bg-[#0F172A] dark:text-white">
                      {cat}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
                    {errors.category}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="income-date"
                  className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
                >
                  <span aria-hidden="true">📅</span>
                  Fecha del ingreso <span className="text-[#5B3DF5] dark:text-[#8B75FF]">*</span>
                </label>
                <input
                  id="income-date"
                  type="date"
                  value={isoDate}
                  onChange={(e) => {
                    setIsoDate(e.target.value);
                    if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#121B30] border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#5B3DF5] cursor-pointer"
                />
                {errors.date && (
                  <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
                    {errors.date}
                  </p>
                )}
              </div>
            </div>

            {/* 4. Medio de pago */}
            <div className="space-y-1.5">
              <label
                htmlFor="income-payment-method"
                className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
              >
                <span aria-hidden="true">🏦</span>
                Medio de pago <span className="text-[#5B3DF5] dark:text-[#8B75FF]">*</span>
              </label>
              <select
                id="income-payment-method"
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value as PaymentMethod);
                  if (errors.paymentMethod) {
                    setErrors((prev) => ({ ...prev, paymentMethod: undefined }));
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#121B30] border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#5B3DF5] cursor-pointer"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method} className="bg-white text-slate-900 dark:bg-[#0F172A] dark:text-white">
                    {method}
                  </option>
                ))}
              </select>
              {errors.paymentMethod && (
                <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
                  {errors.paymentMethod}
                </p>
              )}
            </div>

            {/* 5. Observaciones (opcional, varias líneas) */}
            <div className="space-y-1.5">
              <label
                htmlFor="income-notes"
                className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
              >
                <span aria-hidden="true">📝</span>
                Observaciones <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(opcional)</span>
              </label>
              <textarea
                id="income-notes"
                rows={3}
                maxLength={250}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agrega detalles adicionales sobre este ingreso..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#121B30] border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#5B3DF5] resize-y"
              />
            </div>

            {/* Live Budget & Balance Impact Preview */}
            <div className="rounded-xl bg-[#F4F1FF] dark:bg-[#0B1726] border border-[#5B3DF5]/20 dark:border-[#5B3DF5]/25 px-4 py-3.5 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-[#5B3DF5] dark:text-[#A594FF] font-medium">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Impacto en tu presupuesto del mes
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <span className="text-slate-600 dark:text-slate-400">
                  Presupuesto total:{' '}
                  <strong className="text-slate-900 dark:text-white font-mono tabular-nums">
                    {formatCOP(projectedBudget)}
                  </strong>
                </span>
                <span className="text-slate-600 dark:text-slate-400 sm:text-right">
                  Nuevo saldo disponible:{' '}
                  <strong className="text-emerald-600 dark:text-[#14E19D] font-mono tabular-nums">
                    {formatCOP(projectedBalance)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Buttons: Guardar ingreso (morado #5B3DF5) + Cancelar (gris) */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-600/75 text-slate-800 dark:text-slate-200 text-sm font-medium transition-all duration-150 cursor-pointer text-center hover:-translate-y-0.5 active:translate-y-0"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#5B3DF5] hover:bg-[#6D52F7] text-white text-sm font-semibold transition-all duration-150 cursor-pointer shadow-md shadow-[#5B3DF5]/25 dark:shadow-lg dark:shadow-[#5B3DF5]/30 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B75FF]"
              >
                <Check className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                Guardar ingreso
              </button>
            </div>
          </form>
        )}
      </div>
    </motion.section>
  );
}
