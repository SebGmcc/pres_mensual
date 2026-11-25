import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Layers,
  Pencil,
  Plus,
  Wallet,
  X,
} from 'lucide-react';
import { formatCOP, formatPercent, type MonthDataset } from '../data/budgetData';

interface FinancialSummaryProps {
  month: MonthDataset;
  hasExpenses: boolean;
  totalIncome: number;
  effectiveBudget: number;
  totalSpent: number;
  availableBalance: number;
  onUpdateMonthlyBudget: (newBudget: number) => void;
  onStartRegisterExpense: () => void;
  onStartRegisterIncome: () => void;
}

export function FinancialSummary({
  month,
  hasExpenses,
  totalIncome,
  effectiveBudget,
  totalSpent,
  availableBalance,
  onUpdateMonthlyBudget,
  onStartRegisterExpense,
  onStartRegisterIncome,
}: FinancialSummaryProps) {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(month.monthlyBudget));
  const [budgetError, setBudgetError] = useState<string | null>(null);

  useEffect(() => {
    setBudgetInput(String(month.monthlyBudget));
    setIsEditingBudget(false);
    setBudgetError(null);
  }, [month.id, month.monthlyBudget]);

  const rawSpentPct =
    effectiveBudget > 0 ? (totalSpent / effectiveBudget) * 100 : totalSpent > 0 ? 100 : 0;
  const barSpentWidth = Math.min(100, Math.max(0, rawSpentPct));
  const barAvailableWidth = Math.max(0, 100 - barSpentWidth);
  const availablePct = Math.max(0, 100 - rawSpentPct);

  const monthProgressPct = (month.currentDay / month.totalDays) * 100;
  const remainingDays = month.totalDays - month.currentDay;
  const dailyAllowance =
    remainingDays > 0 ? Math.round(availableBalance / remainingDays) : availableBalance;
  const isNegativeBalance = availableBalance < 0;

  const numericDraftBudget = Number(budgetInput.replace(/\D/g, '')) || 0;

  const handleOpenEdit = () => {
    setBudgetInput(String(month.monthlyBudget));
    setBudgetError(null);
    setIsEditingBudget(true);
  };

  const handleCancelEdit = () => {
    setBudgetInput(String(month.monthlyBudget));
    setBudgetError(null);
    setIsEditingBudget(false);
  };

  const handleSaveBudget = (e: FormEvent) => {
    e.preventDefault();
    if (!numericDraftBudget || numericDraftBudget <= 0) {
      setBudgetError('Ingresa un presupuesto válido mayor a $0 COP.');
      return;
    }
    if (numericDraftBudget > 100000000) {
      setBudgetError('El presupuesto máximo permitido es $100.000.000 COP.');
      return;
    }
    onUpdateMonthlyBudget(numericDraftBudget);
    setBudgetError(null);
    setIsEditingBudget(false);
  };

  return (
    <section aria-labelledby="resumen-financiero-heading" className="space-y-5">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 pb-1">
        <div>
          <h1
            id="resumen-financiero-heading"
            className="text-2xl sm:text-[32px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance"
          >
            Resumen financiero <span className="text-sky-600 dark:text-sky-400">del mes</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Saldo disponible = Presupuesto disponible − Gastos registrados
          </p>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 tabular-nums md:text-right">
          {remainingDays > 0 ? (
            <>
              Margen diario ({remainingDays} días restantes):{' '}
              <span
                className={`font-semibold ${
                  isNegativeBalance ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                }`}
              >
                {formatCOP(Math.max(0, dailyAllowance))}
              </span>
            </>
          ) : (
            <>
              Cierre del mes:{' '}
              <span
                className={`font-semibold ${
                  isNegativeBalance ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                }`}
              >
                {formatCOP(availableBalance)}
              </span>
            </>
          )}
        </p>
      </div>

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Presupuesto disponible (Base editable + Ingresos) */}
        <div
          className={`rounded-2xl bg-white dark:bg-[#0D1424]/95 border p-5 flex flex-col justify-between gap-3.5 shadow-sm dark:shadow-none transition-colors ${
            isEditingBudget
              ? 'border-sky-500/70 dark:border-sky-400/50'
              : 'border-slate-200 dark:border-white/[0.08]'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 dark:border-blue-400/20 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                {totalIncome > 0 ? 'Presupuesto disponible' : 'Presupuesto mensual'}
              </span>
            </div>

            {!isEditingBudget && (
              <button
                type="button"
                onClick={handleOpenEdit}
                aria-label="Editar presupuesto mensual"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:focus-visible:outline-sky-400"
              >
                <Pencil className="w-3 h-3" aria-hidden="true" />
                Editar
              </button>
            )}
          </div>

          {isEditingBudget ? (
            <form onSubmit={handleSaveBudget} noValidate className="space-y-2.5">
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono font-semibold text-slate-500 dark:text-slate-400 pointer-events-none"
                  aria-hidden="true"
                >
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  aria-label="Nuevo presupuesto base en COP"
                  value={budgetInput}
                  onChange={(e) => {
                    setBudgetInput(e.target.value.replace(/\D/g, '').slice(0, 9));
                    if (budgetError) setBudgetError(null);
                  }}
                  placeholder="Ej: 3200000"
                  className={`w-full pl-7 pr-12 py-2 rounded-xl bg-slate-50 dark:bg-[#121B30] border text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none ${
                    budgetError
                      ? 'border-rose-500/70 focus:border-rose-500 dark:focus:border-rose-400'
                      : 'border-slate-300 dark:border-white/[0.12] focus:border-sky-500 dark:focus:border-sky-400'
                  }`}
                />
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-500 dark:text-slate-400 pointer-events-none"
                  aria-hidden="true"
                >
                  COP
                </span>
              </div>

              {budgetError ? (
                <p role="alert" className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  {budgetError}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  Base: {numericDraftBudget > 0 ? formatCOP(numericDraftBudget) : '$0 COP'}
                  {totalIncome > 0 ? ` + ${formatCOP(totalIncome)} ingresos` : ''}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-xs font-medium text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                  Aplicar
                </button>
              </div>
            </form>
          ) : (
            <div>
              <p className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 dark:text-white tabular-nums leading-tight">
                {formatCOP(effectiveBudget)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
                {totalIncome > 0 ? (
                  <>
                    Base {formatCOP(month.monthlyBudget)} ·{' '}
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      +{formatCOP(totalIncome)} ingresos
                    </span>
                  </>
                ) : (
                  month.budgetSubtitle
                )}
              </p>
            </div>
          )}
        </div>

        {/* Card 2: Total gastado */}
        <div className="rounded-2xl bg-white dark:bg-[#0D1424]/95 border border-slate-200 dark:border-white/[0.08] p-5 flex flex-col justify-between gap-3.5 shadow-sm dark:shadow-none transition-colors">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 dark:border-indigo-400/20 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                Total gastado
              </span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
          </div>

          <div>
            <p className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 dark:text-white tabular-nums leading-tight">
              {formatCOP(totalSpent)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
              Equivale al{' '}
              <span
                className={`font-semibold ${
                  isNegativeBalance ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                }`}
              >
                {formatPercent(rawSpentPct)}
              </span>{' '}
              del presupuesto
            </p>
          </div>
        </div>

        {/* Card 3: Saldo disponible & Estado de cuenta */}
        <div
          className={`rounded-2xl p-5 flex flex-col justify-between gap-3.5 border shadow-sm dark:shadow-none transition-colors ${
            isNegativeBalance
              ? 'bg-gradient-to-br from-rose-50 to-red-50/70 dark:from-[#2B1016] dark:to-[#160D18] border-rose-200 dark:border-rose-500/50'
              : 'bg-gradient-to-br from-emerald-50 to-teal-50/70 dark:from-[#0B2320] dark:to-[#0B1722] border-emerald-200 dark:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  isNegativeBalance
                    ? 'bg-rose-500/15 border-rose-500/25 dark:border-rose-400/30'
                    : 'bg-emerald-500/15 border-emerald-500/25 dark:border-emerald-400/25'
                }`}
              >
                <Wallet
                  className={`w-5 h-5 ${
                    isNegativeBalance ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                  aria-hidden="true"
                />
              </div>
              <span
                className={`text-sm font-medium truncate ${
                  isNegativeBalance ? 'text-rose-900 dark:text-rose-100' : 'text-emerald-950 dark:text-emerald-100'
                }`}
              >
                Disponible para gastar
              </span>
            </div>

            {isNegativeBalance ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            )}
          </div>

          <div>
            <p
              className={`text-2xl sm:text-[26px] font-bold tracking-tight tabular-nums leading-tight ${
                isNegativeBalance ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-[#14E19D]'
              }`}
            >
              {availableBalance < 0
                ? `-${formatCOP(Math.abs(availableBalance))}`
                : formatCOP(availableBalance)}
            </p>
            <div className="flex items-center justify-between gap-2 mt-1.5 text-xs">
              <span
                className={`inline-flex items-center gap-1.5 font-semibold ${
                  isNegativeBalance ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {isNegativeBalance ? 'Balance negativo' : 'Balance positivo'}
              </span>
              <span className="text-slate-600 dark:text-slate-300 tabular-nums">
                {isNegativeBalance
                  ? `Déficit de ${formatCOP(Math.abs(availableBalance))}`
                  : `${formatPercent(availablePct)} disponible`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones rápidas (centrado respecto al bloque de tarjetas, con 28px de espacio superior) */}
      <div className="!mt-7 !mb-6 mx-auto w-full max-w-[600px] rounded-2xl bg-white dark:bg-[#0D1424]/95 border border-slate-200 dark:border-white/[0.08] px-5 py-4 sm:px-6 sm:py-5 shadow-md shadow-slate-200/70 dark:shadow-lg dark:shadow-black/20 transition-colors">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 text-center mb-3.5">
          Acciones rápidas
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          <button
            type="button"
            onClick={onStartRegisterIncome}
            className="w-full h-12 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-slate-950 text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shadow-md shadow-emerald-600/20 dark:shadow-lg dark:shadow-emerald-950/40 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:focus-visible:outline-emerald-400"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
            Registrar nuevo ingreso
          </button>

          <button
            type="button"
            onClick={onStartRegisterExpense}
            className="w-full h-12 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#5B3DF5] hover:bg-[#6D52F7] text-white text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shadow-md shadow-[#5B3DF5]/25 dark:shadow-lg dark:shadow-[#5B3DF5]/30 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B75FF]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
            Registrar nuevo gasto
          </button>
        </div>
      </div>

      {/* Progress Bar & Estado de Cuenta Card */}
      <div
        className={`rounded-2xl border px-5 py-4 shadow-sm dark:shadow-none transition-colors ${
          isNegativeBalance
            ? 'bg-rose-50/90 dark:bg-[#1A0E14]/90 border-rose-200 dark:border-rose-500/35'
            : 'bg-white dark:bg-[#0D1424]/95 border-slate-200 dark:border-white/[0.08]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
                isNegativeBalance ? 'bg-rose-500' : 'bg-blue-500'
              }`}
              aria-hidden="true"
            />
            <span className="text-slate-600 dark:text-slate-300">Gastado:</span>
            <span
              className={`font-semibold tabular-nums ${
                isNegativeBalance ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
              }`}
            >
              {formatPercent(rawSpentPct)}
            </span>
            <span className="text-slate-400 dark:text-slate-500" aria-hidden="true">
              ·
            </span>
            <span className="text-slate-700 dark:text-slate-300 tabular-nums">{formatCOP(totalSpent)}</span>
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
                isNegativeBalance ? 'bg-rose-500 dark:bg-rose-400' : 'bg-emerald-500 dark:bg-emerald-400'
              }`}
              aria-hidden="true"
            />
            <span className="text-slate-600 dark:text-slate-300">Estado de cuenta:</span>
            <span
              className={`font-semibold ${
                isNegativeBalance ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {isNegativeBalance ? 'Balance negativo' : 'Balance positivo'}
            </span>
            <span className="text-slate-400 dark:text-slate-500" aria-hidden="true">
              ·
            </span>
            <span className="text-slate-700 dark:text-slate-300 tabular-nums">
              {availableBalance < 0
                ? `-${formatCOP(Math.abs(availableBalance))}`
                : formatCOP(availableBalance)}
            </span>
          </div>
        </div>

        {/* Segmented Gradient Progress Bar */}
        <div className="relative">
          <div
            className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800/90 overflow-hidden flex"
            role="progressbar"
            aria-valuenow={Math.round(barSpentWidth)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Porcentaje gastado ${formatPercent(rawSpentPct)} frente a ${formatPercent(availablePct)} disponible`}
          >
            {isNegativeBalance ? (
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-rose-600 transition-[width] duration-300 ease-out"
                style={{ width: '100%' }}
              />
            ) : (
              <>
                <div
                  className="h-full bg-gradient-to-r from-[#3B82F6] to-[#6366F1] transition-[width] duration-300 ease-out"
                  style={{ width: `${barSpentWidth}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-[#10B981] to-[#34D399] transition-[width] duration-300 ease-out"
                  style={{ width: `${barAvailableWidth}%` }}
                />
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mt-3 text-xs text-slate-600 dark:text-slate-400">
          <span className={isNegativeBalance ? 'text-rose-700 dark:text-rose-300' : ''}>
            {isNegativeBalance
              ? 'Alerta: los gastos registrados superan el presupuesto disponible.'
              : rawSpentPct <= monthProgressPct
                ? 'Ejecución controlada: el gasto acumulado va por debajo del ritmo del mes.'
                : 'Ritmo de gasto por encima del promedio del calendario mensual.'}
          </span>
          <span className="tabular-nums text-slate-600 dark:text-slate-400">
            Avance del calendario:{' '}
            <strong className="font-medium text-slate-900 dark:text-slate-200">
              {formatPercent(monthProgressPct)}
            </strong>{' '}
            (día {month.currentDay}/{month.totalDays})
          </span>
        </div>
      </div>
    </section>
  );
}
