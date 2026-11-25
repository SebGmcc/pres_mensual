import { useState } from 'react';
import { ArrowRight, BarChart2, ChevronRight, Clock, Pencil, Trash2 } from 'lucide-react';
import {
  CATEGORIES,
  CATEGORY_LIST,
  formatCOP,
  formatPercent,
  type CategoryId,
  type ExpenseItem,
  type MovementItem,
} from '../data/budgetData';
import { CategoryIcon } from './CategoryIcon';

interface RecentMovementsProps {
  recentMovements: MovementItem[];
  totalMovementsCount: number;
  currentDay: number;
  allExpenses: ExpenseItem[];
  totalSpent: number;
  selectedCategory: CategoryId | 'all';
  onSelectCategory: (category: CategoryId | 'all') => void;
  onSelectMovement: (movementId: string) => void;
  onEditExpense: (expenseId: string) => void;
  onDeleteExpense: (expenseId: string) => void;
  onViewAllMovements: () => void;
}

export function RecentMovements({
  recentMovements,
  totalMovementsCount,
  currentDay,
  allExpenses,
  totalSpent,
  selectedCategory,
  onSelectCategory,
  onSelectMovement,
  onEditExpense,
  onDeleteExpense,
  onViewAllMovements,
}: RecentMovementsProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const categoryBreakdown = CATEGORY_LIST.map((cat) => {
    const sum = allExpenses
      .filter((item) => item.categoryId === cat.id)
      .reduce((acc, item) => acc + item.amount, 0);
    const pct = totalSpent > 0 ? (sum / totalSpent) * 100 : 0;
    return {
      ...cat,
      sum,
      pct,
    };
  }).sort((a, b) => b.sum - a.sum);

  return (
    <div className="space-y-5">
      {/* 1. Últimos movimientos (gastos e ingresos) */}
      <section
        aria-labelledby="ultimos-movimientos-heading"
        className="bg-white dark:bg-[#0D1424]/95 rounded-2xl border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 shadow-sm dark:shadow-none transition-colors"
      >
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 dark:border-blue-400/20 flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </div>
            <h2
              id="ultimos-movimientos-heading"
              className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white"
            >
              Últimos movimientos
            </h2>
          </div>

          <button
            type="button"
            onClick={onViewAllMovements}
            className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Ver todos ({totalMovementsCount})
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
          {recentMovements.map((movement) => {
            if (movement.type === 'income') {
              const dayLabel =
                movement.day === currentDay ? 'Hoy' : movement.dateLabel;
              return (
                <li key={movement.id}>
                  <button
                    type="button"
                    onClick={() => onSelectMovement(movement.id)}
                    className="w-full py-3 px-2 -mx-2 rounded-xl flex items-center justify-between gap-3 hover:bg-emerald-50 dark:hover:bg-emerald-500/[0.06] transition-colors cursor-pointer text-left group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:focus-visible:outline-emerald-400"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/15 border border-emerald-500/30">
                        <span className="text-base leading-none" aria-hidden="true">
                          💰
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">
                          {movement.concept}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {dayLabel} • Ingreso · {movement.paymentMethod}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-emerald-600 dark:text-[#14E19D] font-mono tabular-nums whitespace-nowrap">
                        +{formatCOP(movement.amount)}
                      </span>
                      <ChevronRight
                        className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors"
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                </li>
              );
            }

            const category = CATEGORIES[movement.categoryId];
            const isConfirming = confirmDeleteId === movement.id;

            return (
              <li key={movement.id}>
                <div className="py-3 px-2 -mx-2 rounded-xl flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors">
                  <button
                    type="button"
                    onClick={() => onSelectMovement(movement.id)}
                    className="flex-1 min-w-0 flex items-center justify-between gap-2.5 text-left cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:focus-visible:outline-sky-400 rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${category.iconBg} ${category.iconText}`}
                      >
                        <CategoryIcon categoryId={movement.categoryId} className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors">
                          {category.label}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {movement.dateLabel} · {movement.concept}
                        </p>
                      </div>
                    </div>

                    <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono tabular-nums whitespace-nowrap shrink-0">
                      {formatCOP(movement.amount)}
                    </span>
                  </button>

                  {isConfirming ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteId(null);
                          onDeleteExpense(movement.id);
                        }}
                        className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Eliminar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-700 dark:text-slate-200 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditExpense(movement.id)}
                        title={`Editar ${movement.concept}`}
                        aria-label={`Editar gasto ${movement.concept}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(movement.id)}
                        title={`Eliminar ${movement.concept}`}
                        aria-label={`Eliminar gasto ${movement.concept}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 2. Gasto por categoría */}
      <section
        aria-labelledby="categorias-heading"
        className="bg-white dark:bg-[#0D1424]/95 rounded-2xl border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 shadow-sm dark:shadow-none transition-colors"
      >
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 dark:border-blue-400/20 flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <BarChart2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </div>
            <h2
              id="categorias-heading"
              className="text-base font-semibold tracking-tight text-slate-900 dark:text-white"
            >
              Gasto por categoría
            </h2>
          </div>

          {selectedCategory !== 'all' ? (
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className="text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 cursor-pointer whitespace-nowrap"
            >
              Ver todas
            </button>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">Acumulado del mes</span>
          )}
        </div>

        <div className="space-y-2.5">
          {categoryBreakdown.map((cat) => {
            const isActive = selectedCategory === cat.id;
            const isDimmed = selectedCategory !== 'all' && !isActive;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(isActive ? 'all' : cat.id)}
                className={`w-full text-left rounded-xl p-2 -mx-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:focus-visible:outline-sky-400 ${
                  isActive ? 'bg-slate-100 dark:bg-white/[0.06]' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                } ${isDimmed ? 'opacity-45' : 'opacity-100'}`}
              >
                <div className="flex items-center justify-between gap-2 text-xs sm:text-sm mb-1.5">
                  <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{cat.label}</span>
                  <span className="font-mono text-xs text-slate-900 dark:text-white tabular-nums whitespace-nowrap shrink-0">
                    {formatCOP(cat.sum)}{' '}
                    <span className="text-slate-500 dark:text-slate-400">({formatPercent(cat.pct)})</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800/90 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-300 ease-out"
                    style={{
                      width: `${cat.pct}%`,
                      backgroundColor: cat.barColor,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
