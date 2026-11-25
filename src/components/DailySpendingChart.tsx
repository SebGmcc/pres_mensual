import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import {
  CATEGORIES,
  CATEGORY_LIST,
  formatCOP,
  formatShortCOP,
  type CategoryId,
  type ExpenseItem,
  type MonthDataset,
} from '../data/budgetData';

interface DailySpendingChartProps {
  month: MonthDataset;
  selectedCategory: CategoryId | 'all';
  onSelectCategory: (category: CategoryId | 'all') => void;
}

type ChartType = 'bars' | 'line';

interface DayBucket {
  day: number;
  total: number;
  items: ExpenseItem[];
  isFuture: boolean;
}

export function DailySpendingChart({
  month,
  selectedCategory,
  onSelectCategory,
}: DailySpendingChartProps) {
  const [chartType, setChartType] = useState<ChartType>('bars');
  const [activeDay, setActiveDay] = useState<number>(month.currentDay);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  useEffect(() => {
    setActiveDay(month.currentDay);
    setHoveredDay(null);
  }, [month.id, month.currentDay]);

  const filteredExpenses = useMemo(() => {
    if (selectedCategory === 'all') return month.expenses;
    return month.expenses.filter((item) => item.categoryId === selectedCategory);
  }, [month.expenses, selectedCategory]);

  const dailyBuckets = useMemo<DayBucket[]>(() => {
    const map = new Map<number, ExpenseItem[]>();
    for (const item of filteredExpenses) {
      const list = map.get(item.day) ?? [];
      list.push(item);
      map.set(item.day, list);
    }

    const buckets: DayBucket[] = [];
    for (let day = 1; day <= month.totalDays; day += 1) {
      const items = map.get(day) ?? [];
      const total = items.reduce((sum, item) => sum + item.amount, 0);
      buckets.push({
        day,
        total,
        items,
        isFuture: day > month.currentDay,
      });
    }
    return buckets;
  }, [filteredExpenses, month.currentDay, month.totalDays]);

  const elapsedBuckets = useMemo(
    () => dailyBuckets.filter((b) => !b.isFuture),
    [dailyBuckets]
  );

  const totalFiltered = useMemo(
    () => elapsedBuckets.reduce((sum, b) => sum + b.total, 0),
    [elapsedBuckets]
  );

  const dailyAverage = Math.round(totalFiltered / month.currentDay);

  const peakDay = useMemo(() => {
    return elapsedBuckets.reduce(
      (max, curr) => (curr.total > max.total ? curr : max),
      elapsedBuckets[0]
    );
  }, [elapsedBuckets]);

  const yMax = useMemo(() => {
    const rawMax = Math.max(...elapsedBuckets.map((b) => b.total), 40000);
    if (rawMax <= 40000) return 50000;
    if (rawMax <= 100000) return 100000;
    if (rawMax <= 150000) return 150000;
    if (rawMax <= 200000) return 200000;
    return Math.ceil(rawMax / 50000) * 50000;
  }, [elapsedBuckets]);

  const yTicks = useMemo(() => {
    const step = yMax / 5;
    return [0, step, step * 2, step * 3, step * 4, yMax];
  }, [yMax]);

  const activeBucket = dailyBuckets[activeDay - 1] ?? dailyBuckets[month.currentDay - 1];
  const hoveredBucket = hoveredDay !== null ? dailyBuckets[hoveredDay - 1] ?? null : null;
  const scrubberPct = (activeDay / month.currentDay) * 100;

  const accentHex =
    selectedCategory === 'all' ? '#3B82F6' : CATEGORIES[selectedCategory].barColor;

  // SVG coordinate system with clear room for X-axis day ticks + axis label
  const svgWidth = 720;
  const svgHeight = 272;
  const padLeft = 48;
  const padRight = 12;
  const padTop = 18;
  const padBottom = 48;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;
  const slotWidth = plotWidth / month.totalDays;
  const barWidth = Math.max(9, slotWidth * 0.56);

  const linePoints = elapsedBuckets
    .map((bucket) => {
      const x = padLeft + (bucket.day - 0.5) * slotWidth;
      const y = padTop + plotHeight - (bucket.total / yMax) * plotHeight;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPath = useMemo(() => {
    if (elapsedBuckets.length === 0) return '';
    const firstX = padLeft + 0.5 * slotWidth;
    const lastX = padLeft + (elapsedBuckets[elapsedBuckets.length - 1].day - 0.5) * slotWidth;
    const baseY = padTop + plotHeight;
    const coords = elapsedBuckets
      .map((bucket) => {
        const x = padLeft + (bucket.day - 0.5) * slotWidth;
        const y = padTop + plotHeight - (bucket.total / yMax) * plotHeight;
        return `L ${x} ${y}`;
      })
      .join(' ');
    return `M ${firstX} ${baseY} ${coords} L ${lastX} ${baseY} Z`;
  }, [elapsedBuckets, plotHeight, slotWidth, yMax]);

  const handleStepDay = (delta: number) => {
    setActiveDay((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > month.currentDay) return month.currentDay;
      return next;
    });
  };

  // Floating tooltip geometry anchored to hovered bar or line point
  const tooltipCoords = useMemo(() => {
    if (!hoveredBucket) return null;
    const centerX = padLeft + (hoveredBucket.day - 0.5) * slotWidth;
    const barH = hoveredBucket.isFuture
      ? 0
      : Math.max(hoveredBucket.total > 0 ? 5 : 0, (hoveredBucket.total / yMax) * plotHeight);
    const pointY =
      chartType === 'bars'
        ? padTop + plotHeight - barH
        : padTop + plotHeight - (hoveredBucket.total / yMax) * plotHeight;

    const leftPct = (centerX / svgWidth) * 100;
    const topPct = (Math.max(padTop + 8, pointY) / svgHeight) * 100;

    let translateClass = '-translate-x-1/2';
    if (hoveredBucket.day <= 4) {
      translateClass = '-translate-x-[15%]';
    } else if (hoveredBucket.day >= month.totalDays - 3) {
      translateClass = '-translate-x-[85%]';
    }

    return {
      leftPct,
      topPct,
      translateClass,
    };
  }, [hoveredBucket, chartType, slotWidth, yMax, plotHeight, month.totalDays]);

  return (
    <section
      aria-labelledby="gastos-diarios-heading"
      className="bg-white dark:bg-[#0D1424]/95 rounded-2xl border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 flex flex-col justify-between h-full shadow-sm dark:shadow-none transition-colors"
    >
      {/* Top Header & Segmented Toggle */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 dark:border-blue-400/20 flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <BarChart3 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <h2
                id="gastos-diarios-heading"
                className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white"
              >
                Gastos diarios del mes
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mt-2 tabular-nums">
              <span>
                Promedio diario:{' '}
                <strong className="font-semibold text-slate-900 dark:text-white">{formatCOP(dailyAverage)}</strong>
              </span>
              <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">
                ·
              </span>
              <span>
                Día más alto:{' '}
                <strong className="font-semibold text-slate-900 dark:text-white">
                  {peakDay.total > 0
                    ? `${peakDay.day} ${month.shortMonth} (${formatCOP(peakDay.total)})`
                    : 'Sin gastos'}
                </strong>
              </span>
            </div>
          </div>

          {/* Segmented Switch: Barras | Línea */}
          <div
            className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#131B2E] border border-slate-200 dark:border-white/[0.08] self-start shrink-0"
            role="group"
            aria-label="Tipo de gráfico"
          >
            <button
              type="button"
              onClick={() => setChartType('bars')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:focus-visible:outline-sky-400 ${
                chartType === 'bars'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
              Barras
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:focus-visible:outline-sky-400 ${
                chartType === 'line'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
              Línea
            </button>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:focus-visible:outline-sky-400 ${
              selectedCategory === 'all'
                ? 'bg-[#2563EB] text-white border-[#3B82F6]'
                : 'bg-slate-100 dark:bg-[#121A2D] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Todas las categorías
          </button>
          {CATEGORY_LIST.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(isSelected ? 'all' : cat.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:focus-visible:outline-sky-400 ${
                  isSelected
                    ? 'bg-[#2563EB] text-white border-[#3B82F6]'
                    : 'bg-slate-100 dark:bg-[#121A2D] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Interactive Day Timeline Scrubber */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleStepDay(-1)}
            disabled={activeDay <= 1}
            aria-label="Día anterior"
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-[#131B2E] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shrink-0 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <div className="flex-1 h-2.5 rounded-full bg-slate-200 dark:bg-[#141D32] border border-slate-300/60 dark:border-white/[0.05] overflow-hidden relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-400/80 transition-[width] duration-200 ease-out"
              style={{ width: `${scrubberPct}%` }}
            />
          </div>

          <button
            type="button"
            onClick={() => handleStepDay(1)}
            disabled={activeDay >= month.currentDay}
            aria-label="Día siguiente"
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-[#131B2E] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shrink-0 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Precision SVG Chart with Floating Hover Tooltip */}
      <div className="mt-4">
        <div className="w-full overflow-x-auto no-scrollbar">
          <div
            className="min-w-[540px] relative"
            onMouseLeave={() => setHoveredDay(null)}
          >
            {/* Floating Hover Tooltip (Fecha + Monto) */}
            {hoveredBucket && tooltipCoords && (
              <div
                role="status"
                aria-live="polite"
                className={`pointer-events-none absolute z-20 ${tooltipCoords.translateClass} -translate-y-full pb-2.5 transition-all duration-100 ease-out`}
                style={{
                  left: `${tooltipCoords.leftPct}%`,
                  top: `${tooltipCoords.topPct}%`,
                }}
              >
                <div className="rounded-xl bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border border-slate-200 dark:border-white/15 px-3.5 py-2 shadow-xl dark:shadow-2xl min-w-[156px]">
                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {hoveredBucket.day} {month.shortMonth} {month.year}
                  </p>
                  <p className="text-sm font-bold font-mono tabular-nums text-emerald-600 dark:text-[#14E19D] whitespace-nowrap mt-0.5">
                    {formatCOP(hoveredBucket.total)}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap mt-0.5">
                    {hoveredBucket.items.length > 0
                      ? `${hoveredBucket.items.length} ${
                          hoveredBucket.items.length === 1 ? 'movimiento' : 'movimientos'
                        }`
                      : hoveredBucket.isFuture
                        ? 'Día pendiente del mes'
                        : 'Sin gastos registrados'}
                  </p>
                </div>
              </div>
            )}

            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto select-none"
              role="img"
              aria-label={`Gráfico de gastos diarios de ${month.label}`}
            >
              <defs>
                <linearGradient id="barBlueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
                <linearGradient id="barEmeraldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34D399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="areaDarkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentHex} stopOpacity="0.32" />
                  <stop offset="100%" stopColor={accentHex} stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines & Y-Axis Labels */}
              {yTicks.map((tick) => {
                const y = padTop + plotHeight - (tick / yMax) * plotHeight;
                return (
                  <g key={tick}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={svgWidth - padRight}
                      y2={y}
                      className={
                        tick === 0
                          ? 'stroke-slate-300 dark:stroke-white/20'
                          : 'stroke-slate-200 dark:stroke-white/[0.06]'
                      }
                      strokeWidth={1}
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-500 dark:fill-slate-400 text-[11px] font-mono tabular-nums"
                    >
                      {formatShortCOP(tick)}
                    </text>
                  </g>
                );
              })}

              {/* Line Area Gradient */}
              {chartType === 'line' && areaPath && (
                <path d={areaPath} fill="url(#areaDarkGrad)" />
              )}

              {/* Line Stroke */}
              {chartType === 'line' && linePoints && (
                <polyline
                  fill="none"
                  stroke={accentHex}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={linePoints}
                />
              )}

              {/* Daily Slots */}
              {dailyBuckets.map((bucket) => {
                const centerX = padLeft + (bucket.day - 0.5) * slotWidth;
                const isSelected = activeDay === bucket.day;
                const isHovered = hoveredDay === bucket.day;
                const isHighlighted = isHovered || (hoveredDay === null && isSelected);
                const barH = bucket.isFuture
                  ? 0
                  : Math.max(bucket.total > 0 ? 5 : 0, (bucket.total / yMax) * plotHeight);
                const barY = padTop + plotHeight - barH;
                const lineY = padTop + plotHeight - (bucket.total / yMax) * plotHeight;

                return (
                  <g
                    key={bucket.day}
                    className={bucket.isFuture ? 'cursor-default' : 'cursor-pointer'}
                    onMouseEnter={() => {
                      setHoveredDay(bucket.day);
                      if (!bucket.isFuture) setActiveDay(bucket.day);
                    }}
                    onClick={() => {
                      setHoveredDay(bucket.day);
                      if (!bucket.isFuture) setActiveDay(bucket.day);
                    }}
                  >
                    {/* Highlighted Column Backdrop */}
                    {isHighlighted && (
                      <rect
                        x={padLeft + (bucket.day - 1) * slotWidth + 1}
                        y={padTop}
                        width={slotWidth - 2}
                        height={plotHeight}
                        rx={4}
                        className={
                          bucket.isFuture
                            ? 'fill-slate-900/[0.03] dark:fill-white/[0.03]'
                            : 'fill-slate-900/[0.06] dark:fill-white/[0.07]'
                        }
                      />
                    )}

                    {/* Bars Mode */}
                    {chartType === 'bars' && !bucket.isFuture && (
                      <>
                        {bucket.total > 0 ? (
                          <rect
                            x={centerX - barWidth / 2}
                            y={barY}
                            width={barWidth}
                            height={barH}
                            rx={3}
                            fill={
                              isHighlighted
                                ? 'url(#barEmeraldGrad)'
                                : selectedCategory === 'all'
                                  ? 'url(#barBlueGrad)'
                                  : accentHex
                            }
                            fillOpacity={
                              isHighlighted ? 1 : selectedCategory === 'all' ? 0.9 : 0.82
                            }
                          />
                        ) : (
                          <rect
                            x={centerX - barWidth / 2}
                            y={padTop + plotHeight - 2}
                            width={barWidth}
                            height={2}
                            rx={1}
                            className="fill-slate-400/50 dark:fill-slate-400/40"
                          />
                        )}
                      </>
                    )}

                    {/* Line Mode Nodes */}
                    {chartType === 'line' && !bucket.isFuture && (
                      <circle
                        cx={centerX}
                        cy={lineY}
                        r={isHighlighted ? 5.5 : 3.5}
                        fill={isHighlighted ? '#10B981' : accentHex}
                        className="stroke-white dark:stroke-[#0D1424]"
                        strokeWidth={isHighlighted ? 2.5 : 1}
                      />
                    )}

                    {/* Future Days Baseline Dash */}
                    {bucket.isFuture && (
                      <line
                        x1={centerX - 4}
                        y1={padTop + plotHeight - 1}
                        x2={centerX + 4}
                        y2={padTop + plotHeight - 1}
                        className="stroke-slate-300 dark:stroke-slate-400/30"
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    )}

                    {/* Visible X-Axis Day Number for Every Day */}
                    <text
                      x={centerX}
                      y={padTop + plotHeight + 16}
                      textAnchor="middle"
                      className={`text-[10px] font-mono tabular-nums transition-colors ${
                        isHighlighted
                          ? 'fill-emerald-600 dark:fill-emerald-400 font-bold'
                          : bucket.isFuture
                            ? 'fill-slate-400 dark:fill-slate-500'
                            : 'fill-slate-600 dark:fill-slate-300'
                      }`}
                    >
                      {bucket.day}
                    </text>

                    {/* Full-Height Invisible Hit Area */}
                    <rect
                      x={padLeft + (bucket.day - 1) * slotWidth}
                      y={padTop}
                      width={slotWidth}
                      height={plotHeight + 24}
                      fill="transparent"
                    />
                  </g>
                );
              })}

              {/* Explicit X-Axis Title Label */}
              <text
                x={padLeft + plotWidth / 2}
                y={svgHeight - 6}
                textAnchor="middle"
                className="fill-slate-500 dark:fill-slate-400 text-[11px] font-medium tracking-wide"
              >
                Día del mes · {month.label}
              </text>
            </svg>
          </div>
        </div>

        {/* Selected / Hovered Day Detail Strip */}
        <div className="mt-3 pt-3.5 border-t border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="font-semibold text-slate-900 dark:text-white whitespace-nowrap">
              {activeBucket.day} de {month.label.toLowerCase()}
            </span>
            <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">
              ·
            </span>
            {activeBucket.items.length > 0 ? (
              <span className="text-slate-600 dark:text-slate-300 truncate">
                {activeBucket.items
                  .map((item) => `${CATEGORIES[item.categoryId].label} (${formatCOP(item.amount)})`)
                  .join(' · ')}
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">Sin gastos registrados este día</span>
            )}
          </div>
          <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums shrink-0">
            Total del día:{' '}
            <span className="text-emerald-600 dark:text-emerald-400">{formatCOP(activeBucket.total)}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
