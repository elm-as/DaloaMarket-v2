import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);

    // Auto-reload on chunk load failures (Vite deployment updates / stale asset caches)
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('failed to fetch');

    if (isChunkError) {
      const hasRetried = sessionStorage.getItem('daloa_chunk_retry');
      if (!hasRetried) {
        sessionStorage.setItem('daloa_chunk_retry', 'true');
        console.warn('[ErrorBoundary] Chunk error detected, auto-reloading page...');
        window.location.reload();
      }
    }
  }

  handleReset = () => {
    sessionStorage.removeItem('daloa_chunk_retry');
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-background)]">
          <div className="text-center max-w-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-[var(--color-on-surface)] mb-2">
              Oups, quelque chose a mal tourne
            </h1>
            <p className="text-[var(--color-on-surface-variant)] text-sm mb-6">
              Actualisez la page ou réessayez plus tard.
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-white font-semibold text-sm active:scale-[0.97] transition-transform shadow-md"
              style={{ background: 'var(--color-primary)' }}
            >
              Actualiser
            </button>
          </div>
        </div>
      );
    }

    return <>{this.props.children}</>;
  }
}