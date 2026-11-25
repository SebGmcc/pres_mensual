import { useState, type FormEvent } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { AlertCircle, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { type ThemeMode } from './Header';

interface AuthViewProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

function mapAuthErrorToSpanish(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta registrada con este correo. Inicia sesión para acceder a tus datos.';
    case 'auth/invalid-email':
      return 'Ingresa un correo electrónico válido.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/operation-not-allowed':
      return 'El inicio de sesión con correo y contraseña aún no está habilitado en Firebase Console (Authentication → Sign-in method).';
    case 'auth/popup-blocked':
      return 'Tu navegador bloqueó la ventana emergente de Google. Permite las ventanas emergentes e intenta de nuevo.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Se cerró la ventana de Google antes de completar el inicio de sesión.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos seguidos. Espera un momento antes de intentarlo nuevamente.';
    case 'auth/network-request-failed':
      return 'Sin conexión a internet. Verifica tu red e intenta de nuevo.';
    default:
      return 'No se pudo completar la autenticación. Intenta de nuevo en unos segundos.';
  }
}

export function AuthView({ theme, onToggleTheme }: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isRegister = mode === 'register';
  const busy = submitting || googleLoading;

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);

    try {
      if (isRegister) {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const cleanName = displayName.trim();
        if (cleanName) {
          await updateProfile(cred.user, { displayName: cleanName.slice(0, 60) });
        }
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
    } catch (err) {
      setErrorMessage(mapAuthErrorToSpanish(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (busy) return;
    setErrorMessage(null);
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setErrorMessage(mapAuthErrorToSpanish(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-900 dark:text-slate-100">
      {/* Minimal Top Bar */}
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

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={
              theme === 'dark'
                ? 'Modo oscuro activo · Cambiar a claro'
                : 'Modo claro activo · Cambiar a oscuro'
            }
            className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-[#11192C] border border-slate-200 dark:border-white/10 hover:bg-slate-200/80 dark:hover:bg-[#18233D] flex items-center justify-center text-base leading-none transition-colors cursor-pointer shrink-0"
          >
            <span aria-hidden="true">{theme === 'dark' ? '🌙' : '☀️'}</span>
          </button>
        </div>
      </header>

      {/* Centered Auth Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white dark:bg-[#0D1424]/95 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xl dark:shadow-2xl dark:shadow-black/40 p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isRegister ? 'Crea tu cuenta' : 'Inicia sesión'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {isRegister
                ? 'Empieza desde cero con tu propio presupuesto y gastos guardados de forma privada.'
                : 'Accede únicamente a tus presupuestos, ingresos y movimientos registrados.'}
            </p>
          </div>

          {/* Mode Tabs */}
          <div
            role="tablist"
            aria-label="Modo de autenticación"
            className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-[#121B30] border border-slate-200 dark:border-white/[0.06]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isRegister}
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                !isRegister
                  ? 'bg-white dark:bg-[#1D2842] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isRegister}
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                isRegister
                  ? 'bg-white dark:bg-[#1D2842] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          {/* Quick Google Auth */}
          <button
            type="button"
            onClick={() => void handleGoogleLogin()}
            disabled={busy}
            className="w-full py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#121B30] dark:hover:bg-[#18243E] border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-white text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>
              {googleLoading ? 'Conectando con Google...' : 'Continuar rápido con Google'}
            </span>
          </button>

          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-slate-200 dark:border-white/[0.08]" />
            <span className="shrink mx-3 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
              o con tu correo
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-white/[0.08]" />
          </div>

          {/* Email + Password Form */}
          <form onSubmit={(e) => void handleEmailSubmit(e)} noValidate className="space-y-4">
            {isRegister && (
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-name"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Tu nombre (opcional)
                </label>
                <div className="relative">
                  <User
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-name"
                    type="text"
                    maxLength={60}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ej: Johan"
                    disabled={busy}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#121B30] border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#5B3DF5]"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="auth-email"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Correo electrónico
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="tucorreo@ejemplo.com"
                  disabled={busy}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#121B30] border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#5B3DF5]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="auth-password"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder={isRegister ? 'Mínimo 6 caracteres' : '••••••••'}
                  disabled={busy}
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-50 dark:bg-[#121B30] border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#5B3DF5]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
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
              disabled={busy}
              className="w-full py-3 rounded-xl bg-[#5B3DF5] hover:bg-[#6D52F7] text-white text-sm font-semibold transition-all cursor-pointer shadow-md shadow-[#5B3DF5]/25 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting
                ? isRegister
                  ? 'Creando cuenta...'
                  : 'Ingresando...'
                : isRegister
                  ? 'Crear cuenta'
                  : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
