import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Pencil, Plus, Receipt, Search, Trash2 } from 'lucide-react';
import {
  CATEGORIES,
  CATEGORY_LIST,
  formatCOP,
  type CategoryId,
  type MonthDataset,
  type MovementItem,
} from '../data/budgetData';
import { CategoryIcon } from './CategoryIcon';

interface MovimientosViewProps {
  month: MonthDataset;
  allMovements: MovementItem[];
  onBackToDashboard: () => void;
  onSelectMovement: (movementId: string) => void;
  onEditExpense: (expenseId: string) => void;
  onDeleteExpense: (expenseId: string) => void;
  onStartRegisterExpense: () => void;
  onStartRegisterIncome: () => void;
}

type MovFilter = CategoryId | 'all' | 'incomes';

export function MovimientosView({
  month,
  allMovements,
  onBackToDashboard,
  onSelectMovement,
  onEditExpense,
  onDeleteExpense,
  onStartRegisterExpense,
  onStartRegisterIncome,
}: MovimientosViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<MovFilter>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const hasMovements = allMovements.length > 0;

  const filteredMovements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allMovements.filter((item) => {
      if (filter === 'incomes' && item.type !== 'income') return false;
      if (filter !== 'all' && filter !== 'incomes') {
        if (item.type !== 'expense' || item.categoryId !== filter) return false;
      }

      if (!query) return true;
      if (item.type === 'income') {
        return (
          item.concept.toLowerCase().includes(query) ||
          item.incomeCategory.toLowerCase().includes(query) ||
          item.paymentMethod.toLowerCase().includes(query) ||
          item.dateLabel.toLowerCase().includes(query) ||
          'ingreso'.includes(query)
        );
      }

      const catLabel = CATEGORIES[item.categoryId].label.toLowerCase();
      return (
        item.concept.toLowerCase().includes(query) ||
        catLabel.includes(query) ||
        item.dateLabel.toLowerCase().includes(query)
      );
    });
  }, [allMovements, filter, searchQuery]);

  const groupedByDate = useMemo(() => {
    const groups: Array<{
      dateLabel: string;
      day: number;
      items: MovementItem[];
      expenseSubtotal: number;
      incomeSubtotal: number;
    }> = [];
    const map = new Map<
      string,
      {
        dateLabel: string;
        day: number;
        items: MovementItem[];
        expenseSubtotal: number;
        incomeSubtotal: number;
      }
    >();

    for (const item of filteredMovements) {
      let group = map.get(item.dateLabel);
      if (!group) {
        group = {
          dateLabel: item.dateLabel,
          day: item.day,
          items: [],
          expenseSubtotal: 0,
          incomeSubtotal: 0,
        };
        map.set(item.dateLabel, group);
        groups.push(group);
      }
      group.items.push(item);
      if (item.type === 'income') {
        group.incomeSubtotal += item.amount;
      } else {
        group.expenseSubtotal += item.amount;
      }
    }

    return groups;
  }, [filteredMovements]);

  const filteredExpenseTotal = useMemo(
    () =>
      filteredMovements.reduce(
        (sum, item) => (item.type === 'expense' ? sum + item.amount : sum),
        0
      ),
    [filteredMovements]
  );

  const filteredIncomeTotal = useMemo(
    () =>
      filteredMovements.reduce(
        (sum, item) => (item.type === 'income' ? sum + item.amount : sum),
        0
      ),
    [filteredMovements]
  );

  // Versión vacía de Movimientos cuando no hay ningún movimiento (ni gastos ni ingresos)
  if (!hasMovements) {
    return (
      <section aria-labelledby="movimientos-vacio-heading" className="space-y-6">
        <div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Volver al Dashboard
          </button>
        </div>

        <div className="bg-white dark:bg-[#0D1424]/95 rounded-2xl border border-slate-200 dark:border-white/[0.08] px-6 py-14 sm:py-16 text-center max-w-2xl mx-auto shadow-sm dark:shadow-lg dark:shadow-black/20">
          <div className="w-12 h-12 rounded-2xl bg-[#5B3DF5]/10 dark:bg-[#5B3DF5]/15 border border-[#5B3DF5]/25 dark:border-[#5B3DF5]/30 flex items-center justify-center mx-auto mb-5">
            <Receipt className="w-6 h-6 text-[#5B3DF5] dark:text-[#8B75FF]" aria-hidden="true" />
          </div>
          <h1
            id="movimientos-vacio-heading"
            className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white text-balance"
          >
            Tus gastos van a vivir aquí
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto">
            cada vez que pagues algo, lo registras y aparece en esta lista
          </p>
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onStartRegisterIncome}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-slate-950 text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shadow-md shadow-emerald-600/20 dark:shadow-lg dark:shadow-emerald-950/40 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
              Registrar nuevo ingreso
            </button>
            <button
              type="button"
              onClick={onStartRegisterExpense}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#5B3DF5] hover:bg-[#6D52F7] text-white text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shadow-md shadow-[#5B3DF5]/25 dark:shadow-lg dark:shadow-[#5B3DF5]/30 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B75FF]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
              Registrar gasto
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="movimientos-heading" className="space-y-6">
      {/* Top Action & Title Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Volver al Dashboard
          </button>
          <h1
            id="movimientos-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
          >
            Movimientos de <span className="text-sky-600 dark:text-sky-400">{month.label}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 tabular-nums">
            {filteredMovements.length} movimientos listados · Gastos:{' '}
            <strong className="font-semibold text-slate-900 dark:text-white">
              {formatCOP(filteredExpenseTotal)}
            </strong>
            {filteredIncomeTotal > 0 && (
              <>
                {' '}
                · Ingresos:{' '}
                <strong className="font-semibold text-emerald-600 dark:text-[#14E19D]">
                  +{formatCOP(filteredIncomeTotal)}
                </strong>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <button
            type="button"
            onClick={onStartRegisterIncome}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-slate-950 text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 shadow-md shadow-emerald-600/20 dark:shadow-lg dark:shadow-emerald-950/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
            Registrar nuevo ingreso
          </button>

          <button
            type="button"
            onClick={onStartRegisterExpense}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#5B3DF5] hover:bg-[#6D52F7] text-white text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 shadow-md shadow-[#5B3DF5]/25 dark:shadow-lg dark:shadow-[#5B3DF5]/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B75FF]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
            Registrar nuevo gasto
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#0D1424]/95 rounded-2xl border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5 space-y-4 shadow-sm dark:shadow-none">
        <div className="relative">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por concepto, categoría, medio de pago o fecha..."
            aria-label="Buscar movimientos"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#121B30] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400/60"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              filter === 'all'
                ? 'bg-[#2563EB] text-white border-[#3B82F6]'
                : 'bg-slate-100 dark:bg-[#121A2D] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todos ({allMovements.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter(filter === 'incomes' ? 'all' : 'incomes')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              filter === 'incomes'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-semibold'
                : 'bg-emerald-50 dark:bg-[#121A2D] text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25 hover:border-emerald-400/60 dark:hover:border-emerald-400/50'
            }`}
          >
            Ingresos ({month.incomes.length})
          </button>

          {CATEGORY_LIST.map((cat) => {
            const isSelected = filter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilter(isSelected ? 'all' : cat.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#2563EB] text-white border-[#3B82F6]'
                    : 'bg-slate-100 dark:bg-[#121A2D] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chronological List Grouped by Day */}
      {groupedByDate.length > 0 ? (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <div
              key={group.dateLabel}
              className="bg-white dark:bg-[#0D1424]/95 rounded-2xl border border-slate-200 dark:border-white/[0.08] overflow-hidden shadow-sm dark:shadow-none"
            >
              <div className="px-5 py-3 bg-slate-50 dark:bg-[#11192D]/80 border-b border-slate-200 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {group.dateLabel}
                </span>
                <div className="flex items-center gap-3 font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                  {group.incomeSubtotal > 0 && (
                    <span>
                      Ingresos:{' '}
                      <strong className="text-emerald-600 dark:text-[#14E19D]">
                        +{formatCOP(group.incomeSubtotal)}
                      </strong>
                    </span>
                  )}
                  {group.expenseSubtotal > 0 && (
                    <span>
                      Gastos:{' '}
                      <strong className="text-slate-900 dark:text-white">
                        {formatCOP(group.expenseSubtotal)}
                      </strong>
                    </span>
                  )}
                </div>
              </div>

              <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {group.items.map((item) => {
                  if (item.type === 'income') {
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => onSelectMovement(item.id)}
                          className="w-full px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-emerald-50/70 dark:hover:bg-emerald-500/[0.04] transition-colors cursor-pointer text-left group focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-400"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/15 border border-emerald-500/30">
                              <span className="text-lg leading-none" aria-hidden="true">
                                💰
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">
                                {item.concept}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                Ingreso · {item.incomeCategory} · {item.paymentMethod} · {item.time}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm sm:text-base font-semibold text-emerald-600 dark:text-[#14E19D] font-mono tabular-nums whitespace-nowrap">
                              +{formatCOP(item.amount)}
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

                  const category = CATEGORIES[item.categoryId];
                  const isConfirming = confirmDeleteId === item.id;

                  return (
                    <li
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="px-5 py-3.5 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => onSelectMovement(item.id)}
                          className="flex-1 min-w-0 flex items-center justify-between gap-3 text-left cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 rounded-lg"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${category.iconBg} ${category.iconText}`}
                            >
                              <CategoryIcon categoryId={item.categoryId} className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors">
                                {item.concept}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {category.label} · {item.time}
                              </p>
                            </div>
                          </div>

                          <span className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white font-mono tabular-nums whitespace-nowrap shrink-0">
                            {formatCOP(item.amount)}
                          </span>
                        </button>

                        {isConfirming ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteId(null);
                                onDeleteExpense(item.id);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Eliminar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onEditExpense(item.id)}
                              title={`Editar ${item.concept}`}
                              aria-label={`Editar gasto ${item.concept}`}
                              className="p-2 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-sky-300 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              title={`Eliminar ${item.concept}`}
                              aria-label={`Eliminar gasto ${item.concept}`}
                              className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectMovement(item.id)}
                              aria-label={`Ver detalle de ${item.concept}`}
                              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer hidden sm:inline-flex"
                            >
                              <ChevronRight className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0D1424]/95 rounded-2xl border border-slate-200 dark:border-white/[0.08] p-10 text-center space-y-3 shadow-sm dark:shadow-none">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            No se encontraron movimientos con esos filtros
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Prueba limpiando la búsqueda o seleccionando todos los movimientos.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-xs font-medium text-slate-800 dark:text-white transition-colors cursor-pointer"
          >
            Restablecer filtros
          </button>
        </div>
      )}
    </section>
  );
}
