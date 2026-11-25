import { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Landmark,
  Pencil,
  PieChart,
  Tag,
  Trash2,
} from 'lucide-react';
import {
  CATEGORIES,
  formatCOP,
  formatPercent,
  type MonthDataset,
  type MovementItem,
} from '../data/budgetData';
import { CategoryIcon } from './CategoryIcon';

interface DetalleMovimientoViewProps {
  movement: MovementItem | null;
  month: MonthDataset;
  effectiveBudget: number;
  totalSpent: number;
  dayTotal: number;
  onBack: () => void;
  onEditExpense: (expenseId: string) => void;
  onDeleteExpense: (expenseId: string) => void;
}

export function DetalleMovimientoView({
  movement,
  effectiveBudget,
  totalSpent,
  dayTotal,
  onBack,
  onEditExpense,
  onDeleteExpense,
}: DetalleMovimientoViewProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Versión vacía de Detalle: texto suave sin botón
  if (!movement) {
    return (
      <section aria-label="Detalle vacío" className="max-w-2xl mx-auto py-8">
        <div className="bg-white dark:bg-[#0D1424]/95 rounded-2xl border border-slate-200 dark:border-white/[0.08] px-6 py-16 text-center shadow-sm dark:shadow-none">
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Selecciona un gasto en Movimientos para ver el detalle
          </p>
        </div>
      </section>
    );
  }

  const isIncome = movement.type === 'income';
  const pctOfBudget =
    effectiveBudget > 0 ? (movement.amount / effectiveBudget) * 100 : 0;
  const pctOfSpent = totalSpent > 0 ? (movement.amount / totalSpent) * 100 : 0;

  return (
    <section aria-labelledby="detalle-heading" className="max-w-2xl mx-auto space-y-6">
      {/* Top Back Navigation */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Volver
        </button>
      </div>

      {/* Main Detail Card */}
      <div className="bg-white dark:bg-[#0D1424]/95 rounded-2xl border border-slate-200 dark:border-white/[0.08] overflow-hidden shadow-sm dark:shadow-none">
        {/* Hero Amount & Category Header */}
        <div
          className={`p-6 sm:p-8 border-b border-slate-200 dark:border-white/[0.08] bg-gradient-to-br ${
            isIncome
              ? 'from-emerald-50 to-white dark:from-[#0B2320] dark:to-[#0B1422]'
              : 'from-slate-50 to-white dark:from-[#0F182D] dark:to-[#0B1221]'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {isIncome ? (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/15 border border-emerald-500/30">
                  <span className="text-xl leading-none" aria-hidden="true">
                    💰
                  </span>
                </div>
              ) : (
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${CATEGORIES[movement.categoryId].iconBg} ${CATEGORIES[movement.categoryId].iconText}`}
                >
                  <CategoryIcon categoryId={movement.categoryId} className="w-5 h-5" />
                </div>
              )}

              <div>
                <span
                  className={`text-xs font-medium ${
                    isIncome
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isIncome
                    ? `Ingreso · ${movement.incomeCategory}`
                    : CATEGORIES[movement.categoryId].label}
                </span>
                <h1
                  id="detalle-heading"
                  className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5"
                >
                  {movement.concept}
                </h1>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isIncome ? 'Monto recibido' : 'Monto registrado'}
            </span>
            <p
              className={`text-3xl sm:text-4xl font-bold font-mono tabular-nums tracking-tight mt-1 ${
                isIncome
                  ? 'text-emerald-600 dark:text-[#14E19D]'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {isIncome ? `+${formatCOP(movement.amount)}` : formatCOP(movement.amount)}
            </p>
          </div>
        </div>

        {/* All Metadata Fields */}
        <div className="p-6 sm:p-8 divide-y divide-slate-200 dark:divide-white/[0.06]">
          <div className="pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Fecha</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">
                  {movement.dateLabel}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Hora de registro</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white font-mono tabular-nums mt-0.5">
                  {movement.time}
                </p>
              </div>
            </div>
          </div>

          <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Tag className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Categoría</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">
                  {isIncome
                    ? movement.incomeCategory
                    : CATEGORIES[movement.categoryId].label}
                </p>
              </div>
            </div>

            {isIncome ? (
              <div className="flex items-start gap-3">
                <Landmark
                  className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Medio de pago</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">
                    {movement.paymentMethod}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <PieChart
                  className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Impacto financiero</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white tabular-nums mt-0.5">
                    {formatPercent(pctOfBudget)} del presupuesto · {formatPercent(pctOfSpent)} del
                    gasto mensual
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isIncome ? 'Observaciones' : 'Descripción y notas'}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-200 mt-0.5">
                  {movement.notes && movement.notes.trim().length > 0
                    ? movement.notes
                    : 'Sin observaciones adicionales registradas.'}
                </p>
              </div>
            </div>

            {isIncome ? (
              <div className="flex items-start gap-3">
                <PieChart
                  className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Aporte al presupuesto total
                  </p>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-[#14E19D] font-mono tabular-nums mt-0.5">
                    +{formatPercent(pctOfBudget)} del presupuesto disponible
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <Calendar
                  className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Acumulado de gastos ese día ({movement.shortDate})
                  </p>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5">
                    {formatCOP(dayTotal)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-6 space-y-3">
            {!isIncome && confirmingDelete && (
              <div
                role="alertdialog"
                aria-label="Confirmar eliminación de gasto"
                className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <p className="text-xs sm:text-sm text-rose-800 dark:text-rose-200">
                  ¿Eliminar este gasto de{' '}
                  <strong className="font-mono tabular-nums text-rose-950 dark:text-white">
                    {formatCOP(movement.amount)}
                  </strong>
                  ? Esta acción actualizará tu presupuesto y saldo disponible.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="px-3.5 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingDelete(false);
                      onDeleteExpense(movement.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Confirmar
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.13] text-slate-800 dark:text-white text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Volver
              </button>

              {!isIncome && (
                <div className="flex items-center gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete((prev) => !prev)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-700 hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-200 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    Eliminar
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditExpense(movement.id)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#5B3DF5] hover:bg-[#6D52F7] text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-md shadow-[#5B3DF5]/25"
                  >
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                    Editar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
