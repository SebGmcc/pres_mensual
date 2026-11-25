import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, LogOut } from 'lucide-react';
import { type MonthDataset } from '../data/budgetData';

export type AppScreen = 'dashboard' | 'movimientos' | 'detalle' | 'registrar' | 'registrar-ingreso';
export type ThemeMode = 'dark' | 'light';

interface HeaderProps {
  months: Record<MonthDataset['id'], MonthDataset>;
  selectedMonthId: MonthDataset['id'];
  onSelectMonth: (monthId: MonthDataset['id']) => void;
  activeScreen: AppScreen;
  onNavigate: (screen: 'dashboard' | 'movimientos' | 'detalle') => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  userName?: string;
  userEmail?: string;
  onSignOut?: () => void;
}

export function Header({
  months,
  selectedMonthId,
  onSelectMonth,
  activeScreen,
  onNavigate,
  theme,
  onToggleTheme,
  userName,
  userEmail,
  onSignOut,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeMonth = months[selectedMonthId];

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const monthList = Object.values(months);
  const isDashboardFlow =
    activeScreen === 'dashboard' ||
    activeScreen === 'registrar' ||
    activeScreen === 'registrar-ingreso';

  return (
    <header className="bg-white/90 dark:bg-[#080D1A]/85 backdrop-blur-md border-b border-slate-200 dark:border-white/[0.08] sticky top-0 z-30 transition-colors">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand */}
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 min-w-0 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:focus-visible:outline-sky-400 rounded-lg"
        >
          <div
            className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 dark:bg-[#0F1B33] dark:border-blue-400/25 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-4 h-4 text-sky-600 dark:text-sky-400"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 18v-5" />
              <path d="M10 18V9" />
              <path d="M15 18V5" />
              <path d="M20 18v-7" />
            </svg>
          </div>
          <span className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-white whitespace-nowrap truncate">
            Mi Presupuesto Mensual
          </span>
        </button>

        {/* Zone 2: Clean Single-Line Navigation */}
        <nav aria-label="Navegación principal" className="hidden md:flex items-center gap-6">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className={`py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              isDashboardFlow
                ? 'text-slate-950 dark:text-white border-sky-500 dark:border-sky-400'
                : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => onNavigate('movimientos')}
            className={`py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeScreen === 'movimientos'
                ? 'text-slate-950 dark:text-white border-sky-500 dark:border-sky-400'
                : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Movimientos
          </button>
          <button
            type="button"
            onClick={() => onNavigate('detalle')}
            className={`py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeScreen === 'detalle'
                ? 'text-slate-950 dark:text-white border-sky-500 dark:border-sky-400'
                : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Detalle
          </button>
        </nav>

        {/* Zone 3: Month Selector, Day Progress & Theme Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-haspopup="listbox"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#11192C] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:focus-visible:outline-sky-400"
            >
              <CalendarDays className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <span>{activeMonth.label}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform duration-150 ${
                  menuOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {menuOpen && (
              <div
                role="listbox"
                aria-label="Seleccionar mes"
                className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl py-1.5 z-40"
              >
                {monthList.map((m) => {
                  const isCurrent = m.id === selectedMonthId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="option"
                      aria-selected={isCurrent}
                      onClick={() => {
                        onSelectMonth(m.id);
                        setMenuOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm flex items-center justify-between transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-sky-50 dark:bg-blue-500/15 text-sky-700 dark:text-sky-300 font-medium'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-950 dark:hover:text-white'
                      }`}
                    >
                      <span>{m.label}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {m.currentDay}/{m.totalDays}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <span className="h-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" aria-hidden="true" />

          <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap hidden sm:inline">
            Día {activeMonth.currentDay} de {activeMonth.totalDays}
          </span>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Modo oscuro activo · Cambiar a claro' : 'Modo claro activo · Cambiar a oscuro'}
            className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-[#11192C] border border-slate-200 dark:border-white/10 hover:bg-slate-200/80 dark:hover:bg-[#18233D] hover:border-slate-300 dark:hover:border-white/20 flex items-center justify-center text-base leading-none transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:focus-visible:outline-sky-400"
          >
            <span aria-hidden="true">{theme === 'dark' ? '🌙' : '☀️'}</span>
          </button>

          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              title={userEmail ? `Sesión: ${userEmail} · Cerrar sesión` : 'Cerrar sesión'}
              aria-label="Cerrar sesión"
              className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg bg-slate-100 dark:bg-[#11192C] border border-slate-200 dark:border-white/10 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 dark:hover:bg-rose-500/10 dark:hover:border-rose-500/30 dark:hover:text-rose-300 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden lg:inline max-w-[90px] truncate">{userName || 'Salir'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Compact Mobile Navigation Row */}
      <div className="md:hidden border-t border-slate-200 dark:border-white/[0.06] px-4 flex items-center gap-6">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className={`py-2.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
            isDashboardFlow
              ? 'text-slate-950 dark:text-white border-sky-500 dark:border-sky-400'
              : 'text-slate-500 dark:text-slate-400 border-transparent'
          }`}
        >
          Dashboard
        </button>
        <button
          type="button"
          onClick={() => onNavigate('movimientos')}
          className={`py-2.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
            activeScreen === 'movimientos'
              ? 'text-slate-950 dark:text-white border-sky-500 dark:border-sky-400'
              : 'text-slate-500 dark:text-slate-400 border-transparent'
          }`}
        >
          Movimientos ({activeMonth.expenses.length + activeMonth.incomes.length})
        </button>
        <button
          type="button"
          onClick={() => onNavigate('detalle')}
          className={`py-2.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
            activeScreen === 'detalle'
              ? 'text-slate-950 dark:text-white border-sky-500 dark:border-sky-400'
              : 'text-slate-500 dark:text-slate-400 border-transparent'
          }`}
        >
          Detalle
        </button>
      </div>
    </header>
  );
}
