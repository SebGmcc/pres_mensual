import { useState, type FormEvent } from 'react';
import { AlertCircle, Check, LogOut, User, Wallet } from 'lucide-react';
import { formatCOP } from '../data/budgetData';
import { type ThemeMode } from './Header';

interface BudgetOnboardingViewProps {
  initialName: string;
  userEmail: string;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onSignOut: () => void;
  onComplete: (params: { displayName: string; monthlyBudget: number }) => Promise<void>;
}

const PRESET_BUDGETS = [1500000, 2500000, 3200000, 5000000];

export function BudgetOnboardingView({
  initialName,
  userEmail,
  theme,
  onToggleTheme,
  onSignOut,
  onComplete,
}: BudgetOnboardingViewProps) {
  const [displayName, setDisplayName] = useState(initialName);
  const [budgetInput, setBudgetInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const numericBudget = Number(budgetInput.replace(/\D/g, '')) || 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!numericBudget || numericBudget <= 0) {
      setErrorMessage('Ingresa tu presupuesto mensual en COP (debe ser mayor a $0).');
      return;
    }
    if (numericBudget > 100000000) {
      setErrorMessage('El presupuesto máximo permitido es $100.000.000 COP.');
      return;
    }

    setErrorMessage(null);
    setSaving(true);
    try {
      await onComplete({
        displayName: displayName.trim() || initialName,
        monthlyBudget: numericBudget,
      });
    } catch {
      setErrorMessage('No se pudo guardar tu presupuesto inicial. Intenta de nuevo.');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-900 dark:text-slate-100">
      <header className="bg-white/90 dark:bg-[#080D1A]/85 backdrop-blur-md border-b border-slate-200 dark:border-white/[0.08]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
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
            <span className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-white truncate">
              Mi Presupuesto Mensual
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-[#11192C] border border-slate-200 dark:border-white/10 hover:bg-slate-200/80 dark:hover:bg-[#18233D] flex items-center justify-center text-base leading-none transition-colors cursor-pointer"
            >
              <span aria-hidden="true">{theme === 'dark' ? '🌙' : '☀️'}</span>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#11192C] dark:hover:bg-[#18233D] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          noValidate
          className="w-full max-w-lg bg-white dark:bg-[#0D1424]/95 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xl dark:shadow-2xl dark:shadow-black/40 p-6 sm:p-8 space-y-6"
        >
          <div className="space-y-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#5B3DF5]/12 dark:bg-[#5B3DF5]/20 border border-[#5B3DF5]/30 dark:border-[#5B3DF5]/40 flex items-center justify-center mx-auto">
              <Wallet className="w-6 h-6 text-[#5B3DF5] dark:text-[#A28BFF]" aria-hidden="true" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              ¡Bienvenido! Configura tu presupuesto mensual
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Tu cuenta (<span className="font-medium text-slate-800 dark:text-slate-200">{userEmail}</span>) empieza desde cero. Define cuánto planeas destinar este mes para empezar a registrar tus movimientos.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="onboarding-name"
              className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              ¿Cómo prefieres que te llamemos?
            </label>
            <div className="relative">
              <User
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="onboarding-name"
                type="text"
                maxLength={60}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre"
                disabled={saving}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#121B30] border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#5B3DF5]"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor="onboarding-budget"
                className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Presupuesto mensual (COP)
              </label>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                {numericBudget > 0 ? formatCOP(numericBudget) : '$0 COP'}
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
                id="onboarding-budget"
                type="text"
                inputMode="numeric"
                autoFocus
                value={budgetInput}
                onChange={(e) => {
                  setBudgetInput(e.target.value.replace(/\D/g, '').slice(0, 9));
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Ej: 2500000"
                disabled={saving}
                className="w-full pl-9 pr-16 py-3.5 rounded-xl bg-slate-50 dark:bg-[#121B30] border border-slate-200 dark:border-white/[0.1] text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400"
              />
              <span
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-medium text-slate-400 pointer-events-none"
                aria-hidden="true"
              >
                COP
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {PRESET_BUDGETS.map((val) => {
                const isSelected = numericBudget === val;
                return (
                  <button
                    key={val}
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setBudgetInput(String(val));
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer tabular-nums ${
                      isSelected
                        ? 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-[#121A2D] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    {formatCOP(val)}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-200 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-slate-950 text-sm font-semibold transition-all cursor-pointer shadow-md shadow-emerald-600/20 dark:shadow-lg dark:shadow-emerald-950/40 inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
            {saving ? 'Guardando presupuesto...' : 'Comenzar con este presupuesto'}
          </button>
        </form>
      </main>
    </div>
  );
}
