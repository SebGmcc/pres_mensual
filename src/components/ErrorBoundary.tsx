import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Ocurrió un error inesperado.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private getFriendlyMessage(): string {
    const raw = this.state.message;
    if (raw.includes('Quota exceeded')) {
      return 'Se alcanzó el límite diario gratuito de lecturas o escrituras de la base de datos. La cuota se restablecerá mañana.';
    }
    if (raw.includes('permission') || raw.includes('PERMISSION_DENIED')) {
      return 'No tienes permisos suficientes para completar esta operación en la base de datos. Verifica tu sesión e intenta de nuevo.';
    }
    return 'Ocurrió un problema inesperado al sincronizar tus datos.';
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 text-slate-900 dark:text-slate-100">
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-[#0D1424]/95 border border-slate-200 dark:border-white/[0.08] p-7 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Algo no salió como esperábamos
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {this.getFriendlyMessage()}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#5B3DF5] hover:bg-[#6D52F7] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Recargar aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
